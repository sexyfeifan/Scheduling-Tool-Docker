const cors = require('cors');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { BACKUP_PASSWORD, CLIENT_DIR } = require('./config');
const { securityHeaders } = require('./middleware/securityHeaders');
const { createBackupRouter } = require('./routes/backup');
const { createSchedulesRouter } = require('./routes/schedules');
const { createSettingsRouter } = require('./routes/settings');
const { createSystemRouter } = require('./routes/system');
const { createHistoryRouter } = require('./routes/history');
const { createWebhookRouter } = require('./routes/webhook');
const { createBackupService } = require('./services/backupService');
const { createSqliteStore } = require('./services/sqliteStore');
const { verifyPassword } = require('./utils/normalize');

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(securityHeaders);

  function sendUpdateToClients(data) {
    connectedClients.forEach((client) => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }

  function requireAdminPassword(req, res, next) {
    const headerPassword = req.headers['x-admin-password'];
    if (String(headerPassword || '') !== String(backupPassword)) {
      return res.status(401).json({ message: '管理员密码无效' });
    }
    next();
  }

  function resolveEditPasswordHash() {
    const settings = store.readSettings();
    return settings.access && settings.access.editPasswordHash
      ? settings.access.editPasswordHash
      : '';
  }

  function requireEditAccess(req, res, next) {
    try {
      const expectedHash = resolveEditPasswordHash();
      if (!expectedHash) {
        next();
        return;
      }

      const candidate = String(req.headers['x-edit-password'] || '');
      if (!candidate || !verifyPassword(candidate, expectedHash)) {
        res.status(401).json({ message: '编辑密码无效' });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  }

  function baseUrlFromRequest(req) {
    return `${req.protocol}://${req.get('host')}`;
  }

  // SSE endpoint with heartbeat to prevent zombie connections
  app.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
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
  app.use('/api', createSystemRouter({ store }));

  app.use(express.static(CLIENT_DIR));
  app.get('/', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));
  app.get('/notice', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'preview.html')));

  app.use((error, req, res, next) => {
    console.error(error);
    const statusCode = error && error.message && /无效/.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ message: error.message || '服务器错误' });
  });

  // Auto-backup: daily at 03:00
  const autoCronJob = cron.schedule('0 3 * * *', async () => {
    try {
      await backupService.createBackup();
      console.log('[cron] 自动备份完成');
    } catch (err) {
      console.error('[cron] 自动备份失败:', err.message);
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
