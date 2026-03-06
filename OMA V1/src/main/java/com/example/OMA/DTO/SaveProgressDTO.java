package com.example.OMA.DTO;

import java.util.Map;

/**
 * DTO for the bulk save-progress endpoint.
 * Receives the FULL responses map on every autosave, enabling idempotent UPSERT.
 *
 * {
 *   "sessionId":  "anon-...",
 *   "responses": {
 *     "1": 3,
 *     "2": [10, 12],
 *     "5": "Some free text",
 *     "7": {"1": 30, "2": 31}
 *   }
 * }
 */
public class SaveProgressDTO {

    private String sessionId;
    private Map<String, Object> responses;
    private Boolean consentGiven;
    private String consentAt;

    public SaveProgressDTO() {}

    public String getSessionId()                  { return sessionId; }
    public void   setSessionId(String sessionId)  { this.sessionId = sessionId; }

    public Map<String, Object> getResponses()                       { return responses; }
    public void                setResponses(Map<String, Object> r)  { this.responses = r; }

    public Boolean getConsentGiven()                         { return consentGiven; }
    public void    setConsentGiven(Boolean consentGiven)     { this.consentGiven = consentGiven; }

    public String getConsentAt()                             { return consentAt; }
    public void   setConsentAt(String consentAt)             { this.consentAt = consentAt; }
}
