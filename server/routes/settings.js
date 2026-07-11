const express = require('express');

const {
  generateId,
  hashPassword,
  normalizeAccessConfig,
  normalizeSettingsPayload,
  normalizeTemplate,
  sanitizeAccessForClient,
  sanitizeSettingsForClient
} = require('../utils/normalize');
const { addHistoryRecord } = require('../utils/historyHelper');

function createSettingsRouter({ baseUrlFromRequest, requireAdminPassword, requireEditAccess, store, sendUpdateToClients }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(sanitizeSettingsForClient(store.readSettings()));
  });

  router.post('/', requireEditAccess, (req, res) => {
    const currentSettings = store.readSettings();
    const nextSettings = normalizeSettingsPayload({
      ...currentSettings,
      ...req.body,
      access: currentSettings.access
    });

    store.writeSettings(nextSettings);
    addHistoryRecord(store, req, 'settings', '保存设置', '保存系统设置');
    sendUpdateToClients({ type: 'settingsUpdate', settings: sanitizeSettingsForClient(nextSettings) });
    res.json({ message: '设置已保存' });
  });

  router.get('/access', requireAdminPassword, (req, res) => {
    const settings = store.readSettings();
    res.json(sanitizeAccessForClient(settings, baseUrlFromRequest(req)));
  });

  router.post('/access', requireAdminPassword, (req, res) => {
    const settings = store.readSettings();
    const access = normalizeAccessConfig({
      ...settings.access,
      shareEnabled: req.body && req.body.shareEnabled,
      shareToken: req.body && req.body.shareToken,
      sharePath: req.body && req.body.sharePath
    });

    if (req.body && typeof req.body.editPassword === 'string') {
      access.editPasswordHash = req.body.editPassword
        ? hashPassword(req.body.editPassword)
        : '';
    }

    const nextSettings = { ...settings, access };
    store.writeSettings(nextSettings);
    addHistoryRecord(store, req, 'settings', '保存访问控制', '保存访问控制设置');
    res.json({
      message: '访问控制已保存',
      access: sanitizeAccessForClient(nextSettings, baseUrlFromRequest(req))
    });
  });

  router.get('/templates', (req, res) => {
    const settings = store.readSettings();
    res.json(settings.projectTemplates || []);
  });

  router.post('/templates', requireEditAccess, (req, res) => {
    const settings = store.readSettings();
    const template = normalizeTemplate({
      id: req.body && req.body.id ? req.body.id : generateId('template'),
      name: req.body && req.body.name,
      defaults: req.body && req.body.defaults
    });

    if (!template.name) {
      return res.status(400).json({ message: '模板名称不能为空' });
    }

    const nextTemplates = [...(settings.projectTemplates || [])];
    const existingIndex = nextTemplates.findIndex((item) => item.id === template.id);
    if (existingIndex >= 0) {
      nextTemplates[existingIndex] = template;
    } else {
      nextTemplates.push(template);
    }

    const nextSettings = { ...settings, projectTemplates: nextTemplates };
    store.writeSettings(nextSettings);
    addHistoryRecord(store, req, 'settings', '保存模板', `保存项目模板: ${template.name}`);
    sendUpdateToClients({ type: 'templateUpdate', templates: nextTemplates });
    res.json({ message: '模板已保存', template });
  });

  router.delete('/templates/:id', requireEditAccess, (req, res) => {
    const settings = store.readSettings();
    const nextTemplates = (settings.projectTemplates || []).filter((item) => item.id !== req.params.id);

    if (nextTemplates.length === (settings.projectTemplates || []).length) {
      return res.status(404).json({ message: '模板不存在' });
    }

    const nextSettings = { ...settings, projectTemplates: nextTemplates };
    store.writeSettings(nextSettings);
    addHistoryRecord(store, req, 'settings', '删除模板', `删除项目模板: ${req.params.id}`);
    sendUpdateToClients({ type: 'templateUpdate', templates: nextTemplates });
    res.json({ message: '模板已删除' });
  });

  return router;
}

module.exports = { createSettingsRouter };
