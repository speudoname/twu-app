const db = require('../database/db');
const { sanitizeInput } = require('../utils/sanitize');
const { validateLength } = require('../utils/sanitize');

// ============================================================================
// Tag Service
// ============================================================================
//
// This service eliminates code duplication by providing reusable functions
// for tag operations across tasks, inbox items, and memos.
//
// USAGE:
//   const tagService = require('./services/tagService');
//   await tagService.attachTagsToTask(taskId, tags, userId);
// ============================================================================

const DEFAULT_TAG_COLOR = '#667eea';
const MAX_TAG_NAME_LENGTH = 50;

/**
 * Normalizes tag input to consistent format
 * Handles both string tags ("React") and object tags ({name: "React", color: "#blue"})
 *
 * @param {string|object} tag - Tag input
 * @returns {object} Normalized tag with name and color
 */
function normalizeTag(tag) {
  if (typeof tag === 'string') {
    return {
      name: tag.trim(),
      color: DEFAULT_TAG_COLOR
    };
  }

  if (typeof tag === 'object' && tag.name) {
    return {
      name: tag.name.trim(),
      color: tag.color || DEFAULT_TAG_COLOR
    };
  }

  throw new Error('Invalid tag format');
}

/**
 * Inserts or gets existing tags for a user
 * Uses INSERT OR IGNORE to avoid duplicates, then SELECT to get IDs
 *
 * @param {array} tags - Array of tag objects/strings
 * @param {number} userId - User ID
 * @param {object} transaction - Optional database transaction
 * @returns {array} Array of tag records with IDs
 */
function ensureTagsExist(tags, userId, transaction = null) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return [];
  }

  const dbConn = transaction || db;

  const insertTagStmt = dbConn.prepare(`
    INSERT OR IGNORE INTO tags (user_id, name, color)
    VALUES (?, ?, ?)
  `);

  const getTagStmt = dbConn.prepare(`
    SELECT id, name, color FROM tags
    WHERE user_id = ? AND name = ?
  `);

  const tagRecords = [];

  for (const tag of tags) {
    try {
      // Normalize and validate tag
      const normalized = normalizeTag(tag);
      const sanitizedName = sanitizeInput(normalized.name);

      // Validate length
      validateLength(sanitizedName, { min: 1, max: MAX_TAG_NAME_LENGTH });

      // Insert or ignore if exists
      insertTagStmt.run(userId, sanitizedName, normalized.color);

      // Get the tag record
      const tagRecord = getTagStmt.get(userId, sanitizedName);

      // Verify tag exists after insert
      if (!tagRecord) {
        // This should never happen, but handle it gracefully
        console.error(`Race condition detected: Tag "${sanitizedName}" not found after INSERT OR IGNORE`);
        throw new Error(`Failed to create or retrieve tag: ${sanitizedName}`);
      }

      tagRecords.push(tagRecord);
    } catch (error) {
      console.error('Error processing tag:', error.message);
      // Continue with other tags even if one fails
    }
  }

  return tagRecords;
}

/**
 * Attaches tags to a task
 *
 * @param {number} taskId - Task ID
 * @param {array} tags - Array of tag objects/strings
 * @param {number} userId - User ID
 * @returns {array} Array of attached tag records
 */
function attachTagsToTask(taskId, tags, userId) {
  if (!taskId || !userId) {
    throw new Error('Task ID and User ID are required');
  }

  if (!tags || tags.length === 0) {
    return [];
  }

  // Use transaction for performance
  const transaction = db.transaction((tags) => {
    // Ensure tags exist and get their IDs
    const tagRecords = ensureTagsExist(tags, userId, db);

    // Link tags to task
    const linkStmt = db.prepare(`
      INSERT OR IGNORE INTO task_tags (task_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagRecord of tagRecords) {
      linkStmt.run(taskId, tagRecord.id);
    }

    return tagRecords;
  });

  return transaction(tags);
}

/**
 * Attaches tags to an inbox item
 *
 * @param {number} inboxId - Inbox item ID
 * @param {array} tags - Array of tag objects/strings
 * @param {number} userId - User ID
 * @returns {array} Array of attached tag records
 */
function attachTagsToInbox(inboxId, tags, userId) {
  if (!inboxId || !userId) {
    throw new Error('Inbox ID and User ID are required');
  }

  if (!tags || tags.length === 0) {
    return [];
  }

  // Use transaction for performance
  const transaction = db.transaction((tags) => {
    // Ensure tags exist and get their IDs
    const tagRecords = ensureTagsExist(tags, userId, db);

    // Link tags to inbox item
    const linkStmt = db.prepare(`
      INSERT OR IGNORE INTO inbox_tags (inbox_item_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagRecord of tagRecords) {
      linkStmt.run(inboxId, tagRecord.id);
    }

    return tagRecords;
  });

  return transaction(tags);
}

/**
 * Attaches tags to a memo
 *
 * @param {number} memoId - Memo ID
 * @param {array} tags - Array of tag objects/strings
 * @param {number} userId - User ID
 * @returns {array} Array of attached tag records
 */
function attachTagsToMemo(memoId, tags, userId) {
  if (!memoId || !userId) {
    throw new Error('Memo ID and User ID are required');
  }

  if (!tags || tags.length === 0) {
    return [];
  }

  // Use transaction for performance
  const transaction = db.transaction((tags) => {
    // Ensure tags exist and get their IDs
    const tagRecords = ensureTagsExist(tags, userId, db);

    // Link tags to memo
    const linkStmt = db.prepare(`
      INSERT OR IGNORE INTO memo_tags (memo_id, tag_id)
      VALUES (?, ?)
    `);

    for (const tagRecord of tagRecords) {
      linkStmt.run(memoId, tagRecord.id);
    }

    return tagRecords;
  });

  return transaction(tags);
}

/**
 * Updates tags for a task (removes old, adds new)
 *
 * @param {number} taskId - Task ID
 * @param {array} tags - Array of new tag objects/strings
 * @param {number} userId - User ID
 * @returns {array} Array of attached tag records
 */
function updateTaskTags(taskId, tags, userId) {
  if (!taskId || !userId) {
    throw new Error('Task ID and User ID are required');
  }

  // Use transaction for atomicity
  const transaction = db.transaction((tags) => {
    // Remove existing tags
    const deleteStmt = db.prepare(`
      DELETE FROM task_tags WHERE task_id = ?
    `);
    deleteStmt.run(taskId);

    // Add new tags if provided
    if (tags && tags.length > 0) {
      return attachTagsToTask(taskId, tags, userId);
    }

    return [];
  });

  return transaction(tags || []);
}

/**
 * Updates tags for an inbox item
 *
 * @param {number} inboxId - Inbox item ID
 * @param {array} tags - Array of new tag objects/strings
 * @param {number} userId - User ID
 * @returns {array} Array of attached tag records
 */
function updateInboxTags(inboxId, tags, userId) {
  if (!inboxId || !userId) {
    throw new Error('Inbox ID and User ID are required');
  }

  // Use transaction for atomicity
  const transaction = db.transaction((tags) => {
    // Remove existing tags
    const deleteStmt = db.prepare(`
      DELETE FROM inbox_tags WHERE inbox_item_id = ?
    `);
    deleteStmt.run(inboxId);

    // Add new tags if provided
    if (tags && tags.length > 0) {
      return attachTagsToInbox(inboxId, tags, userId);
    }

    return [];
  });

  return transaction(tags || []);
}

/**
 * Updates tags for a memo
 *
 * @param {number} memoId - Memo ID
 * @param {array} tags - Array of new tag objects/strings
 * @param {number} userId - User ID
 * @returns {array} Array of attached tag records
 */
function updateMemoTags(memoId, tags, userId) {
  if (!memoId || !userId) {
    throw new Error('Memo ID and User ID are required');
  }

  // Use transaction for atomicity
  const transaction = db.transaction((tags) => {
    // Remove existing tags
    const deleteStmt = db.prepare(`
      DELETE FROM memo_tags WHERE memo_id = ?
    `);
    deleteStmt.run(memoId);

    // Add new tags if provided
    if (tags && tags.length > 0) {
      return attachTagsToMemo(memoId, tags, userId);
    }

    return [];
  });

  return transaction(tags || []);
}

/**
 * Gets all tags for a user
 *
 * @param {number} userId - User ID
 * @returns {array} Array of tag records
 */
function getUserTags(userId) {
  const stmt = db.prepare(`
    SELECT id, name, color, created_at
    FROM tags
    WHERE user_id = ?
    ORDER BY name ASC
  `);

  return stmt.all(userId);
}

/**
 * Deletes unused tags for a user
 * Removes tags that are not linked to any task, inbox item, or memo
 *
 * @param {number} userId - User ID
 * @returns {number} Number of tags deleted
 */
function cleanupUnusedTags(userId) {
  const stmt = db.prepare(`
    DELETE FROM tags
    WHERE user_id = ?
    AND id NOT IN (
      SELECT DISTINCT tag_id FROM task_tags
      UNION
      SELECT DISTINCT tag_id FROM inbox_tags
      UNION
      SELECT DISTINCT tag_id FROM memo_tags
    )
  `);

  const result = stmt.run(userId);
  return result.changes;
}

module.exports = {
  attachTagsToTask,
  attachTagsToInbox,
  attachTagsToMemo,
  updateTaskTags,
  updateInboxTags,
  updateMemoTags,
  getUserTags,
  cleanupUnusedTags,
  ensureTagsExist, // Exported for direct use in complex scenarios
  MAX_TAG_NAME_LENGTH
};
