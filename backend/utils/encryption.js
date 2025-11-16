const crypto = require('crypto');

// ============================================================================
// CRITICAL SECURITY FIX #8: API Key Encryption
// ============================================================================
//
// This utility provides secure encryption/decryption for sensitive data like
// API keys stored in the database using AES-256-GCM.
//
// USAGE:
//   const { encryptApiKey, decryptApiKey } = require('./utils/encryption');
//   const encrypted = encryptApiKey('my-secret-key');
//   const decrypted = decryptApiKey(encrypted);
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get the encryption key from environment variables
 * @returns {Buffer} The encryption key as a Buffer
 * @throws {Error} If ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (encryptionKey.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ' +
      'Generate a new one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  try {
    return Buffer.from(encryptionKey, 'hex');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be a valid hexadecimal string');
  }
}

/**
 * Encrypts sensitive data (like API keys) using AES-256-GCM
 *
 * @param {string} plaintext - The text to encrypt (e.g., API key)
 * @returns {string} Encrypted data in format: iv:authTag:encryptedData (hex encoded)
 * @throws {Error} If encryption fails or plaintext is invalid
 *
 * @example
 * const encrypted = encryptApiKey('sk-openai-api-key-here');
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
function encryptApiKey(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data that was encrypted with encryptApiKey
 *
 * @param {string} encryptedData - The encrypted data (format: iv:authTag:encryptedData)
 * @returns {string} The decrypted plaintext
 * @throws {Error} If decryption fails, data is tampered, or format is invalid
 *
 * @example
 * const decrypted = decryptApiKey('a1b2c3d4....:e5f6g7h8....:i9j0k1l2....');
 * // Returns: "sk-openai-api-key-here"
 */
function decryptApiKey(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Encrypted data must be a non-empty string');
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Authentication tag verification failed means data was tampered with
    if (error.message.includes('auth')) {
      throw new Error('Data integrity check failed - possible tampering detected');
    }
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Validates that the encryption system is properly configured
 * Call this on server startup to ensure encryption will work
 *
 * @returns {boolean} True if encryption is properly configured
 * @throws {Error} If configuration is invalid
 */
function validateEncryptionSetup() {
  try {
    getEncryptionKey();

    // Test encryption/decryption
    const testData = 'test-encryption-key';
    const encrypted = encryptApiKey(testData);
    const decrypted = decryptApiKey(encrypted);

    if (decrypted !== testData) {
      throw new Error('Encryption test failed - decrypted data does not match');
    }

    return true;
  } catch (error) {
    throw new Error(`Encryption setup validation failed: ${error.message}`);
  }
}

module.exports = {
  encryptApiKey,
  decryptApiKey,
  validateEncryptionSetup
};
