const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { transcribeAudio } = require('../services/whisper');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/audio/',
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// All inbox routes require authentication
router.use(authMiddleware);

/**
 * GET /api/inbox
 * Get all inbox items for the authenticated user
 */
router.get('/', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT id, content, source, created_at
      FROM inbox
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json(items);
  } catch (error) {
    console.error('Get inbox items error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox items' });
  }
});

/**
 * POST /api/inbox
 * Create a new inbox item (manual or voice)
 * Body: { content: string, source?: 'manual' | 'voice' }
 */
router.post('/', (req, res) => {
  try {
    const { content, source = 'manual' } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!['manual', 'voice'].includes(source)) {
      return res.status(400).json({ error: 'Source must be manual or voice' });
    }

    const result = db.prepare(`
      INSERT INTO inbox (user_id, content, source)
      VALUES (?, ?, ?)
    `).run(req.user.id, content.trim(), source);

    const newItem = db.prepare(`
      SELECT id, content, source, created_at
      FROM inbox
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Create inbox item error:', error);
    res.status(500).json({ error: 'Failed to create inbox item' });
  }
});

/**
 * PUT /api/inbox/:id
 * Update an inbox item's content
 * Body: { content: string }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Verify ownership
    const item = db.prepare(`
      SELECT id FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    db.prepare(`
      UPDATE inbox
      SET content = ?
      WHERE id = ?
    `).run(content.trim(), id);

    const updatedItem = db.prepare(`
      SELECT id, content, source, created_at
      FROM inbox
      WHERE id = ?
    `).get(id);

    res.json(updatedItem);
  } catch (error) {
    console.error('Update inbox item error:', error);
    res.status(500).json({ error: 'Failed to update inbox item' });
  }
});

/**
 * DELETE /api/inbox/:id
 * Delete an inbox item
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const item = db.prepare(`
      SELECT id FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    db.prepare('DELETE FROM inbox WHERE id = ?').run(id);

    res.json({ message: 'Inbox item deleted successfully' });
  } catch (error) {
    console.error('Delete inbox item error:', error);
    res.status(500).json({ error: 'Failed to delete inbox item' });
  }
});

/**
 * POST /api/inbox/:id/convert-to-task
 * Convert an inbox item to a task and optionally delete the inbox item
 * Body: { deleteAfterConvert?: boolean }
 */
router.post('/:id/convert-to-task', (req, res) => {
  try {
    const { id } = req.params;
    const { deleteAfterConvert = true } = req.body;

    // Get the inbox item
    const item = db.prepare(`
      SELECT id, content FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    // Create task from inbox content
    const taskResult = db.prepare(`
      INSERT INTO tasks (user_id, title, description, completed)
      VALUES (?, ?, '', 0)
    `).run(req.user.id, item.content);

    // Delete inbox item if requested
    if (deleteAfterConvert) {
      db.prepare('DELETE FROM inbox WHERE id = ?').run(id);
    }

    const newTask = db.prepare(`
      SELECT id, title, description, completed, created_at, updated_at
      FROM tasks
      WHERE id = ?
    `).get(taskResult.lastInsertRowid);

    res.status(201).json({
      task: newTask,
      inboxDeleted: deleteAfterConvert
    });
  } catch (error) {
    console.error('Convert to task error:', error);
    res.status(500).json({ error: 'Failed to convert inbox item to task' });
  }
});

/**
 * POST /api/inbox/transcribe
 * Transcribe audio file and create inbox item
 * Accepts: multipart/form-data with 'audio' field
 * Optional: language field (e.g., 'en', 'ka')
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { language } = req.body;

    // Transcribe the audio
    const transcribedText = await transcribeAudio(req.file.path, language);

    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({ error: 'Could not transcribe audio or audio was empty' });
    }

    // Create inbox item with transcribed text
    const result = db.prepare(`
      INSERT INTO inbox (user_id, content, source)
      VALUES (?, ?, 'voice')
    `).run(req.user.id, transcribedText.trim());

    const newItem = db.prepare(`
      SELECT id, content, source, created_at
      FROM inbox
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      item: newItem,
      transcribedText
    });
  } catch (error) {
    console.error('Transcription error:', error);

    if (error.message.includes('API key')) {
      return res.status(500).json({
        error: 'OpenAI API key not configured or invalid. Please configure it in admin settings.'
      });
    }

    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.message
    });
  }
});

module.exports = router;
