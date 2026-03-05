package com.example.OMA.Service;

import com.example.OMA.DTO.BertResponse;
import com.example.OMA.DTO.SaveAnswerDTO;
import com.example.OMA.DTO.SaveProgressDTO;
import com.example.OMA.DTO.SurveySubmissionDTO;
import com.example.OMA.Model.MainQuestion;
import com.example.OMA.Model.Option;
import com.example.OMA.Model.SurveyResponse;
import com.example.OMA.Model.SurveySubmission;
import com.example.OMA.Repository.MainQuestionRepo;
import com.example.OMA.Repository.OptionRepo;
import com.example.OMA.Repository.SurveyResponseRepo;
import com.example.OMA.Repository.SurveySubmissionRepo;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SurveyService {

    private final SurveySubmissionRepo submissionRepo;
    private final SurveyResponseRepo responseRepo;
    private final MainQuestionRepo mainQuestionRepo;

    private final OptionRepo optionRepo;

    public SurveyService(SurveySubmissionRepo submissionRepo,
                         SurveyResponseRepo responseRepo,
                         MainQuestionRepo mainQuestionRepo,
                        OptionRepo optionRepo) {
        this.submissionRepo = submissionRepo;
        this.responseRepo = responseRepo;
        this.mainQuestionRepo = mainQuestionRepo;
        this.optionRepo = optionRepo;
    }

    // ── Save a single answer (called on Next click, debounced 2 s from frontend) ──
    @Transactional
    public void saveAnswer(SaveAnswerDTO dto) {
        // Upsert the submission row (create if first answer for this session)
        SurveySubmission submission = submissionRepo.findById(dto.getSessionId()).orElse(null);
        if (submission == null) {
            Instant startedAt = parseInstant(dto.getStartedAt());
            submission = new SurveySubmission(dto.getSessionId(), startedAt, null);
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
            submission = new SurveySubmission(dto.getSessionId(), Instant.now(), null);
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

        Instant startedAt = dto.getStartedAt() != null
                ? parseInstant(dto.getStartedAt())
                : null;
        Instant submittedAt = dto.getSubmittedAt() != null
                ? parseInstant(dto.getSubmittedAt())
                : Instant.now();

        // Reuse existing submission row if one was created by save-answer calls
        SurveySubmission submission = submissionRepo.findById(dto.getSessionId()).orElse(null);
        if (submission != null) {
            submission.setStartedAt(startedAt);
            submission.setSubmittedAt(submittedAt);
            applyConsent(submission, dto.getConsentGiven(), dto.getConsentAt());
            // Delete old draft responses
            responseRepo.deleteAll(submission.getResponses());
            responseRepo.flush();
            submission.getResponses().clear();
        } else {
            submission = new SurveySubmission(dto.getSessionId(), startedAt, submittedAt);
            applyConsent(submission, dto.getConsentGiven(), dto.getConsentAt());
        }

        // Persist/update the submission row first
        submission = submissionRepo.saveAndFlush(submission);

        // Fan-out all responses into relational rows and save explicitly
        Map<String, Object> responses = dto.getResponses();
        if (responses != null) {
            List<SurveyResponse> allRows = new ArrayList<>();
            for (Map.Entry<String, Object> entry : responses.entrySet()) {
                Integer mainQId = Integer.valueOf(entry.getKey());
                allRows.addAll(buildResponseRows(submission, mainQId, entry.getValue()));
            }
            responseRepo.saveAll(allRows);
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
        data.put("startedAt", sub.getStartedAt() != null ? sub.getStartedAt().toString() : null);
        data.put("submittedAt", sub.getSubmittedAt() != null ? sub.getSubmittedAt().toString() : null);
        data.put("consentGiven", sub.getConsentGiven());
        data.put("consentAt", sub.getConsentAt() != null ? sub.getConsentAt().toString() : null);
        data.put("responses", getResponsesMapForSession(sessionId));
        return data;
    }

    // ── GDPR data deletion ──
    /**
     * Delete all response data for a session (right to erasure).
     * Removes responses and nullifies PII-adjacent fields but keeps the
     * submission row as an audit stub.
     */
    @Transactional
    public boolean deleteSessionData(String sessionId) {
        SurveySubmission sub = submissionRepo.findById(sessionId).orElse(null);
        if (sub == null) return false;

        // Delete all response rows
        responseRepo.deleteBySubmissionSessionId(sessionId);
        responseRepo.flush();

        // Nullify data fields but keep row as audit trail
        sub.setConsentGiven(false);
        sub.setConsentAt(null);
        submissionRepo.saveAndFlush(sub);
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
        // int i=0;
        // int k=0;
        List<Option> optionScore = optionRepo.findAll();
        List<SurveyResponse> surveyResponse = responseRepo.findAll();

        Map<Integer, BigDecimal> optionScoreMap = new HashMap<>();
        for(Option opt : optionScore){
            optionScoreMap.put(opt.getOptionId(), opt.getScore());
        }

        Map<Integer, BigDecimal> categoryTotalScore = new HashMap<>();
        Map<Integer, Integer> categoryCount = new HashMap<>();

        for(SurveyResponse response : surveyResponse){
            Integer categoryId = response.getCategoryId();
            Integer optionId = response.getOptionId();

            BigDecimal score = optionScoreMap.get(optionId);

            if(score!= null){
                categoryTotalScore.put(categoryId, categoryTotalScore.getOrDefault(categoryId, BigDecimal.ZERO).add(score));
            }
            else{
                RestTemplate restTemplate = new RestTemplate();
                String url = "http://localhost:8000/predict";
                Map<String, String> request = new HashMap<>();
                request.put("text", response.getFreeText());
                ResponseEntity<BertResponse> res = restTemplate.postForEntity(url, request, BertResponse.class);
                BertResponse body = res.getBody();
                BigDecimal stage = body.getPredicted_class_id();
                System.out.println(response.getFreeText() +" ------ "+stage + " ---- " );
                categoryTotalScore.put(categoryId, categoryTotalScore.getOrDefault(categoryId, BigDecimal.ZERO).add(stage));
            }

            categoryCount.put(categoryId, categoryCount.getOrDefault(categoryId, 0)+1);
        }

        Map<Integer, BigDecimal> categoryAverage = new HashMap<>();
        for(Integer categoryId : categoryTotalScore.keySet()){
            BigDecimal total = categoryTotalScore.get(categoryId);
            int count = categoryCount.get(categoryId);

            BigDecimal average = total.divide(
                    BigDecimal.valueOf(count),
                    2,
                    RoundingMode.HALF_UP
            );
            
            categoryAverage.put(categoryId, average);

        }
        
        // System.out.println("Category Total Score : " + categoryTotalScore);
        // System.out.println("Category Count : "+ categoryCount);
        // System.out.println("Category Average : "+ categoryAverage);
        return categoryAverage;
    }


}
