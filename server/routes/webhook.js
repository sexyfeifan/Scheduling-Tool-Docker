const express = require('express');
const { createWebhookService } = require('../services/webhookService');

function createWebhookRouter({ requireAdminPassword, store }) {
  const router = express.Router();
  const webhookService = createWebhookService(store);

  // 测试 webhook 连通性
  router.post('/test', requireAdminPassword, async (req, res) => {
    try {
      const settings = store.readSettings();
      const webhook = settings.webhook || {};
      if (!webhook.enabled || !webhook.url) {
        return res.status(400).json({ message: 'Webhook 未启用或未配置 URL' });
      }
      const result = await webhookService.testWebhook(webhook.url, webhook.platform);
      if (result.success) {
        res.json({ message: '测试成功，Webhook 连通正常', statusCode: result.statusCode });
      } else {
        res.status(502).json({ message: `测试失败，状态码: ${result.statusCode}`, body: result.body });
      }
    } catch (err) {
      res.status(502).json({ message: err.message });
    }
  });

  // 推送日通告
  router.post('/push/daily', requireAdminPassword, async (req, res) => {
    try {
      const settings = store.readSettings();
      const webhook = settings.webhook || {};
      if (!webhook.enabled || !webhook.url) {
        return res.status(400).json({ message: 'Webhook 未启用或未配置 URL' });
      }

      const { date } = req.body || {};
      if (!date) {
        return res.status(400).json({ message: '请指定推送日期' });
      }

      const schedules = store.readSchedules();
      const daySchedule = schedules.find(s => s.date === date);
      if (!daySchedule || !daySchedule.projects || daySchedule.projects.length === 0) {
        return res.status(404).json({ message: `${date} 没有排期项目` });
      }

      const result = await webhookService.pushDailyNotice(
        webhook.url, webhook.platform, date, daySchedule.projects, webhook.dailyTemplate
      );
      if (result.success) {
        res.json({ message: '日通告推送成功' });
      } else {
        res.status(502).json({ message: `推送失败，状态码: ${result.statusCode}` });
      }
    } catch (err) {
      res.status(502).json({ message: err.message });
    }
  });

  // 推送周通告
  router.post('/push/weekly', requireAdminPassword, async (req, res) => {
    try {
      const settings = store.readSettings();
      const webhook = settings.webhook || {};
      if (!webhook.enabled || !webhook.url) {
        return res.status(400).json({ message: 'Webhook 未启用或未配置 URL' });
      }

      const { startDate, endDate } = req.body || {};
      if (!startDate || !endDate) {
        return res.status(400).json({ message: '请指定推送的起止日期' });
      }

      const schedules = store.readSchedules();
      const scheduleMap = {};
      schedules.forEach(s => { scheduleMap[s.date] = s.projects; });

      const result = await webhookService.pushWeeklyNotice(
        webhook.url, webhook.platform, startDate, endDate, scheduleMap, webhook.weeklyTemplate
      );
      if (result.success) {
        res.json({ message: '周通告推送成功' });
      } else {
        res.status(502).json({ message: `推送失败，状态码: ${result.statusCode}` });
      }
    } catch (err) {
      res.status(502).json({ message: err.message });
    }
  });

  // 获取默认模板
  router.get('/templates', requireAdminPassword, (req, res) => {
    res.json({
      daily: webhookService.DEFAULT_DAILY_TEMPLATE,
      weekly: webhookService.DEFAULT_WEEKLY_TEMPLATE,
      platforms: Object.entries(webhookService.PLATFORM_PRESETS).map(([key, val]) => ({
        key, name: val.name
      })),
      presets: webhookService.TEMPLATE_PRESETS
    });
  });

  return router;
}

module.exports = { createWebhookRouter };
