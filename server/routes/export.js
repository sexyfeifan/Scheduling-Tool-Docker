/**
 * 数据导出路由
 * GET /api/export/json   - JSON 完整备份
 * GET /api/export/excel  - Excel 排期报表
 */

const express = require('express');
const logger = require('../logger');

function createExportRouter({ store }) {
  const router = express.Router();

  // JSON 完整导出
  router.get('/json', (req, res) => {
    try {
      const schedules = store.readSchedules() || [];
      const settings = store.readSettings();

      const exportData = {
        version: '2.60',
        exportedAt: new Date().toISOString(),
        schedules: schedules.map(s => ({
          date: s.date,
          projects: s.projects
        })),
        settings: (() => {
          const sanitized = { ...settings };
          delete sanitized.access;
          delete sanitized.editPasswordHash;
          return sanitized;
        })()
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="排期备份_${formatDate(new Date())}.json"`);
      res.json(exportData);
    } catch (err) {
      logger.error(err, 'JSON 导出失败');
      res.status(500).json({ message: '导出失败' });
    }
  });

  // Excel 导出（纯文本 CSV 格式，前端可转为 xlsx）
  router.get('/excel', (req, res) => {
    try {
      const { start, end } = req.query;
      const allSchedules = store.readSchedules() || [];

      // 按日期范围过滤
      let filtered = allSchedules;
      if (start) filtered = filtered.filter(s => s.date >= start);
      if (end) filtered = filtered.filter(s => s.date <= end);

      // 生成 CSV（Excel 兼容）
      const BOM = '\uFEFF'; // UTF-8 BOM for Excel
      const headers = ['日期', '项目名称', '类型', '场地', '导演', '摄影师', '制片', '状态', '开始时间'];
      const rows = [headers.join(',')];

      filtered.forEach(item => {
        (item.projects || []).forEach(proj => {
          rows.push([
            item.date,
            csvEscape(proj.name),
            csvEscape(proj.type || ''),
            csvEscape(proj.location || ''),
            csvEscape(proj.director || ''),
            csvEscape(proj.photographer || ''),
            csvEscape(proj.production || ''),
            csvEscape(proj.status || ''),
            csvEscape(proj.startTime || '')
          ].join(','));
        });
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="排期报表_${formatDate(new Date())}.csv"`);
      res.send(BOM + rows.join('\n'));
    } catch (err) {
      logger.error(err, 'Excel 导出失败');
      res.status(500).json({ message: '导出失败' });
    }
  });

  return router;
}

function formatDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function csvEscape(str) {
  const s = String(str || '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

module.exports = { createExportRouter };
