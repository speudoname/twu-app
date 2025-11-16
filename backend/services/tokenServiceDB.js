const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../database/db');

// ============================================================================
// DATABASE-BACKED TOKEN SERVICE - PRODUCTION READY
// ============================================================================
// This replaces the in-memory token storage with database persistence
// Tokens survive server restarts and work across multiple instances
// ============================================================================

const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days

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
 */
async function generateTokenPair(userId, email, isAdmin = false, userAgent = null, ipAddress = null) {
  validateJwtSecret();

  // Generate tokens
  const accessToken = generateAccessToken(userId, email, isAdmin);
  const refreshToken = generateRefreshToken();

  // Hash the refresh token for storage (extra security)
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Store refresh token in database
  try {
    const stmt = db.prepare(`
      INSERT INTO refresh_tokens
      (user_id, token, token_hash, expires_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      refreshToken,
      tokenHash,
      expiresAt.toISOString(),
      userAgent,
      ipAddress
    );
  } catch (error) {
    throw new Error('Failed to store refresh token');
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 minutes in seconds
  };
}

/**
 * Verifies and decodes an access token
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
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Refresh token is required');
  }

  try {
    // Find token in database
    const tokenData = db.prepare(`
      SELECT rt.*, u.email, u.is_admin
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = ? AND rt.revoked = 0
    `).get(refreshToken);

    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Mark as revoked
      db.prepare('UPDATE refresh_tokens SET revoked = 1, revoked_at = CURRENT_TIMESTAMP WHERE token = ?')
        .run(refreshToken);
      throw new Error('Refresh token expired');
    }

    // Verify token hash
    const isValid = await bcrypt.compare(refreshToken, tokenData.token_hash);
    if (!isValid) {
      throw new Error('Invalid refresh token');
    }

    // Update last used timestamp
    db.prepare('UPDATE refresh_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = ?')
      .run(refreshToken);

    // Generate new access token
    const accessToken = generateAccessToken(
      tokenData.user_id,
      tokenData.email,
      tokenData.is_admin
    );

    return {
      accessToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  } catch (error) {
    if (error.message.includes('refresh token')) {
      throw error;
    }
    throw new Error('Failed to refresh token');
  }
}

/**
 * Revokes a refresh token (logout)
 */
function revokeRefreshToken(refreshToken) {
  try {
    const result = db.prepare(`
      UPDATE refresh_tokens
      SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
      WHERE token = ? AND revoked = 0
    `).run(refreshToken);

    return result.changes > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Revokes all refresh tokens for a user (logout all devices)
 */
function revokeAllUserTokens(userId) {
  try {
    const result = db.prepare(`
      UPDATE refresh_tokens
      SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked = 0
    `).run(userId);

    return result.changes;
  } catch (error) {
    return 0;
  }
}

/**
 * Cleans up expired refresh tokens (should run periodically)
 */
function cleanupExpiredTokens() {
  try {
    // Delete tokens that are either expired or revoked more than 30 days ago
    const result = db.prepare(`
      DELETE FROM refresh_tokens
      WHERE expires_at < datetime('now')
      OR (revoked = 1 AND revoked_at < datetime('now', '-30 days'))
    `).run();

    return result.changes;
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    return 0;
  }
}

/**
 * Gets statistics about stored tokens
 */
function getTokenStats() {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN revoked = 0 AND expires_at > datetime('now') THEN 1 END) as active,
        COUNT(CASE WHEN revoked = 1 THEN 1 END) as revoked,
        COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expired
      FROM refresh_tokens
    `).get();

    return stats || { total: 0, active: 0, revoked: 0, expired: 0 };
  } catch (error) {
    return { total: 0, active: 0, revoked: 0, expired: 0 };
  }
}

// Cleanup expired tokens every hour
setInterval(() => {
  const cleaned = cleanupExpiredTokens();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired refresh tokens`);
  }
}, 60 * 60 * 1000); // 1 hour

// Run cleanup on startup
setTimeout(() => {
  cleanupExpiredTokens();
}, 5000); // 5 seconds after startup

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