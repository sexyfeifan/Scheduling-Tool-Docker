const cors = require('cors');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { BACKUP_PASSWORD, CLIENT_DIR } = require('./config');
const logger = require('./logger');
const pinoHttp = require('pino-http');
const { securityHeaders } = require('./middleware/securityHeaders');
const { createRequireAdminPassword, createRequireEditAccess, csrfProtection } = require('./middleware/auth');
const { verifyPassword } = require('./utils/normalize');
const { createBackupRouter } = require('./routes/backup');
const { createSchedulesRouter } = require('./routes/schedules');
const { createSettingsRouter } = require('./routes/settings');
const { createSystemRouter } = require('./routes/system');
const { createHistoryRouter } = require('./routes/history');
const { createWebhookRouter } = require('./routes/webhook');
const { createCalendarRouter } = require('./routes/calendar');
const { createExportRouter } = require('./routes/export');
const { createBatchRouter } = require('./routes/batch');
const { createSearchRouter } = require('./routes/search');
const { createConflictRouter } = require('./routes/conflict');
const { createStatisticsRouter } = require('./routes/statistics');
const { createBackupService } = require('./services/backupService');
const { createSqliteStore } = require('./services/sqliteStore');

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' }
});

const backupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' }
});

function createApp(options = {}) {
  const app = express();
  const store = options.store || createSqliteStore(options);
  const backupService = createBackupService(store);
  const backupPassword = options.backupPassword || BACKUP_PASSWORD;
  let connectedClients = [];

  // Helmet security headers
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.loli.net"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.loli.net", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  app.disable('x-powered-by');
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(securityHeaders);
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/events' } }));
  app.use(csrfProtection);

  // HTTPS redirect hint for production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.status(403).json({ message: 'HTTPS required in production' });
      }
      next();
    });
  }

  function sendUpdateToClients(data) {
    connectedClients.forEach((client) => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }

  // 认证中间件（从 middleware/auth.js 加载）
  const requireAdminPassword = createRequireAdminPassword(backupPassword);
  const requireEditAccess = createRequireEditAccess(store);

  function baseUrlFromRequest(req) {
    return `${req.protocol}://${req.get('host')}`;
  }

  // SSE endpoint — read-only real-time sync, no auth required (write endpoints are protected)
  app.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    res.write(': connected\n\n');
    connectedClients.push(res);

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      connectedClients = connectedClients.filter((client) => client !== res);
    });
  });

  // Apply rate limiters to sensitive routes before mounting routers
  app.use('/api/verify-password', passwordLimiter);
  app.use('/api/backup', backupLimiter);
  app.use('/api/restore', backupLimiter);

  app.use('/api/schedules', createSchedulesRouter({ requireEditAccess, sendUpdateToClients, store }));
  app.use('/api', createBackupRouter({
    backupPassword,
    backupService,
    requireAdminPassword,
    requireEditAccess,
    sendUpdateToClients,
    store
  }));
  app.use('/api/settings', createSettingsRouter({
    baseUrlFromRequest,
    requireAdminPassword,
    requireEditAccess,
    sendUpdateToClients,
    store
  }));
  app.use('/api/history', createHistoryRouter({ requireAdminPassword, store }));
  app.use('/api/webhook', createWebhookRouter({ requireAdminPassword, store }));
  app.use('/api/calendar', createCalendarRouter({ store }));
  app.use('/api/export', createExportRouter({ store }));
  app.use('/api/schedules/batch', createBatchRouter({ requireEditAccess, sendUpdateToClients, store }));
  app.use('/api/schedules/search', createSearchRouter({ store }));
  app.use('/api/schedules/conflicts', createConflictRouter({ store }));
  app.use('/api/statistics', createStatisticsRouter({ store }));
  app.use('/api', createSystemRouter({ store }));

  app.use(express.static(CLIENT_DIR));
  app.get('/', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));
  app.get('/notice', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'preview.html')));

  app.use((error, req, res, next) => {
    logger.error(error);
    const statusCode = error && error.message && /无效/.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ message: error.message || '服务器错误' });
  });

  // Auto-backup: daily at 03:00
  const autoCronJob = cron.schedule('0 3 * * *', async () => {
    try {
      await backupService.createBackup();
      logger.info('自动备份完成');
    } catch (err) {
      logger.error(err, '自动备份失败');
    }
  });

  function stop() {
    autoCronJob.stop();
    connectedClients.forEach((c) => {
      try { c.end(); } catch (_) {}
    });
    connectedClients = [];
    if (store.db) {
      try { store.db.close(); } catch (_) {}
    }
  }

  return { app, backupService, store, stop };
}

module.exports = { createApp };
