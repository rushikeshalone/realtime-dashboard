require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { getPool } = require('./db');
const { connectRedis, isRedisAvailable } = require('./redis');
const { pollAll, fetchAllCached, CHANNELS } = require('./worker');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 1433;
const API_KEY = process.env.API_SECRET_KEY;
const FAST_INTERVAL = parseInt(process.env.POLL_INTERVAL_FAST) || 5000;   // 5s
const SLOW_INTERVAL = parseInt(process.env.POLL_INTERVAL_SLOW) || 30000;  // 30s

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', limiter);

// ============================================================
// API Key Auth Middleware
// ============================================================
const apiKeyAuth = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

// ============================================================
// Routes
// ============================================================
app.get('/', (req, res) => res.json({ message: 'Banking Dashboard API', version: '1.0.0' }));

// Health check (no auth required)
app.get('/health', (req, res) => res.json({
  status: 'OK',
  redis: isRedisAvailable(),
  timestamp: new Date().toISOString(),
}));

// Protected dashboard routes
app.use('/api/dashboard', apiKeyAuth, dashboardRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ============================================================
// Socket.IO Setup
// ============================================================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket middleware — authenticate with API key
io.use((socket, next) => {
  const key = socket.handshake.auth?.apiKey || socket.handshake.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return next(new Error('Authentication failed: invalid API key'));
  }
  next();
});

// Socket event handlers
io.on('connection', async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send all data immediately on connection
  try {
    const allData = await fetchAllCached();
    socket.emit('dashboard:init', {
      data: allData,
      timestamp: new Date().toISOString(),
    });
    console.log(`📦 Sent initial data to ${socket.id}`);
  } catch (err) {
    console.error('Failed to send initial data:', err.message);
  }

  // Client can request a specific channel refresh
  socket.on('refresh:channel', async (channel) => {
    const allowedChannels = Object.values(CHANNELS);
    if (!allowedChannels.includes(channel)) return;
    // Data will be sent on next poll
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} — ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`Socket error [${socket.id}]:`, err.message);
  });
});

// ============================================================
// Polling Worker — broadcast updates to all connected clients
// ============================================================
let pollInterval = null;

const startPolling = () => {
  const poll = async () => {
    if (io.engine.clientsCount === 0) return; // skip if no clients
    try {
      const updatedData = await pollAll();
      if (Object.keys(updatedData).length > 0) {
        io.emit('dashboard:update', {
          data: updatedData,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  };

  pollInterval = setInterval(poll, FAST_INTERVAL);
  console.log(`⏱  Polling every ${FAST_INTERVAL / 1000}s`);
};

// ============================================================
// Start Server
// ============================================================
let dbConnected = false;

const connectDBWithRetry = async () => {
  while (!dbConnected) {
    try {
      await getPool();
      dbConnected = true;
      console.log('✅ Database connected — starting data polling');
      startPolling();
    } catch (err) {
      console.error('⚠️  DB connection failed:', err.message);
      console.log('🔄 Retrying DB connection in 10 seconds...');
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
};

const start = async () => {
  // Try Redis (optional — never blocks startup)
  connectRedis().catch(() => { });

  // Handle port-in-use error clearly
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Run: taskkill /f /im node.exe`);
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });

  // Start HTTP + WebSocket server IMMEDIATELY (don't wait for DB)
  server.listen(PORT, () => {
    console.log(`\n🚀 Banking Dashboard Server running on http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${API_KEY?.substring(0, 8)}...`);
    console.log(`📡 WebSocket ready — connecting to DB in background...`);

    // Connect to DB in background — server stays up regardless
    connectDBWithRetry();
  });
};



// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  if (pollInterval) clearInterval(pollInterval);
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  if (pollInterval) clearInterval(pollInterval);
  server.close(() => process.exit(0));
});

start();
