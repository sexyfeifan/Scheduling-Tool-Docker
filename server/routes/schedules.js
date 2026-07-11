const express = require('express');

const { generateId, isValidDateString, normalizeProjects } = require('../utils/normalize');
const { addHistoryRecord } = require('../utils/historyHelper');

function createSchedulesRouter({ store, sendUpdateToClients, requireEditAccess }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { startDate, endDate } = req.query;
    if ((startDate && !isValidDateString(startDate)) || (endDate && !isValidDateString(endDate))) {
      return res.status(400).json({ message: '日期格式无效' });
    }

    const schedules = store.readSchedules();
    const filtered = (startDate && endDate)
      ? schedules.filter((s) => s.date >= startDate && s.date <= endDate)
      : schedules;

    const payload = {};
    filtered.forEach((s) => { payload[s.date] = s.projects; });
    res.json(payload);
  });

  router.post('/', requireEditAccess, (req, res) => {
    const { date, projects } = req.body || {};
    if (!isValidDateString(date)) {
      return res.status(400).json({ message: '日期格式无效' });
    }

    const normalizedProjects = normalizeProjects(projects);
    if (!normalizedProjects) {
      return res.status(400).json({ message: 'projects 必须是数组' });
    }

    const existing = store.readScheduleByDate(date);
    const before = existing ? existing.projects : null;

    store.writeScheduleDate(date, existing ? existing.id : generateId('schedule'), normalizedProjects);

    const detail = buildSaveDetail(date, before, normalizedProjects);
    addHistoryRecord(store, req, 'schedule', '保存排期', detail, detail, date);

    sendUpdateToClients({ type: 'scheduleUpdate', date, projects: normalizedProjects });
    res.json({ message: '保存成功' });
  });

  router.delete('/:date', requireEditAccess, (req, res) => {
    const { date } = req.params;
    if (!isValidDateString(date)) {
      return res.status(400).json({ message: '日期格式无效' });
    }

    const existing = store.readScheduleByDate(date);
    if (!existing) {
      return res.status(404).json({ message: '未找到指定日期的排期数据' });
    }

    store.deleteScheduleDate(date);

    const names = (existing.projects || []).map(p => p.name).filter(Boolean).join(', ');
    const deleteDetail = `删除 ${date} 的排期（${(existing.projects || []).length}个项目: ${names || '无'}）`;
    addHistoryRecord(store, req, 'schedule', '删除排期', deleteDetail, deleteDetail, date);

    sendUpdateToClients({ type: 'scheduleDelete', date });
    res.json({ message: '删除成功' });
  });

  return router;
}

function buildSaveDetail(date, before, after) {
  const beforeNames = new Set((before || []).map(p => p.name).filter(Boolean));
  const afterNames = new Set((after || []).map(p => p.name).filter(Boolean));

  const added = [...afterNames].filter(n => !beforeNames.has(n));
  const removed = [...beforeNames].filter(n => !afterNames.has(n));
  const kept = [...afterNames].filter(n => beforeNames.has(n));

  const parts = [];
  if (added.length > 0) parts.push(`新增: ${added.join(', ')}`);
  if (removed.length > 0) parts.push(`删除: ${removed.join(', ')}`);

  // 对保留的项目，检查字段变更
  const fields = ['startTime', 'location', 'type', 'director', 'photographer', 'production', 'operational', 'rd', 'audio', 'business', 'status'];
  const fieldLabels = { startTime: '时间', location: '地点', type: '类型', director: '导演', photographer: '摄影', production: '制片', operational: '运营', rd: '研发', audio: '录音', business: '商务', status: '状态' };
  kept.forEach(name => {
    const oldP = (before || []).find(p => p.name === name);
    const newP = (after || []).find(p => p.name === name);
    if (!oldP || !newP) return;
    const changes = [];
    fields.forEach(f => {
      const oldVal = oldP[f] || '';
      const newVal = newP[f] || '';
      if (oldVal !== newVal) {
        changes.push(`${fieldLabels[f] || f}: ${oldVal || '空'}→${newVal || '空'}`);
      }
    });
    if (changes.length > 0) {
      parts.push(`${name}: ${changes.join(', ')}`);
    }
  });

  if (!before) return `新建 ${date} 排期（${after.length}个项目: ${after.map(p => p.name).filter(Boolean).join(', ')}）`;
  if (parts.length === 0) return `更新 ${date} 排期（${after.length}个项目，无实质变更）`;
  return `${date} ${parts.join(' | ')}`;
}

module.exports = { createSchedulesRouter };
