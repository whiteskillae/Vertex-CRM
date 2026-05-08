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
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://vertex-crm-three.vercel.app', 'https://vertex-crm.onrender.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    transports: ['polling', 'websocket']
  });

  // ── FIX: Socket Authentication Middleware ──────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) return next(new Error('Authentication error: No cookies found'));

      const parsedCookies = cookie.parse(cookies);
      const token = parsedCookies.token;

      if (!token) return next(new Error('Authentication error: Token missing'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      console.error('Socket Auth Error:', err.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id} (User: ${socket.userId})`);

    // Users automatically join their personal room on connection
    socket.join(socket.userId);
    console.log(`Socket ${socket.id} automatically joined room: ${socket.userId}`);

    // Still handle 'join' for backward compatibility or explicit room management
    socket.on('join', (userId) => {
      if (userId === socket.userId) {
        socket.join(userId);
      }
    });

    // ── Screen Sharing & Monitoring ──

    // Employee starts sharing
    socket.on('screen:start', async ({ userId }) => {
      activeStreamers.set(userId, socket.id);
      socket.broadcast.emit('monitoring:update', { userId, status: 'sharing' });
      
      try {
        const session = new MonitoringSession({ employeeId: userId });
        await session.save();
        socket.sessionId = session._id;
      } catch (err) {
        console.error('Error starting monitoring session:', err);
      }
    });

    // Employee stops sharing
    socket.on('screen:stop', async ({ userId }) => {
      activeStreamers.delete(userId);
      socket.broadcast.emit('monitoring:update', { userId, status: 'online' });
      
      if (socket.sessionId) {
        try {
          await MonitoringSession.findByIdAndUpdate(socket.sessionId, { 
            endTime: new Date(), 
            status: 'ended' 
          });
        } catch (err) {
          console.error('Error ending monitoring session:', err);
        }
      }
    });

    // WebRTC Signaling
    socket.on('screen:request', ({ to, viewerId }) => {
      socket.to(to).emit('screen:request', { from: socket.userId, viewerId });
    });

    socket.on('screen:offer', ({ to, viewerId, offer }) => {
      socket.to(to).emit('screen:offer', { from: socket.userId, viewerId, offer });
    });

    socket.on('screen:answer', ({ to, viewerId, answer }) => {
      socket.to(to).emit('screen:answer', { from: socket.userId, viewerId, answer });
    });

    socket.on('screen:candidate', ({ to, viewerId, candidate }) => {
      socket.to(to).emit('screen:candidate', { from: socket.userId, viewerId, candidate });
    });

    // Activity Updates
    socket.on('activity:update', async ({ userId, status, metadata }) => {
      socket.broadcast.emit('monitoring:activity', { userId, status, metadata });
      
      if (socket.sessionId) {
        try {
          await MonitoringSession.findByIdAndUpdate(socket.sessionId, {
            $push: { activityLogs: { type: status, metadata, timestamp: new Date() } }
          });
        } catch (err) {
          console.error('Error logging activity:', err);
        }
      }
    });

    // Admin Messages
    socket.on('admin:message', ({ to, message }) => {
      socket.to(to).emit('admin:message', { message, timestamp: new Date() });
    });

    // Chat Typing Indicators
    socket.on('typing', ({ to, isTyping }) => {
      socket.to(to).emit('typing', { from: socket.userId, isTyping });
    });

    socket.on('team:typing', ({ isTyping, userName }) => {
      socket.broadcast.emit('team:typing', { userId: socket.userId, userName, isTyping });
    });

    socket.on('team:message', (data) => {
      io.emit('team_message', data);
    });

    socket.on('disconnect', async () => {
      if (socket.userId && activeStreamers.get(socket.userId) === socket.id) {
        activeStreamers.delete(socket.userId);
        socket.broadcast.emit('monitoring:update', { userId: socket.userId, status: 'offline' });
        
        if (socket.sessionId) {
          try {
            await MonitoringSession.findByIdAndUpdate(socket.sessionId, { 
              endTime: new Date(), 
              status: 'interrupted' 
            });
          } catch (err) {
            console.error('Error interrupting monitoring session:', err);
          }
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const getActiveStreamers = () => activeStreamers;

module.exports = { initSocket, getIO, getActiveStreamers };
