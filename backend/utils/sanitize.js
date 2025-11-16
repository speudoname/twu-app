const sanitizeHtml = require('sanitize-html');
const validator = require('validator');

// ============================================================================
// CRITICAL SECURITY FIX #14: XSS Prevention - Input Sanitization
// ============================================================================
//
// This utility provides sanitization functions to prevent XSS attacks.
// All user-provided text should be sanitized before being stored or displayed.
//
// USAGE:
//   const { sanitizeInput, sanitizeEmail, sanitizeUrl } = require('./utils/sanitize');
//   const clean = sanitizeInput(userInput);
// ============================================================================

/**
 * Default sanitization options for sanitize-html
 * This removes all HTML tags and dangerous content
 */
const DEFAULT_SANITIZE_OPTIONS = {
  allowedTags: [], // No HTML tags allowed
  allowedAttributes: {}, // No attributes allowed
  disallowedTagsMode: 'recursiveEscape' // Escape rather than strip
};

/**
 * Options for rich text (allows some safe HTML)
 * Use this for content that should support basic formatting
 */
const RICH_TEXT_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape'
};

/**
 * Sanitizes general text input by removing/escaping all HTML
 *
 * @param {string} input - The user input to sanitize
 * @param {object} options - Optional sanitize-html options
 * @returns {string} Sanitized string safe from XSS
 * @throws {Error} If input is not a string
 *
 * @example
 * const safe = sanitizeInput('<script>alert("xss")</script>Hello');
 * // Returns: "Hello" or escaped version depending on options
 */
function sanitizeInput(input, options = DEFAULT_SANITIZE_OPTIONS) {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Sanitize HTML
  sanitized = sanitizeHtml(sanitized, options);

  return sanitized;
}

/**
 * Sanitizes text that should support basic HTML formatting
 *
 * @param {string} input - The user input with basic HTML
 * @returns {string} Sanitized HTML safe from XSS
 *
 * @example
 * const safe = sanitizeRichText('<p>Hello</p><script>alert("xss")</script>');
 * // Returns: "<p>Hello</p>" (script tag removed)
 */
function sanitizeRichText(input) {
  return sanitizeInput(input, RICH_TEXT_OPTIONS);
}

/**
 * Validates and sanitizes email addresses
 *
 * @param {string} email - The email address to validate/sanitize
 * @returns {string} Sanitized email in lowercase
 * @throws {Error} If email is invalid
 *
 * @example
 * const email = sanitizeEmail('  User@Example.COM  ');
 * // Returns: "user@example.com"
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  // Trim and convert to lowercase
  const trimmed = email.trim().toLowerCase();

  // Validate email format
  if (!validator.isEmail(trimmed)) {
    throw new Error('Invalid email format');
  }

  // Additional sanitization (remove any HTML if somehow present)
  const sanitized = sanitizeInput(trimmed);

  // Validate again after sanitization
  if (!validator.isEmail(sanitized)) {
    throw new Error('Email contains invalid characters');
  }

  return sanitized;
}

/**
 * Validates and sanitizes URLs
 *
 * @param {string} url - The URL to validate/sanitize
 * @param {object} options - Validation options
 * @returns {string} Sanitized URL
 * @throws {Error} If URL is invalid or uses dangerous protocol
 *
 * @example
 * const url = sanitizeUrl('https://example.com/path?query=value');
 * // Returns: "https://example.com/path?query=value" (if valid)
 */
function sanitizeUrl(url, options = {}) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  const trimmed = url.trim();

  // Check for dangerous protocols (javascript:, data:, vbscript:, etc.)
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowercaseUrl = trimmed.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowercaseUrl.startsWith(protocol)) {
      throw new Error(`Dangerous protocol detected: ${protocol}`);
    }
  }

  // Validate URL format
  const validatorOptions = {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    ...options
  };

  if (!validator.isURL(trimmed, validatorOptions)) {
    throw new Error('Invalid URL format');
  }

  return trimmed;
}

/**
 * Sanitizes a filename to prevent directory traversal attacks
 *
 * @param {string} filename - The filename to sanitize
 * @returns {string} Safe filename
 * @throws {Error} If filename is invalid
 *
 * @example
 * const safe = sanitizeFilename('../../../etc/passwd');
 * // Throws error (directory traversal attempt)
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  const trimmed = filename.trim();

  // Check for directory traversal attempts
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Invalid filename - directory traversal detected');
  }

  // Remove any null bytes
  const sanitized = trimmed.replace(/\0/g, '');

  // Remove any HTML/scripts
  const cleaned = sanitizeInput(sanitized);

  // Validate it's not empty after sanitization
  if (!cleaned || cleaned.length === 0) {
    throw new Error('Filename is empty after sanitization');
  }

  // Check length (reasonable limit)
  if (cleaned.length > 255) {
    throw new Error('Filename too long (max 255 characters)');
  }

  return cleaned;
}

/**
 * Validates and sanitizes integers
 *
 * @param {any} value - The value to validate as integer
 * @param {object} options - Min/max constraints
 * @returns {number} Valid integer
 * @throws {Error} If value is not a valid integer
 *
 * @example
 * const num = sanitizeInteger('42', { min: 0, max: 100 });
 * // Returns: 42
 */
function sanitizeInteger(value, options = {}) {
  const { min, max } = options;

  // Convert to integer
  const num = parseInt(value, 10);

  // Check if valid integer
  if (isNaN(num) || !Number.isInteger(num)) {
    throw new Error('Value must be a valid integer');
  }

  // Check min constraint
  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  // Check max constraint
  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }

  return num;
}

/**
 * Validates string length
 *
 * @param {string} str - The string to validate
 * @param {object} options - Min/max length constraints
 * @returns {string} The original string if valid
 * @throws {Error} If string length is invalid
 *
 * @example
 * validateLength('hello', { min: 1, max: 10 });
 * // Returns: "hello"
 */
function validateLength(str, options = {}) {
  const { min = 0, max } = options;

  if (typeof str !== 'string') {
    throw new Error('Value must be a string');
  }

  if (str.length < min) {
    throw new Error(`String must be at least ${min} characters`);
  }

  if (max !== undefined && str.length > max) {
    throw new Error(`String must be at most ${max} characters`);
  }

  return str;
}

/**
 * Sanitizes an object by applying sanitization to all string values
 * Useful for sanitizing entire request bodies
 *
 * @param {object} obj - The object to sanitize
 * @param {array} richTextFields - Array of field names that should allow basic HTML
 * @returns {object} Sanitized object
 *
 * @example
 * const clean = sanitizeObject({ title: '<script>xss</script>Hello', content: '<p>Text</p>' }, ['content']);
 * // Returns: { title: 'Hello', content: '<p>Text</p>' }
 */
function sanitizeObject(obj, richTextFields = []) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Check if this field should support rich text
      if (richTextFields.includes(key)) {
        sanitized[key] = sanitizeRichText(value);
      } else {
        sanitized[key] = sanitizeInput(value);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, richTextFields);
    } else {
      // Keep non-string, non-object values as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes a tag name to prevent XSS attacks
 * @param {string} tagName - The tag name to sanitize
 * @returns {string} Sanitized tag name
 */
function sanitizeTagName(tagName) {
  if (!tagName || typeof tagName !== 'string') {
    return '';
  }

  // First apply general sanitization to remove HTML/scripts
  let sanitized = sanitizeInput(tagName);

  // Limit length for tags
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }

  // Remove special characters that could be problematic
  sanitized = sanitized.replace(/[<>\"'`]/g, '');

  return sanitized.trim();
}

/**
 * Sanitizes a color value
 * @param {string} color - The color value to sanitize
 * @returns {string} Sanitized color value or default
 */
function sanitizeColor(color) {
  if (!color || typeof color !== 'string') {
    return '#667eea'; // Default color
  }

  // Check if it's a valid hex color
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color;
  }

  // Check if it's a valid RGB/RGBA color
  if (/^rgba?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(,\s*[0-9.]+)?\)$/i.test(color)) {
    return color;
  }

  // Default color if invalid
  return '#667eea';
}

/**
 * Sanitizes an array of tags
 * @param {Array} tags - Array of tags to sanitize
 * @returns {Array} Array of sanitized tag objects
 */
function sanitizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.map(tag => {
    if (typeof tag === 'string') {
      return {
        name: sanitizeTagName(tag),
        color: '#667eea'
      };
    } else if (typeof tag === 'object' && tag !== null) {
      return {
        name: sanitizeTagName(tag.name),
        color: sanitizeColor(tag.color)
      };
    }
    return null;
  }).filter(tag => tag && tag.name); // Remove null/empty tags
}

// Alias for backward compatibility
const sanitizeText = sanitizeInput;

module.exports = {
  sanitizeInput,
  sanitizeText,  // Alias for inbox.js
  sanitizeRichText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeInteger,
  validateLength,
  sanitizeObject,
  sanitizeTagName,
  sanitizeColor,
  sanitizeTags
};
