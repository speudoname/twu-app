-- Migration: Inbox Zero Features
-- Adds task priority, delayed inbox, memos, and tags

-- Step 1: Add new fields to tasks table
ALTER TABLE tasks ADD COLUMN importance INTEGER DEFAULT 5;

ALTER TABLE tasks ADD COLUMN urgency INTEGER DEFAULT 5;

ALTER TABLE tasks ADD COLUMN why TEXT;

ALTER TABLE tasks ADD COLUMN deadline DATETIME;

ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER;

ALTER TABLE tasks ADD COLUMN source_inbox_id INTEGER;

-- Step 2: Add delayed_until to inbox table
ALTER TABLE inbox ADD COLUMN delayed_until DATETIME;

ALTER TABLE inbox ADD COLUMN status TEXT DEFAULT 'active';

-- Step 3: Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#667eea',  -- Color for visual distinction
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)  -- Each user can't have duplicate tag names
);

-- Create task_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create memos table
CREATE TABLE IF NOT EXISTS memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  details TEXT,  -- Additional details/context
  source_inbox_id INTEGER REFERENCES inbox(id) ON DELETE SET NULL,  -- Track where memo came from
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create memo_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS memo_tags (
  memo_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (memo_id, tag_id),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
CREATE INDEX IF NOT EXISTS idx_tasks_urgency ON tasks(urgency);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox(status);
CREATE INDEX IF NOT EXISTS idx_inbox_delayed_until ON inbox(delayed_until);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);
