import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config';
import authRoutes from './routes/authRoutes';
import itemRoutes from './routes/itemRoutes';
import approvalRoutes from './routes/approvalRoutes';
import bookingRoutes from './routes/bookingRoutes';
import claimRoutes from './routes/claimRoutes';
import chatRoutes from './routes/chatRoutes';
import communityRoutes from './routes/communityRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';

const app = express();
const server = http.createServer(app);

// Trust proxy for secure cookies and accurate HTTPS detection behind reverse proxy
app.set('trust proxy', 1);

// Configure CORS: Explicit origins or reflected origin for credentials compatibility
const isWildcardCors = CONFIG.CORS_ORIGIN === '*';
const allowedOrigins = isWildcardCors
  ? []
  : CONFIG.CORS_ORIGIN.split(',').map((o) => o.trim().toLowerCase());

const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
  // Allow requests with no origin (mobile apps, curl, server-to-server, same-origin)
  if (!origin) return callback(null, true);
  if (isWildcardCors) {
    // In staging with wildcard, dynamically reflect the incoming origin to allow credentials without browser rejection
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin.toLowerCase())) {
    return callback(null, true);
  }
  return callback(new Error(`CORS blocked: origin ${origin} is not allowed by CORS_ORIGIN policy`));
};

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: isWildcardCors ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Production Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (CONFIG.NODE_ENV !== 'production' || res.statusCode >= 400 || req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Middleware
app.use(cors({
  origin: corsOriginHandler,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'BorrowCircle Hyperlocal API',
    version: '1.0.0',
    market: 'India (INR ₹)',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Static uploads directory (supports persistent mounted volume via CONFIG.UPLOAD_DIR)
const uploadsStaticPath = CONFIG.UPLOAD_DIR;
if (fs.existsSync(uploadsStaticPath)) {
  app.use('/uploads', express.static(uploadsStaticPath));
}

// Socket.IO Real-Time Chat & Booking Status Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_booking_room', (bookingId: string) => {
    socket.join(`booking_${bookingId}`);
    console.log(`Socket ${socket.id} joined booking room: booking_${bookingId}`);
  });

  socket.on('send_booking_message', (data: any) => {
    io.to(`booking_${data.bookingId}`).emit('new_booking_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Serve frontend client build in full-stack mode
const clientDistPath = CONFIG.STATIC_CLIENT_PATH || path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 Handler if client build not present (e.g. standalone API mode)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found on BorrowCircle API' });
  });
}

// Global Centralized Error Handler (masks internal stack traces in production)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[API Server Error ${new Date().toISOString()}]:`, err);
  const status = err.status || (typeof err.statusCode === 'number' ? err.statusCode : 500);
  const message = CONFIG.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred. Please try again later.'
    : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

// Graceful Shutdown Handlers
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[BorrowCircle] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[BorrowCircle] HTTP server closed.');
    try {
      const { prisma } = require('./prisma');
      await prisma.$disconnect();
      console.log('[BorrowCircle] Database connections closed.');
    } catch (e) {
      console.error('[BorrowCircle] Error during database disconnect:', e);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start Server
server.listen(CONFIG.PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 BorrowCircle Staging/Production Server Active`);
  console.log(`  📍 Environment: ${CONFIG.NODE_ENV}`);
  console.log(`  🔌 Port: ${CONFIG.PORT}`);
  console.log(`  🛡️ CORS Allowed Origins: ${CONFIG.CORS_ORIGIN}`);
  console.log(`  ✨ Tagline: Borrow Anything. Share Everything.`);
  console.log(`  🇮🇳 Market: Hyperlocal India (INR ₹, +91, UPI, Dual OTP)`);
  console.log(`=======================================================`);
});

export { app, server, io };
