const db = require('../database/db');

/**
 * Audit Logging Service
 *
 * Tracks admin and critical user actions for security and compliance
 *
 * USAGE:
 *   const auditLog = require('../services/auditLog');
 *   auditLog.log(req, 'UPDATE_SETTINGS', 'email_settings', 1, { fields: ['sender_email'] });
 */

/**
 * Standard action types for consistency
 */
const ACTIONS = {
  // Auth actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Admin actions
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  VIEW_USERS: 'VIEW_USERS',
  VIEW_STATS: 'VIEW_STATS',
  SEND_TEST_EMAIL: 'SEND_TEST_EMAIL',

  // Resource actions
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW: 'VIEW'
};

/**
 * Logs an action to the audit trail
 *
 * @param {object} req - Express request object (contains user and IP info)
 * @param {string} action - Action type (use ACTIONS constants)
 * @param {string} resourceType - Type of resource (e.g., 'task', 'user', 'settings')
 * @param {number} resourceId - ID of the resource (optional)
 * @param {object} details - Additional details about the action (optional)
 */
function log(req, action, resourceType, resourceId = null, details = null) {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      action,
      resourceType,
      resourceId,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent
    );
  } catch (error) {
    // Don't throw - audit logging should never break the app
    console.error('Audit log error:', error);
  }
}

/**
 * Retrieves audit logs with optional filtering
 *
 * @param {object} filters - Filter options
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.resourceType - Filter by resource type
 * @param {number} filters.resourceId - Filter by resource ID
 * @param {number} filters.limit - Max results (default 100)
 * @param {number} filters.offset - Offset for pagination (default 0)
 * @returns {array} Array of audit log entries
 */
function getLogs(filters = {}) {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    limit = 100,
    offset = 0
  } = filters;

  let query = `
    SELECT al.*, u.email as user_email, u.name as user_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (userId) {
    query += ' AND al.user_id = ?';
    params.push(userId);
  }

  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }

  if (resourceType) {
    query += ' AND al.resource_type = ?';
    params.push(resourceType);
  }

  if (resourceId) {
    query += ' AND al.resource_id = ?';
    params.push(resourceId);
  }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

/**
 * Gets a count of audit logs (for pagination)
 *
 * @param {object} filters - Same filters as getLogs
 * @returns {number} Total count
 */
function getCount(filters = {}) {
  const {
    userId,
    action,
    resourceType,
    resourceId
  } = filters;

  let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
  const params = [];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  if (resourceType) {
    query += ' AND resource_type = ?';
    params.push(resourceType);
  }

  if (resourceId) {
    query += ' AND resource_id = ?';
    params.push(resourceId);
  }

  const result = db.prepare(query).get(...params);
  return result.count;
}

module.exports = {
  log,
  getLogs,
  getCount,
  ACTIONS
};
