const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { transcribeAudio } = require('../services/whisper');
const { validateAudioFile, MAX_FILE_SIZE } = require('../utils/fileValidation');
const { sanitizeFilename, sanitizeText } = require('../utils/sanitize');
const { transformTaskWithTags } = require('../utils/taskHelpers');
const tagService = require('../services/tagService');

// Configure multer for file uploads with enhanced security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/audio/';
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      // Sanitize filename to prevent directory traversal
      const originalName = file.originalname || 'recording';
      const sanitizedName = sanitizeFilename(originalName);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      let ext = path.extname(sanitizedName);

      // If no extension, infer from MIME type (common with blob uploads)
      if (!ext) {
        const mimeToExt = {
          'audio/webm': '.webm',
          'audio/ogg': '.ogg',
          'audio/wav': '.wav',
          'audio/wave': '.wav',
          'audio/x-wav': '.wav',
          'audio/mp3': '.mp3',
          'audio/mpeg': '.mp3',
          'audio/mp4': '.m4a',
          'audio/m4a': '.m4a',
          'audio/x-m4a': '.m4a',
          'audio/flac': '.flac'
        };
        ext = mimeToExt[file.mimetype] || '.webm'; // default to .webm for browser recordings
      }

      cb(null, `audio-${uniqueSuffix}${ext}`);
    } catch (error) {
      console.error('Filename generation error:', error);
      // Fallback to simple naming if sanitization fails
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `audio-${uniqueSuffix}.webm`);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type check (will be validated further after upload)
    const allowedMimes = [
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/flac'
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
 * Query params: status ('active' | 'delayed' | 'all'), cursor, limit
 */
router.get('/', (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    // Build WHERE clause for status and cursor filters
    let whereClause = 'WHERE user_id = ?';
    if (status === 'active') {
      whereClause += ` AND (status = 'active' OR (status = 'delayed' AND delayed_until <= datetime('now')))`;
    } else if (status === 'delayed') {
      whereClause += ` AND status = 'delayed' AND delayed_until > datetime('now')`;
    }
    if (cursor) {
      whereClause += ' AND id < ?';
    }

    const params = cursor ? [req.user.id, cursor, limit + 1] : [req.user.id, limit + 1];

    const items = db.prepare(`
      SELECT id, content, source, status, delayed_until, created_at
      FROM inbox
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `).all(...params);

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    res.json({
      success: true,
      items,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_more: hasMore
      }
    });
  } catch (error) {
    console.error('Get inbox items error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inbox items' });
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
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    if (!['manual', 'voice'].includes(source)) {
      return res.status(400).json({ success: false, message: 'Source must be manual or voice' });
    }

    const result = db.prepare(`
      INSERT INTO inbox (user_id, content, source)
      VALUES (?, ?, ?)
    `).run(req.user.id, sanitizeText(content.trim()), source);

    const newItem = db.prepare(`
      SELECT id, content, source, created_at
      FROM inbox
      WHERE id = ?
    `).get(result.lastInsertRowid);

    if (!newItem) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve created inbox item'
      });
    }

    res.status(201).json({
      success: true,
      item: newItem
    });
  } catch (error) {
    console.error('Create inbox item error:', error);
    res.status(500).json({ success: false, message: 'Failed to create inbox item' });
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
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Verify ownership
    const item = db.prepare(`
      SELECT id FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inbox item not found' });
    }

    db.prepare(`
      UPDATE inbox
      SET content = ?
      WHERE id = ?
    `).run(sanitizeText(content.trim()), id);

    const updatedItem = db.prepare(`
      SELECT id, content, source, created_at
      FROM inbox
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      item: updatedItem
    });
  } catch (error) {
    console.error('Update inbox item error:', error);
    res.status(500).json({ success: false, message: 'Failed to update inbox item' });
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
      return res.status(404).json({ success: false, message: 'Inbox item not found' });
    }

    db.prepare('DELETE FROM inbox WHERE id = ?').run(id);

    res.json({ success: true, message: 'Inbox item deleted successfully' });
  } catch (error) {
    console.error('Delete inbox item error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete inbox item' });
  }
});

/**
 * POST /api/inbox/:id/convert-to-tasks
 * Convert an inbox item to one or more tasks
 * Body: {
 *   tasks: Array<{
 *     title: string,
 *     description?: string,
 *     why?: string,
 *     importance?: number (0-9),
 *     urgency?: number (0-9),
 *     deadline?: string (ISO8601),
 *     parent_task_id?: number,
 *     tags?: Array<string | {name: string, color?: string}>
 *   }>
 * }
 */
router.post('/:id/convert-to-tasks', (req, res) => {
  try {
    const { id } = req.params;
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'Tasks array is required' });
    }

    // Get the inbox item
    const item = db.prepare(`
      SELECT id, content FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inbox item not found' });
    }

    const createdTasks = [];

    // Create each task
    for (const task of tasks) {
      if (!task.title || task.title.trim() === '') {
        continue; // Skip tasks without title
      }

      const taskResult = db.prepare(`
        INSERT INTO tasks (
          user_id, title, description, why, importance, urgency,
          deadline, parent_task_id, source_inbox_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        task.title.trim(),
        task.description || null,
        task.why || null,
        task.importance !== undefined ? task.importance : 5,
        task.urgency !== undefined ? task.urgency : 5,
        task.deadline || null,
        task.parent_task_id || null,
        id
      );

      const taskId = taskResult.lastInsertRowid;

      // Handle tags if provided
      if (task.tags && task.tags.length > 0) {
        tagService.attachTagsToTask(taskId, task.tags, req.user.id);
      }

      // Fetch created task with tags
      const createdTask = db.prepare(`
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
      const transformedTask = transformTaskWithTags(createdTask);

      createdTasks.push(transformedTask);
    }

    // Delete inbox item after conversion
    db.prepare('DELETE FROM inbox WHERE id = ?').run(id);

    res.status(201).json({
      success: true,
      tasks: createdTasks,
      count: createdTasks.length
    });
  } catch (error) {
    console.error('Convert to tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to convert inbox item to tasks' });
  }
});

/**
 * POST /api/inbox/:id/convert-to-memo
 * Convert an inbox item to a memo
 * Body: {
 *   title: string,
 *   content: string,
 *   details?: string,
 *   tags?: Array<string | {name: string, color?: string}>
 * }
 */
router.post('/:id/convert-to-memo', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, details, tags } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Get the inbox item
    const item = db.prepare(`
      SELECT id FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inbox item not found' });
    }

    // Create memo
    const memoResult = db.prepare(`
      INSERT INTO memos (user_id, title, content, details, source_inbox_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, title.trim(), content.trim(), details || null, id);

    const memoId = memoResult.lastInsertRowid;

    // Handle tags if provided
    if (tags && tags.length > 0) {
      tagService.attachTagsToMemo(memoId, tags, req.user.id);
    }

    // Delete inbox item after conversion
    db.prepare('DELETE FROM inbox WHERE id = ?').run(id);

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
    console.error('Convert to memo error:', error);
    res.status(500).json({ success: false, message: 'Failed to convert inbox item to memo' });
  }
});

/**
 * POST /api/inbox/:id/delay
 * Delay an inbox item until a specific time
 * Body: {
 *   delayUntil: string (ISO8601 datetime)
 * }
 */
router.post('/:id/delay', (req, res) => {
  try {
    const { id } = req.params;
    const { delayUntil } = req.body;

    if (!delayUntil) {
      return res.status(400).json({ success: false, message: 'delayUntil is required' });
    }

    // Verify ownership
    const item = db.prepare(`
      SELECT id FROM inbox
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inbox item not found' });
    }

    // Update status and delayed_until
    db.prepare(`
      UPDATE inbox
      SET status = 'delayed', delayed_until = ?
      WHERE id = ?
    `).run(delayUntil, id);

    const updatedItem = db.prepare(`
      SELECT id, content, source, status, delayed_until, created_at
      FROM inbox
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      item: updatedItem
    });
  } catch (error) {
    console.error('Delay inbox item error:', error);
    res.status(500).json({ success: false, message: 'Failed to delay inbox item' });
  }
});

/**
 * POST /api/inbox/transcribe
 * Transcribe audio file and create inbox item
 * Accepts: multipart/form-data with 'audio' field
 * Optional: language field (e.g., 'en', 'ka')
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file provided' });
    }

    filePath = req.file.path;

    // Comprehensive file validation
    const validation = await validateAudioFile(req.file);
    if (!validation.valid) {
      console.error('File validation failed:', validation.error, 'File:', req.file);
      // Delete invalid file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ success: false, message: validation.error });
    }

    const { language } = req.body;

    // Transcribe the audio
    const transcribedText = await transcribeAudio(filePath, language);

    // Clean up uploaded file after transcription
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      filePath = null;
    }

    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({ success: false, message: 'Could not transcribe audio or audio was empty' });
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
      success: true,
      item: newItem,
      transcribedText
    });
  } catch (error) {
    console.error('Transcription error:', error);

    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured or invalid. Please configure it in admin settings.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio',
      details: error.message
    });
  }
});

module.exports = router;
