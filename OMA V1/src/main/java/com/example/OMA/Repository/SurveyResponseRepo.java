package com.example.OMA.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.OMA.Model.SurveyResponse;

@Repository
public interface SurveyResponseRepo extends JpaRepository<SurveyResponse, Long> {

    List<SurveyResponse> findBySubmissionSessionId(String sessionId);

    /** Delete all answer rows for a given session + question (before re-inserting). */
     @Modifying
     @Query("DELETE FROM SurveyResponse r WHERE r.submission.sessionId = :sessionId AND r.mainQuestionId = :mainQuestionId")
     void deleteBySessionIdAndMainQuestionId(String sessionId, Integer mainQuestionId);

    /** Delete ALL answer rows for a session (used by bulk save-progress). */
     @Modifying
     @Query("DELETE FROM SurveyResponse r WHERE r.submission.sessionId = :sessionId")
     void deleteBySubmissionSessionId(String sessionId);

    /**
     * Atomically update the FK session_id on all response rows and nullify free_text.
     * Part of the irreversible anonymization flow.
     */
    @Modifying
    @Query(value = "UPDATE survey_response " +
            "SET session_id = :newSessionId, " +
            "    free_text = NULL " +
            "WHERE session_id = :oldSessionId",
            nativeQuery = true)
    int anonymizeResponses(String oldSessionId, String newSessionId);
}
