package com.example.OMA.Controller;

import com.example.OMA.DTO.SaveAnswerDTO;
import com.example.OMA.DTO.SaveProgressDTO;
import com.example.OMA.DTO.SurveySubmissionDTO;
import com.example.OMA.Model.SurveySubmission;
import com.example.OMA.Service.SurveyService;
import com.example.OMA.Service.RecaptchaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/survey")
public class SurveyController {

    private static final Logger log = LoggerFactory.getLogger(SurveyController.class);

    private final SurveyService surveyService;
    private final RecaptchaService recaptchaService;

    public SurveyController(SurveyService surveyService, RecaptchaService recaptchaService) {
        this.surveyService = surveyService;
        this.recaptchaService = recaptchaService;

    }

    /** Incrementally save one answer (called on Next click, debounced 2 s). */
    @PostMapping("/save-answer")
    public ResponseEntity<Map<String, Object>> saveAnswer(@RequestBody SaveAnswerDTO dto) {
        try {
            surveyService.saveAnswer(dto);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("save-answer failed", e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Bulk save-progress endpoint - receives the FULL responses map.
     * Idempotent: replaces all stored responses for this session with the payload.
     * Called by the frontend autosave hook on navigation, answer change, and visibility events.
     */
    @PostMapping("/save-progress")
    public ResponseEntity<Map<String, Object>> saveProgress(@RequestBody SaveProgressDTO dto) {
        try {
            surveyService.saveProgress(dto);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("save-progress failed", e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /** 
     * Verify reCAPTCHA token when user starts the survey (from InstructionPage).
     * Called before accessing the survey questions.
     */
    @PostMapping("/verify-session")
    public ResponseEntity<Map<String, Object>> verifySession(@RequestBody Map<String, String> request) {
        try {
            String recaptchaToken = request.get("recaptchaToken");
            
            if (recaptchaToken == null || recaptchaToken.isEmpty()) {
                Map<String, Object> err = new HashMap<>();
                err.put("success", false);
                err.put("message", "reCAPTCHA token is missing");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
            }

            // Verify reCAPTCHA token
            Map<String, Object> verificationResult = recaptchaService.verifyToken(recaptchaToken);
            
            // Check if reCAPTCHA verification was successful with acceptable score
            // Uses configurable threshold from recaptcha.score.threshold property
            if (!recaptchaService.isValidScore(verificationResult)) {
                Map<String, Object> err = new HashMap<>();
                err.put("success", false);
                err.put("message", "reCAPTCHA verification failed - Bot detected");
                err.put("score", verificationResult.get("score"));
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            }

            // Verification passed - allow survey access
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Session verified successfully");
            body.put("score", verificationResult.get("score"));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("verify-session failed", e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Verification error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /** Final submit - stamps submittedAt and re-saves all answers. */
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitSurvey(@RequestBody SurveySubmissionDTO dto) {
        try {
            // reCAPTCHA was already verified at session start (via /verify-session endpoint)
            // Now just save the survey submission
            SurveySubmission saved = surveyService.submitSurvey(dto);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Survey submitted successfully");
            body.put("sessionId", saved.getSessionId());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("submit failed", e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Recover saved answers for a session (used when localStorage is cleared).
     * Returns the responses map in the same format the frontend stores it,
     * so it can be loaded directly into state.
     */
    @GetMapping("/session/{sessionId}/responses")
    public ResponseEntity<Map<String, Object>> getSessionResponses(@PathVariable String sessionId) {
        try {
            SurveySubmission submission = surveyService.getSubmissionBySessionId(sessionId);
            Map<String, Object> body = new HashMap<>();

            if (submission == null) {
                body.put("found", false);
                body.put("responses", Map.of());
                return ResponseEntity.ok(body);
            }

            // If already submitted, don't allow recovery
            if (submission.getSubmittedAt() != null) {
                body.put("found", true);
                body.put("submitted", true);
                body.put("responses", Map.of());
                return ResponseEntity.ok(body);
            }

            Map<String, Object> responses = surveyService.getResponsesMapForSession(sessionId);
            body.put("found", true);
            body.put("submitted", false);
            body.put("responses", responses);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("session-responses failed", e);
            Map<String, Object> err = new HashMap<>();
            err.put("found", false);
            err.put("message", "Failed to retrieve session data");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }


    @GetMapping("survey_score")
    public Map<Integer, BigDecimal> getScore(){
        return surveyService.getAllResponse();
    }

    // ── GDPR Data Rights Endpoints ──

    /**
     * Export all data linked to a session ID (GDPR right of access / portability).
     * Returns the session metadata and all responses in JSON format.
     */
    @GetMapping("/session/{sessionId}/export")
    public ResponseEntity<Map<String, Object>> exportSessionData(@PathVariable String sessionId) {
        try {
            Map<String, Object> data = surveyService.exportSessionData(sessionId);
            if (data == null) {
                Map<String, Object> err = new HashMap<>();
                err.put("found", false);
                err.put("message", "No data found for this session ID");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
            }
            data.put("exportedAt", java.time.Instant.now().toString());
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Export failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Irreversibly anonymize all data linked to a session ID (GDPR right to erasure).
     * Replaces the session ID with a random anonymous value, nullifies timestamps,
     * consent fields, and free-text responses. Structured response data is preserved
     * in anonymized form for aggregated analysis.
     */
    @DeleteMapping("/session/{sessionId}/data")
    public ResponseEntity<Map<String, Object>> deleteSessionData(@PathVariable String sessionId) {
        try {
            boolean anonymized = surveyService.anonymizeSessionData(sessionId);
            Map<String, Object> body = new HashMap<>();
            if (!anonymized) {
                body.put("success", false);
                body.put("message", "No data found for this session ID");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
            }
            body.put("success", true);
            body.put("message", "Session data has been irreversibly anonymized");
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Anonymization failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

}
