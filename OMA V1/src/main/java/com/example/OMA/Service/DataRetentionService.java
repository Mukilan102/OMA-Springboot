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
 * Automatically anonymizes survey data that exceeds the configured retention period.
 * Runs daily at 2:00 AM UTC.
 */
@Service
public class DataRetentionService {

    private static final Logger log = LoggerFactory.getLogger(DataRetentionService.class);

    private final SurveySubmissionRepo submissionRepo;
    private final SurveyService surveyService;

    @Value("${data.retention.days:90}")
    private int retentionDays;

    public DataRetentionService(SurveySubmissionRepo submissionRepo,
                                SurveyService surveyService) {
        this.submissionRepo = submissionRepo;
        this.surveyService = surveyService;
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void anonymizeExpiredSessions() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<String> expiredIds = submissionRepo.findSessionIdsSubmittedBefore(cutoff);

        if (expiredIds.isEmpty()) {
            log.info("Data retention: no sessions older than {} days found", retentionDays);
            return;
        }

        log.info("Data retention: anonymizing {} sessions older than {} days", expiredIds.size(), retentionDays);

        int success = 0;
        for (String sessionId : expiredIds) {
            try {
                surveyService.anonymizeSessionData(sessionId);
                success++;
            } catch (Exception e) {
                log.error("Data retention: failed to anonymize a session", e);
            }
        }

        log.info("Data retention: completed — {}/{} sessions anonymized", success, expiredIds.size());
    }
}
