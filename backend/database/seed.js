const db = require('./db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

    // ========================================================================
    // CRITICAL SECURITY FIX #2: Use environment variables for admin credentials
    // ========================================================================

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Validate that admin credentials are provided
    if (!adminEmail || !adminPassword) {
      console.warn('⚠️  WARNING: ADMIN_EMAIL and ADMIN_PASSWORD not set in environment variables');
      console.warn('⚠️  Skipping admin user creation. Please set these in your .env file and re-run seed.');
    } else {
      // Check if admin user already exists
      const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

      if (!adminExists) {
        // Create admin user with environment variable credentials
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const insertAdmin = db.prepare(`
          INSERT INTO users (email, password_hash, name, email_verified, is_admin)
          VALUES (?, ?, ?, 1, 1)
        `);

        insertAdmin.run(adminEmail, hashedPassword, adminName);

        console.log('✅ Admin user created successfully');
        console.log(`   Email: ${adminEmail}`);
        console.log('   ⚠️  SECURITY: Change password immediately after first login!');
        console.log('   Password is set from ADMIN_PASSWORD environment variable');
      } else {
        console.log('ℹ️  Admin user already exists');
      }
    }

    // Initialize email settings if not exists
    const emailSettingsExist = db.prepare('SELECT id FROM email_settings WHERE id = 1').get();

    if (!emailSettingsExist) {
      const insertSettings = db.prepare(`
        INSERT INTO email_settings (id, sender_email, sender_name, reply_to_email, openai_api_key)
        VALUES (1, 'noreply@twu.com', 'TWU', 'support@twu.com', NULL)
      `);

      insertSettings.run();
      console.log('✅ Default email settings created');
      console.log('   Configure OpenAI API key and Postmark token in admin panel');
    }

    console.log('\n✅ Database seeded successfully!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run seeding
seedDatabase();
