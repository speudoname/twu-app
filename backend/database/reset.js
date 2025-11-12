const db = require('./db');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  try {
    console.log('Resetting database...');

    // Drop all tables
    const tables = ['email_tokens', 'reset_tokens', 'tasks', 'email_settings', 'users'];

    for (const table of tables) {
      try {
        db.exec(`DROP TABLE IF EXISTS ${table}`);
        console.log(`Dropped table: ${table}`);
      } catch (err) {
        console.error(`Error dropping table ${table}:`, err.message);
      }
    }

    console.log('All tables dropped. Reinitializing...');

    // Close and reconnect
    db.close();

    // Re-run seed script
    require('./seed');

  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

// Run reset
resetDatabase();