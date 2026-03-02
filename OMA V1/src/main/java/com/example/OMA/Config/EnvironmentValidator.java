package com.example.OMA.Config;

import org.springframework.boot.context.event.ApplicationContextInitializedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

/**
 * Validates that all required environment variables are set before application startup.
 * This ensures production safety by preventing the app from starting with missing secrets.
 */
@Component
public class EnvironmentValidator implements ApplicationListener<ApplicationContextInitializedEvent> {

    @Override
    public void onApplicationEvent(ApplicationContextInitializedEvent event) {
        validateRequiredEnvironmentVariables();
    }

    private void validateRequiredEnvironmentVariables() {
        String[] requiredEnvVars = {
            "JWT_SECRET",
            "DB_URL",
            "DB_USER",
            "DB_PASS",
            "RECAPTCHA_SECRET_KEY",
            "ALLOWED_ORIGINS"
        };

        StringBuilder missingVars = new StringBuilder();

        for (String envVar : requiredEnvVars) {
            String value = System.getenv(envVar);
            if (value == null || value.trim().isEmpty()) {
                missingVars.append("  - ").append(envVar).append("\n");
            }
        }

        if (missingVars.length() > 0) {
            throw new IllegalStateException(
                "❌ STARTUP FAILED: Required environment variables are not set:\n" +
                missingVars +
                "\n📋 Set these variables before running the application:\n" +
                "  source scripts/dev-env.sh  (for development)\n" +
                "  OR\n" +
                "  export JWT_SECRET=your-secret-key\n" +
                "  export DB_URL=jdbc:postgresql://...\n" +
                "  export DB_USER=...\n" +
                "  export DB_PASS=...\n" +
                "  export RECAPTCHA_SECRET_KEY=...\n" +
                "  export ALLOWED_ORIGINS=...\n" +
                "\n⚠️  DO NOT commit secrets to version control. Use secure secret management in production."
            );
        }
    }
}
