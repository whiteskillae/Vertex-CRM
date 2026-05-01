const ActivityLog = require('../models/ActivityLog');

const logActivity = (action, entity) => {
  return async (req, res, next) => {
    // We'll log after the response is sent
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          if (!req.user) return; // Only log authenticated actions

          await ActivityLog.create({
            user: req.user.id,
            action,
            entity,
            entityId: req.params.id || null,
            details: {
              method: req.method,
              url: req.originalUrl,
              body: req.method !== 'GET' ? req.body : undefined,
              status: res.statusCode
            },
            ip: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent']
          });
        } catch (err) {
          console.error('Activity log failure:', err.message);
        }
      }
    });
    next();
  };
};

module.exports = logActivity;
