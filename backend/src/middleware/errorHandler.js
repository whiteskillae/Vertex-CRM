// ── Centralized Error Handler Middleware ──────────────────────────────────────
// Returns safe, generic messages in production while logging full details
// to the server console. In development, full error details are returned.

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log full error details server-side
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (!isProduction) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    message: isProduction && statusCode === 500
      ? 'An internal server error occurred'
      : err.message || 'Server error',
    ...((!isProduction) && { stack: err.stack }),
  });
};

module.exports = errorHandler;
