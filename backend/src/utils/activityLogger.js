const ActivityLog = require('../models/ActivityLog');

/**
 * Core logging function that can be called from anywhere (controllers or middleware)
 */
const logActivity = async (req, { 
    userId = null, 
    action, 
    actionType = 'view', 
    entity = 'system', 
    entityId = null, 
    details = '', 
    changes = null,
    page = null 
}) => {
    try {
        const ua = req.headers['user-agent'] || '';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        
        // Simple manual parsing
        let device = 'Desktop';
        if (/mobile/i.test(ua)) device = 'Mobile';
        else if (/tablet/i.test(ua)) device = 'Tablet';
        
        let browser = 'Unknown';
        if (/chrome/i.test(ua)) browser = 'Chrome';
        else if (/firefox/i.test(ua)) browser = 'Firefox';
        else if (/safari/i.test(ua)) browser = 'Safari';
        else if (/edge/i.test(ua)) browser = 'Edge';

        let os = 'Unknown';
        if (/windows/i.test(ua)) os = 'Windows';
        else if (/mac/i.test(ua)) os = 'MacOS';
        else if (/linux/i.test(ua)) os = 'Linux';
        else if (/android/i.test(ua)) os = 'Android';
        else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

        const log = new ActivityLog({
            user: userId || req.user?.id,
            action,
            actionType,
            entity,
            entityId,
            page: page || req.originalUrl,
            details,
            changes,
            ip,
            userAgent: ua,
            device,
            browser,
            os,
            timestamp: new Date()
        });

        await log.save();
        return log;
    } catch (error) {
        console.error('❌ ACTIVITY LOGGING ERROR:', error.message);
    }
};

module.exports = { logActivity };
