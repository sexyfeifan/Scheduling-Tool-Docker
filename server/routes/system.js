const express = require('express');

const { APP_CREATE_DATE, APP_VERSION } = require('../config');

function createSystemRouter({ store }) {
  const router = express.Router();
  const startedAt = new Date();

  router.get('/version', (req, res) => {
    const version = store.readVersion();
    res.json({
      version: APP_VERSION,
      createDate: version.createDate || APP_CREATE_DATE,
      buildDate: version.buildDate || new Date().toISOString().split('T')[0]
    });
  });

  router.get('/health', (req, res) => {
    const health = store.getHealthStatus();
    res.json({
      status: 'ok',
      version: APP_VERSION,
      uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
      startedAt: startedAt.toISOString(),
      ...health
    });
  });

  return router;
}

module.exports = { createSystemRouter };
