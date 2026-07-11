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
      { method: 'GET', path: '/api/health', description: '健康检查（服务状态/运行时间）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/version', description: '版本信息（版本号/构建日期）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/endpoints', description: 'API 接口列表（本页数据源）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/schedules', description: '获取排期数据（按日期范围查询）', auth: '无', perm: 'readonly' },
      { method: 'POST', path: '/api/schedules', description: '创建/更新排期项目', auth: '编辑密码', perm: 'write' },
      { method: 'GET', path: '/api/schedules/search', description: '搜索排期（关键词/类型/状态）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/schedules/conflicts', description: '冲突检测（同一人同天多项目）', auth: '无', perm: 'readonly' },
      { method: 'POST', path: '/api/schedules/batch', description: '批量操作（删除/移动/状态更新）', auth: '编辑密码', perm: 'write' },
      { method: 'GET', path: '/api/statistics', description: '统计数据（项目数/人员/类型分布）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/calendar', description: 'iCal 日历订阅（Apple/Google/Outlook）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/export/json', description: 'JSON 格式导出全部排期', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/export/excel', description: 'CSV 格式导出排期（Excel 可打开）', auth: '无', perm: 'readonly' },
      { method: 'GET', path: '/api/settings', description: '获取系统设置（人员/平台/模板等）', auth: '无', perm: 'readonly' },
      { method: 'POST', path: '/api/settings', description: '更新系统设置', auth: '管理员密码', perm: 'write' },
      { method: 'GET', path: '/api/settings/access', description: '获取访问控制设置（密码/分享）', auth: '管理员密码', perm: 'readonly' },
      { method: 'POST', path: '/api/settings/access', description: '更新访问控制设置', auth: '管理员密码', perm: 'write' },
      { method: 'GET', path: '/api/settings/templates', description: '获取项目模板列表', auth: '无', perm: 'readonly' },
      { method: 'POST', path: '/api/settings/templates', description: '创建/更新项目模板', auth: '编辑密码', perm: 'write' },
      { method: 'DELETE', path: '/api/settings/templates/:id', description: '删除项目模板', auth: '编辑密码', perm: 'write' },
      { method: 'GET', path: '/api/history', description: '操作历史记录（排期/设置/系统/错误/访问）', auth: '管理员密码', perm: 'readonly' },
      { method: 'GET', path: '/api/webhook', description: '获取 Webhook 推送配置', auth: '管理员密码', perm: 'readonly' },
      { method: 'POST', path: '/api/webhook', description: '更新 Webhook 推送配置', auth: '管理员密码', perm: 'write' },
      { method: 'POST', path: '/api/backup', description: '创建数据备份', auth: '管理员密码', perm: 'write' },
      { method: 'POST', path: '/api/backup/restore', description: '从备份恢复数据', auth: '管理员密码', perm: 'write' },
      { method: 'GET', path: '/api/backup/export', description: '导出备份文件下载', auth: '管理员密码', perm: 'readonly' },
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
