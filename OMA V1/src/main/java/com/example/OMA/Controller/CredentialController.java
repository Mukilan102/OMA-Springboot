package com.example.OMA.Controller;

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

import com.example.OMA.Model.Credentials;
import com.example.OMA.Service.CredentialService;
import com.example.OMA.Repository.CredentialsRepo;
import com.example.OMA.Util.JwtUtil;
import com.example.OMA.Util.RateLimitingUtil;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/credential")
public class CredentialController {
    
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
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Too many login attempts. Please try again in 1 minute.");
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(errorResponse);
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
            jwtCookie.setSecure(false);            // Set to true in production (HTTPS only)
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
    public ResponseEntity<?> logout(HttpServletResponse response) {
        try {
            // Clear JWT cookie by setting maxAge to 0
            Cookie jwtCookie = new Cookie("jwt", "");
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false);  // Set to true in production
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
    public String simple(){
        return "success";
    }
}
