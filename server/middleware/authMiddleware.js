const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT auth middleware
 *
 * JWT (JSON Web Token) is a signed token issued at login.
 * The client sends it in the Authorization header: Bearer <token>
 * We verify the signature with JWT_SECRET and attach the user to req.
 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/** Optional auth — attaches user if token present, otherwise continues */
async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {
    // ignore invalid optional tokens
  }
  next();
}

module.exports = { protect, optionalAuth };
