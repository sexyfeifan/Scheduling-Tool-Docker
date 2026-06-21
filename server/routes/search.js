/**
 * 搜索路由
 * GET /api/schedules/search?q=&location=&status=&role=&person=&dateFrom=&dateTo=
 */

const express = require('express');
const logger = require('../logger');

function createSearchRouter({ store }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const { q, location, status, role, person, dateFrom, dateTo } = req.query;
      const allSchedules = store.readSchedules() || [];

      // 按日期范围过滤
      let filtered = allSchedules;
      if (dateFrom) filtered = filtered.filter(s => s.date >= dateFrom);
      if (dateTo) filtered = filtered.filter(s => s.date <= dateTo);

      const results = [];

      filtered.forEach(item => {
        (item.projects || []).forEach(proj => {
          let match = true;

          // 全文搜索
          if (q) {
            const query = q.toLowerCase();
            const searchFields = [
              proj.name, proj.location, proj.director, proj.photographer,
              proj.production, proj.rd, proj.operational, proj.audio, proj.business, proj.type
            ].filter(Boolean).join(' ').toLowerCase();
            if (!searchFields.includes(query)) match = false;
          }

          // 场地过滤
          if (location && proj.location !== location) match = false;

          // 状态过滤
          if (status && proj.status !== status) match = false;

          // 角色 + 人员过滤
          if (role && person) {
            const roleField = {
              '导演': 'director', '摄影师': 'photographer', '制片': 'production',
              '录音': 'audio', '研发': 'rd', '运营': 'operational', '商务': 'business'
            }[role];
            if (roleField && !(proj[roleField] || '').toLowerCase().includes(person.toLowerCase())) {
              match = false;
            }
          } else if (person) {
            // 搜索所有角色
            const allRoles = [proj.director, proj.photographer, proj.production, proj.rd, proj.operational, proj.audio, proj.business];
            if (!allRoles.some(r => r && r.toLowerCase().includes(person.toLowerCase()))) {
              match = false;
            }
          }

          if (match) {
            results.push({ date: item.date, ...proj });
          }
        });
      });

      res.json({ results, total: results.length });
    } catch (err) {
      logger.error(err, '搜索失败');
      res.status(500).json({ message: '搜索失败' });
    }
  });

  return router;
}

module.exports = { createSearchRouter };
