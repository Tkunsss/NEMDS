// server.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

function getAllowedOrigins() {
  const configured = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`[cors] blocked origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

const { testConnection } = require('./config/db');
const { cleanupPendingCalls } = require('./utils/pendingCleanup');
const { createJsonBodyParser, handlePayloadTooLarge } = require('./middleware/requestBody');

const authRoutes = require('./routes/authRoutes');
const callRoutes = require('./routes/callRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverAssignmentRoutes = require('./routes/driverAssignmentRoutes');
const placesRoutes = require('./routes/placesRoutes');
const proximityRoutes = require('./routes/proximityRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PATCH'] }
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(createJsonBodyParser(4));

// Make io accessible inside controllers via req.app.get('io')
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'NCEMDS API is running' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver-assignments', driverAssignmentRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/proximity', proximityRoutes);

// Socket.io: detailed logging to help diagnose frequent connect/disconnects
io.on('connection', (socket) => {
  try {
    console.log('Socket connected:', socket.id);
    // Log handshake + auth/query info (helpful to see why server may reject)
    try {
      const { headers, auth, query } = socket.handshake || {};
      console.log('  handshake.auth:', JSON.stringify(auth || {}));
      console.log('  handshake.query:', JSON.stringify(query || {}));
      // Avoid logging huge header objects, but show important pieces
      console.log('  handshake.headers.sample:', {
        origin: headers && headers.origin,
        referer: headers && headers.referer,
        'user-agent': headers && headers['user-agent']
      });
    } catch (e) {
      console.log('  failed to stringify handshake info', e && e.message);
    }

    // Apps join rooms based on role: 'dispatchers', 'driver_<id>', 'caller_<callId>'
    socket.on('join_room', (roomName) => {
      console.log(`  socket ${socket.id} joining room: ${roomName}`);
      socket.join(roomName);
    });

    socket.on('disconnect', (reason) => {
      // reason is a short string: 'ping timeout', 'transport close', etc.
      console.log('Socket disconnected:', socket.id, 'reason:', reason);
      // If available, log last received packet info
      try {
        const lastPacket = socket.lastPacket || null;
        if (lastPacket) console.log('  lastPacket:', JSON.stringify(lastPacket));
      } catch (e) {
        // ignore
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connect_error for', socket.id, err && err.message);
    });
  } catch (err) {
    console.error('Socket logging error:', err);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(handlePayloadTooLarge);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const net = require('net');
const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Keep track of ports we've attempted to avoid retrying same port
const triedPorts = new Set();
const MAX_RETRIES = 50;

// Handle runtime listen errors (e.g. race where a port becomes taken between check and listen)
server.on('error', async (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.warn('Runtime EADDRINUSE received when attempting to listen. Trying next free port...');
    triedPorts.add(err.port || PORT);
    for (let offset = 1; offset <= MAX_RETRIES; offset += 1) {
      const candidate = PORT + offset;
      if (triedPorts.has(candidate)) continue;
      try {
        const free = await isPortFree(candidate);
        if (free) {
          console.warn(`Retrying listen on fallback port ${candidate}`);
          triedPorts.add(candidate);
          server.listen(candidate, HOST, async () => {
            console.log(`🚑 NCEMDS backend running on host ${HOST} port ${candidate}`);
            await testConnection();
          });
          return;
        }
      } catch (e) {
        // ignore and continue
      }
    }

    console.error(`Could not find a free port after ${MAX_RETRIES} retries. Please free port ${PORT} and retry.`);
    process.exit(1);
  }

  console.error('Server encountered an error:', err);
  process.exit(1);
});

// Check if a port is free
function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') return resolve(false);
        return resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port);
  });
}

// Find a free port starting from desired PORT up to PORT+10
(async () => {
  try {
    let actualPort = PORT;
    let free = await isPortFree(actualPort);
    if (!free) {
      for (let p = PORT + 1; p <= PORT + 10; p += 1) {
        if (await isPortFree(p)) {
          actualPort = p;
          free = true;
          break;
        }
      }
    }

    if (!free) {
      console.error(`Port ${PORT} is in use and no fallback port found in range ${PORT + 1}-${PORT + 10}.`);
      console.error(`Free the port with: netstat -ano | findstr :${PORT} && taskkill /PID <pid> /F`);
      process.exit(1);
    }

    if (actualPort !== PORT) {
      console.warn(`Port ${PORT} is in use; falling back to available port ${actualPort}.`);
    }

    server.listen(actualPort, HOST, async () => {
      console.log(`🚑 NCEMDS backend running on host ${HOST} port ${actualPort}`);
      await testConnection();
      try {
        const cleanupResult = await cleanupPendingCalls();
        console.log('Pending cleanup applied:', cleanupResult);
      } catch (cleanupErr) {
        console.warn('Pending cleanup skipped:', cleanupErr.message);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
