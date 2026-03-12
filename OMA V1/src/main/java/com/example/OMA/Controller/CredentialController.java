package com.example.OMA.Controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
import org.springframework.web.client.RestClientException;

import com.example.OMA.Model.Credentials;
import com.example.OMA.Service.CredentialService;
import com.example.OMA.Repository.CredentialsRepo;
import com.example.OMA.Util.JwtUtil;
import com.example.OMA.Util.RateLimitingUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/credential")
public class CredentialController {
    
    private static final Logger logger = LoggerFactory.getLogger(CredentialController.class);
    private static final String BERT_MODEL_URL = "http://localhost:8000/health";

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;
    
    private final CredentialService credentialService;
    private final CredentialsRepo credentialsRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RateLimitingUtil rateLimitingUtil;
    
    public CredentialController(
            CredentialService credentialService, 
            CredentialsRepo credentialsRepo, 
            PasswordEncoder passwordEncoder, 
            JwtUtil jwtUtil,
            RateLimitingUtil rateLimitingUtil) {
        this.credentialService = credentialService;
        this.credentialsRepo = credentialsRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.rateLimitingUtil = rateLimitingUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody Credentials user) {
        credentialService.registerUser(user);
        return ResponseEntity.ok("User registered successfully");
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Credentials credentials, HttpServletRequest request, HttpServletResponse response) {
        try {
            // Get client IP address
            String clientIp = getClientIp(request);

            // Check rate limit (5 attempts per minute per IP)
            if (!rateLimitingUtil.isLoginAllowed(clientIp)) {
                long retrySeconds = rateLimitingUtil.getSecondsUntilRefill(clientIp);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Too many login attempts.");
                errorResponse.put("retryAfterSeconds", retrySeconds);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .header("Retry-After", String.valueOf(retrySeconds))
                        .body(errorResponse);
            }

            var existingUser = credentialsRepo.findByUsername(credentials.getUsername());
            
            if (existingUser.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
            }
            
            Credentials user = existingUser.get();
            
            // Verify password
            if (!passwordEncoder.matches(credentials.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
            }
            
            // Generate JWT token
            String token = jwtUtil.generateToken(user.getUsername());
            
            // Set JWT in httpOnly cookie using proper Cookie API
            Cookie jwtCookie = new Cookie("jwt", token);
            jwtCookie.setHttpOnly(true);           // Prevent JavaScript access (XSS protection)
            jwtCookie.setSecure(cookieSecure);     // HTTPS only when true (set via COOKIE_SECURE env var)
            jwtCookie.setPath("/");                // Available across entire app
            jwtCookie.setMaxAge(30 * 60);          // 30 minutes
            jwtCookie.setAttribute("SameSite", "Strict");  // CSRF protection
            response.addCookie(jwtCookie);
            
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("username", user.getUsername());
            responseBody.put("message", "Login successful");
            
            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Login failed");
        }
    }

    /**
     * Extract client IP address from request.
     * Handles X-Forwarded-For header for proxies and load balancers.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For can contain multiple IPs, get the first one (client IP)
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Extract JWT token from cookies
            Cookie[] cookies = request.getCookies();
            String token = null;
            
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("jwt".equals(cookie.getName())) {
                        token = cookie.getValue();
                        break;
                    }
                }
            }
            
            // If no JWT token found, return 401
            if (token == null || token.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("No JWT token found - already logged out");
            }
            
            // Validate JWT token
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid JWT token");
            }
            
            // Clear JWT cookie by setting maxAge to 0
            Cookie jwtCookie = new Cookie("jwt", "");
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(cookieSecure);
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(0);  // Immediately expire the cookie
            jwtCookie.setAttribute("SameSite", "Strict");
            response.addCookie(jwtCookie);
            
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("success", true);
            responseBody.put("message", "Logout successful");
            
            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Logout failed");
        }
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkAuth(HttpServletRequest request) {
        try {
            // Extract JWT token from cookies
            Cookie[] cookies = request.getCookies();
            String token = null;
            
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("jwt".equals(cookie.getName())) {
                        token = cookie.getValue();
                        break;
                    }
                }
            }
            
            // If no JWT token found, return 401
            if (token == null || token.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("No JWT token found");
            }
            
            // Validate JWT token
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid JWT token");
            }
            
            // Token is valid
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Authenticated");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication check failed");
        }
    }

    /**
     * Health check endpoint - verifies system status including BERT model server
     * Returns 200 OK with maintenance flag (never returns 5xx errors)
     */
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Map<String, Object> healthStatus = new HashMap<>();
        
        // Check BERT model server (with timeout and error handling)
        boolean bertHealthy = checkBertHealth();
        healthStatus.put("bertServer", bertHealthy ? "healthy" : "unavailable");
        
        // Always return 200 OK, just indicate status in body
        healthStatus.put("status", bertHealthy ? "healthy" : "degraded");
        healthStatus.put("maintenance", !bertHealthy);
        healthStatus.put("estimatedMaintenanceMinutes", 30);
        
        return ResponseEntity.ok(healthStatus);
    }

    /**
     * Check if BERT model server is reachable with timeout protection
     * Returns false gracefully if server is unreachable or times out
     */
    private boolean checkBertHealth() {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            
            // Create a factory with timeout
            org.springframework.http.client.SimpleClientHttpRequestFactory factory = 
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(2000);  // 2 second connection timeout
            factory.setReadTimeout(2000);     // 2 second read timeout
            restTemplate.setRequestFactory(factory);
            
            // Map<String, String> testRequest = new HashMap<>();
            // testRequest.put("text", "health");
            
            ResponseEntity<?> response = restTemplate.getForEntity(
                    BERT_MODEL_URL, 
                    String.class
            );
            
            // Return true only if response is 2xx
            return response.getStatusCode().is2xxSuccessful();
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            logger.debug("BERT server returned client error: {}", e.getStatusCode());
            return false;
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            logger.debug("BERT server returned server error: {}", e.getStatusCode());
            return false;
        } catch (org.springframework.web.client.ResourceAccessException e) {
            logger.debug("BERT server connection failed: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            logger.debug("BERT health check error: {}", e.getMessage());
            return false;
        }
    }
}
