const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');
const { transformTaskWithTags } = require('../utils/taskHelpers');
const tagService = require('../services/tagService');
const { buildTaskUpdateQuery } = require('../utils/dynamicUpdate');

// All task routes require authentication
router.use(authMiddleware);

// Get all tasks for logged-in user
router.get('/', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    // Build WHERE clause - if cursor provided, add id filter
    const whereClause = cursor
      ? 'WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.id < ?'
      : 'WHERE t.user_id = ? AND t.deleted_at IS NULL';

    const params = cursor ? [req.user.id, cursor, limit + 1] : [req.user.id, limit + 1];

    const tasks = db.prepare(`
      SELECT
        t.id, t.title, t.description, t.completed, t.importance, t.urgency,
        t.why, t.deadline, t.parent_task_id, t.source_inbox_id,
        t.created_at, t.updated_at,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tag ON tt.tag_id = tag.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.id DESC
      LIMIT ?
    `).all(...params);

    const hasMore = tasks.length > limit;
    if (hasMore) tasks.pop(); // Remove the extra item

    const transformedTasks = tasks.map(transformTaskWithTags);
    const nextCursor = hasMore && tasks.length > 0 ? tasks[tasks.length - 1].id : null;

    res.json({
      success: true,
      tasks: transformedTasks,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_more: hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Get single task
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT
        t.id, t.title, t.description, t.completed, t.importance, t.urgency,
        t.why, t.deadline, t.parent_task_id, t.source_inbox_id,
        t.created_at, t.updated_at,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tag ON tt.tag_id = tag.id
      WHERE t.id = ? AND t.user_id = ? AND t.deleted_at IS NULL
      GROUP BY t.id
    `).get(req.params.id, req.user.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Transform the grouped tag data into arrays
    const transformedTask = transformTaskWithTags(task);

    res.json({
      success: true,
      task: transformedTask
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task'
    });
  }
});

// Create new task
router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').optional().trim(),
  body('why').optional().trim(),
  body('importance').optional().isInt({ min: 0, max: 1000000 }),
  body('urgency').optional().isInt({ min: 0, max: 1000000 }),
  body('deadline').optional().isISO8601(),
  body('parent_task_id').optional().isInt(),
  body('source_inbox_id').optional().isInt(),
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

    const {
      title, description, why, importance, urgency,
      deadline, parent_task_id, source_inbox_id, tags
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        user_id, title, description, why, importance, urgency,
        deadline, parent_task_id, source_inbox_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      sanitizeText(title),
      description ? sanitizeText(description) : null,
      why ? sanitizeText(why) : null,
      importance !== undefined ? importance : 500000,
      urgency !== undefined ? urgency : 500000,
      deadline || null,
      parent_task_id || null,
      source_inbox_id || null
    );

    const taskId = result.lastInsertRowid;

    // Handle tags if provided
    if (tags && tags.length > 0) {
      tagService.attachTagsToTask(taskId, tags, req.user.id);
    }

    // Fetch the created task with tags
    const task = db.prepare(`
      SELECT
        t.*,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tag ON tt.tag_id = tag.id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(taskId);

    // Transform tags
    const transformedTask = transformTaskWithTags(task);

    res.status(201).json({
      success: true,
      task: transformedTask
    });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

// Update task
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('completed').optional().isBoolean(),
  body('why').optional().trim(),
  body('importance').optional().isInt({ min: 0, max: 1000000 }),
  body('urgency').optional().isInt({ min: 0, max: 1000000 }),
  body('deadline').optional().isISO8601(),
  body('parent_task_id').optional().isInt(),
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

    // Check if task exists and belongs to user
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .get(id, req.user.id);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Build update query using dynamic update utility
    const { query, values, hasUpdates } = buildTaskUpdateQuery(
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

    // Update task fields if any
    if (hasUpdates) {
      db.prepare(query).run(...values);
    }

    // Handle tags update if provided
    if (req.body.tags !== undefined) {
      tagService.updateTaskTags(id, req.body.tags, req.user.id);
    }

    // Fetch updated task with tags
    const task = db.prepare(`
      SELECT
        t.*,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tag ON tt.tag_id = tag.id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(id);

    // Transform tags
    const transformedTask = transformTaskWithTags(task);

    res.json({
      success: true,
      task: transformedTask
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

// Toggle task completion
router.patch('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists and belongs to user
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .get(id, req.user.id);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Toggle completion status
    const newStatus = existingTask.completed ? 0 : 1;

    db.prepare(`
      UPDATE tasks
      SET completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(newStatus, id, req.user.id);

    // Fetch updated task
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found after update'
      });
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Error toggling task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle task'
    });
  }
});

// Delete task (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists and belongs to user
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .get(id, req.user.id);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Soft delete task
    db.prepare('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(id, req.user.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

module.exports = router;