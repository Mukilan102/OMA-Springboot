package com.example.OMA.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000}")
    private String allowedOriginsStr;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        
        // Parse allowed origins from config (handle spaces)
        List<String> allowedOrigins = Arrays.asList(allowedOriginsStr.split(","));
        for (int i = 0; i < allowedOrigins.size(); i++) {
            allowedOrigins.set(i, allowedOrigins.get(i).trim());
        }
        corsConfiguration.setAllowedOrigins(allowedOrigins); 

        // Allow ALL headers including Authorization for JWT
        corsConfiguration.setAllowedHeaders(Arrays.asList("*"));

        // Expose Authorization and Content-Type headers
        corsConfiguration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));

        // Allow credentials (cookies, auth headers)
        corsConfiguration.setAllowCredentials(true);

        // Allow all common HTTP methods
        corsConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Cache preflight requests for 1 hour
        corsConfiguration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource urlBasedCorsConfigurationSource = new UrlBasedCorsConfigurationSource();
        urlBasedCorsConfigurationSource.registerCorsConfiguration("/**", corsConfiguration);
        
        return new CorsFilter(urlBasedCorsConfigurationSource);
    }
}

