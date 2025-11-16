const { validateLength } = require('../utils/sanitize');

// ============================================================================
// Input Validation Middleware
// ============================================================================
//
// This middleware provides maximum length validation to prevent DoS attacks
// via gigabyte-sized text inputs that could cause memory exhaustion.
//
// USAGE:
//   const { validateTaskInput, validateMemoInput } = require('./middleware/validation');
//   router.post('/tasks', validateTaskInput, (req, res) => { ... });
// ============================================================================

/**
 * Maximum field length constants (in characters)
 * These limits prevent memory exhaustion while allowing reasonable content
 */
const MAX_LENGTHS = {
  TITLE: 200,
  DESCRIPTION: 5000,
  TAG_NAME: 50,
  MEMO_CONTENT: 50000,
  MEMO_DETAILS: 10000,
  INBOX_CONTENT: 5000,
  EMAIL: 255,
  NAME: 100,
  URL: 2000,
  WHY: 1000
};

/**
 * Validates a single field length
 *
 * @param {string} fieldName - Name of the field for error messages
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum allowed length
 * @throws {Error} If validation fails
 */
function validateFieldLength(fieldName, value, maxLength) {
  if (value === null || value === undefined) {
    return; // Allow null/undefined (handled by other validation)
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  validateLength(value, { min: 0, max: maxLength });
}

/**
 * Middleware to validate task input fields
 */
function validateTaskInput(req, res, next) {
  try {
    const { title, description, why } = req.body;

    validateFieldLength('Title', title, MAX_LENGTHS.TITLE);
    validateFieldLength('Description', description, MAX_LENGTHS.DESCRIPTION);
    validateFieldLength('Why', why, MAX_LENGTHS.WHY);

    // Validate tags if provided
    if (req.body.tags && Array.isArray(req.body.tags)) {
      for (const tag of req.body.tags) {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        validateFieldLength('Tag name', tagName, MAX_LENGTHS.TAG_NAME);
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Middleware to validate memo input fields
 */
function validateMemoInput(req, res, next) {
  try {
    const { title, content, details } = req.body;

    validateFieldLength('Title', title, MAX_LENGTHS.TITLE);
    validateFieldLength('Content', content, MAX_LENGTHS.MEMO_CONTENT);
    validateFieldLength('Details', details, MAX_LENGTHS.MEMO_DETAILS);

    // Validate tags if provided
    if (req.body.tags && Array.isArray(req.body.tags)) {
      for (const tag of req.body.tags) {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        validateFieldLength('Tag name', tagName, MAX_LENGTHS.TAG_NAME);
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Middleware to validate inbox item input fields
 */
function validateInboxInput(req, res, next) {
  try {
    const { content } = req.body;

    validateFieldLength('Content', content, MAX_LENGTHS.INBOX_CONTENT);

    // Validate tags if provided
    if (req.body.tags && Array.isArray(req.body.tags)) {
      for (const tag of req.body.tags) {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        validateFieldLength('Tag name', tagName, MAX_LENGTHS.TAG_NAME);
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Middleware to validate tag input fields
 */
function validateTagInput(req, res, next) {
  try {
    const { name } = req.body;

    validateFieldLength('Tag name', name, MAX_LENGTHS.TAG_NAME);

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Middleware to validate user registration/profile input
 */
function validateUserInput(req, res, next) {
  try {
    const { email, name } = req.body;

    validateFieldLength('Email', email, MAX_LENGTHS.EMAIL);
    validateFieldLength('Name', name, MAX_LENGTHS.NAME);

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Middleware to validate email settings input
 */
function validateEmailSettingsInput(req, res, next) {
  try {
    const { sender_email, sender_name, reply_to_email } = req.body;

    validateFieldLength('Sender email', sender_email, MAX_LENGTHS.EMAIL);
    validateFieldLength('Sender name', sender_name, MAX_LENGTHS.NAME);
    validateFieldLength('Reply-to email', reply_to_email, MAX_LENGTHS.EMAIL);

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generic middleware factory for custom validation rules
 *
 * @param {object} rules - Object mapping field names to max lengths
 * @returns {function} Express middleware function
 *
 * @example
 * const validateCustom = createValidator({
 *   customField: 1000,
 *   anotherField: 500
 * });
 * router.post('/custom', validateCustom, handler);
 */
function createValidator(rules) {
  return (req, res, next) => {
    try {
      for (const [fieldName, maxLength] of Object.entries(rules)) {
        const value = req.body[fieldName];
        validateFieldLength(fieldName, value, maxLength);
      }
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}

module.exports = {
  validateTaskInput,
  validateMemoInput,
  validateInboxInput,
  validateTagInput,
  validateUserInput,
  validateEmailSettingsInput,
  createValidator,
  MAX_LENGTHS
};
