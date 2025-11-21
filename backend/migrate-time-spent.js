const db = require('./database/db');

try {
  // Check if column already exists
  const tableInfo = db.prepare('PRAGMA table_info(tasks)').all();
  const columnExists = tableInfo.some(col => col.name === 'time_spent_minutes');

  if (columnExists) {
    console.log('Column "time_spent_minutes" already exists. Migration skipped.');
    process.exit(0);
  }

  // Add the column
  db.prepare('ALTER TABLE tasks ADD COLUMN time_spent_minutes INTEGER DEFAULT 0').run();
  console.log('Successfully added "time_spent_minutes" column to tasks table.');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
