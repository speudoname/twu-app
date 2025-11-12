const adminAuthMiddleware = (req, res, next) => {
  // This middleware should be used AFTER the regular auth middleware
  // It assumes req.user is already set

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

module.exports = adminAuthMiddleware;