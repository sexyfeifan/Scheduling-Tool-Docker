/**
 * iCal 日历订阅路由
 * GET /api/calendar?weeks=4 或 ?start=&end=
 */

const express = require('express');
const logger = require('../logger');

function createCalendarRouter({ store }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const { start, end, weeks } = req.query;
      let startDate, endDate;

      if (start && end) {
        startDate = start;
        endDate = end;
      } else {
        const weeksNum = parseInt(weeks, 10) || 4;
        const now = new Date();
        startDate = formatDate(now);
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + weeksNum * 7);
        endDate = formatDate(futureDate);
      }

      const allSchedules = store.readSchedules() || [];
      // 按日期范围过滤
      const schedules = {};
      allSchedules.forEach(item => {
        if (item.date >= startDate && item.date <= endDate) {
          schedules[item.date] = { projects: item.projects };
        }
      });
      const icalContent = generateICal(schedules, startDate, endDate);

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="scheduling-tool.ics"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(icalContent);
    } catch (err) {
      logger.error(err, '生成 iCal 失败');
      res.status(500).json({ message: '生成日历失败' });
    }
  });

  return router;
}

/**
 * 生成 iCal 格式内容
 */
function generateICal(schedules, startDate, endDate) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//罐头场//排期系统//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:罐头场排期',
    'X-WR-TIMEZONE:Asia/Shanghai'
  ];

  Object.entries(schedules).forEach(([date, dayData]) => {
    if (!dayData || !dayData.projects) return;

    dayData.projects.forEach((proj, idx) => {
      const startTime = proj.startTime || '09:00';
      const dtStart = `${date.replace(/-/g, '')}T${startTime.replace(':', '')}00`;

      // 结束时间 = 开始时间 + 2小时
      const [h, m] = startTime.split(':').map(Number);
      const endH = String((h + 2) % 24).padStart(2, '0');
      const dtEnd = `${date.replace(/-/g, '')}T${endH}${String(m).padStart(2, '0')}00`;

      // 状态映射
      const statusMap = {
        '待确认': 'TENTATIVE',
        '已确认': 'CONFIRMED',
        '已完成': 'CONFIRMED',
        '取消': 'CANCELLED'
      };
      const icalStatus = statusMap[proj.status] || 'TENTATIVE';

      // 人员描述
      const persons = [];
      if (proj.director) persons.push(`导演：${proj.director}`);
      if (proj.photographer) persons.push(`摄影：${proj.photographer}`);
      if (proj.production) persons.push(`制片：${proj.production}`);
      if (proj.rd) persons.push(`研发：${proj.rd}`);
      if (proj.operational) persons.push(`运营：${proj.operational}`);
      if (proj.audio) persons.push(`录音：${proj.audio}`);
      if (proj.business) persons.push(`商务：${proj.business}`);
      persons.push(`状态：${proj.status || '待确认'}`);

      const uid = `schedule_${date}_${sanitizeUid(proj.name)}_${idx}@scheduling-tool`;

      lines.push('BEGIN:VEVENT');
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeICal(proj.name)}（${escapeICal(proj.type || '-')}）`);
      if (proj.location) lines.push(`LOCATION:${escapeICal(proj.location)}`);
      lines.push(`DESCRIPTION:${escapeICal(persons.join('\\n'))}`);
      lines.push(`STATUS:${icalStatus}`);
      lines.push(`UID:${uid}`);
      lines.push(`LAST-MODIFIED:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      lines.push('END:VEVENT');
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ── 工具函数 ──

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeICal(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function sanitizeUid(str) {
  return String(str || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
}

module.exports = { createCalendarRouter };
