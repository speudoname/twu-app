const bcrypt = require('bcrypt');
const db = require('../database/db');

async function updatePassword() {
  try {
    // Hash the new password
    const newPassword = 'levan0488';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in the database
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    const result = stmt.run(passwordHash, 'levan@sarke.ge');

    if (result.changes > 0) {
      console.log('Password updated successfully for levan@sarke.ge');
    } else {
      console.log('User levan@sarke.ge not found');
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    db.close();
  }
}

updatePassword();