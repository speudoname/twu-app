const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

// All tag routes require authentication
router.use(authMiddleware);

/**
 * GET /api/tags
 * Get all tags for the authenticated user
 */
router.get('/', (req, res) => {
  try {
    const tags = db.prepare(`
      SELECT id, name, color, created_at
      FROM tags
      WHERE user_id = ?
      ORDER BY name ASC
    `).all(req.user.id);

    res.json({
      success: true,
      tags
    });

  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags'
    });
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('color').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, color } = req.body;

    // Check if tag already exists for this user
    const existingTag = db.prepare(`
      SELECT id, name, color, created_at FROM tags
      WHERE user_id = ? AND name = ?
    `).get(req.user.id, name);

    if (existingTag) {
      // Return existing tag
      return res.json({
        success: true,
        tag: existingTag,
        existed: true
      });
    }

    // Create new tag
    const result = db.prepare(`
      INSERT INTO tags (user_id, name, color)
      VALUES (?, ?, ?)
    `).run(req.user.id, sanitizeText(name), color || '#667eea');

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);

    if (!tag) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve created tag'
      });
    }

    res.status(201).json({
      success: true,
      tag,
      existed: false
    });

  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tag'
    });
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag
 */
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1 }),
  body('color').optional().trim()
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
    const { name, color } = req.body;

    // Check if tag exists and belongs to user
    const existingTag = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Whitelist of allowed fields to prevent SQL injection
    const ALLOWED_FIELDS = {
      'name': 'name',
      'color': 'color'
    };

    // Build update query dynamically with field validation
    const updates = [];
    const values = [];

    if (name !== undefined && ALLOWED_FIELDS.name) {
      const sanitizedName = sanitizeText(name);

      // Check if another tag with this name already exists
      const duplicate = db.prepare(`
        SELECT id FROM tags
        WHERE user_id = ? AND name = ? AND id != ?
      `).get(req.user.id, sanitizedName, id);

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'A tag with this name already exists'
        });
      }

      updates.push('name = ?');
      values.push(sanitizedName);
    }

    if (color !== undefined && ALLOWED_FIELDS.color) {
      updates.push('color = ?');
      values.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id, req.user.id);

    const updateQuery = `
      UPDATE tags
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    db.prepare(updateQuery).run(...values);

    // Fetch updated tag
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found after update'
      });
    }

    res.json({
      success: true,
      tag
    });

  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tag'
    });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag exists and belongs to user
    const existingTag = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Delete tag (task_tags and memo_tags will be cascade deleted)
    db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, req.user.id);

    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tag'
    });
  }
});

module.exports = router;
