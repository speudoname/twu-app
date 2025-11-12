const db = require('../database/db');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.postmarkClient = null;
    this.settings = null;
    this.loadSettings();
  }

  loadSettings() {
    try {
      const settings = db.prepare('SELECT * FROM email_settings WHERE id = 1').get();
      this.settings = settings;

      if (settings && settings.postmark_server_token) {
        const { ServerClient } = require('postmark');
        this.postmarkClient = new ServerClient(settings.postmark_server_token);
        console.log('Postmark client initialized');
      } else {
        console.log('Postmark not configured - emails will not be sent');
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  }

  async sendEmail(to, subject, htmlBody, textBody) {
    if (!this.postmarkClient || !this.settings) {
      console.log('Email would be sent to:', to);
      console.log('Subject:', subject);
      console.log('Body:', textBody || htmlBody);
      return { message: 'Email service not configured', simulated: true };
    }

    try {
      const result = await this.postmarkClient.sendEmail({
        From: `${this.settings.sender_name} <${this.settings.sender_email}>`,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        ReplyTo: this.settings.reply_to_email || this.settings.sender_email,
        MessageStream: this.settings.postmark_stream || 'outbound'
      });

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendVerificationEmail(user, token) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to TWU!</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>Welcome to TWU - Time Well Used!</p>
        <p>Please verify your email by clicking the link below:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationLink}"
             style="background-color: #4CAF50; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #666;">${verificationLink}</p>
        <p>This link expires in 24 hours.</p>
        <p>Best regards,<br>TWU Team</p>
      </div>
    `;

    const textBody = `
Hi ${user.name || 'there'},

Welcome to TWU - Time Well Used!

Please verify your email by clicking the link below:
${verificationLink}

This link expires in 24 hours.

Best regards,
TWU Team
    `;

    return this.sendEmail(user.email, 'Welcome to TWU!', htmlBody, textBody);
  }

  async sendPasswordResetEmail(user, token) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>You requested to reset your password. Click the link below:</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}"
             style="background-color: #2196F3; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>TWU Team</p>
      </div>
    `;

    const textBody = `
Hi ${user.name || 'there'},

You requested to reset your password. Click the link below:
${resetLink}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
TWU Team
    `;

    return this.sendEmail(user.email, 'Reset your password', htmlBody, textBody);
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createEmailToken(userId) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const stmt = db.prepare(`
      INSERT INTO email_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, token, expiresAt.toISOString());
    return token;
  }

  async createResetToken(userId) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing tokens for this user
    db.prepare('DELETE FROM reset_tokens WHERE user_id = ?').run(userId);

    const stmt = db.prepare(`
      INSERT INTO reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, token, expiresAt.toISOString());
    return token;
  }

  async verifyEmailToken(token) {
    const result = db.prepare(`
      SELECT et.*, u.* FROM email_tokens et
      JOIN users u ON et.user_id = u.id
      WHERE et.token = ? AND et.expires_at > datetime('now')
    `).get(token);

    if (!result) {
      return null;
    }

    // Mark user as verified
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(result.user_id);

    // Delete the used token
    db.prepare('DELETE FROM email_tokens WHERE token = ?').run(token);

    return result;
  }

  async verifyResetToken(token) {
    const result = db.prepare(`
      SELECT rt.*, u.* FROM reset_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = ? AND rt.expires_at > datetime('now')
    `).get(token);

    return result;
  }

  async useResetToken(token) {
    db.prepare('DELETE FROM reset_tokens WHERE token = ?').run(token);
  }

  // Method to refresh settings (useful for admin updates)
  refreshSettings() {
    this.loadSettings();
  }
}

module.exports = new EmailService();