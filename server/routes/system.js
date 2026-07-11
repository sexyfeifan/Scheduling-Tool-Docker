const express = require('express');

const { APP_CREATE_DATE, APP_VERSION, BUILD_DATE } = require('../config');

function createSystemRouter({ store }) {
  const router = express.Router();
  const startedAt = new Date();

  router.get('/version', (req, res) => {
    const version = store.readVersion();
    res.json({
      version: APP_VERSION,
      createDate: version.createDate || APP_CREATE_DATE,
      buildDate: BUILD_DATE
    });
  });

  router.get('/endpoints', (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const base = `${protocol}://${host}`;
    const endpoints = [
      { method: 'GET', path: '/api/health', description: '健康检查', auth: '无' },
      { method: 'GET', path: '/api/version', description: '版本信息', auth: '无' },
      { method: 'GET', path: '/api/endpoints', description: 'API 列表', auth: '无' },
      { method: 'GET', path: '/api/schedules', description: '获取排期数据', auth: '无' },
      { method: 'POST', path: '/api/schedules', description: '创建/更新排期', auth: '编辑密码', readOnly: true },
      { method: 'GET', path: '/api/schedules/search', description: '搜索排期', auth: '无' },
      { method: 'GET', path: '/api/schedules/conflicts', description: '冲突检测', auth: '无' },
      { method: 'POST', path: '/api/schedules/batch', description: '批量操作', auth: '编辑密码', readOnly: true },
      { method: 'GET', path: '/api/statistics', description: '统计数据', auth: '无' },
      { method: 'GET', path: '/api/calendar', description: 'iCal 订阅', auth: '无' },
      { method: 'GET', path: '/api/export/json', description: 'JSON 导出', auth: '无' },
      { method: 'GET', path: '/api/export/excel', description: 'CSV 导出', auth: '无' },
      { method: 'GET', path: '/api/settings', description: '获取设置', auth: '无' },
      { method: 'POST', path: '/api/settings', description: '更新设置', auth: '管理员密码', readOnly: true },
      { method: 'GET', path: '/api/settings/access', description: '获取访问设置', auth: '管理员密码' },
      { method: 'POST', path: '/api/settings/access', description: '更新访问设置', auth: '管理员密码', readOnly: true },
      { method: 'GET', path: '/api/settings/templates', description: '获取模板', auth: '无' },
      { method: 'POST', path: '/api/settings/templates', description: '创建/更新模板', auth: '编辑密码', readOnly: true },
      { method: 'DELETE', path: '/api/settings/templates/:id', description: '删除模板', auth: '编辑密码', readOnly: true },
      { method: 'GET', path: '/api/history', description: '操作历史', auth: '管理员密码' },
      { method: 'GET', path: '/api/webhook', description: '获取 Webhook', auth: '管理员密码' },
      { method: 'POST', path: '/api/webhook', description: '更新 Webhook', auth: '管理员密码', readOnly: true },
      { method: 'POST', path: '/api/backup', description: '创建备份', auth: '管理员密码', readOnly: true },
      { method: 'POST', path: '/api/backup/restore', description: '恢复备份', auth: '管理员密码', readOnly: true },
      { method: 'GET', path: '/api/backup/export', description: '导出备份', auth: '管理员密码' },
    ];
    
    const settings = store.readSettings();
    res.json({
      baseUrl: base,
      apiReadOnly: Boolean(settings && settings.apiReadOnly),
      endpoints: endpoints.map(e => ({ ...e, url: base + e.path }))
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
