const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');
const emailService = require('../services/email');

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
          postmark_server_token: '',
          postmark_stream: 'outbound',
          sender_email: '',
          sender_name: '',
          reply_to_email: ''
        }
      });
    }

    // Don't send the full token for security
    const maskedSettings = {
      ...settings,
      postmark_server_token: settings.postmark_server_token
        ? `${settings.postmark_server_token.substring(0, 8)}...`
        : ''
    };

    res.json({
      success: true,
      settings: maskedSettings
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
  body('reply_to_email').optional().isEmail()
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
      reply_to_email
    } = req.body;

    // Check if settings exist
    const existingSettings = db.prepare('SELECT id FROM email_settings WHERE id = 1').get();

    if (existingSettings) {
      // Build update query dynamically
      const updates = [];
      const values = [];

      if (postmark_server_token !== undefined && !postmark_server_token.includes('...')) {
        updates.push('postmark_server_token = ?');
        values.push(postmark_server_token);
      }

      if (postmark_stream !== undefined) {
        updates.push('postmark_stream = ?');
        values.push(postmark_stream);
      }

      if (sender_email !== undefined) {
        updates.push('sender_email = ?');
        values.push(sender_email);
      }

      if (sender_name !== undefined) {
        updates.push('sender_name = ?');
        values.push(sender_name);
      }

      if (reply_to_email !== undefined) {
        updates.push('reply_to_email = ?');
        values.push(reply_to_email);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');

        const updateQuery = `
          UPDATE email_settings
          SET ${updates.join(', ')}
          WHERE id = 1
        `;

        db.prepare(updateQuery).run(...values);
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
router.post('/test-email', [
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

    res.json({
      success: true,
      stats: {
        totalUsers: userCount.count,
        verifiedUsers: verifiedUserCount.count,
        totalTasks: taskCount.count,
        completedTasks: completedTaskCount.count
      }
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