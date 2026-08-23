const jwt = require('jsonwebtoken');
require('dotenv').config();

// Checks if a valid token was sent
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded; // { id, role }
    next();
  });
}

// Checks if the logged-in user has one of the allowed roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied for your role' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };