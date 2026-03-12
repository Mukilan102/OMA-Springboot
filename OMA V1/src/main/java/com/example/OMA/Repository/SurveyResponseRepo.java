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
     * Delete all free-text response rows for a session (personal data — may contain
     * voluntarily disclosed identifying details). Called before PK anonymization.
     * Deleting the whole row prevents null free_text from reaching the NLP model.
     */
    @Modifying
    @Query(value = "DELETE FROM survey_response WHERE session_id = :sessionId AND free_text IS NOT NULL",
            nativeQuery = true)
    int deleteFreeTextResponses(String sessionId);
}
