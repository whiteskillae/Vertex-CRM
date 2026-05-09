const { logActivity } = require('../utils/activityLogger');

/**
 * Middleware wrapper for logActivity utility
 */
const logActivityMiddleware = (actionLabel, entityLabel) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          if (!req.user) return;

          let action = actionLabel;
          let actionType = 'view';
          const method = req.method;

          if (method === 'POST') actionType = 'create';
          else if (method === 'PUT' || method === 'PATCH') actionType = 'update';
          else if (method === 'DELETE') actionType = 'delete';

          if (!action) {
            const url = req.originalUrl;
            if (url.includes('/leads')) action = 'Leads';
            else if (url.includes('/tasks')) action = 'Tasks';
            else if (url.includes('/reports')) action = 'Reports';
            else action = 'System';
            
            action = `${method === 'GET' ? 'Viewed' : (method === 'POST' ? 'Created' : 'Modified')} ${action}`;
          }

          await logActivity(req, {
            userId: req.user.id,
            action: action,
            actionType: actionType,
            entity: entityLabel || 'system',
            entityId: req.params.id || null,
            details: `HTTP ${method} ${req.originalUrl} - Status ${res.statusCode}`,
            changes: method !== 'GET' ? req.body : null
          });
        } catch (err) {
          console.error('❌ Middleware log failure:', err.message);
        }
      }
    });
    next();
  };
};

module.exports = logActivityMiddleware;
