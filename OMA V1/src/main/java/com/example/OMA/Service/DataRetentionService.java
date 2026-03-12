package com.example.OMA.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import com.example.OMA.Repository.SurveySubmissionRepo;

/**
 * Automatically anonymizes survey data that exceeds the configured retention period
 * (default 730 days / 24 months). Runs daily at 2:00 AM UTC.
 *
 * Open-text responses are treated as personal data (respondents may voluntarily
 * include identifying details) and are deleted along with the session identifier
 * during anonymization. Structured response data (option selections, rankings)
 * is preserved in anonymized form for benchmarking and research.
 *
 * All job runs and individual deletion actions are audit-logged.
 */
@Service
public class DataRetentionService {

    private static final Logger log = LoggerFactory.getLogger(DataRetentionService.class);

    private final SurveySubmissionRepo submissionRepo;
    private final SurveyService surveyService;

    @Value("${data.retention.days:730}")
    private int retentionDays;

    public DataRetentionService(SurveySubmissionRepo submissionRepo,
                                SurveyService surveyService) {
        this.submissionRepo = submissionRepo;
        this.surveyService = surveyService;
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void anonymizeExpiredSessions() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        log.info("AUDIT retention-job started: cutoff={} (retention={}d)", cutoff, retentionDays);

        List<String> expiredIds = submissionRepo.findSessionIdsSubmittedBefore(cutoff);

        if (expiredIds.isEmpty()) {
            log.info("AUDIT retention-job finished: 0 sessions eligible for anonymization");
            return;
        }

        log.info("AUDIT retention-job: {} sessions eligible for anonymization", expiredIds.size());

        int success = 0;
        int failed = 0;
        for (String sessionId : expiredIds) {
            try {
                surveyService.anonymizeSessionData(sessionId);
                success++;
            } catch (Exception e) {
                failed++;
                log.error("AUDIT retention-job: failed to anonymize a session", e);
            }
        }

        log.info("AUDIT retention-job finished: {}/{} anonymized, {} failed",
                success, expiredIds.size(), failed);
    }
}
