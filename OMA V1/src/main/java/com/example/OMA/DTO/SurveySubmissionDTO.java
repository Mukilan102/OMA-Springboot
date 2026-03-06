package com.example.OMA.DTO;

import java.util.Map;

public class SurveySubmissionDTO {

    private String sessionId;
    private String startedAt;
    private String submittedAt;
    private Map<String, Object> responses;
    private Boolean consentGiven;
    private String consentAt;

    public SurveySubmissionDTO() {}

    public String getSessionId()                  { return sessionId; }
    public void   setSessionId(String sessionId)  { this.sessionId = sessionId; }

    public String getStartedAt()                  { return startedAt; }
    public void   setStartedAt(String startedAt)  { this.startedAt = startedAt; }

    public String getSubmittedAt()                    { return submittedAt; }
    public void   setSubmittedAt(String submittedAt)  { this.submittedAt = submittedAt; }

    public Map<String, Object> getResponses()                     { return responses; }
    public void                setResponses(Map<String, Object> r){ this.responses = r; }

    public Boolean getConsentGiven()                         { return consentGiven; }
    public void    setConsentGiven(Boolean consentGiven)     { this.consentGiven = consentGiven; }

    public String getConsentAt()                             { return consentAt; }
    public void   setConsentAt(String consentAt)             { this.consentAt = consentAt; }
}
