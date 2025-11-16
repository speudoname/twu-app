const db = require('../db');

// ============================================================================
// Migration: Add Missing Indexes and inbox_tags Table
// ============================================================================
// Run this file once to apply the new indexes and inbox_tags table
// Usage: node backend/database/migrations/add_indexes_and_inbox_tags.js
// ============================================================================

console.log('🔄 Running migration: Add missing indexes and inbox_tags table...\n');

try {
  // Add inbox_tags table
  console.log('Creating inbox_tags table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbox_tags (
      inbox_item_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (inbox_item_id, tag_id),
      FOREIGN KEY (inbox_item_id) REFERENCES inbox(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ inbox_tags table created\n');

  // Add missing indexes
  console.log('Creating missing indexes...');

  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)');
  console.log('✅ Created index on users.email_verified');

  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed)');
  console.log('✅ Created composite index on tasks(user_id, completed)');

  db.exec('CREATE INDEX IF NOT EXISTS idx_inbox_source ON inbox(source)');
  console.log('✅ Created index on inbox.source');

  db.exec('CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at DESC)');
  console.log('✅ Created index on memos.created_at');

  console.log('\n✅ Migration completed successfully!');
  console.log('\nPerformance improvements:');
  console.log('  - Faster authentication queries (email_verified index)');
  console.log('  - Faster dashboard queries (tasks composite index)');
  console.log('  - Faster inbox filtering (source index)');
  console.log('  - Faster memo listing (created_at index)');
  console.log('  - inbox_tags table ready for tag support');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}

// Close database connection
db.close();
