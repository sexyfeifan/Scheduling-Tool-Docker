const express = require('express');

const { generateId, isValidDateString, normalizeProjects } = require('../utils/normalize');

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

    const existing = store.readSchedules().find((s) => s.date === date);
    const before = existing ? existing.projects : null;

    store.writeScheduleDate(date, existing ? existing.id : generateId('schedule'), normalizedProjects);

    if (store.appendHistory) {
      store.appendHistory({ action: 'saveSchedule', date, before, after: normalizedProjects });
    }

    sendUpdateToClients({ type: 'scheduleUpdate', date, projects: normalizedProjects });
    res.json({ message: '保存成功' });
  });

  router.delete('/:date', requireEditAccess, (req, res) => {
    const { date } = req.params;
    if (!isValidDateString(date)) {
      return res.status(400).json({ message: '日期格式无效' });
    }

    const existing = store.readSchedules().find((s) => s.date === date);
    if (!existing) {
      return res.status(404).json({ message: '未找到指定日期的排期数据' });
    }

    store.deleteScheduleDate(date);

    if (store.appendHistory) {
      store.appendHistory({ action: 'deleteSchedule', date, before: existing.projects, after: null });
    }

    sendUpdateToClients({ type: 'scheduleDelete', date });
    res.json({ message: '删除成功' });
  });

  return router;
}

module.exports = { createSchedulesRouter };
