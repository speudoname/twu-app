const crypto = require('crypto');

// ============================================================================
// CSRF PROTECTION MIDDLEWARE
// ============================================================================
// Implements double-submit cookie pattern for CSRF protection
// Since we use JWT tokens in Authorization header, CSRF risk is lower
// but we still protect state-changing operations for defense in depth
// ============================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a secure CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and validate CSRF tokens
 */
function csrfProtection(options = {}) {
  const {
    excludePaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'],
    cookie = {
      httpOnly: false, // Must be false so JavaScript can read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  } = options;

  return (req, res, next) => {
    // Skip CSRF check for excluded paths
    if (excludePaths.includes(req.path)) {
      return next();
    }

    // Skip CSRF for GET, HEAD, OPTIONS requests (safe methods)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate token if not exists
      if (!req.cookies[CSRF_COOKIE_NAME]) {
        const token = generateCSRFToken();
        res.cookie(CSRF_COOKIE_NAME, token, cookie);
      }
      return next();
    }

    // For state-changing requests (POST, PUT, DELETE, PATCH)
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] || req.body._csrf;

    // Check if tokens exist
    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token missing'
      });
    }

    // Validate tokens match
    if (cookieToken !== headerToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }

    // Tokens match, proceed
    next();
  };
}

/**
 * Middleware to provide CSRF token to views/responses
 */
function csrfToken() {
  return (req, res, next) => {
    // Make CSRF token available to views
    res.locals.csrfToken = () => {
      let token = req.cookies[CSRF_COOKIE_NAME];
      if (!token) {
        token = generateCSRFToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      }
      return token;
    };

    // Add method to get token
    req.csrfToken = () => {
      return req.cookies[CSRF_COOKIE_NAME] || '';
    };

    next();
  };
}

/**
 * Endpoint to get CSRF token for frontend
 */
function csrfTokenEndpoint(req, res) {
  let token = req.cookies[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateCSRFToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }

  res.json({
    success: true,
    csrfToken: token
  });
}

module.exports = {
  csrfProtection,
  csrfToken,
  csrfTokenEndpoint,
  generateCSRFToken
};