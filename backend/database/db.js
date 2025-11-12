const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const dbPath = path.resolve(__dirname, '..', process.env.DATABASE_PATH || './data/twu.db');
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Helper function to run schema
const initDatabase = () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = schema.split(';').filter(stmt => stmt.trim());

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (err) {
      console.error('Error executing statement:', statement);
      throw err;
    }
  }

  console.log('Database initialized successfully');
};

// Initialize database on first run
try {
  // Check if tables exist
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!tableCheck) {
    console.log('Initializing database...');
    initDatabase();
  }
} catch (err) {
  console.error('Database initialization error:', err);
  process.exit(1);
}

module.exports = db;