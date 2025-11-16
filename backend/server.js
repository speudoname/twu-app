const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const sanitizeHtml = require('sanitize-html');
require('dotenv').config();

// ============================================================================
// CRITICAL SECURITY: Validate Environment Variables on Startup
// ============================================================================
function validateEnvironment() {
  const errors = [];

  // JWT_SECRET validation (CRITICAL #6)
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters for security');
  }

  // Add warnings for missing optional variables
  if (!process.env.ALLOWED_ORIGINS && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: ALLOWED_ORIGINS not set. Using default http://localhost:3000');
  }

  if (errors.length > 0) {
    console.error('\n❌ FATAL: Environment validation failed:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\nPlease check your .env file and fix the issues above.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

validateEnvironment();

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');
const inboxRoutes = require('./routes/inbox');
const memosRoutes = require('./routes/memos');
const tagsRoutes = require('./routes/tags');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for rate limiting behind reverse proxy
// Set to 1 to trust only the first proxy hop (more secure than 'true')
app.set('trust proxy', 1);

// ============================================================================
// SECURITY MIDDLEWARE (CRITICAL #11)
// ============================================================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration (CRITICAL #5)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Compression for response size optimization
app.use(compression());

// Body parsing with size limits to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// RATE LIMITING (CRITICAL #4)
// ============================================================================

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  validate: { trustProxy: false, xForwardedForHeader: false }
});

// Refresh token rate limiter (more permissive than auth, but still limited)
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow 20 token refreshes per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many token refresh attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false }
});

// Email sending rate limiter (very strict to prevent spam)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 email sends per hour
  message: {
    success: false,
    message: 'Too many email requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false }
});

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Request logging middleware (CRITICAL #7 - Removed sensitive data)
app.use((req, res, next) => {
  // Only log method and path, no sensitive headers or body
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (CRITICAL #7 - Removed environment exposure)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
    // Removed: environment - security risk
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes); // Strict rate limiting on auth
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/memos', memosRoutes);
app.use('/api/tags', tagsRoutes);

// Serve static files in production with proper caching
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');

  // Cache static assets for 1 year
  app.use(express.static(frontendBuildPath, {
    maxAge: '1y',
    immutable: true,
    etag: true
  }));

  // Handle React routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler (CRITICAL #7 - Never expose stack traces)
app.use((err, req, res, next) => {
  // Log full error server-side for debugging
  console.error('Error occurred:', {
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Only log stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Send safe error response to client (NEVER include stack trace)
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN (CRITICAL #17)
// ============================================================================
const db = require('./database/db');

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close database connection
  try {
    db.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }

  // Exit process
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  gracefulShutdown('UNCAUGHT EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED REJECTION');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║         TWU Backend Server             ║
║                                        ║
║  Status: ✅ Running Securely           ║
║  Port: ${PORT}                            ║
║  Mode: ${process.env.NODE_ENV || 'development'}                  ║
║                                        ║
║  Security Features:                    ║
║  ✅ Helmet (Security Headers)          ║
║  ✅ CORS Protection                    ║
║  ✅ Rate Limiting                      ║
║  ✅ Input Validation                   ║
║  ✅ Compression                        ║
║                                        ║
║  Endpoints:                            ║
║  - /api/health                         ║
║  - /api/auth/*                         ║
║  - /api/tasks/*                        ║
║  - /api/admin/*                        ║
║  - /api/inbox/*                        ║
║  - /api/memos/*                        ║
║  - /api/tags/*                         ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app; // Export for testing
