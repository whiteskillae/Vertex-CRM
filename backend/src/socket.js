const { Server } = require('socket.io');
const MonitoringSession = require('./models/MonitoringSession');

let io;
// Keep track of active streamers: userId -> socketId
const activeStreamers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://vertex-crm-three.vercel.app',
          'https://vertex-crm.onrender.com'
        ];
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('render.com')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId);
      socket.userId = userId;
      console.log(`User ${userId} joined their personal room`);
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
    socket.on('screen:request', ({ to }) => {
      socket.to(to).emit('screen:request', { from: socket.userId });
    });

    socket.on('screen:offer', ({ to, offer }) => {
      socket.to(to).emit('screen:offer', { from: socket.userId, offer });
    });

    socket.on('screen:answer', ({ to, answer }) => {
      socket.to(to).emit('screen:answer', { from: socket.userId, answer });
    });

    socket.on('screen:candidate', ({ to, candidate }) => {
      socket.to(to).emit('screen:candidate', { from: socket.userId, candidate });
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
