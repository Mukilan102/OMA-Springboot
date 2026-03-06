package com.example.OMA.Model;

import jakarta.persistence.*;
import org.springframework.data.domain.Persistable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "survey_submission")
public class SurveySubmission implements Persistable<String> {

    @Id
    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "consent_given")
    private Boolean consentGiven;

    @Column(name = "consent_at")
    private Instant consentAt;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SurveyResponse> responses = new ArrayList<>();

    @Transient
    private boolean isNew = true;

    public SurveySubmission() {
        this.createdAt = Instant.now();
    }

    public SurveySubmission(String sessionId, Instant startedAt, Instant submittedAt) {
        this.sessionId = sessionId;
        this.startedAt = startedAt;
        this.submittedAt = submittedAt;
        this.createdAt = Instant.now();
    }

    @Override
    public String getId() { return sessionId; }

    @Override
    public boolean isNew() { return isNew; }

    @PostLoad
    @PostPersist
    void markNotNew() { this.isNew = false; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public List<SurveyResponse> getResponses() { return responses; }
    public void setResponses(List<SurveyResponse> responses) { this.responses = responses; }

    public Boolean getConsentGiven() { return consentGiven; }
    public void setConsentGiven(Boolean consentGiven) { this.consentGiven = consentGiven; }

    public Instant getConsentAt() { return consentAt; }
    public void setConsentAt(Instant consentAt) { this.consentAt = consentAt; }

    public void addResponse(SurveyResponse response) {
        responses.add(response);
        response.setSubmission(this);
    }
}
