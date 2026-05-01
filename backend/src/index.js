const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// ── FIX: Validate environment variables BEFORE anything else ─────────────────
const validateEnv = require('./config/validateEnv');
validateEnv();

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const taskRoutes = require('./routes/taskRoutes');
const reportRoutes = require('./routes/reportRoutes');
const messageRoutes = require('./routes/messageRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const todoRoutes = require('./routes/todoRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const storageRoutes = require('./routes/storageRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// ── FIX: Production-safe CORS configuration ─────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://vertex-crm-three.vercel.app',
  'https://vertex-crm.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                     origin.endsWith('.vercel.app') ||
                     origin.includes('render.com');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS REJECTED] Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Cookie'
  ],
  exposedHeaders: ['Set-Cookie']
}));

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Disable CSP for now to ensure all scripts (Google, Cloudinary, etc.) load
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: mongoStatus === 1 ? 'healthy' : 'unhealthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: statusMap[mongoStatus] || 'unknown',
  });
});

// ── FIX: Legacy/Malformed URL Redirect ───────────────────────────────────────
// If a request hits /auth/login instead of /api/auth/login, we redirect it.
app.use('/auth', (req, res) => {
  const newPath = `/api/auth${req.path}`;
  console.log(`[REDIRECT] Malformed request to ${req.originalUrl} -> ${newPath}`);
  res.redirect(307, newPath); // 307 preserves the POST method and body
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/logs', require('./routes/logRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'CRM Backend API is running...', port: process.env.PORT || 5001, version: '2.0.6' });
});

// ── FIX: Centralized error handler (must be AFTER routes) ────────────────────
app.use(errorHandler);

// ── Auto-seed Admin User ─────────────────────────────────────────────────────
const seedAdmin = async () => {
  try {
    const User = require('./models/User');
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@crm.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    // Check for the designated admin email specifically
    let designatedUser = await User.findOne({ email: adminEmail });

    if (!designatedUser) {
      // Create fresh admin if email not taken
      designatedUser = new User({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword, 
        role: 'admin',
        status: 'active',
        isVerified: true,
      });
      await designatedUser.save();
      console.log(`\n🚀 [SEEDER] NEW ADMIN CREATED: ${adminEmail}`);
    } else {
      // Ensure admin is active and password matches the current environment variable
      designatedUser.role = 'admin';
      designatedUser.status = 'active';
      designatedUser.isVerified = true;
      designatedUser.password = adminPassword; // Middleware will re-hash if modified
      await designatedUser.save();
      console.log(`\n🔐 [SEEDER] SYSTEM READY: Admin node synchronized`);
    }

    console.log(`ℹ️  [SEEDER] Access email: ${adminEmail}\n`);
  } catch (err) {
    console.error('❌ [SEEDER] ERROR:', err.message);
  }
};
// ─────────────────────────────────────────────────────────────────────────────


// MongoDB Connection
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

const http = require('http');
const server = http.createServer(app);
const { initSocket } = require('./socket');
const io = initSocket(server);

mongoose.connect(MONGODB_URI, { family: 4 })
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    const { transporter } = require('./config/emailService');

    // Verify SMTP connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('╔══════════════════════════════════════════════════════════╗');
        console.error('║  SMTP CONNECTION FAILED                                  ║');
        console.error('╚══════════════════════════════════════════════════════════╝');
        console.error(`Error: ${error.message}`);
      } else {
        console.log('📧 SMTP Server is ready to send emails');
      }
    });
    await seedAdmin(); // Seed admin on every startup (safe — checks first)
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });

    // ── EADDRINUSE: Graceful port conflict handling ───────────────────────────
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ PORT ${PORT} IS ALREADY IN USE.`);
        console.error(`   Run: npx kill-port ${PORT}  — then restart the server.\n`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
