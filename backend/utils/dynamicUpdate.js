/**
 * Dynamic Update Query Builder
 *
 * Safely builds UPDATE queries with dynamic fields while preventing SQL injection
 * by validating all field names against a whitelist.
 *
 * @example
 * const { buildUpdateQuery } = require('../utils/dynamicUpdate');
 *
 * const allowedFields = {
 *   'title': 'title',
 *   'description': 'description',
 *   'completed': 'completed'
 * };
 *
 * const { query, values } = buildUpdateQuery(
 *   'tasks',
 *   req.body,
 *   allowedFields,
 *   { id: taskId, user_id: req.user.id }
 * );
 *
 * db.prepare(query).run(...values);
 */

/**
 * Builds a dynamic UPDATE query with field validation
 *
 * @param {string} tableName - Name of the table to update
 * @param {object} data - Object containing fields to update
 * @param {object} allowedFields - Whitelist of allowed field names (for security)
 * @param {object} whereConditions - WHERE clause conditions (e.g., {id: 5, user_id: 10})
 * @param {object} options - Additional options
 * @param {boolean} options.addTimestamp - Whether to add updated_at = CURRENT_TIMESTAMP (default: true)
 * @param {function} options.sanitize - Optional sanitization function for text fields
 *
 * @returns {object} { query: string, values: array, hasUpdates: boolean }
 *
 * @throws {Error} If table name or where conditions are missing
 */
function buildUpdateQuery(tableName, data, allowedFields, whereConditions, options = {}) {
  // Validate required parameters
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('Table name is required and must be a string');
  }

  if (!whereConditions || typeof whereConditions !== 'object' || Object.keys(whereConditions).length === 0) {
    throw new Error('WHERE conditions are required');
  }

  // Default options
  const addTimestamp = options.addTimestamp !== undefined ? options.addTimestamp : true;
  const sanitize = options.sanitize || ((val) => val);

  // Build the SET clause
  const updates = [];
  const values = [];

  // Process each field in the data object
  for (const [fieldName, fieldValue] of Object.entries(data)) {
    // Skip undefined values (they weren't provided in the request)
    if (fieldValue === undefined) {
      continue;
    }

    // Validate field against whitelist to prevent SQL injection
    if (!allowedFields[fieldName]) {
      continue; // Skip non-whitelisted fields silently
    }

    // Get the actual column name (allows for field name mapping if needed)
    const columnName = allowedFields[fieldName];

    // Add to updates
    updates.push(`${columnName} = ?`);

    // Sanitize text values if sanitization function provided
    if (typeof fieldValue === 'string' && options.sanitize) {
      values.push(sanitize(fieldValue));
    } else {
      values.push(fieldValue);
    }
  }

  // If no valid fields to update, return early
  if (updates.length === 0) {
    return {
      query: null,
      values: [],
      hasUpdates: false
    };
  }

  // Add timestamp if requested
  if (addTimestamp) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
  }

  // Build WHERE clause
  const whereClause = [];
  const whereValues = [];

  for (const [columnName, columnValue] of Object.entries(whereConditions)) {
    whereClause.push(`${columnName} = ?`);
    whereValues.push(columnValue);
  }

  // Combine values: SET values first, then WHERE values
  const allValues = [...values, ...whereValues];

  // Construct the complete query
  const query = `
    UPDATE ${tableName}
    SET ${updates.join(', ')}
    WHERE ${whereClause.join(' AND ')}
  `;

  return {
    query: query.trim(),
    values: allValues,
    hasUpdates: true
  };
}

/**
 * Convenience function specifically for updating tasks
 * Pre-configured with common task field validations
 */
function buildTaskUpdateQuery(data, taskId, userId, sanitizeFn) {
  const allowedFields = {
    'title': 'title',
    'description': 'description',
    'completed': 'completed',
    'why': 'why',
    'importance': 'importance',
    'urgency': 'urgency',
    'deadline': 'deadline',
    'parent_task_id': 'parent_task_id'
  };

  return buildUpdateQuery(
    'tasks',
    data,
    allowedFields,
    { id: taskId, user_id: userId },
    { sanitize: sanitizeFn }
  );
}

/**
 * Convenience function specifically for updating memos
 * Pre-configured with common memo field validations
 */
function buildMemoUpdateQuery(data, memoId, userId, sanitizeFn) {
  const allowedFields = {
    'title': 'title',
    'content': 'content',
    'details': 'details'
  };

  return buildUpdateQuery(
    'memos',
    data,
    allowedFields,
    { id: memoId, user_id: userId },
    { sanitize: sanitizeFn }
  );
}

/**
 * Convenience function for updating email settings
 * Pre-configured for admin settings table
 */
function buildEmailSettingsUpdateQuery(data) {
  const allowedFields = {
    'postmark_server_token': 'postmark_server_token',
    'postmark_stream': 'postmark_stream',
    'sender_email': 'sender_email',
    'sender_name': 'sender_name',
    'reply_to_email': 'reply_to_email',
    'openai_api_key': 'openai_api_key'
  };

  return buildUpdateQuery(
    'email_settings',
    data,
    allowedFields,
    { id: 1 },
    { addTimestamp: true }
  );
}

module.exports = {
  buildUpdateQuery,
  buildTaskUpdateQuery,
  buildMemoUpdateQuery,
  buildEmailSettingsUpdateQuery
};
