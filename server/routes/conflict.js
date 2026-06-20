/**
 * 人员冲突检测路由
 * GET /api/schedules/conflicts?start=&end=
 */

const express = require('express');

function createConflictRouter({ store }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ message: '需要 start 和 end 参数' });
      }

      const allSchedules = store.readSchedules() || [];
      const filtered = allSchedules.filter(s => s.date >= start && s.date <= end);

      // 按人员+日期分组
      const personSchedule = new Map(); // "name|role|date" -> [projects]

      filtered.forEach(item => {
        (item.projects || []).forEach(proj => {
          const roles = [
            { key: 'director', label: '导演' },
            { key: 'photographer', label: '摄影师' },
            { key: 'production', label: '制片' },
            { key: 'rd', label: '研发' },
            { key: 'operational', label: '运营' },
            { key: 'audio', label: '录音' },
            { key: 'business', label: '商务' }
          ];

          roles.forEach(r => {
            const name = proj[r.key];
            if (!name) return;

            const key = `${name}|${r.label}|${item.date}`;
            if (!personSchedule.has(key)) {
              personSchedule.set(key, { name, role: r.label, date: item.date, projects: [] });
            }
            personSchedule.get(key).projects.push({
              name: proj.name,
              startTime: proj.startTime,
              status: proj.status
            });
          });
        });
      });

      // 找出同一人在同一天有多于一个项目的情况
      const conflicts = [];
      personSchedule.forEach(entry => {
        if (entry.projects.length > 1) {
          // 检查时间是否重叠
          const timeSlots = entry.projects
            .map(p => p.startTime || '09:00')
            .sort();

          // 简单判断：同一人同一天有多个项目即为冲突
          conflicts.push({
            person: entry.name,
            role: entry.role,
            date: entry.date,
            count: entry.projects.length,
            projects: entry.projects.map(p => p.name),
            timeSlots,
            severity: entry.projects.length > 2 ? 'high' : 'medium'
          });
        }
      });

      // 按严重程度排序
      conflicts.sort((a, b) => b.count - a.count);

      res.json({
        conflicts,
        total: conflicts.length,
        period: { start, end }
      });
    } catch (err) {
      console.error('[conflict] 冲突检测失败:', err);
      res.status(500).json({ message: '冲突检测失败' });
    }
  });

  return router;
}

module.exports = { createConflictRouter };
