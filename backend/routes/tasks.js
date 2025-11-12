const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

// All task routes require authentication
router.use(authMiddleware);

// Get all tasks for logged-in user
router.get('/', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT id, title, description, completed, created_at, updated_at
      FROM tasks
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({
      success: true,
      tasks
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
      SELECT id, title, description, completed, created_at, updated_at
      FROM tasks
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
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
  body('description').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description } = req.body;

    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(req.user.id, title, description || null);

    // Fetch the created task
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      task
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
  body('completed').optional().isBoolean()
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
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (req.body.title !== undefined) {
      updates.push('title = ?');
      values.push(req.body.title);
    }

    if (req.body.description !== undefined) {
      updates.push('description = ?');
      values.push(req.body.description);
    }

    if (req.body.completed !== undefined) {
      updates.push('completed = ?');
      values.push(req.body.completed ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, req.user.id);

    const updateQuery = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    db.prepare(updateQuery).run(...values);

    // Fetch updated task
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.json({
      success: true,
      task
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
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
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

// Delete task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists and belongs to user
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete task
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.user.id);

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