// middleware/authMiddleware.js
const { verifyToken } = require('../utils/jwt');

// Verifies the JWT and attaches decoded user info to req.user
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { user_id, role, full_name }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Restricts access to specific roles. Usage: requireRole('admin', 'dispatcher')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Allows guest callers through (caller app permits anonymous emergency reports)
// but attaches user info if a valid token IS present.
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
    } catch (err) {
      // ignore invalid token for optional auth, just proceed as guest
    }
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
