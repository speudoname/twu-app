# TWU Security & Optimization Plan
**Created:** November 14, 2025
**Status:** IN PROGRESS
**Estimated Time:** 4-6 hours

## Overview
This document tracks all security vulnerabilities, performance issues, and code quality improvements identified in the comprehensive audit. Each item will be checked off as completed.

---

## PHASE 1: CRITICAL SECURITY (Must Fix Immediately)

### 1.1 Authentication & Secrets
- [x] **Generate secure JWT_SECRET** - Replace weak secret with 64-char random hex
- [x] **Remove hardcoded admin credentials** from .env file
- [x] **Move admin credentials to environment variables** or first-run setup
- [ ] **Remove exposed IP addresses** from configuration files
- [ ] **Implement secure secret management** for production

### 1.2 Token Storage
- [x] **Create refresh_tokens table** in database schema
- [x] **Migrate from in-memory Map to SQLite** for token storage
- [x] **Add token cleanup job** for expired tokens
- [x] **Implement token revocation** on logout

### 1.3 CSRF Protection
- [x] **Install csurf package** for CSRF tokens (created custom middleware)
- [x] **Add CSRF middleware** to Express
- [ ] **Update frontend** to include CSRF tokens in requests (NOTE: CSRF less critical with JWT auth)
- [ ] **Validate CSRF tokens** on all state-changing operations (NOTE: CSRF less critical with JWT auth)

### 1.4 Input Sanitization
- [x] **Fix tag sanitization in inbox.js** (line 306-316)
- [x] **Fix tag sanitization in tasks.js** tag loops
- [x] **Fix tag sanitization in memos.js** tag handling
- [x] **Add color validation** for hex color inputs
- [x] **Create validation helper** for color formats

---

## PHASE 2: HIGH PRIORITY SECURITY

### 2.1 Rate Limiting
- [ ] **Add rate limiting to /auth/refresh** endpoint
- [ ] **Add rate limiting to /admin/test-email** endpoint
- [ ] **Create email-specific rate limiter** (stricter limits)
- [ ] **Add rate limiting to file uploads**
- [ ] **Implement progressive delays** for failed attempts

### 2.2 Password Security
- [ ] **Add password complexity requirements** (uppercase, lowercase, number, special char)
- [ ] **Create password strength meter** for frontend
- [ ] **Implement password history** (prevent reuse)
- [ ] **Add password expiration** for admin accounts

### 2.3 Admin Security
- [ ] **Add pagination to /admin/users** endpoint
- [ ] **Implement admin action logging**
- [ ] **Add IP whitelisting** for admin routes
- [ ] **Create admin session timeout** (shorter than regular users)

### 2.4 API Security
- [ ] **Add input length limits** on all text fields
- [ ] **Implement request depth validation** for JSON
- [ ] **Add API versioning** for backward compatibility
- [ ] **Create API documentation** with security notes

---

## PHASE 3: PERFORMANCE OPTIMIZATIONS

### 3.1 Database Indexes
- [x] **Add index on tasks(user_id)**
- [x] **Add index on tasks(user_id, completed)**
- [x] **Add index on tasks(parent_task_id)**
- [x] **Add index on tasks(importance, urgency)**
- [x] **Add index on inbox(user_id)**
- [x] **Add index on inbox(status)**
- [x] **Add index on inbox(delayed_until)**
- [x] **Add index on memos(user_id)**
- [x] **Add index on tags(user_id)**
- [x] **Add index on email_tokens(token)**
- [x] **Add index on reset_tokens(token)**
- [x] **Add index on refresh_tokens(token)** (after creation)

### 3.2 Query Optimization
- [ ] **Fix N+1 problem in tag fetching** - batch load tags
- [x] **Add pagination to GET /tasks**
- [x] **Add pagination to GET /inbox**
- [x] **Add pagination to GET /memos**
- [ ] **Add pagination to GET /tags**
- [ ] **Implement cursor-based pagination** for large datasets
- [ ] **Add query result caching** for frequently accessed data

### 3.3 Code Performance
- [ ] **Batch tag operations** instead of loops
- [ ] **Implement connection pooling** for database
- [ ] **Add response compression** (gzip)
- [ ] **Implement lazy loading** for large resources

---

## PHASE 4: CODE QUALITY

### 4.1 Remove Duplications
- [x] **Extract tag transformation logic** to shared utility (used taskHelpers.transformTaskWithTags)
- [ ] **Create tagService.js** for tag operations
- [ ] **Extract GROUP_CONCAT query pattern** to helper
- [ ] **Create query builder utility** for dynamic queries
- [ ] **Consolidate validation rules** to central location

### 4.2 Error Handling
- [ ] **Add consistent error logging** with context
- [ ] **Handle database constraint violations** properly
- [ ] **Add file cleanup on errors** (finally blocks)
- [ ] **Create custom error classes** for different error types
- [ ] **Implement error recovery strategies**

### 4.3 Configuration
- [ ] **Update CORS configuration** for production
- [ ] **Add missing security headers** (X-Frame-Options, etc.)
- [ ] **Encrypt API keys** (OpenAI, Postmark) in database
- [ ] **Create environment-specific configs**
- [ ] **Add configuration validation** on startup

---

## PHASE 5: ROBUSTNESS FEATURES

### 5.1 Monitoring & Logging
- [ ] **Add request correlation IDs** for tracing
- [ ] **Implement structured logging** (JSON format)
- [ ] **Add performance monitoring** endpoints
- [ ] **Create health check endpoint**
- [ ] **Add metrics collection** (response times, error rates)

### 5.2 Resilience
- [ ] **Add circuit breaker** for external services
- [ ] **Implement retry logic** with exponential backoff
- [ ] **Add graceful degradation** for email service
- [ ] **Create fallback mechanisms** for critical features
- [ ] **Implement request timeout handling**

### 5.3 Data Management
- [ ] **Implement database backup strategy**
- [ ] **Add data retention policies**
- [ ] **Create data cleanup jobs** for old tokens
- [ ] **Implement soft delete** for important records
- [ ] **Add audit trail** for data changes

### 5.4 Email Service
- [ ] **Fix email verification enforcement**
- [ ] **Add email queue** for reliable delivery
- [ ] **Implement email templates** with versioning
- [ ] **Add bounce/complaint handling**
- [ ] **Create email analytics** tracking

---

## PHASE 6: FRONTEND SECURITY

### 6.1 Token Management
- [ ] **Consider httpOnly cookies** instead of localStorage
- [ ] **Implement token refresh strategy**
- [ ] **Add session timeout warnings**
- [ ] **Clear sensitive data on logout**

### 6.2 Security Headers
- [ ] **Add Content Security Policy**
- [ ] **Implement Subresource Integrity**
- [ ] **Add referrer policy**
- [ ] **Configure HTTPS redirect**

### 6.3 Input Validation
- [ ] **Add client-side validation** (complement server-side)
- [ ] **Sanitize displayed content**
- [ ] **Implement XSS prevention** in React
- [ ] **Add CAPTCHA** for public forms

---

## PHASE 7: TESTING & DOCUMENTATION

### 7.1 Security Testing
- [ ] **Add SQL injection tests**
- [ ] **Create XSS test suite**
- [ ] **Implement authentication tests**
- [ ] **Add rate limiting tests**
- [ ] **Create penetration test checklist**

### 7.2 Documentation
- [ ] **Create security runbook**
- [ ] **Document API endpoints**
- [ ] **Add deployment guide**
- [ ] **Create incident response plan**
- [ ] **Document backup procedures**

---

## PHASE 8: DEPLOYMENT PREPARATION

### 8.1 Production Config
- [ ] **Create .env.production template**
- [ ] **Set up environment variables** in Railway
- [ ] **Configure production database** (PostgreSQL)
- [ ] **Set up SSL certificates**
- [ ] **Configure CDN** for static assets

### 8.2 Monitoring Setup
- [ ] **Install Sentry** for error tracking
- [ ] **Set up uptime monitoring**
- [ ] **Configure alerting rules**
- [ ] **Create dashboard** for metrics
- [ ] **Set up log aggregation**

---

## Progress Tracking

| Phase | Items | Completed | Percentage |
|-------|-------|-----------|------------|
| Phase 1: Critical Security | 17 | 0 | 0% |
| Phase 2: High Priority | 16 | 0 | 0% |
| Phase 3: Performance | 24 | 0 | 0% |
| Phase 4: Code Quality | 15 | 1 | 7% |
| Phase 5: Robustness | 20 | 0 | 0% |
| Phase 6: Frontend | 12 | 0 | 0% |
| Phase 7: Testing | 10 | 0 | 0% |
| Phase 8: Deployment | 10 | 0 | 0% |
| **TOTAL** | **124** | **1** | **0.8%** |

---

## Implementation Order

1. **Day 1 (Today)**: Phase 1 & 2 - Critical and High Security
2. **Day 2**: Phase 3 - Performance Optimizations
3. **Day 3**: Phase 4 & 5 - Code Quality and Robustness
4. **Day 4**: Phase 6 & 7 - Frontend and Testing
5. **Day 5**: Phase 8 - Deployment Preparation

---

## Files to Modify

### Backend Files (Priority Order)
1. `/backend/.env` - Remove sensitive data
2. `/backend/database/schema.sql` - Add indexes and tables
3. `/backend/routes/tasks.js` - Fix sanitization, add pagination
4. `/backend/routes/inbox.js` - Fix sanitization, add pagination
5. `/backend/routes/memos.js` - Fix sanitization, add pagination
6. `/backend/routes/auth.js` - Add rate limiting, password validation
7. `/backend/routes/admin.js` - Add pagination, rate limiting
8. `/backend/services/tokenService.js` - Move to database
9. `/backend/server.js` - Add CSRF, security headers
10. `/backend/utils/` - Create new utility files

### Frontend Files
1. `/frontend/src/contexts/AuthContext.jsx` - Token management
2. `/frontend/src/services/api.js` - Add CSRF tokens
3. `/frontend/src/components/` - Add validation

### New Files to Create
1. `/backend/database/migrations/` - Database migrations
2. `/backend/utils/validators.js` - Validation helpers
3. `/backend/utils/queryBuilder.js` - Query utilities
4. `/backend/services/tagService.js` - Tag management
5. `/backend/middleware/csrf.js` - CSRF protection
6. `/backend/middleware/pagination.js` - Pagination helper
7. `/backend/jobs/cleanup.js` - Cleanup jobs
8. `/backend/config/` - Environment configs

---

## Success Criteria

- [ ] All critical vulnerabilities fixed
- [ ] No hardcoded secrets in codebase
- [ ] All endpoints have proper validation
- [ ] All list endpoints have pagination
- [ ] No code duplication (DRY principle)
- [ ] Comprehensive error handling
- [ ] Production-ready configuration
- [ ] Complete test coverage for security
- [ ] Documentation complete
- [ ] Zero high/critical vulnerabilities in security scan

---

## Notes

- Each item should be tested immediately after implementation
- Create git commits for each completed phase
- Run security audit after each phase
- Document any decisions or trade-offs
- Keep this file updated as work progresses

---

## Current Status Log

### November 14, 2025
- 📝 Plan created
- 🚀 Starting Phase 1: Critical Security
- ⏱️ Estimated completion: 4-6 hours for all phases

---

**Last Updated:** November 14, 2025 @ 10:30 AM