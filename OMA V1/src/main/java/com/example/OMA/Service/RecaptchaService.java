package com.example.OMA.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * Production-grade reCAPTCHA v3 verification service.
 * Prevents bot attacks on survey submission with real user behavior analysis.
 * 
 * In production with real reCAPTCHA keys:
 * - Real users: score 0.7-1.0 (natural interaction patterns)
 * - Suspicious activity: score 0.1-0.4 (bot-like patterns)
 * - Threshold 0.5: Blocks bots while allowing legitimate users
 */
@Service
public class RecaptchaService {

    private static final String RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
    private static final Logger logger = LoggerFactory.getLogger(RecaptchaService.class);

    @Value("${recaptcha.secret.key}")
    private String recaptchaSecretKey;

    @Value("${recaptcha.score.threshold:0.5}")
    private double scoreThreshold;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RecaptchaService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Verifies a reCAPTCHA v3 token against Google's verification API.
     * Production-ready with comprehensive error handling and monitoring.
     * 
     * @param token The reCAPTCHA token from the client
     * @return A map containing:
     *         - "success": boolean indicating if the token is valid
     *         - "score": float between 0.0 and 1.0 (higher = more likely human)
     *         - "action": the action name
     *         - "challenge_ts": timestamp when challenge was completed
     *         - "hostname": hostname of the site
     */
    public Map<String, Object> verifyToken(String token) {
        Map<String, Object> response = new HashMap<>();

        try {
            // Validate token
            if (token == null || token.trim().isEmpty()) {
                logger.warn("⚠️  reCAPTCHA: Token missing - possible bot attempt or client error");
                response.put("success", false);
                response.put("message", "reCAPTCHA verification required");
                return response;
            }

            // Call Google's verification API
            String verificationUrl = RECAPTCHA_VERIFY_URL + "?secret=" + recaptchaSecretKey + "&response=" + token;
            String result = restTemplate.postForObject(verificationUrl, null, String.class);

            if (result == null || result.trim().isEmpty()) {
                logger.error("❌ reCAPTCHA: Empty response from Google API - API downtime or network issue");
                response.put("success", false);
                response.put("message", "Verification service temporarily unavailable");
                return response;
            }

            // Parse the response
            JsonNode jsonNode = objectMapper.readTree(result);

            // Check if response has required fields
            if (!jsonNode.has("success")) {
                logger.error("❌ reCAPTCHA: Malformed response from Google API - missing 'success' field");
                response.put("success", false);
                response.put("message", "Verification service error");
                return response;
            }

            boolean success = jsonNode.get("success").asBoolean();
            double score = jsonNode.has("score") ? jsonNode.get("score").asDouble() : 0.0;
            String action = jsonNode.has("action") ? jsonNode.get("action").asText() : "unknown";
            String challengeTs = jsonNode.has("challenge_ts") ? jsonNode.get("challenge_ts").asText() : "";
            String hostname = jsonNode.has("hostname") ? jsonNode.get("hostname").asText() : "";

            response.put("success", success);
            response.put("score", score);
            response.put("action", action);
            response.put("challenge_ts", challengeTs);
            response.put("hostname", hostname);

            // Production monitoring: Log all verification attempts
            if (!success) {
                logger.warn("⚠️  reCAPTCHA Verification Failed: success=false, action={}, hostname={}", action, hostname);
            } else if (score < scoreThreshold) {
                logger.warn("⚠️  reCAPTCHA Bot Detected: score={}, threshold={}, action={}", score, scoreThreshold, action);
            } else {
                logger.info("✓ reCAPTCHA Verification Success: score={}, threshold={}, action={}", score, scoreThreshold, action);
            }

            return response;

        } catch (RestClientException e) {
            logger.error("❌ reCAPTCHA API Error: Network or connection issue - {}", e.getClass().getSimpleName());
            response.put("success", false);
            response.put("message", "Verification service temporarily unavailable");
            return response;
        } catch (Exception e) {
            logger.error("❌ reCAPTCHA Verification Exception: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Verification service error");
            return response;
        }
    }

    /**
     * Checks if reCAPTCHA verification passed and score exceeds threshold.
     * Production-ready validation using configured threshold.
     * 
     * @param verificationResult The result from verifyToken()
     * @return true if verification passed and user is likely human (score >= threshold)
     */
    public boolean isValidScore(Map<String, Object> verificationResult) {
        Boolean success = (Boolean) verificationResult.get("success");
        Double score = (Double) verificationResult.get("score");

        // Defensive checks for null values
        if (success == null || score == null) {
            logger.error("❌ reCAPTCHA: Invalid verification result structure");
            return false;
        }

        boolean isValid = success && score >= scoreThreshold;
        
        // Log suspicious activity for security monitoring
        if (!isValid && success) {
            logger.warn("🤖 Suspicious Activity: Low reCAPTCHA score ({}) below threshold ({})", score, scoreThreshold);
        }
        
        return isValid;
    }

    /**
     * Overloaded method for backward compatibility and testing.
     * Allows custom threshold override for specific scenarios.
     */
    public boolean isValidScore(Map<String, Object> verificationResult, double customThreshold) {
        Boolean success = (Boolean) verificationResult.get("success");
        Double score = (Double) verificationResult.get("score");

        if (success == null || score == null) {
            return false;
        }

        return success && score >= customThreshold;
    }
}
