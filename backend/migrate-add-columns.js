const db = require('./database/db');

try {
  // Check which columns exist
  const tableInfo = db.prepare('PRAGMA table_info(tasks)').all();
  const existingColumns = tableInfo.map(col => col.name);

  console.log('Existing columns:', existingColumns.join(', '));

  // Add pomodoro_count if missing
  if (!existingColumns.includes('pomodoro_count')) {
    db.prepare('ALTER TABLE tasks ADD COLUMN pomodoro_count INTEGER DEFAULT 0').run();
    console.log('✅ Added "pomodoro_count" column');
  } else {
    console.log('⏭️  "pomodoro_count" column already exists');
  }

  // Add time_spent_minutes if missing
  if (!existingColumns.includes('time_spent_minutes')) {
    db.prepare('ALTER TABLE tasks ADD COLUMN time_spent_minutes INTEGER DEFAULT 0').run();
    console.log('✅ Added "time_spent_minutes" column');
  } else {
    console.log('⏭️  "time_spent_minutes" column already exists');
  }

  // Add planned_for_today if missing
  if (!existingColumns.includes('planned_for_today')) {
    db.prepare('ALTER TABLE tasks ADD COLUMN planned_for_today DATE').run();
    console.log('✅ Added "planned_for_today" column');
  } else {
    console.log('⏭️  "planned_for_today" column already exists');
  }

  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
