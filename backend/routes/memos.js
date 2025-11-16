const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');
const { transformTaskWithTags } = require('../utils/taskHelpers');
const tagService = require('../services/tagService');
const { buildMemoUpdateQuery } = require('../utils/dynamicUpdate');

// All memo routes require authentication
router.use(authMiddleware);

/**
 * GET /api/memos
 * Get all memos for the authenticated user
 */
router.get('/', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    // Build WHERE clause - if cursor provided, add id filter
    const whereClause = cursor
      ? 'WHERE m.user_id = ? AND m.deleted_at IS NULL AND m.id < ?'
      : 'WHERE m.user_id = ? AND m.deleted_at IS NULL';

    const params = cursor ? [req.user.id, cursor, limit + 1] : [req.user.id, limit + 1];

    const memos = db.prepare(`
      SELECT
        m.id, m.title, m.content, m.details, m.source_inbox_id,
        m.created_at, m.updated_at,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM memos m
      LEFT JOIN memo_tags mt ON m.id = mt.memo_id
      LEFT JOIN tags tag ON mt.tag_id = tag.id
      ${whereClause}
      GROUP BY m.id
      ORDER BY m.id DESC
      LIMIT ?
    `).all(...params);

    const hasMore = memos.length > limit;
    if (hasMore) memos.pop(); // Remove the extra item

    const transformedMemos = memos.map(transformTaskWithTags);
    const nextCursor = hasMore && memos.length > 0 ? memos[memos.length - 1].id : null;

    res.json({
      success: true,
      memos: transformedMemos,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_more: hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching memos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch memos'
    });
  }
});

/**
 * GET /api/memos/:id
 * Get a single memo
 */
router.get('/:id', (req, res) => {
  try {
    const memo = db.prepare(`
      SELECT
        m.id, m.title, m.content, m.details, m.source_inbox_id,
        m.created_at, m.updated_at,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM memos m
      LEFT JOIN memo_tags mt ON m.id = mt.memo_id
      LEFT JOIN tags tag ON mt.tag_id = tag.id
      WHERE m.id = ? AND m.user_id = ? AND m.deleted_at IS NULL
      GROUP BY m.id
    `).get(req.params.id, req.user.id);

    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Memo not found'
      });
    }

    // Transform the grouped tag data into arrays
    const transformedMemo = transformTaskWithTags(memo);

    res.json({
      success: true,
      memo: transformedMemo
    });

  } catch (error) {
    console.error('Error fetching memo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch memo'
    });
  }
});

/**
 * POST /api/memos
 * Create a new memo
 */
router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('details').optional().trim(),
  body('tags').optional().isArray()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, content, details, tags } = req.body;

    const memoResult = db.prepare(`
      INSERT INTO memos (user_id, title, content, details)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, sanitizeText(title), sanitizeText(content), details ? sanitizeText(details) : null);

    const memoId = memoResult.lastInsertRowid;

    // Handle tags if provided
    if (tags && tags.length > 0) {
      tagService.attachTagsToMemo(memoId, tags, req.user.id);
    }

    // Fetch created memo with tags
    const memo = db.prepare(`
      SELECT
        m.*,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM memos m
      LEFT JOIN memo_tags mt ON m.id = mt.memo_id
      LEFT JOIN tags tag ON mt.tag_id = tag.id
      WHERE m.id = ?
      GROUP BY m.id
    `).get(memoId);

    // Transform tags
    const transformedMemo = transformTaskWithTags(memo);

    res.status(201).json({
      success: true,
      memo: transformedMemo
    });

  } catch (error) {
    console.error('Error creating memo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create memo'
    });
  }
});

/**
 * PUT /api/memos/:id
 * Update a memo
 */
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('details').optional().trim(),
  body('tags').optional().isArray()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Check if memo exists and belongs to user
    const existingMemo = db.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .get(id, req.user.id);

    if (!existingMemo) {
      return res.status(404).json({
        success: false,
        message: 'Memo not found'
      });
    }

    // Build update query using dynamic update utility
    const { query, values, hasUpdates } = buildMemoUpdateQuery(
      req.body,
      id,
      req.user.id,
      sanitizeText
    );

    // Check if there's anything to update
    if (!hasUpdates && req.body.tags === undefined) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Update memo fields if any
    if (hasUpdates) {
      db.prepare(query).run(...values);
    }

    // Handle tags update if provided
    if (req.body.tags !== undefined) {
      tagService.updateMemoTags(id, req.body.tags, req.user.id);
    }

    // Fetch updated memo with tags
    const memo = db.prepare(`
      SELECT
        m.*,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM memos m
      LEFT JOIN memo_tags mt ON m.id = mt.memo_id
      LEFT JOIN tags tag ON mt.tag_id = tag.id
      WHERE m.id = ?
      GROUP BY m.id
    `).get(id);

    // Transform tags
    const transformedMemo = transformTaskWithTags(memo);

    res.json({
      success: true,
      memo: transformedMemo
    });

  } catch (error) {
    console.error('Error updating memo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update memo'
    });
  }
});

/**
 * DELETE /api/memos/:id
 * Delete a memo (soft delete)
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if memo exists and belongs to user
    const existingMemo = db.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .get(id, req.user.id);

    if (!existingMemo) {
      return res.status(404).json({
        success: false,
        message: 'Memo not found'
      });
    }

    // Soft delete memo
    db.prepare('UPDATE memos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(id, req.user.id);

    res.json({
      success: true,
      message: 'Memo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting memo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete memo'
    });
  }
});

module.exports = router;
