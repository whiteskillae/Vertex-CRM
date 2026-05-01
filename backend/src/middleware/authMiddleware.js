const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── CRITICAL: Never use a fallback secret ────────────────────────────────────
// JWT_SECRET is validated at startup by validateEnv.js.
// Using process.env.JWT_SECRET directly ensures the server crashes loudly
// if it's missing rather than silently using an insecure default.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ [FATAL] JWT_SECRET is missing in production environment!');
}

const protect = async (req, res, next) => {
  let token;

  // 1. Check Cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  // 2. Check Authorization Header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        console.warn(`[AUTH] 401: Token valid but user ${decoded.id} no longer exists`);
        return res.status(401).json({ message: 'User account no longer exists. Please re-login.' });
      }

      return next();
    } catch (error) {
      console.error(`[AUTH] 401: Token verification failed: ${error.message}`);
      const message = error.name === 'TokenExpiredError' 
        ? 'Session expired. Please login again.' 
        : 'Invalid session. Please login again.';
      return res.status(401).json({ message });
    }
  } else {
    // No token provided
    console.warn(`[AUTH] 401: No token detected in request to ${req.originalUrl}`);
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const manager = (req, res, next) => {
  if (req.user && (req.user.role === 'manager' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a manager' });
  }
};

// ── NEW: Optional protect middleware ─────────────────────────────────────────
// Attaches user to req if a valid token is present, but does NOT block
// unauthenticated requests. Used for the register route to allow the
// first-ever registration without a token.
const optionalProtect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token invalid — continue without user
    }
  }

  next();
};

module.exports = { protect, admin, manager, optionalProtect };
