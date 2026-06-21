/**
 * 统计数据路由
 * GET /api/statistics?start=&end=&type=overview|personnel|location|status|trend
 */

const express = require('express');
const logger = require('../logger');

function createStatisticsRouter({ store }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const { start, end, type } = req.query;
      const allSchedules = store.readSchedules() || [];

      // 按日期范围过滤
      let filtered = allSchedules;
      if (start) filtered = filtered.filter(s => s.date >= start);
      if (end) filtered = filtered.filter(s => s.date <= end);

      const stats = computeStatistics(filtered, type || 'overview');
      res.json(stats);
    } catch (err) {
      logger.error(err, '统计失败');
      res.status(500).json({ message: '统计数据获取失败' });
    }
  });

  return router;
}

function computeStatistics(schedules, type) {
  const stats = {
    period: { totalDays: 0, totalProjects: 0 },
    status: {},
    types: {},
    locations: {},
    personnel: {},
    weeklyTrend: []
  };

  const allPersons = {};

  schedules.forEach(item => {
    stats.period.totalDays++;
    (item.projects || []).forEach(proj => {
      stats.period.totalProjects++;

      // 状态统计
      const status = proj.status || '待确认';
      stats.status[status] = (stats.status[status] || 0) + 1;

      // 类型统计
      const projType = proj.type || '未分类';
      stats.types[projType] = (stats.types[projType] || 0) + 1;

      // 场地统计
      if (proj.location) {
        stats.locations[proj.location] = (stats.locations[proj.location] || 0) + 1;
      }

      // 人员统计
      const roles = { director: '导演', photographer: '摄影师', production: '制片', rd: '研发', operational: '运营', audio: '录音', business: '商务' };
      Object.entries(roles).forEach(([key, label]) => {
        const name = proj[key];
        if (!name) return;
        if (!allPersons[name]) {
          allPersons[name] = { name, role: label, count: 0, dates: [] };
        }
        allPersons[name].count++;
        if (!allPersons[name].dates.includes(item.date)) {
          allPersons[name].dates.push(item.date);
        }
      });

      // 周趋势
      const weekKey = getWeekKey(item.date);
      const existing = stats.weeklyTrend.find(w => w.week === weekKey);
      if (existing) {
        existing.count++;
      } else {
        stats.weeklyTrend.push({ week: weekKey, count: 1 });
      }
    });
  });

  // 排序
  stats.weeklyTrend.sort((a, b) => a.week.localeCompare(b.week));
  stats.personnelTop = Object.values(allPersons)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  stats.locationTop = Object.entries(stats.locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return stats;
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

module.exports = { createStatisticsRouter };
