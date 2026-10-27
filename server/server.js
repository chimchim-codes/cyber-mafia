const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const env = require('./config/env');
const { connectDB, disconnectDB, getConnectionStatus } = require('./db/connection');
const { initChatSocket } = require('./sockets/chatSocket');

// Routes
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const faqRoutes = require('./routes/faqRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Initialize real-time chat socket handlers
initChatSocket(io);

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({
    status: 'healthy',
    service: 'SupportHub Real-Time AI Chatbot Server',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: dbStatus,
    openaiConfigured: Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0),
    environment: env.NODE_ENV,
  });
});

// Serve frontend build if present (for unified single-port or full deployment)
const distPath = path.join(__dirname, '../dist');
const clientDistPath = path.join(__dirname, '../client/dist');
const staticPath = require('fs').existsSync(distPath) ? distPath : clientDistPath;

if (require('fs').existsSync(staticPath)) {
  console.log(`📁 Serving client static assets from ${staticPath}`);
  app.use(express.static(staticPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  try {
    await connectDB();
    const port = env.PORT;
    server.listen(port, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 SupportHub Server running on http://localhost:${port}`);
      console.log(`⚡ WebSocket / Socket.IO live and accepting connections`);
      console.log(`📊 Health Check: http://localhost:${port}/api/health`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful termination handling
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down SupportHub server...');
  await disconnectDB();
  server.close(() => {
    console.log('HTTP and Socket server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received, shutting down...');
  await disconnectDB();
  server.close(() => process.exit(0));
});

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
