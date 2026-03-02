# Production Deployment Guide - Security Hardening ✅

**Status**: Application is now production-ready with enhanced security features.

---

## Security Features Implemented

### 1. ✅ Rate Limiting
- **Login endpoint**: 5 attempts per minute per IP address
- **Protection**: Brute force attacks on credentials
- **Response**: 429 Too Many Requests after limit exceeded

### 2. ✅ reCAPTCHA v3 Verification
- **Threshold**: 0.5 (configurable for stricter/lenient bot detection)
- **Protection**: Bot/automated attack prevention
- **Dev Mode**: Can override with `RECAPTCHA_SCORE_THRESHOLD=0.0`

### 3. ✅ Security Headers
- **HSTS** (Strict-Transport-Security): Forces HTTPS for 1 year
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables browser XSS filtering
- **Content-Security-Policy**: Controls resource loading
- **X-Content-Type-Options**: Prevents MIME type sniffing

### 4. ✅ JWT Authentication
- **Algorithm**: HS256 with strong secret key
- **Expiration**: 30 minutes (configurable)
- **Storage**: httpOnly cookies (immune to XSS)
- **Validation**: Token verified on every authenticated request

### 5. ✅ Input Validation & Error Handling
- **reCAPTCHA**: Token validation on session start
- **Rate Limiting**: Per-IP tracking
- **Generic Error Messages**: No sensitive information leaked

---

## Production Deployment Checklist

### Step 1: Generate Secrets
```bash
# Generate strong JWT secret (256+ bits)
openssl rand -base64 32
# Output: example_jwt_secret_here

# Generate reCAPTCHA keys (from Google Cloud Console)
# https://www.google.com/recaptcha/admin
```

### Step 2: Set Environment Variables

```bash
# Required security variables
export JWT_SECRET="your-generated-secret-key"
export RECAPTCHA_SECRET_KEY="your-recaptcha-secret-from-google"
export RECAPTCHA_SCORE_THRESHOLD="0.5"  # Production: strict bot detection

# Database
export DB_URL="jdbc:postgresql://prod-db:5432/omav1"
export DB_USER="prod_user"
export DB_PASS="strong_database_password"

# Frontend origins (HTTPS only for production)
export ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Logging
export LOG_LEVEL_ROOT="WARN"
export LOG_LEVEL_OMA="INFO"
export SHOW_SQL="false"
export CACHE_TYPE="redis"  # Use Redis for distributed cache
```

### Step 3: SSL/TLS Configuration

```bash
# Ensure backend runs on HTTPS
# Use a reverse proxy (nginx, Apache) or Java keystore

# Example with self-signed certificate (testing only):
keytool -genkey -alias tomcat -storetype PKCS12 \
  -keyalg RSA -keysize 2048 \
  -keystore keystore.p12 -validity 3650

# application.properties
server.ssl.key-store=keystore.p12
server.ssl.key-store-password=password
server.ssl.key-store-type=PKCS12
server.port=8443
```

### Step 4: Start Application

```bash
# Option A: Direct execution
java -jar target/OMA-*.jar

# Option B: Background with nohup
nohup java -jar target/OMA-*.jar > app.log 2>&1 &

# Option C: Docker (recommended)
docker build -t oma-survey .
docker run -d \
  -e JWT_SECRET="$JWT_SECRET" \
  -e RECAPTCHA_SECRET_KEY="$RECAPTCHA_SECRET_KEY" \
  -e DB_URL="$DB_URL" \
  -e DB_USER="$DB_USER" \
  -e DB_PASS="$DB_PASS" \
  -e ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  -p 8443:8443 \
  oma-survey
```

---

## Security Verification

### Test Rate Limiting
```bash
# Make 6 rapid login attempts (should fail on 6th)
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/credential/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  echo ""
done

# Expected: First 5 succeed (or fail with auth error), 6th returns 429
```

### Test reCAPTCHA
```bash
# Should return 403 (bot detected) with invalid token
curl -X POST http://localhost:8080/api/survey/verify-session \
  -H "Content-Type: application/json" \
  -d '{"recaptchaToken":"invalid-token"}'

# Check server logs for threshold validation
```

### Test Security Headers
```bash
# Check HSTS header is present
curl -I https://yourdomain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Frame-Options: deny
# X-Content-Type-Options: nosniff
```

---

## Monitoring & Logs

### Key Metrics to Monitor

```bash
# Watch for rate limit hits
grep "Too many login attempts" app.log

# Watch for reCAPTCHA failures
grep "reCAPTCHA" app.log | grep -E "success=(false|true)" 

# Watch for security errors
grep -E "WARN|ERROR" app.log
```

### Log Rotation

```bash
# Configure logback-spring.xml for automatic log rotation
# Prevent disk space issues in production
```

---

## Troubleshooting

### Users Can't Login - Rate Limited
**Problem**: All login attempts are blocked with "Too many attempts"
**Solution**: 
- Check IP address behind proxy - ensure `X-Forwarded-For` header is set
- Clear rate limit cache (dev only): Restart application

### reCAPTCHA Always Fails
**Problem**: All users detected as bots
**Solution**:
- Check threshold: `RECAPTCHA_SCORE_THRESHOLD` should be 0.5 for production
- Check secret key: Verify `RECAPTCHA_SECRET_KEY` is correct
- Check frontend: Ensure reCAPTCHA script loads from correct origin

### SSL Certificate Errors
**Problem**: "HTTPS connection refused" or certificate validation errors
**Solution**:
- Use valid certificate from trusted CA (not self-signed in production)
- Configure `server.ssl.*` properties correctly
- Ensure firewall allows port 443

---

## Regular Maintenance

### Weekly
- Review security logs for suspicious activity
- Check rate limit metrics
- Verify database backups

### Monthly  
- Update Spring Security patches
- Review and rotate JWT secret (if needed)
- Audit access logs

### Quarterly
- Security vulnerability scan
- Penetration testing
- Update dependencies

---

## Next Steps

1. ✅ **Implement**: All security measures now in place
2. 🧪 **Test**: Run through the verification checklist above
3. 🚀 **Deploy**: Follow the production deployment steps
4. 📊 **Monitor**: Set up logging, alerting, and metrics
5. 🔄 **Maintain**: Regular security reviews and updates

---

**Questions?** Check the logs and error messages - they're now properly formatted for debugging.
