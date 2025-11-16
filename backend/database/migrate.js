const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Run database migrations
 * Executes SQL files from migrations directory
 */
function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  const migrationsDir = path.join(__dirname, 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('✅ No migrations directory found. Skipping migrations.');
    return;
  }

  // Get all .sql files in migrations directory
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Run in alphabetical order

  if (migrationFiles.length === 0) {
    console.log('✅ No migration files found.');
    return;
  }

  // Run each migration
  migrationFiles.forEach(file => {
    console.log(`📄 Running migration: ${file}`);
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    statements.forEach((statement, index) => {
      try {
        db.exec(statement);
        console.log(`   ✓ Statement ${index + 1}/${statements.length}`);
      } catch (error) {
        // Ignore "duplicate column" errors (migration already run)
        if (error.message.includes('duplicate column') ||
            error.message.includes('already exists')) {
          console.log(`   ⊙ Statement ${index + 1}/${statements.length} (already applied)`);
        } else {
          console.error(`   ✗ Error in statement ${index + 1}:`, error.message);
          throw error;
        }
      }
    });

    console.log(`✅ Migration ${file} completed\n`);
  });

  console.log('🎉 All migrations completed successfully!');
}

// Run migrations
if (require.main === module) {
  try {
    runMigrations();
    db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

module.exports = { runMigrations };
