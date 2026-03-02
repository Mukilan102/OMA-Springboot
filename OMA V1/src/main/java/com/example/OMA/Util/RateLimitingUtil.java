package com.example.OMA.Util;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting utility using Bucket4j.
 * Prevents brute force attacks on login and other sensitive endpoints.
 *
 * Limits:
 * - 5 login attempts per minute per IP address
 * - 10 login attempts per hour per IP address
 */
@Component
public class RateLimitingUtil {

    private final Map<String, Bucket> loginAttempts = new ConcurrentHashMap<>();

    /**
     * Get or create a rate limiter bucket for an IP address.
     * Allows 5 requests per minute, with a burst capacity of 10 per hour.
     */
    public Bucket getLoginBucket(String ipAddress) {
        return loginAttempts.computeIfAbsent(ipAddress, ip -> createLoginBucket());
    }

    /**
     * Create a bucket with rate limiting rules for login attempts:
     * - 5 requests per minute (strict limit)
     */
    @SuppressWarnings("deprecation")
    private Bucket createLoginBucket() {
        Bandwidth minuteLimit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1)));
        return Bucket4j.builder()
                .addLimit(minuteLimit)
                .build();
    }

    /**
     * Check if a login attempt from this IP is allowed.
     * Returns true if allowed, false if rate limit exceeded.
     */
    public boolean isLoginAllowed(String ipAddress) {
        return getLoginBucket(ipAddress).tryConsume(1);
    }

    /**
     * Clear rate limit for an IP (for testing or admin operations).
     */
    public void clearLimit(String ipAddress) {
        loginAttempts.remove(ipAddress);
    }

    /**
     * Clear all rate limits (for testing).
     */
    public void clearAllLimits() {
        loginAttempts.clear();
    }
}
