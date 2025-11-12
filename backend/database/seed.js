const db = require('./db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const statements = schema.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (err) {
        // Tables might already exist, that's ok
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }

    // Check if admin user already exists
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('levan@sarke.ge');

    if (!adminExists) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('levan0488', 10);

      const insertAdmin = db.prepare(`
        INSERT INTO users (email, password_hash, name, email_verified, is_admin)
        VALUES (?, ?, ?, 1, 1)
      `);

      insertAdmin.run('levan@sarke.ge', hashedPassword, 'Levan Bakhia');
      console.log('Admin user created successfully');
      console.log('Email: levan@sarke.ge');
      console.log('Password: levan0488');
    } else {
      console.log('Admin user already exists');
    }

    // Initialize email settings if not exists
    const emailSettingsExist = db.prepare('SELECT id FROM email_settings WHERE id = 1').get();

    if (!emailSettingsExist) {
      const insertSettings = db.prepare(`
        INSERT INTO email_settings (id, sender_email, sender_name, reply_to_email)
        VALUES (1, 'noreply@twu.com', 'TWU', 'support@twu.com')
      `);

      insertSettings.run();
      console.log('Default email settings created (Postmark token needs to be configured)');
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run seeding
seedDatabase();