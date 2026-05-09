const { Server } = require('socket.io');
const MonitoringSession = require('./models/MonitoringSession');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;
const activeStreamers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // More permissive for debugging
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 5e6, // Increase to 5MB for larger frames
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ── Authentication Middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      let token = null;
      
      // 1. Try handshake.auth (client-side passed) - Prioritize this
      if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      }

      // 2. Try Cookies
      if (!token) {
        const cookies = socket.handshake.headers.cookie;
        if (cookies) {
          const parsedCookies = cookie.parse(cookies);
          token = parsedCookies.token;
        }
      }

      // 3. Try query params
      if (!token && socket.handshake.query && socket.handshake.query.token) {
        token = socket.handshake.query.token;
      }

      console.log(`[SOCKET AUTH] Checking token for socket ${socket.id}. Found: ${!!token}`);

      if (!token) {
        console.error(`[SOCKET AUTH] Denied: No token for socket ${socket.id}`);
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      console.error('Socket Auth Error:', err.message);
      next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Node Connected: ${socket.id} (User: ${socket.userId})`);

    // Basic Room Setup
    socket.join(socket.userId);
    if (socket.user.role === 'admin' || socket.user.role === 'manager') {
      socket.join('admin-room');
    }

    // ── Monitoring Logic ──

    // Start Session
    socket.on('monitoring:start', async ({ userName }) => {
      activeStreamers.set(socket.userId, { socketId: socket.id, userName, status: 'sharing' });
      io.to('admin-room').emit('monitoring:update', { userId: socket.userId, userName, status: 'sharing' });
      
      try {
        const session = new MonitoringSession({ employeeId: socket.userId, startTime: new Date(), status: 'active' });
        await session.save();
        socket.sessionId = session._id;
      } catch (err) {
        console.error('[SOCKET] Error starting session:', err);
      }
    });

    // Frame Capture (Frame-based Streaming)
    socket.on('monitoring:frame', (data) => {
      if (!socket.userId) return;

      // Auto-register streamer if not already done
      if (!activeStreamers.has(socket.userId)) {
        activeStreamers.set(socket.userId, { 
          socketId: socket.id, 
          status: 'sharing',
          lastSeen: Date.now()
        });
      }
      
      const room = `stream:${socket.userId}`;
      const frameSize = data.frame ? Math.round(data.frame.length / 1024) : 0;
      
      // Only log every 20th frame to avoid log spam, but verify it's working
      if (Math.random() < 0.05) {
        console.log(`[STREAM] Packet from ${socket.userId}: ${frameSize}KB -> Room: ${room}`);
      }

      io.to(room).emit('monitoring:frame', { 
        ...data,
        userId: socket.userId,
        timestamp: Date.now() 
      });
    });

    // Viewer Subscription
    socket.on('monitoring:subscribe', (targetUserId) => {
      if (!targetUserId) return;
      const room = `stream:${targetUserId}`;
      console.log(`[SOCKET] Admin ${socket.userId} joining room: ${room}`);
      socket.join(room);
      
      // Immediately notify the streamer
      io.to(targetUserId).emit('admin:watching', { adminId: socket.userId });
    });

    socket.on('monitoring:unsubscribe', (targetUserId) => {
      if (!targetUserId) return;
      const room = `stream:${targetUserId}`;
      console.log(`[SOCKET] Admin ${socket.userId} leaving room: ${room}`);
      socket.leave(room);
    });

    // Stop Session
    socket.on('monitoring:stop', async () => {
      activeStreamers.delete(socket.userId);
      io.to('admin-room').emit('monitoring:update', { userId: socket.userId, status: 'online' });
      
      if (socket.sessionId) {
        try {
          await MonitoringSession.findByIdAndUpdate(socket.sessionId, { 
            endTime: new Date(), 
            status: 'ended' 
          });
          socket.sessionId = null;
        } catch (err) {
          console.error('[SOCKET] Error ending session:', err);
        }
      }
    });

    // WebRTC Signaling (kept as backup/alternative)
    socket.on('screen:signal', ({ to, data }) => {
      socket.to(to).emit('screen:signal', { from: socket.userId, data });
    });

    // Activity Updates
    socket.on('activity:update', async ({ status, metadata }) => {
      io.to('admin-room').emit('monitoring:activity', { userId: socket.userId, status, metadata });
      
      if (socket.sessionId) {
        try {
          await MonitoringSession.findByIdAndUpdate(socket.sessionId, {
            $push: { activityLogs: { type: status, metadata, timestamp: new Date() } }
          });
        } catch (err) {
          console.error('[SOCKET] Error logging activity:', err);
        }
      }
    });

    // Chat & Messaging
    socket.on('message:send', (data) => {
      const { to, message, type } = data;
      if (to) {
        socket.to(to).emit('message:new', { from: socket.userId, message, type, timestamp: new Date() });
      }
    });

    socket.on('disconnect', async () => {
      if (activeStreamers.has(socket.userId) && activeStreamers.get(socket.userId).socketId === socket.id) {
        activeStreamers.delete(socket.userId);
        io.to('admin-room').emit('monitoring:update', { userId: socket.userId, status: 'offline' });
        
        if (socket.sessionId) {
          try {
            await MonitoringSession.findByIdAndUpdate(socket.sessionId, { 
              endTime: new Date(), 
              status: 'interrupted' 
            });
          } catch (err) {
            console.error('[SOCKET] Error interrupting session:', err);
          }
        }
      }
      console.log(`[SOCKET] Node Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

const getActiveStreamers = () => activeStreamers;

module.exports = { initSocket, getIO, getActiveStreamers };
