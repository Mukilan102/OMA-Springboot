package com.example.OMA.Repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.OMA.Model.SurveySubmission;

@Repository
public interface SurveySubmissionRepo extends JpaRepository<SurveySubmission, String> {

    List<SurveySubmission> findAllByOrderBySubmittedAtDesc();

    /** Find all submitted sessions older than the given cutoff that haven't been anonymized yet. */
    @Query("SELECT s.sessionId FROM SurveySubmission s " +
           "WHERE s.submittedAt IS NOT NULL " +
           "AND s.submittedAt < :cutoff " +
           "AND s.sessionId NOT LIKE 'REDACTED-%'")
    List<String> findSessionIdsSubmittedBefore(@Param("cutoff") Instant cutoff);

    /**
     * Atomically anonymize a submission: replace session_id with an irreversible
     * anonymous value and nullify all temporal / consent fields.
     * Uses native SQL because JPA does not support changing an entity's primary key.
     */
    @Modifying
    @Query(value = "UPDATE survey_submission " +
            "SET session_id = :newSessionId, " +
            "    submitted_at = NULL, " +
            "    created_at = NULL, " +
            "    consent_given = false, " +
            "    consent_at = NULL " +
            "WHERE session_id = :oldSessionId",
            nativeQuery = true)
    int anonymizeSubmission(String oldSessionId, String newSessionId);
}
