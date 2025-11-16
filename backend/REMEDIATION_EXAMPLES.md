# Code Remediation Examples

This document provides before/after code examples for the most critical issues.

---

## Issue 1.1: Migrate Tag Handling to Service

### BEFORE (Current - Duplicated in 6 locations)
**File: `/routes/tasks.js` lines 154-180**

```javascript
// Handle tags if provided
if (tags && tags.length > 0) {
  const insertTagStmt = db.prepare(`
    INSERT OR IGNORE INTO tags (user_id, name, color)
    VALUES (?, ?, ?)
  `);
  const getTagStmt = db.prepare(`
    SELECT id FROM tags WHERE user_id = ? AND name = ?
  `);
  const linkTagStmt = db.prepare(`
    INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)
  `);

  for (const tag of tags) {
    const tagName = sanitizeTagName(typeof tag === 'string' ? tag : tag.name);
    const tagColor = sanitizeColor(typeof tag === 'object' ? tag.color : '#667eea');

    if (!tagName) continue; // Skip empty/invalid tags

    // Insert or get existing tag
    insertTagStmt.run(req.user.id, tagName, tagColor);
    const tagRecord = getTagStmt.get(req.user.id, tagName);

    // Link tag to task
    if (tagRecord) {
      linkTagStmt.run(taskId, tagRecord.id);
    }
  }
}
```

### AFTER (With tagService)
**File: `/routes/tasks.js` lines 154-180 → REDUCED TO 3 LINES**

```javascript
// Handle tags if provided
if (tags && tags.length > 0) {
  tagService.attachTagsToTask(taskId, tags, req.user.id);
}
```

**Add at top of file**:
```javascript
const tagService = require('../services/tagService');
```

**That's it!** Same functionality, 27 fewer lines, centralized logic.

---

## Issue 4.1: Add Transactions to Critical Operations

### BEFORE (Current - Data corruption risk)
**File: `/routes/tasks.js` lines 131-195**

```javascript
// Create new task
router.post('/', [...validators...], (req, res) => {
  try {
    // Step 1: Insert task
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
      // ... other fields
    );

    const taskId = result.lastInsertRowid;

    // Step 2-N: Handle tags (inline, separate queries)
    if (tags && tags.length > 0) {
      // 27 lines of tag handling
      // If this fails or server crashes, task exists without tags!
    }

    // PROBLEM: If any step above fails mid-way, 
    // task exists in database without tags, partial state!

    // Fetch and return created task
    const task = db.prepare(...).get(taskId);
    res.status(201).json({ success: true, task });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});
```

### AFTER (With transactions)
**File: `/routes/tasks.js` lines 131-195**

```javascript
router.post('/', [...validators...], (req, res) => {
  try {
    // Wrap entire operation in transaction
    const transaction = db.transaction((data) => {
      // Step 1: Insert task
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
        // ... other fields
      );

      const taskId = result.lastInsertRowid;

      // Step 2: Attach tags using service (also uses transaction internally)
      if (data.tags && data.tags.length > 0) {
        tagService.attachTagsToTask(taskId, data.tags, req.user.id);
      }

      // All operations within transaction - either all succeed or all rollback
      return taskId;
    });

    // Execute transaction
    const taskId = transaction({ tags });

    // Fetch and return created task (guaranteed to have tags if provided)
    const task = db.prepare(`
      SELECT t.*,
        GROUP_CONCAT(tag.id) as tag_ids,
        GROUP_CONCAT(tag.name) as tag_names,
        GROUP_CONCAT(tag.color) as tag_colors
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tag ON tt.tag_id = tag.id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(taskId);

    const transformedTask = transformTaskWithTags(task);

    res.status(201).json({ success: true, task: transformedTask });

  } catch (error) {
    console.error('Error creating task:', error);
    // Transaction automatically rolled back on error
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});
```

**Key differences**:
1. Wrap all operations in `db.transaction()`
2. If ANY operation fails, entire transaction rolls back
3. No orphaned tasks without tags possible
4. Server crash = automatic rollback

---

## Issue 3.1: Extract Dynamic SQL Building

### BEFORE (Duplicated in 3 files)
**File: `/routes/tasks.js` lines 260-322**

```javascript
// Build update query dynamically with field validation
const updates = [];
const values = [];

if (req.body.title !== undefined && ALLOWED_FIELDS.title) {
  updates.push('title = ?');
  values.push(sanitizeText(req.body.title));
}

if (req.body.description !== undefined && ALLOWED_FIELDS.description) {
  updates.push('description = ?');
  values.push(sanitizeText(req.body.description));
}

if (req.body.completed !== undefined && ALLOWED_FIELDS.completed) {
  updates.push('completed = ?');
  values.push(req.body.completed ? 1 : 0);
}

if (req.body.why !== undefined && ALLOWED_FIELDS.why) {
  updates.push('why = ?');
  values.push(sanitizeText(req.body.why));
}

if (req.body.importance !== undefined && ALLOWED_FIELDS.importance) {
  updates.push('importance = ?');
  values.push(req.body.importance);
}

if (req.body.urgency !== undefined && ALLOWED_FIELDS.urgency) {
  updates.push('urgency = ?');
  values.push(req.body.urgency);
}

if (req.body.deadline !== undefined && ALLOWED_FIELDS.deadline) {
  updates.push('deadline = ?');
  values.push(req.body.deadline);
}

if (req.body.parent_task_id !== undefined && ALLOWED_FIELDS.parent_task_id) {
  updates.push('parent_task_id = ?');
  values.push(req.body.parent_task_id);
}

if (updates.length === 0 && req.body.tags === undefined) {
  return res.status(400).json({
    success: false,
    message: 'No fields to update'
  });
}

// Update task fields if any
if (updates.length > 0) {
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, req.user.id);

  const updateQuery = `
    UPDATE tasks
    SET ${updates.join(', ')}
    WHERE id = ? AND user_id = ?
  `;

  db.prepare(updateQuery).run(...values);
}
```

### AFTER (Centralized utility)
**New File: `/utils/dynamicUpdate.js`**

```javascript
/**
 * Builds UPDATE query dynamically from request body
 * Sanitizes values and validates against allowed fields
 * 
 * @param {object} body - Request body with field values
 * @param {object} allowedFields - Map of {fieldName: true/false}
 * @param {object} sanitizers - Map of {fieldName: sanitizerFunction}
 * @returns {object} {updates: string[], values: any[]} or null if no updates
 */
function buildDynamicUpdate(body, allowedFields, sanitizers = {}) {
  const updates = [];
  const values = [];

  for (const [field, value] of Object.entries(body)) {
    // Check if field is allowed and defined
    if (!allowedFields[field] || value === undefined) {
      continue;
    }

    // Get sanitizer for this field, or use identity function
    const sanitizer = sanitizers[field] || (v => v);
    
    updates.push(`${field} = ?`);
    values.push(sanitizer(value));
  }

  return updates.length > 0 ? { updates, values } : null;
}

/**
 * Executes UPDATE query with automatic timestamp and WHERE clause
 */
function executeUpdate(db, table, updates, values, id, userId) {
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, userId);

  const query = `
    UPDATE ${table}
    SET ${updates.join(', ')}
    WHERE id = ? AND user_id = ?
  `;

  return db.prepare(query).run(...values);
}

module.exports = {
  buildDynamicUpdate,
  executeUpdate
};
```

**Updated File: `/routes/tasks.js` lines 260-322**

```javascript
const { buildDynamicUpdate, executeUpdate } = require('../utils/dynamicUpdate');

// Define allowed fields and sanitizers once per route
const ALLOWED_FIELDS = {
  'title': true,
  'description': true,
  'completed': true,
  'why': true,
  'importance': true,
  'urgency': true,
  'deadline': true,
  'parent_task_id': true
};

const SANITIZERS = {
  'title': (v) => sanitizeText(v),
  'description': (v) => sanitizeText(v),
  'completed': (v) => v ? 1 : 0,
  'why': (v) => sanitizeText(v),
  'importance': (v) => v,
  'urgency': (v) => v,
  'deadline': (v) => v,
  'parent_task_id': (v) => v
};

// In the PUT handler:
router.put('/:id', [...validators...], (req, res) => {
  try {
    const { id } = req.params;

    // ... ownership check ...

    // Build update query (now 2 lines instead of 60!)
    const updateData = buildDynamicUpdate(req.body, ALLOWED_FIELDS, SANITIZERS);
    
    if (!updateData && req.body.tags === undefined) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Execute update (now 1 line instead of 10!)
    if (updateData) {
      executeUpdate(db, 'tasks', updateData.updates, updateData.values, id, req.user.id);
    }

    // ... rest of handler ...
  } catch (error) {
    // ...
  }
});
```

**Benefits**:
- 60 lines → 2 lines in route handler
- Logic centralized in reusable utility
- Same pattern works for tasks, memos, admin
- Consistent validation and sanitization

---

## Issue 4.2: Fix Race Condition in Tag Operations

### BEFORE (Race condition possible)
**File: `/routes/tasks.js` lines 173-179** (or similar in other files)

```javascript
// Insert or ignore if exists
insertTagStmt.run(req.user.id, tagName, tagColor);
const tagRecord = getTagStmt.get(req.user.id, tagName);

// Link tag to task
if (tagRecord) {
  linkTagStmt.run(taskId, tagRecord.id);
}
// PROBLEM: Between INSERT and SELECT, concurrent request could delete the tag!
// PROBLEM: tagRecord could be null even though insert succeeded!
```

### AFTER (Race condition fixed)
**File: `/routes/tasks.js` lines 173-179**

```javascript
// Insert or ignore if exists
const result = insertTagStmt.run(req.user.id, tagName, tagColor);
const tagRecord = getTagStmt.get(req.user.id, tagName);

// Verify tag was successfully created/retrieved
if (!tagRecord) {
  throw new Error(`Failed to create/retrieve tag: ${tagName}`);
}

// Link tag to task
linkTagStmt.run(taskId, tagRecord.id);
```

**OR Better: Use tagService which handles this atomically**:
```javascript
tagService.attachTagsToTask(taskId, tags, req.user.id);
```

---

## Issue 1.2: Create Ownership Middleware

### NEW FILE: `/middleware/ownershipCheck.js`

```javascript
const db = require('../database/db');

/**
 * Creates middleware to verify user owns a resource
 * @param {string} table - Table name
 * @param {string} idParam - Request param name (default: 'id')
 * @returns {function} Express middleware
 */
function createOwnershipMiddleware(table, idParam = 'id') {
  return (req, res, next) => {
    try {
      const resourceId = req.params[idParam];

      // Check ownership with single query
      const record = db.prepare(`
        SELECT id FROM ${table}
        WHERE id = ? AND user_id = ?
      `).get(resourceId, req.user.id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: `${table} not found`
        });
      }

      // Store in request for potential use in handler
      req.resource = record;
      next();

    } catch (error) {
      console.error(`Ownership check error for ${table}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify ownership'
      });
    }
  };
}

module.exports = { createOwnershipMiddleware };
```

### BEFORE (Duplicated in every route)
**File: `/routes/tasks.js` lines 237-246**

```javascript
router.put('/:id', [...validators...], (req, res) => {
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

    // ... rest of handler ...
  }
});
```

**AFTER (Using middleware)**
**File: `/routes/tasks.js`**

```javascript
const { createOwnershipMiddleware } = require('../middleware/ownershipCheck');

// Use middleware instead of checking in handler
router.put(
  '/:id',
  [...validators...],
  createOwnershipMiddleware('tasks'),  // <-- One line replaces 10!
  (req, res) => {
    try {
      const { id } = req.params;
      // req.resource already verified to belong to user
      // Directly proceed with update logic

      // ... rest of handler (no ownership check needed) ...
    }
  }
);
```

---

## Issue 4.3: Add Null Checks

### BEFORE (Missing null check)
**File: `/routes/tasks.js` lines 418-423**

```javascript
router.patch('/:id/toggle', (req, res) => {
  try {
    // ... toggle operation ...

    // Fetch updated task
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.json({
      success: true,
      task  // Could be null!
    });
  } catch (error) {
    // ...
  }
});
```

### AFTER (With null check)
**File: `/routes/tasks.js` lines 418-423**

```javascript
router.patch('/:id/toggle', (req, res) => {
  try {
    // ... toggle operation ...

    // Fetch updated task
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    // Verify task still exists (could theoretically be deleted by concurrent request)
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or was deleted'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    // ...
  }
});
```

---

## Summary of Changes

| Issue | Before | After | Time |
|-------|--------|-------|------|
| 1.1 | 27 lines inline | 3 lines with tagService | 2-3h |
| 3.1 | 60 lines in route | 2 lines with utility | 1-2h |
| 4.1 | No transaction | Wrapped in db.transaction() | 2-4h |
| 1.2 | 10 line check per route | 1 middleware line | 1h |
| 4.2 | No error check | `if (!tagRecord) throw` | 1h |
| 4.3 | Response might be null | Added `if (!task) return 404` | 30m |

---

## Recommended Application Order

1. **Start with Issue 1.1** (tagService migration)
   - Reduces duplication
   - Sets up foundation for Issue 4.1
   - 2-3 hours, high impact

2. **Then Issue 4.1** (transactions)
   - Now that routes use tagService, adding transactions is easier
   - Fixes data integrity
   - 2-4 hours, critical

3. **Then Issue 3.1** (dynamic SQL)
   - Now that tagService is in place, this is independent
   - 1-2 hours, good polish

4. **Quick wins** (1.2, 4.2, 4.3)
   - 30 min to 1 hour each
   - Good for wrapping up

