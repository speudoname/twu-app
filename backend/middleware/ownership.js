const db = require('../database/db');

// ============================================================================
// Resource Ownership Verification Middleware
// ============================================================================
//
// This middleware eliminates 15+ duplicate ownership checks across all routes
// by providing reusable middleware functions.
//
// USAGE:
//   const { verifyTaskOwnership, verifyInboxOwnership } = require('./middleware/ownership');
//   router.put('/tasks/:id', verifyTaskOwnership, (req, res) => { ... });
// ============================================================================

/**
 * Generic ownership verification factory
 *
 * @param {string} table - Table name
 * @param {string} idParam - Route parameter name (default: 'id')
 * @param {string} userIdColumn - Column name for user ID (default: 'user_id')
 * @returns {function} Express middleware function
 */
function createOwnershipMiddleware(table, idParam = 'id', userIdColumn = 'user_id') {
  return (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: `${idParam} parameter is required`
        });
      }

      // Query the resource
      const query = `SELECT ${userIdColumn} FROM ${table} WHERE id = ?`;
      const resource = db.prepare(query).get(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: `${table.slice(0, -1)} not found`
        });
      }

      // Verify ownership
      if (resource[userIdColumn] !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource'
        });
      }

      // Attach resource to request for use in handler
      req.resource = resource;

      next();
    } catch (error) {
      console.error('Ownership verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to verify task ownership
 * Usage: router.put('/tasks/:id', verifyTaskOwnership, handler)
 */
const verifyTaskOwnership = createOwnershipMiddleware('tasks');

/**
 * Middleware to verify inbox item ownership
 * Usage: router.put('/inbox/:id', verifyInboxOwnership, handler)
 */
const verifyInboxOwnership = createOwnershipMiddleware('inbox_items');

/**
 * Middleware to verify memo ownership
 * Usage: router.put('/memos/:id', verifyMemoOwnership, handler)
 */
const verifyMemoOwnership = createOwnershipMiddleware('memos');

/**
 * Middleware to verify tag ownership
 * Usage: router.put('/tags/:id', verifyTagOwnership, handler)
 */
const verifyTagOwnership = createOwnershipMiddleware('tags');

/**
 * Optional: Middleware to verify ownership OR admin access
 * Useful for routes that admins should be able to access
 *
 * @param {string} table - Table name
 * @param {string} idParam - Route parameter name
 * @returns {function} Express middleware function
 */
function createOwnershipOrAdminMiddleware(table, idParam = 'id') {
  return (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin || req.user?.is_admin;

      // Admins bypass ownership check
      if (isAdmin) {
        return next();
      }

      // Otherwise, perform normal ownership check
      return createOwnershipMiddleware(table, idParam)(req, res, next);
    } catch (error) {
      console.error('Ownership/Admin verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * Batch ownership verification for multiple resources
 * Useful when operating on multiple items at once
 *
 * @param {string} table - Table name
 * @param {array} resourceIds - Array of resource IDs
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user owns all resources
 */
async function verifyBatchOwnership(table, resourceIds, userId) {
  if (!resourceIds || resourceIds.length === 0) {
    return true;
  }

  const placeholders = resourceIds.map(() => '?').join(',');
  const query = `
    SELECT COUNT(*) as count
    FROM ${table}
    WHERE id IN (${placeholders})
    AND user_id = ?
  `;

  const result = db.prepare(query).get(...resourceIds, userId);

  return result.count === resourceIds.length;
}

module.exports = {
  createOwnershipMiddleware,
  createOwnershipOrAdminMiddleware,
  verifyTaskOwnership,
  verifyInboxOwnership,
  verifyMemoOwnership,
  verifyTagOwnership,
  verifyBatchOwnership
};
