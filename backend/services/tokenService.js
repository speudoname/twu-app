const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ============================================================================
// CRITICAL SECURITY FIX #13: Refresh Token System
// ============================================================================
//
// This service implements a dual-token authentication system:
// - Access Token: Short-lived (15 minutes), used for API requests
// - Refresh Token: Long-lived (7 days), used to get new access tokens
//
// This prevents stolen tokens from being valid for extended periods.
//
// USAGE:
//   const tokens = tokenService.generateTokenPair(userId, email);
//   const newAccess = tokenService.refreshAccessToken(refreshToken);
// ============================================================================

const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days

// In-memory store for refresh tokens (in production, use Redis or database)
// Structure: { refreshToken: { userId, email, issuedAt, expiresAt } }
const refreshTokenStore = new Map();

/**
 * Validates JWT secret is properly configured
 * @throws {Error} If JWT_SECRET is missing or weak
 */
function validateJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters for security');
  }
}

/**
 * Generates a cryptographically secure refresh token
 * @returns {string} Secure random token
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Generates an access token (short-lived JWT)
 *
 * @param {number} userId - User's database ID
 * @param {string} email - User's email
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {string} JWT access token
 */
function generateAccessToken(userId, email, isAdmin = false) {
  validateJwtSecret();

  const payload = {
    userId,
    email,
    isAdmin,
    type: 'access'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'twu-api',
    audience: 'twu-client'
  });
}

/**
 * Generates both access and refresh tokens
 *
 * @param {number} userId - User's database ID
 * @param {string} email - User's email
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {object} { accessToken, refreshToken, expiresIn }
 *
 * @example
 * const tokens = generateTokenPair(123, 'user@example.com');
 * // Returns: { accessToken: 'jwt...', refreshToken: 'hex...', expiresIn: 900 }
 */
function generateTokenPair(userId, email, isAdmin = false) {
  validateJwtSecret();

  // Generate access token
  const accessToken = generateAccessToken(userId, email, isAdmin);

  // Generate refresh token
  const refreshToken = generateRefreshToken();

  // Store refresh token metadata
  const now = Date.now();
  const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

  refreshTokenStore.set(refreshToken, {
    userId,
    email,
    isAdmin,
    issuedAt: now,
    expiresAt
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 minutes in seconds
  };
}

/**
 * Verifies and decodes an access token
 *
 * @param {string} token - JWT access token
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid, expired, or wrong type
 */
function verifyAccessToken(token) {
  validateJwtSecret();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'twu-api',
      audience: 'twu-client'
    });

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Refreshes an access token using a refresh token
 *
 * @param {string} refreshToken - The refresh token
 * @returns {object} { accessToken, expiresIn }
 * @throws {Error} If refresh token is invalid or expired
 *
 * @example
 * const newTokens = refreshAccessToken('abc123...');
 * // Returns: { accessToken: 'new-jwt...', expiresIn: 900 }
 */
function refreshAccessToken(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Refresh token is required');
  }

  // Check if refresh token exists in store
  const tokenData = refreshTokenStore.get(refreshToken);

  if (!tokenData) {
    throw new Error('Invalid refresh token');
  }

  // Check if refresh token has expired
  if (Date.now() > tokenData.expiresAt) {
    // Clean up expired token
    refreshTokenStore.delete(refreshToken);
    throw new Error('Refresh token expired');
  }

  // Generate new access token
  const accessToken = generateAccessToken(
    tokenData.userId,
    tokenData.email,
    tokenData.isAdmin
  );

  return {
    accessToken,
    expiresIn: 900 // 15 minutes in seconds
  };
}

/**
 * Revokes a refresh token (logout)
 *
 * @param {string} refreshToken - The refresh token to revoke
 * @returns {boolean} True if token was revoked
 */
function revokeRefreshToken(refreshToken) {
  return refreshTokenStore.delete(refreshToken);
}

/**
 * Revokes all refresh tokens for a user (logout all devices)
 *
 * @param {number} userId - User's database ID
 * @returns {number} Number of tokens revoked
 */
function revokeAllUserTokens(userId) {
  let count = 0;

  for (const [token, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) {
      refreshTokenStore.delete(token);
      count++;
    }
  }

  return count;
}

/**
 * Cleans up expired refresh tokens (should run periodically)
 * @returns {number} Number of tokens cleaned up
 */
function cleanupExpiredTokens() {
  let count = 0;
  const now = Date.now();

  for (const [token, data] of refreshTokenStore.entries()) {
    if (now > data.expiresAt) {
      refreshTokenStore.delete(token);
      count++;
    }
  }

  return count;
}

/**
 * Gets statistics about stored tokens
 * @returns {object} Token statistics
 */
function getTokenStats() {
  const now = Date.now();
  let activeCount = 0;
  let expiredCount = 0;

  for (const [token, data] of refreshTokenStore.entries()) {
    if (now > data.expiresAt) {
      expiredCount++;
    } else {
      activeCount++;
    }
  }

  return {
    total: refreshTokenStore.size,
    active: activeCount,
    expired: expiredCount
  };
}

// Cleanup expired tokens every hour
setInterval(() => {
  const cleaned = cleanupExpiredTokens();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired refresh tokens`);
  }
}, 60 * 60 * 1000); // 1 hour

module.exports = {
  generateTokenPair,
  generateAccessToken,
  verifyAccessToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  getTokenStats,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
