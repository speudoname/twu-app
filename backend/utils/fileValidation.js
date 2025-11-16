const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CRITICAL SECURITY FIX #9: File Upload Security
// ============================================================================
//
// This utility provides secure file upload validation using:
// - Magic number (file signature) verification
// - MIME type validation
// - File extension checks
// - File size limits
//
// USAGE:
//   const { validateFileUpload } = require('./utils/fileValidation');
//   await validateFileUpload(filePath, { maxSize: 10 * 1024 * 1024 });
// ============================================================================

/**
 * Magic numbers (file signatures) for allowed file types
 * These are the first bytes of the file that identify its true type
 */
const MAGIC_NUMBERS = {
  // Audio formats
  'audio/mpeg': [
    { signature: Buffer.from([0xFF, 0xFB]), offset: 0 },           // MP3
    { signature: Buffer.from([0xFF, 0xF3]), offset: 0 },           // MP3
    { signature: Buffer.from([0xFF, 0xF2]), offset: 0 },           // MP3
    { signature: Buffer.from([0x49, 0x44, 0x33]), offset: 0 }      // MP3 with ID3v2
  ],
  'audio/mp4': [
    { signature: Buffer.from([0x66, 0x74, 0x79, 0x70]), offset: 4 } // M4A (ftyp at offset 4)
  ],
  'audio/wav': [
    { signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 } // WAV (RIFF)
  ],
  'audio/x-m4a': [
    { signature: Buffer.from([0x66, 0x74, 0x79, 0x70]), offset: 4 } // M4A
  ],
  'audio/webm': [
    { signature: Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), offset: 0 } // WebM
  ],

  // Image formats (for future use)
  'image/jpeg': [
    { signature: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0 }
  ],
  'image/png': [
    { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47]), offset: 0 }
  ],
  'image/gif': [
    { signature: Buffer.from([0x47, 0x49, 0x46, 0x38]), offset: 0 }
  ],
  'image/webp': [
    { signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 },
    { signature: Buffer.from([0x57, 0x45, 0x42, 0x50]), offset: 8 }
  ]
};

/**
 * Allowed file extensions for each MIME type
 */
const ALLOWED_EXTENSIONS = {
  'audio/mpeg': ['.mp3'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/wav': ['.wav'],
  'audio/x-m4a': ['.m4a'],
  'audio/webm': ['.webm'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

/**
 * Default file size limits (in bytes)
 */
const DEFAULT_LIMITS = {
  audio: 25 * 1024 * 1024,  // 25MB for audio files
  image: 10 * 1024 * 1024,  // 10MB for images
  default: 10 * 1024 * 1024 // 10MB default
};

// Maximum file size constant for backward compatibility
const MAX_FILE_SIZE = DEFAULT_LIMITS.audio;

/**
 * Reads the magic number (file signature) from a file
 *
 * @param {string} filePath - Path to the file
 * @param {number} bytesToRead - Number of bytes to read
 * @returns {Promise<Buffer>} The first bytes of the file
 */
async function readMagicNumber(filePath, bytesToRead = 12) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(bytesToRead);
    fs.open(filePath, 'r', (err, fd) => {
      if (err) return reject(err);

      fs.read(fd, buffer, 0, bytesToRead, 0, (err, bytesRead, buffer) => {
        fs.close(fd, () => {});
        if (err) return reject(err);
        resolve(buffer);
      });
    });
  });
}

/**
 * Verifies file signature against magic numbers
 *
 * @param {Buffer} fileBuffer - The file's magic number
 * @param {string} mimeType - Expected MIME type
 * @returns {boolean} True if magic number matches expected type
 */
function verifyMagicNumber(fileBuffer, mimeType) {
  const magicNumbers = MAGIC_NUMBERS[mimeType];

  if (!magicNumbers) {
    return false; // MIME type not in our whitelist
  }

  // Check if any of the magic numbers match
  return magicNumbers.some(({ signature, offset }) => {
    for (let i = 0; i < signature.length; i++) {
      if (fileBuffer[offset + i] !== signature[i]) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Validates file extension against allowed extensions for MIME type
 *
 * @param {string} filename - The filename
 * @param {string} mimeType - The MIME type
 * @returns {boolean} True if extension is allowed
 */
function validateExtension(filename, mimeType) {
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = ALLOWED_EXTENSIONS[mimeType];

  if (!allowedExts) {
    return false; // MIME type not in our whitelist
  }

  return allowedExts.includes(ext);
}

/**
 * Gets file size
 *
 * @param {string} filePath - Path to the file
 * @returns {Promise<number>} File size in bytes
 */
async function getFileSize(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return reject(err);
      resolve(stats.size);
    });
  });
}

/**
 * Validates an uploaded file for security
 *
 * @param {string} filePath - Path to the uploaded file
 * @param {object} options - Validation options
 * @param {string} options.mimeType - Expected MIME type
 * @param {string} options.filename - Original filename
 * @param {number} options.maxSize - Maximum file size in bytes
 * @returns {Promise<object>} Validation result with details
 * @throws {Error} If validation fails
 *
 * @example
 * const result = await validateFileUpload('/tmp/upload.mp3', {
 *   mimeType: 'audio/mpeg',
 *   filename: 'recording.mp3',
 *   maxSize: 25 * 1024 * 1024
 * });
 */
async function validateFileUpload(filePath, options = {}) {
  const { mimeType, filename, maxSize } = options;

  // Validate inputs
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path is required');
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error('MIME type is required');
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename is required');
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error('File does not exist');
  }

  // STEP 1: Validate file extension
  if (!validateExtension(filename, mimeType)) {
    throw new Error(
      `Invalid file extension for MIME type ${mimeType}. ` +
      `Allowed: ${ALLOWED_EXTENSIONS[mimeType]?.join(', ') || 'none'}`
    );
  }

  // STEP 2: Validate file size
  const fileSize = await getFileSize(filePath);
  const sizeLimit = maxSize || (mimeType.startsWith('audio/') ? DEFAULT_LIMITS.audio : DEFAULT_LIMITS.default);

  if (fileSize > sizeLimit) {
    throw new Error(
      `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds limit ` +
      `(${(sizeLimit / 1024 / 1024).toFixed(2)}MB)`
    );
  }

  if (fileSize === 0) {
    throw new Error('File is empty');
  }

  // STEP 3: Validate magic number (file signature)
  const magicNumber = await readMagicNumber(filePath);

  if (!verifyMagicNumber(magicNumber, mimeType)) {
    throw new Error(
      `File signature does not match MIME type ${mimeType}. ` +
      `The file may be corrupted or have a spoofed extension.`
    );
  }

  // All validations passed
  return {
    valid: true,
    mimeType,
    filename,
    fileSize,
    fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
    ext: path.extname(filename).toLowerCase()
  };
}

/**
 * Generates a secure random filename to prevent path traversal
 *
 * @param {string} originalFilename - Original filename
 * @returns {string} Secure random filename with original extension
 *
 * @example
 * const safeName = generateSecureFilename('user-upload.mp3');
 * // Returns: "a3b2c1d4e5f6g7h8.mp3"
 */
function generateSecureFilename(originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${randomName}${ext}`;
}

/**
 * Sanitizes a directory path to prevent traversal
 *
 * @param {string} basePath - The base directory (must be absolute)
 * @param {string} userPath - User-provided path component
 * @returns {string} Sanitized absolute path
 * @throws {Error} If path traversal is detected
 *
 * @example
 * const safe = sanitizePath('/uploads', 'audio/file.mp3');
 * // Returns: "/uploads/audio/file.mp3"
 *
 * sanitizePath('/uploads', '../../../etc/passwd');
 * // Throws error
 */
function sanitizePath(basePath, userPath) {
  // Resolve the full path
  const fullPath = path.resolve(basePath, userPath);

  // Ensure it's still within basePath
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Path traversal detected');
  }

  return fullPath;
}

/**
 * Gets list of supported MIME types
 *
 * @returns {array} Array of supported MIME types
 */
function getSupportedMimeTypes() {
  return Object.keys(MAGIC_NUMBERS);
}

/**
 * Validates an audio file from multer upload
 * This is a convenience wrapper for validateFileUpload that works with multer file objects
 *
 * @param {object} multerFile - The multer file object from req.file
 * @returns {Promise<object>} Validation result with { valid: boolean, error?: string }
 */
async function validateAudioFile(multerFile) {
  try {
    if (!multerFile || typeof multerFile !== 'object') {
      return { valid: false, error: 'No file provided' };
    }

    const result = await validateFileUpload(multerFile.path, {
      mimeType: multerFile.mimetype,
      filename: multerFile.originalname,
      maxSize: MAX_FILE_SIZE
    });

    return { valid: true, ...result };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

module.exports = {
  validateFileUpload,
  validateAudioFile,  // Alias for inbox.js
  generateSecureFilename,
  sanitizePath,
  getSupportedMimeTypes,
  ALLOWED_EXTENSIONS,
  DEFAULT_LIMITS,
  MAX_FILE_SIZE  // For inbox.js
};
