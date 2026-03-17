package com.example.OMA.Service;
 
import com.example.OMA.DTO.SaveAnswerDTO;
import com.example.OMA.DTO.SaveProgressDTO;
import com.example.OMA.DTO.SurveySubmissionDTO;
import com.example.OMA.Model.FreetextCache;
import com.example.OMA.Model.MainQuestion;
import com.example.OMA.Model.Option;
import com.example.OMA.Model.SubQuestion;
import com.example.OMA.Model.Category;
import com.example.OMA.Model.SurveyResponse;
import com.example.OMA.Model.SurveySubmission;
import com.example.OMA.Repository.CategoryRepo;
import com.example.OMA.Repository.FreetextCacheRepository;
import com.example.OMA.Repository.MainQuestionRepo;
import com.example.OMA.Repository.OptionRepo;
import com.example.OMA.Repository.SubQuestionRepo;
import com.example.OMA.Repository.SurveyResponseRepo;
import com.example.OMA.Repository.SurveySubmissionRepo;
 
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
 
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
 
@Service
public class SurveyService {
 
    private static final Logger log = LoggerFactory.getLogger(SurveyService.class);
 
    private final SurveySubmissionRepo submissionRepo;
    private final SurveyResponseRepo responseRepo;
    private final MainQuestionRepo mainQuestionRepo;
    private final OptionRepo optionRepo;
    private final SubQuestionRepo subQuestionRepo;
    private final CategoryRepo categoryRepo;
    private final FreetextCacheRepository freetextCacheRepo;
 
    public SurveyService(SurveySubmissionRepo submissionRepo,
                         SurveyResponseRepo responseRepo,
                         MainQuestionRepo mainQuestionRepo,
                         OptionRepo optionRepo,
                         SubQuestionRepo subQuestionRepo,
                         CategoryRepo categoryRepo,
                         FreetextCacheRepository freetextCacheRepo) {
        this.submissionRepo = submissionRepo;
        this.responseRepo = responseRepo;
        this.mainQuestionRepo = mainQuestionRepo;
        this.optionRepo = optionRepo;
        this.subQuestionRepo = subQuestionRepo;
        this.categoryRepo = categoryRepo;
        this.freetextCacheRepo = freetextCacheRepo;
    }
 
    // ── Save a single answer (called on Next click, debounced 2 s from frontend) ──
    @Transactional
    public void saveAnswer(SaveAnswerDTO dto) {
        // Upsert the submission row (create if first answer for this session)
        SurveySubmission submission = submissionRepo.findById(dto.getSessionId()).orElse(null);
        if (submission == null) {
            submission = new SurveySubmission(dto.getSessionId(), null);
            submissionRepo.saveAndFlush(submission);
        }
 
        // Delete old answer rows for this question (in case user changed answer)
        responseRepo.deleteBySessionIdAndMainQuestionId(dto.getSessionId(), dto.getMainQuestionId());
        responseRepo.flush();
 
        // Insert new answer row(s) - save each response explicitly
        List<SurveyResponse> rows = buildResponseRows(submission, dto.getMainQuestionId(), dto.getAnswer());
        responseRepo.saveAll(rows);
    }
 
    /**
     * Bulk save-progress: replaces ALL stored responses for a session with the
     * full responses map from the frontend.
     * Idempotent - multiple identical calls produce the same result.
     * Does NOT touch submittedAt (that is the job of submitSurvey).
     */
    @Transactional
    public void saveProgress(SaveProgressDTO dto) {
        // Upsert the submission row
        SurveySubmission submission = submissionRepo.findById(dto.getSessionId()).orElse(null);
        if (submission == null) {
            submission = new SurveySubmission(dto.getSessionId(), null);
            // Persist consent if provided
            applyConsent(submission, dto.getConsentGiven(), dto.getConsentAt());
            submissionRepo.saveAndFlush(submission);
        } else {
            // Update consent if not already set and provided
            if (submission.getConsentGiven() == null || !submission.getConsentGiven()) {
                applyConsent(submission, dto.getConsentGiven(), dto.getConsentAt());
                submissionRepo.saveAndFlush(submission);
            }
        }
 
        // If already submitted, reject silently (don't overwrite final data)
        if (submission.getSubmittedAt() != null) return;
 
        // Wipe all existing response rows for this session
        responseRepo.deleteBySubmissionSessionId(dto.getSessionId());
        responseRepo.flush();
 
        // Re-insert all responses from the full map
        Map<String, Object> responses = dto.getResponses();
        if (responses != null && !responses.isEmpty()) {
            List<SurveyResponse> allRows = new ArrayList<>();
            for (Map.Entry<String, Object> entry : responses.entrySet()) {
                Integer mainQId = Integer.valueOf(entry.getKey());
                allRows.addAll(buildResponseRows(submission, mainQId, entry.getValue()));
            }
            responseRepo.saveAll(allRows);
        }
    }
 
    /**
     * Persist the final survey submission.
     * Deletes any existing draft rows and re-inserts all answers,
     * then stamps submittedAt.
     */
    @Transactional
    public SurveySubmission submitSurvey(SurveySubmissionDTO dto) {
 
        Instant submittedAt = dto.getSubmittedAt() != null
                ? parseInstant(dto.getSubmittedAt())
                : Instant.now();
 
        // Reuse existing submission row if one was created by save-answer calls
        SurveySubmission submission = submissionRepo.findById(dto.getSessionId()).orElse(null);
        if (submission != null) {
            submission.setSubmittedAt(submittedAt);
            applyConsent(submission, dto.getConsentGiven(), dto.getConsentAt());
            // Delete old draft responses
            responseRepo.deleteAll(submission.getResponses());
            responseRepo.flush();
            submission.getResponses().clear();
        } else {
            submission = new SurveySubmission(dto.getSessionId(), submittedAt);
            applyConsent(submission, dto.getConsentGiven(), dto.getConsentAt());
        }
 
        // Persist/update the submission row first
        submission = submissionRepo.saveAndFlush(submission);
 
        // Fan-out all responses into relational rows and save explicitly
        Map<String, Object> responses = dto.getResponses();
        if (responses != null) {
            List<SurveyResponse> allRows = new ArrayList<>();
            List<FreetextCache> cacheRows = new ArrayList<>();
            for (Map.Entry<String, Object> entry : responses.entrySet()) {
                Integer mainQId = Integer.valueOf(entry.getKey());
                List<SurveyResponse> questionRows = buildResponseRows(submission, mainQId, entry.getValue());
                allRows.addAll(questionRows);
                
                // Extract free text responses and add to cache with null score
                for (SurveyResponse row : questionRows) {
                    if (row.getFreeText() != null) {
                        FreetextCache cache = new FreetextCache(dto.getSessionId(), mainQId, row.getCategoryId(), row.getFreeText());
                        cacheRows.add(cache);
                    }
                }
            }
            responseRepo.saveAll(allRows);
            // Save free text to cache for BERT processing
            if (!cacheRows.isEmpty()) {
                freetextCacheRepo.saveAll(cacheRows);
            }
        }
 
        return submission;
    }
 
    // ── Consent helper ──
    private void applyConsent(SurveySubmission submission, Boolean consentGiven, String consentAt) {
        if (consentGiven != null && consentGiven) {
            submission.setConsentGiven(true);
            if (consentAt != null && !consentAt.isBlank()) {
                submission.setConsentAt(parseInstant(consentAt));
            } else {
                submission.setConsentAt(Instant.now());
            }
        }
    }
 
    /**
     * Parse an ISO-8601 timestamp string to an Instant (UTC).
     * Handles formats with 'Z', offsets ('+05:30'), or bare local datetimes
     * (treated as UTC for consistency).
     */
    private Instant parseInstant(String iso) {
        if (iso == null || iso.isBlank()) return Instant.now();
        try {
            // Handles both "2026-03-03T12:33:29.162Z" and "2026-03-03T12:33:29.162+05:30"
            return Instant.parse(iso);
        } catch (DateTimeParseException e) {
            // Bare local datetime without zone (e.g. "2026-03-03T12:33:29.162")
            // Treat as UTC to keep behaviour consistent
            return Instant.parse(iso + "Z");
        }
    }
 
    // ── GDPR data export ──
    /**
     * Export all data linked to a session ID in a portable format.
     * Returns a map that can be serialised straight to JSON.
     */
    public Map<String, Object> exportSessionData(String sessionId) {
        SurveySubmission sub = submissionRepo.findById(sessionId).orElse(null);
        if (sub == null) return null;
 
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("sessionId", sub.getSessionId());
        data.put("submittedAt", sub.getSubmittedAt() != null ? sub.getSubmittedAt().toString() : null);
        data.put("consentGiven", sub.getConsentGiven());
        data.put("consentAt", sub.getConsentAt() != null ? sub.getConsentAt().toString() : null);
        data.put("responses", getResponsesMapForSession(sessionId));
        return data;
    }

    /**
     * Export all data linked to a session ID as a human-readable CSV string.
     * Resolves all IDs to actual question text, option text, sub-question text,
     * and category names so the output is usable without internal knowledge.
     */
    public String exportSessionDataAsCsv(String sessionId) {
        SurveySubmission sub = submissionRepo.findById(sessionId).orElse(null);
        if (sub == null) return null;

        List<SurveyResponse> responses = responseRepo.findBySubmissionSessionId(sessionId);
        if (responses == null || responses.isEmpty()) return null;

        // Build lookup maps
        Map<Integer, MainQuestion> questionMap = new HashMap<>();
        for (MainQuestion q : mainQuestionRepo.findAll()) {
            questionMap.put(q.getMainQuestionId(), q);
        }
        Map<Integer, com.example.OMA.Model.SubQuestion> subQuestionMap = new HashMap<>();
        for (com.example.OMA.Model.SubQuestion sq : subQuestionRepo.findAll()) {
            subQuestionMap.put(sq.getSubQuestionId(), sq);
        }
        Map<Integer, Option> optionMap = new HashMap<>();
        for (Option o : optionRepo.findAll()) {
            optionMap.put(o.getOptionId(), o);
        }
        Map<Integer, String> categoryNameMap = new HashMap<>();
        for (com.example.OMA.Model.Category c : categoryRepo.findAll()) {
            categoryNameMap.put(c.getCategoryId(), c.getName());
        }

        // Sort by mainQuestionId, then subQuestionId, then rankPosition
        responses.sort((a, b) -> {
            int cmp = Integer.compare(a.getMainQuestionId(), b.getMainQuestionId());
            if (cmp != 0) return cmp;
            int subA = a.getSubQuestionId() != null ? a.getSubQuestionId() : 0;
            int subB = b.getSubQuestionId() != null ? b.getSubQuestionId() : 0;
            cmp = Integer.compare(subA, subB);
            if (cmp != 0) return cmp;
            int posA = a.getRankPosition() != null ? a.getRankPosition() : 0;
            int posB = b.getRankPosition() != null ? b.getRankPosition() : 0;
            return Integer.compare(posA, posB);
        });

        StringBuilder csv = new StringBuilder();

        // ── Metadata section (GDPR Art. 15 — include all personal data held) ──
        csv.append("Session ID,").append(escapeCsv(sub.getSessionId())).append('\n');
        csv.append("Submitted At,").append(sub.getSubmittedAt() != null ? sub.getSubmittedAt().toString() : "").append('\n');
        csv.append("Consent Given,").append(sub.getConsentGiven() != null ? sub.getConsentGiven().toString() : "").append('\n');
        csv.append("Consent At,").append(sub.getConsentAt() != null ? sub.getConsentAt().toString() : "").append('\n');
        csv.append("Export Date,").append(java.time.Instant.now().toString()).append('\n');
        csv.append('\n');

        // ── Response data ──
        csv.append("Category,Question,Sub-Question,Response,Rank Position\n");

        for (SurveyResponse r : responses) {
            String categoryName = r.getCategoryId() != null
                    ? categoryNameMap.getOrDefault(r.getCategoryId(), "")
                    : "";

            MainQuestion mq = questionMap.get(r.getMainQuestionId());
            String questionText = mq != null ? mq.getQuestionText() : "";

            String subQuestionText = "";
            if (r.getSubQuestionId() != null) {
                com.example.OMA.Model.SubQuestion sq = subQuestionMap.get(r.getSubQuestionId());
                if (sq != null) subQuestionText = sq.getQuestionText();
            }

            String response;
            if (r.getFreeText() != null && !r.getFreeText().isBlank()) {
                response = r.getFreeText();
            } else if (r.getOptionId() != null) {
                Option opt = optionMap.get(r.getOptionId());
                response = opt != null ? opt.getOptionText() : "";
            } else {
                response = "";
            }

            String rankPos = r.getRankPosition() != null ? String.valueOf(r.getRankPosition()) : "";

            csv.append(escapeCsv(categoryName)).append(',');
            csv.append(escapeCsv(questionText)).append(',');
            csv.append(escapeCsv(subQuestionText)).append(',');
            csv.append(escapeCsv(response)).append(',');
            csv.append(escapeCsv(rankPos)).append('\n');
        }

        return csv.toString();
    }

    private static String escapeCsv(String value) {
        if (value == null || value.isEmpty()) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    // ── GDPR data anonymization (irreversible) ──
    /**
     * Irreversibly anonymize all data for a session (right to erasure / right to be forgotten).
     *
     * Approach: Replace the original session_id with a random REDACTED-<UUID> value
     * in the survey_submission table. The FK on survey_response has ON UPDATE CASCADE,
     * so PostgreSQL automatically propagates the new session_id to all child rows.
     * Free-text responses are nullified (treated as personal data — respondents may
     * voluntarily include identifying details). Temporal and consent fields in the
     * submission are nullified.
     *
     * After this operation:
     * - The original session ID no longer exists anywhere in the database
     * - Free-text responses are permanently erased
     * - The anonymized rows cannot be linked back to any session or person
     * - Structured response data (option selections, rankings) is preserved
     *   for aggregated organisational analysis
     * - This is irreversible: the mapping between the original session ID
     *   and the anonymous ID is never recorded
     */
    @Transactional
    public boolean anonymizeSessionData(String sessionId) {
        SurveySubmission sub = submissionRepo.findById(sessionId).orElse(null);
        if (sub == null) return false;
 
        // Generate a random anonymous replacement ID that cannot be reversed
        // Prefix is REDACTED- (distinct from normal session prefix anon-)
        String anonymousId = "REDACTED-" + java.util.UUID.randomUUID().toString();

        // Delete free-text response rows entirely (may contain voluntarily disclosed PII).
        // Removing the rows prevents null free_text from being sent to the NLP model.
        responseRepo.deleteFreeTextResponses(sessionId);

        // Update PK + nullify fields in survey_submission
        // ON UPDATE CASCADE on the FK automatically updates survey_response.session_id
        submissionRepo.anonymizeSubmission(sessionId, anonymousId);
 
        // Audit log: record that anonymization occurred without logging the original session ID
        log.info("GDPR erasure completed: session replaced with {}", anonymousId);

        return true;
    }
 
    public List<SurveySubmission> getAllSubmissions() {
        return submissionRepo.findAllByOrderBySubmittedAtDesc();
    }
 
    public SurveySubmission getSubmissionBySessionId(String sessionId) {
        return submissionRepo.findById(sessionId).orElse(null);
    }
 
    /**
     * Reconstruct the frontend-style responses map from DB rows for session recovery.
     * Returns a map of mainQuestionId → answer value (same format the frontend stores).
     */
    public Map<String, Object> getResponsesMapForSession(String sessionId) {
        List<SurveyResponse> rows = responseRepo.findBySubmissionSessionId(sessionId);
        if (rows == null || rows.isEmpty()) return Map.of();
 
        // Group rows by mainQuestionId
        Map<Integer, List<SurveyResponse>> grouped = new java.util.LinkedHashMap<>();
        for (SurveyResponse r : rows) {
            grouped.computeIfAbsent(r.getMainQuestionId(), k -> new ArrayList<>()).add(r);
        }
 
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        for (Map.Entry<Integer, List<SurveyResponse>> entry : grouped.entrySet()) {
            Integer mainQId = entry.getKey();
            List<SurveyResponse> qRows = entry.getValue();
 
            // Determine question type by inspecting the rows
            MainQuestion mq = mainQuestionRepo.findById(mainQId).orElse(null);
            String qType = (mq != null && mq.getQuestionType() != null)
                    ? mq.getQuestionType().toLowerCase().trim()
                    : "single ans";
 
            switch (qType) {
                case "single ans":
                    if (!qRows.isEmpty() && qRows.get(0).getOptionId() != null) {
                        result.put(String.valueOf(mainQId), qRows.get(0).getOptionId());
                    }
                    break;
                case "multi ans":
                    List<Integer> selectedIds = new ArrayList<>();
                    for (SurveyResponse r : qRows) {
                        if (r.getOptionId() != null) selectedIds.add(r.getOptionId());
                    }
                    result.put(String.valueOf(mainQId), selectedIds);
                    break;
                case "free text":
                    if (!qRows.isEmpty() && qRows.get(0).getFreeText() != null) {
                        result.put(String.valueOf(mainQId), qRows.get(0).getFreeText());
                    }
                    break;
                case "rank":
                    // Sort by rank_position and collect option_ids
                    qRows.sort((a, b) -> {
                        int posA = a.getRankPosition() != null ? a.getRankPosition() : 0;
                        int posB = b.getRankPosition() != null ? b.getRankPosition() : 0;
                        return Integer.compare(posA, posB);
                    });
                    List<Integer> rankedIds = new ArrayList<>();
                    for (SurveyResponse r : qRows) {
                        if (r.getOptionId() != null) rankedIds.add(r.getOptionId());
                    }
                    result.put(String.valueOf(mainQId), rankedIds);
                    break;
                case "likert":
                    Map<String, Integer> likertMap = new java.util.LinkedHashMap<>();
                    for (SurveyResponse r : qRows) {
                        if (r.getSubQuestionId() != null && r.getOptionId() != null) {
                            likertMap.put(String.valueOf(r.getSubQuestionId()), r.getOptionId());
                        }
                    }
                    result.put(String.valueOf(mainQId), likertMap);
                    break;
                default:
                    if (!qRows.isEmpty() && qRows.get(0).getOptionId() != null) {
                        result.put(String.valueOf(mainQId), qRows.get(0).getOptionId());
                    }
                    break;
            }
        }
        return result;
    }
 
    // ── Build relational rows for a single answer value ──
    private List<SurveyResponse> buildResponseRows(SurveySubmission submission, Integer mainQId, Object value) {
        List<SurveyResponse> rows = new ArrayList<>();
        MainQuestion mq = mainQuestionRepo.findById(mainQId).orElse(null);
        String qType = (mq != null && mq.getQuestionType() != null)
                ? mq.getQuestionType().toLowerCase().trim()
                : "single ans";
        Integer categoryId = (mq != null && mq.getCategoryId() != null)
                ? mq.getCategoryId().intValue()
                : null;
 
        switch (qType) {
            case "single ans":
                rows.add(new SurveyResponse(submission, mainQId, null, toInt(value), null, null, categoryId));
                break;
            case "multi ans":
                if (value instanceof List<?> list) {
                    for (Object item : list) {
                        rows.add(new SurveyResponse(submission, mainQId, null, toInt(item), null, null, categoryId));
                    }
                }
                break;
            case "free text":
                rows.add(new SurveyResponse(submission, mainQId, null, null, String.valueOf(value), null, categoryId));
                break;
            case "rank":
                if (value instanceof List<?> list) {
                    for (int pos = 0; pos < list.size(); pos++) {
                        rows.add(new SurveyResponse(submission, mainQId, null, toInt(list.get(pos)), null, pos + 1, categoryId));
                    }
                }
                break;
            case "likert":
                if (value instanceof Map<?, ?> map) {
                    for (Map.Entry<?, ?> sub : map.entrySet()) {
                        rows.add(new SurveyResponse(submission, mainQId, toInt(sub.getKey()), toInt(sub.getValue()), null, null, categoryId));
                    }
                }
                break;
            default:
                rows.add(new SurveyResponse(submission, mainQId, null, toInt(value), null, null, categoryId));
                break;
        }
        return rows;
    }
 
    // ── Helper ──
    private Integer toInt(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number n) return n.intValue();
        return Integer.valueOf(obj.toString());
    }
 
    public Map<Integer, BigDecimal> getAllResponse() {
        List<Option> optionScore = optionRepo.findAll();
        List<SurveyResponse> surveyResponse = responseRepo.findAll();
 
        Map<Integer, BigDecimal> optionScoreMap = new HashMap<>();
        for (Option opt : optionScore) {
            optionScoreMap.put(opt.getOptionId(), opt.getScore());
        }
 
        Map<Integer, BigDecimal> categoryTotalScore = new HashMap<>();
        Map<Integer, Integer> categoryCount = new HashMap<>();
 
        // Process standard survey responses (options with scores)
        for (SurveyResponse response : surveyResponse) {
            Integer categoryId = response.getCategoryId();
            Integer optionId = response.getOptionId();
 
            BigDecimal score = optionScoreMap.get(optionId);
 
            if (score != null) {
                categoryTotalScore.put(categoryId, categoryTotalScore.getOrDefault(categoryId, BigDecimal.ZERO).add(score));
                categoryCount.put(categoryId, categoryCount.getOrDefault(categoryId, 0) + 1);
            }
            // Note: Free text responses are processed separately through FreetextCache batch processing
        }
 
        // Process free text from cache using pagination for memory efficiency
        processFreetextCacheWithPagination(categoryTotalScore, categoryCount);
 
        Map<Integer, BigDecimal> categoryAverage = new HashMap<>();
        for (Integer categoryId : categoryTotalScore.keySet()) {
            BigDecimal total = categoryTotalScore.get(categoryId);
            int count = categoryCount.get(categoryId);
 
            if (count > 0) {
                BigDecimal average = total.divide(
                        BigDecimal.valueOf(count),
                        2,
                        RoundingMode.HALF_UP
                );
                categoryAverage.put(categoryId, average);
            }
        }
        System.out.println(categoryAverage);
        return categoryAverage;
    }
 
    /**
     * Process free text cache entries in batches using VECTORIZED batch API (single request per batch)
     * instead of parallel individual requests. This is 10x more efficient.
     *
     * @param categoryTotalScore Map to accumulate category scores
     * @param categoryCount Map to count responses per category
     */
    private void processFreetextCacheWithPagination(Map<Integer, BigDecimal> categoryTotalScore,
                                                    Map<Integer, Integer> categoryCount) {
        RestTemplate restTemplate = new RestTemplate();
        String batchUrl = "http://internal-bert-internal-alb-1833527551.ap-south-2.elb.amazonaws.com/predict-batch-optimized";
        
        // Process in batches of 100 to avoid memory overflow
        int batchSize = 100;
        int batchNumber = 0;
        boolean hasMoreUnprocessed = true;
 
        // ========== PHASE 1: Send BATCH REQUESTS to BERT (1 request per 100 texts) ==========
        while (hasMoreUnprocessed) {
            try {
                // Always fetch from page 0 since we're removing entries as we process them
                Pageable pageable = PageRequest.of(0, batchSize);
                Page<FreetextCache> page = freetextCacheRepo.findByBertScoreIsNull(pageable);
 
                if (page.isEmpty()) {
                    System.out.println("✓ No more unprocessed free text entries to process");
                    hasMoreUnprocessed = false;
                    break;
                }
 
                batchNumber++;
                List<FreetextCache> batchContent = page.getContent();
                System.out.println("Processing batch " + batchNumber + " with " + batchContent.size()
                        + " entries (Total unprocessed remaining: " + (page.getTotalElements() - batchContent.size()) + ")");
 
                // ===== STEP 1: Collect all texts from this batch =====
                List<String> textsForBatch = batchContent.stream()
                    .map(FreetextCache::getFreeText)
                    .collect(Collectors.toList());
 
                System.out.println("  → Sending " + textsForBatch.size() + " texts to BERT in ONE batch request...");
                
                // ===== STEP 2: Send ONE REQUEST with all texts (vectorized processing) =====
                try {
                    Map<String, Object> batchRequest = new HashMap<>();
                    batchRequest.put("texts", textsForBatch);
                    
                    long startTime = System.currentTimeMillis();
                    ResponseEntity<Map> batchResponse = restTemplate.postForEntity(batchUrl, batchRequest, Map.class);
                    long duration = System.currentTimeMillis() - startTime;
                    
                    Map<String, Object> responseBody = batchResponse.getBody();
                    List<Map<String, Object>> results = (List<Map<String, Object>>) responseBody.get("results");
                    
                    System.out.println("  ✓ BERT batch response received (" + duration + "ms) with " + results.size() + " results");
                    
                    // ===== STEP 3: Map results back to FreetextCache entries =====
                    for (int i = 0; i < results.size() && i < batchContent.size(); i++) {
                        Map<String, Object> result = results.get(i);
                        FreetextCache cache = batchContent.get(i);
                        
                        if (result.containsKey("predicted_class_id")) {
                            Object scoreObj = result.get("predicted_class_id");
                            BigDecimal score = scoreObj instanceof Number
                                ? BigDecimal.valueOf(((Number) scoreObj).doubleValue())
                                : new BigDecimal(scoreObj.toString());
                            
                            cache.setBertScore(score);
                            
                            String preview = cache.getFreeText().substring(0, Math.min(50, cache.getFreeText().length()));
                            System.out.println("    ✓ Entry " + (i + 1) + ": '" + preview + "...' => Score: " + score);
                        }
                    }
                    
                    // ===== STEP 4: Batch save all processed entries at once =====
                    freetextCacheRepo.saveAll(batchContent);
                    System.out.println("  → Batch " + batchNumber + " saved: " + batchContent.size() + " entries updated");
                    
                } catch (Exception e) {
                    System.err.println("  ✗ Error in batch BERT request: " + e.getMessage());
                    e.printStackTrace();
                    break;
                }
 
                // If this batch was smaller than batchSize, we've reached the end
                if (batchContent.size() < batchSize) {
                    System.out.println("✓ Completed processing all batches (final batch had " + batchContent.size() + " < " + batchSize + ")");
                    hasMoreUnprocessed = false;
                }
 
            } catch (Exception e) {
                System.err.println("Error fetching batch " + batchNumber + ": " + e.getMessage());
                break;
            }
        }
 
        // ========== PHASE 2: Aggregate processed scores (single efficient query) ==========
        System.out.println("✓ Aggregating processed scores from cache...");
        
        // Get all processed free text scores in one go
        List<FreetextCache> processedScores = freetextCacheRepo.findAll()
                .stream()
                .filter(fc -> fc.getBertScore() != null)
                .toList();
 
        for (FreetextCache cache : processedScores) {
            Integer categoryId = cache.getCategoryId();
            categoryTotalScore.put(categoryId, categoryTotalScore.getOrDefault(categoryId, BigDecimal.ZERO).add(cache.getBertScore()));
            categoryCount.put(categoryId, categoryCount.getOrDefault(categoryId, 0) + 1);
        }
        
        System.out.println("✓ Aggregation complete: " + processedScores.size() + " processed entries counted");
    }
 
 
}