const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');
const emailService = require('../services/email');
const { buildEmailSettingsUpdateQuery } = require('../utils/dynamicUpdate');
const auditLog = require('../services/auditLog');

// Email sending rate limiter (very strict to prevent spam)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 email sends per hour
  message: {
    success: false,
    message: 'Too many email requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin routes require both auth and admin privileges
router.use(authMiddleware);
router.use(adminAuthMiddleware);

// Get email settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM email_settings WHERE id = 1').get();

    if (!settings) {
      return res.json({
        success: true,
        settings: {
          has_postmark_token: false,
          has_openai_key: false,
          postmark_stream: 'outbound',
          sender_email: '',
          sender_name: '',
          reply_to_email: ''
        }
      });
    }

    // NEVER send any portion of API keys - only boolean flags
    const safeSettings = {
      has_postmark_token: !!settings.postmark_server_token,
      has_openai_key: !!settings.openai_api_key,
      postmark_stream: settings.postmark_stream || 'outbound',
      sender_email: settings.sender_email || '',
      sender_name: settings.sender_name || '',
      reply_to_email: settings.reply_to_email || ''
    };

    // Log admin action
    auditLog.log(req, auditLog.ACTIONS.VIEW, 'email_settings', 1);

    res.json({
      success: true,
      settings: safeSettings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update email settings
router.put('/settings', [
  body('postmark_server_token').optional().trim(),
  body('postmark_stream').optional().trim(),
  body('sender_email').optional().isEmail(),
  body('sender_name').optional().trim(),
  body('reply_to_email').optional().isEmail(),
  body('openai_api_key').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      postmark_server_token,
      postmark_stream,
      sender_email,
      sender_name,
      reply_to_email,
      openai_api_key
    } = req.body;

    // Check if settings exist
    const existingSettings = db.prepare('SELECT id FROM email_settings WHERE id = 1').get();

    if (existingSettings) {
      // Validate and prepare data for update
      const validatedData = {};

      // Validate postmark_server_token: real token, not empty, not masked, min 10 chars
      if (postmark_server_token !== undefined) {
        if (typeof postmark_server_token === 'string' &&
            postmark_server_token.trim() !== '' &&
            !postmark_server_token.includes('...') &&
            postmark_server_token.length >= 10) {
          validatedData.postmark_server_token = postmark_server_token.trim();
        }
      }

      // Validate postmark_stream: must be in allowed list
      if (postmark_stream !== undefined) {
        const allowedStreams = ['outbound', 'broadcast', 'transactional'];
        if (typeof postmark_stream === 'string' &&
            allowedStreams.includes(postmark_stream.toLowerCase())) {
          validatedData.postmark_stream = postmark_stream.toLowerCase();
        }
      }

      // Validate sender_email: email format, max 320 chars
      if (sender_email !== undefined) {
        const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (typeof sender_email === 'string' &&
            sender_email.length <= 320 &&
            emailRegex.test(sender_email)) {
          validatedData.sender_email = sender_email.toLowerCase().trim();
        }
      }

      // Validate sender_name: non-empty, max 100 chars
      if (sender_name !== undefined) {
        if (typeof sender_name === 'string' &&
            sender_name.length > 0 &&
            sender_name.length <= 100) {
          validatedData.sender_name = sender_name.trim();
        }
      }

      // Validate reply_to_email: email format, max 320 chars
      if (reply_to_email !== undefined) {
        const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (typeof reply_to_email === 'string' &&
            reply_to_email.length <= 320 &&
            emailRegex.test(reply_to_email)) {
          validatedData.reply_to_email = reply_to_email.toLowerCase().trim();
        }
      }

      // Validate openai_api_key: real key, not empty, not masked, min 10 chars
      if (openai_api_key !== undefined) {
        if (typeof openai_api_key === 'string' &&
            openai_api_key.trim() !== '' &&
            !openai_api_key.includes('...') &&
            openai_api_key.length >= 10) {
          validatedData.openai_api_key = openai_api_key.trim();
        }
      }

      // Build and execute update query using utility
      const { query, values, hasUpdates } = buildEmailSettingsUpdateQuery(validatedData);

      if (hasUpdates) {
        db.prepare(query).run(...values);
      }
    } else {
      // Insert new settings
      const stmt = db.prepare(`
        INSERT INTO email_settings (
          id, postmark_server_token, postmark_stream,
          sender_email, sender_name, reply_to_email
        ) VALUES (1, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        postmark_server_token || null,
        postmark_stream || 'outbound',
        sender_email || null,
        sender_name || null,
        reply_to_email || null
      );
    }

    // Refresh email service settings
    emailService.refreshSettings();

    // Log admin action
    auditLog.log(req, auditLog.ACTIONS.UPDATE_SETTINGS, 'email_settings', 1, {
      updatedFields: Object.keys(req.body).filter(k => req.body[k] !== undefined)
    });

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Test email configuration
router.post('/test-email', emailLimiter, [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test Email from TWU</h2>
        <p>This is a test email to verify your email configuration is working correctly.</p>
        <p>If you're receiving this email, your Postmark integration is properly configured!</p>
        <p>Settings used:</p>
        <ul>
          <li>Email service: Postmark</li>
          <li>Sent to: ${email}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>Best regards,<br>TWU Team</p>
      </div>
    `;

    const textBody = `
Test Email from TWU

This is a test email to verify your email configuration is working correctly.

If you're receiving this email, your Postmark integration is properly configured!

Settings used:
- Email service: Postmark
- Sent to: ${email}
- Timestamp: ${new Date().toISOString()}

Best regards,
TWU Team
    `;

    const result = await emailService.sendEmail(
      email,
      'TWU Test Email',
      htmlBody,
      textBody
    );

    // Log admin action
    auditLog.log(req, auditLog.ACTIONS.SEND_TEST_EMAIL, 'email', null, {
      recipient: email
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// Get dashboard statistics
router.get('/stats', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    const completedTaskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed = 1').get();
    const verifiedUserCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE email_verified = 1').get();

    const stats = {
      totalUsers: userCount.count,
      verifiedUsers: verifiedUserCount.count,
      totalTasks: taskCount.count,
      completedTasks: completedTaskCount.count
    };

    // Log admin action
    auditLog.log(req, auditLog.ACTIONS.VIEW_STATS, 'stats', null, stats);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Get all users (for admin dashboard)
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, name, email_verified, is_admin, created_at,
        (SELECT COUNT(*) FROM tasks WHERE user_id = users.id) as task_count
      FROM users
      ORDER BY created_at DESC
    `).all();

    // Log admin action
    auditLog.log(req, auditLog.ACTIONS.VIEW_USERS, 'users', null, {
      userCount: users.length
    });

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

module.exports = router;