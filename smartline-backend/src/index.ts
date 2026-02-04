// MUST BE FIRST: Patch Redis version check for Windows compatibility
import './config/redis-patch';

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config, isProduction } from './config/env';
import authRoutes from './routes/authRoutes';
import tripRoutes from './routes/tripRoutes';
import paymentRoutes from './routes/paymentRoutes';
import locationRoutes from './routes/locationRoutes';
import userRoutes from './routes/userRoutes';
import driverRoutes from './routes/driverRoutes';
import tripOfferRoutes from './routes/tripOfferRoutes';
import messageRoutes from './routes/messageRoutes';
import pricingRoutes from './routes/pricingRoutes';
import sosRoutes from './routes/sosRoutes';
import walletRoutes from './routes/walletRoutes';
import supportRoutes from './routes/supportRoutes';
import supportAdminRoutes from './routes/supportAdminRoutes';
import dashboardAuthRoutes from './routes/dashboardAuthRoutes';
<<<<<<< HEAD
import popupRoutes from './routes/popupRoutes';
import surgeRoutes from './routes/surgeRoutes';
=======
import driverPreferenceRoutes from './routes/driverPreferenceRoutes';
>>>>>>> f0b39f553b0cb350fc91f9a32385947ceef429de
import { checkDatabaseConnection } from './config/database';
import { checkRedisConnection } from './config/redis';
import { startLocationSync } from './workers/locationSyncWorker';
import { startRealtimeServer } from './realtime/realtimeServer';

const app = express();
const PORT = config.PORT;

// ===== Security Middleware =====

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS - Configure based on environment
const corsOptions = {
  origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Disable X-Powered-By header
app.disable('x-powered-by');

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/dashboard/auth', dashboardAuthRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trip-offers', tripOfferRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin/support', supportAdminRoutes);
<<<<<<< HEAD
app.use('/api/popups', popupRoutes);
app.use('/api/surge', surgeRoutes);
=======
app.use('/api/drivers/preferences', driverPreferenceRoutes);
>>>>>>> f0b39f553b0cb350fc91f9a32385947ceef429de

// ===== Health Check =====
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = await checkRedisConnection();

  const status = dbHealthy && redisHealthy ? 'ok' : 'degraded';
  const statusCode = status === 'ok' ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'SmartLine Backend API',
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// ===== Global Error Handler =====
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  // Don't expose error details in production
  const message = isProduction ? 'Internal server error' : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
});

// ===== Start Server =====
const server = http.createServer(app);
startRealtimeServer(server);

server.listen(PORT, async () => {
  console.log(`
🚀 SmartLine Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Port:        ${PORT}
  Environment: ${config.NODE_ENV}
  Timestamp:   ${new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Initialize background workers
  // Temporarily disabled due to Redis version incompatibility
  // TODO: Upgrade Redis to 5.0+ to enable background workers
  // try {
  //   await startLocationSync();
  //   console.log('✅ Background workers initialized\n');
  // } catch (error) {
  //   console.error('❌ Failed to initialize background workers:', error);
  // }
});
