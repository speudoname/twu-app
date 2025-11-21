const db = require('./database/db');

try {
  // Check if column already exists
  const tableInfo = db.prepare('PRAGMA table_info(tasks)').all();
  const columnExists = tableInfo.some(col => col.name === 'planned_for_today');

  if (columnExists) {
    console.log('Column "planned_for_today" already exists. Migration skipped.');
    process.exit(0);
  }

  // Add the column
  db.prepare('ALTER TABLE tasks ADD COLUMN planned_for_today DATE').run();
  console.log('Successfully added "planned_for_today" column to tasks table.');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
