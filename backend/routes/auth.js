const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../database/db');
const emailService = require('../services/email');
const tokenService = require('../services/tokenServiceDB'); // Using database-backed token service

// Refresh token rate limiter
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow 20 token refreshes per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many token refresh attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().trim().isLength({ min: 1 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(email, hashedPassword, name || null);
    const userId = result.lastInsertRowid;

    // Create and send verification email
    try {
      const token = await emailService.createEmailToken(userId);
      const user = { id: userId, email, name };
      await emailService.sendVerificationEmail(user, token);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue - user is created, just email failed
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified (optional - can be disabled for development)
    if (process.env.NODE_ENV === 'production' && !user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Generate access and refresh tokens with user tracking
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const { accessToken, refreshToken, expiresIn } = await tokenService.generateTokenPair(
      user.id,
      user.email,
      user.is_admin,
      userAgent,
      ipAddress
    );

    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        email_verified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', refreshTokenLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Refresh access token (verifies refresh token and generates new access token)
    const result = await tokenService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
});

// Logout endpoint - revokes refresh token
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      tokenService.revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const startTime = Date.now();
  const MIN_RESPONSE_TIME = 500; // Minimum 500ms to prevent timing attacks

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Always perform the same operations to prevent timing attacks
    if (user) {
      // Create reset token and send email
      try {
        const token = await emailService.createResetToken(user.id);
        await emailService.sendPasswordResetEmail(user, token);
      } catch (emailError) {
        console.error('Error sending reset email:', emailError);
      }
    }

    // Ensure consistent response time to prevent timing attacks
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_RESPONSE_TIME - elapsedTime);

    await new Promise(resolve => setTimeout(resolve, remainingTime));

    // Always return the same response regardless of whether user exists
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    // Ensure consistent response time even on error
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_RESPONSE_TIME - elapsedTime);
    await new Promise(resolve => setTimeout(resolve, remainingTime));

    res.status(500).json({
      success: false,
      message: 'Failed to process request'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Verify token
    const tokenData = await emailService.verifyResetToken(token);

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashedPassword, tokenData.user_id);

    // Delete used token
    await emailService.useResetToken(token);

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Verify email endpoint
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await emailService.verifyEmailToken(token);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

module.exports = router;