# Security Utilities

This directory contains security utilities for the TWU application.

## Files

### `encryption.js`
**Purpose:** Encrypt/decrypt sensitive data (API keys, tokens)

**Functions:**
- `encrypt(text)` - Encrypt plaintext using AES-256-GCM
- `decrypt(encryptedData)` - Decrypt encrypted data
- `hash(text)` - One-way hash (SHA-256)
- `generateToken(length)` - Generate secure random token
- `constantTimeCompare(a, b)` - Timing-attack-safe comparison

**Usage:**
```javascript
const { encrypt, decrypt } = require('./utils/encryption');

// Encrypt before storing
const encrypted = encrypt('my-api-key');
db.run('UPDATE settings SET api_key = ?', encrypted);

// Decrypt when needed
const apiKey = decrypt(encrypted);
```

**Environment Required:**
- `ENCRYPTION_KEY` - 32+ character secret key

---

### `sanitize.js`
**Purpose:** Prevent XSS attacks through input sanitization

**Functions:**
- `escapeHtml(text)` - Escape HTML special characters
- `stripHtml(text)` - Remove all HTML tags
- `sanitizeText(text)` - Remove dangerous content (scripts, events)
- `sanitizeObject(obj)` - Recursively sanitize object
- `sanitizeFilename(filename)` - Prevent directory traversal
- `sanitizeEmail(email)` - Validate and sanitize email
- `sanitizeUrl(url)` - Block dangerous protocols

**Usage:**
```javascript
const { sanitizeText } = require('./utils/sanitize');

// Sanitize user input before storing
const title = sanitizeText(req.body.title);
db.run('INSERT INTO tasks (title) VALUES (?)', title);
```

**Features:**
- Removes `<script>` tags
- Strips event handlers (onclick, onerror, etc.)
- Blocks javascript:, vbscript:, data: protocols
- ReDoS-safe (length limits)

---

### `fileValidation.js`
**Purpose:** Secure file upload validation

**Functions:**
- `validateAudioFile(file)` - Comprehensive audio file validation
- `validateFileSignature(filePath)` - Magic number validation
- `validateFileExtension(filename)` - Extension whitelist
- `validateMimeType(mimetype)` - MIME type whitelist
- `validateFileSize(size)` - Size limit check

**Usage:**
```javascript
const { validateAudioFile } = require('./utils/fileValidation');

// Validate uploaded file
const validation = await validateAudioFile(req.file);
if (!validation.valid) {
  return res.status(400).json({ error: validation.error });
}
```

**Supported Formats:**
- WAV, MP3, M4A, OGG, WebM, FLAC
- Maximum size: 25MB

**Security Features:**
- Magic number (file signature) validation
- MIME type verification
- Extension checking
- Size limits
- Prevents malicious file execution

---

## Security Best Practices

### Input Sanitization
Always sanitize user input before storing in the database:
```javascript
// ❌ BAD - Direct storage
db.run('INSERT INTO tasks (title) VALUES (?)', req.body.title);

// ✅ GOOD - Sanitized first
const title = sanitizeText(req.body.title);
db.run('INSERT INTO tasks (title) VALUES (?)', title);
```

### File Upload
Always validate files after upload:
```javascript
// ✅ GOOD - Validate and cleanup
const validation = await validateAudioFile(req.file);
if (!validation.valid) {
  fs.unlinkSync(req.file.path); // Delete invalid file
  return res.status(400).json({ error: validation.error });
}
```

### API Keys
Never store API keys in plaintext:
```javascript
// ❌ BAD - Plaintext storage
db.run('UPDATE settings SET api_key = ?', apiKey);

// ✅ GOOD - Encrypted storage
const encrypted = encrypt(apiKey);
db.run('UPDATE settings SET api_key = ?', encrypted);
```

---

## Testing

Run security tests:
```bash
npm test -- utils/
```

Manual testing:
```javascript
// Test XSS prevention
const xss = '<script>alert("XSS")</script>';
console.log(sanitizeText(xss)); // Should be safe

// Test file validation
const result = await validateAudioFile({
  path: '/path/to/test.mp3',
  mimetype: 'audio/mpeg',
  size: 1024 * 1024, // 1MB
  originalname: 'test.mp3'
});
console.log(result.valid); // true or false
```

---

## Dependencies

### Required Packages
- `crypto` (built-in Node.js)
- `fs` (built-in Node.js)

### Optional Testing
- `jest` - Unit testing
- `supertest` - Integration testing

---

## Performance

| Function | Avg Time | Notes |
|----------|----------|-------|
| `sanitizeText()` | ~1ms | Per 1KB text |
| `validateAudioFile()` | ~10-50ms | Depends on file size |
| `encrypt()` | ~1ms | Per encryption |
| `decrypt()` | ~1ms | Per decryption |

---

## Security Notes

1. **Encryption Key:** Must be 32+ characters, stored securely
2. **Input Length:** All functions have length limits to prevent ReDoS
3. **File Cleanup:** Always delete invalid uploaded files
4. **Error Messages:** Never expose encryption/validation details to users

---

## Troubleshooting

### "ENCRYPTION_KEY not set"
Set the environment variable:
```bash
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### "Invalid file signature"
The file content doesn't match the declared MIME type. This prevents:
- Renamed executables (.exe → .mp3)
- Malicious files with fake extensions

### "Text too long"
Input exceeds safety limits:
- Text: 100KB max
- Email: 320 chars max
- URL: 2048 chars max

---

## Version History

- **v1.0** (Nov 2025) - Initial release
  - Encryption utility
  - Sanitization utility
  - File validation utility

---

For more details, see `/backend/SECURITY_REMEDIATION.md`
