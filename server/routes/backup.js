const express = require('express');
const fs = require('fs').promises;

const { asyncHandler } = require('../middleware/asyncHandler');
const { timingSafeEqual } = require('../utils/normalize');

function createBackupRouter({ backupPassword, backupService, requireAdminPassword, requireEditAccess, sendUpdateToClients, store }) {
  const router = express.Router();

  router.post('/verify-password', (req, res) => {
    const password = req.body && req.body.password;
    if (!password) {
      return res.status(400).json({ valid: false, message: '请输入密码' });
    }
    res.json({ valid: timingSafeEqual(password, backupPassword) });
  });

  router.post('/backup', requireEditAccess, asyncHandler(async (req, res) => {
    const result = await backupService.createBackup();
    res.json({
      message: '备份成功',
      backupPath: result.backupPath,
      backups: result.backups
    });
  }));

  router.get('/backups', requireAdminPassword, asyncHandler(async (req, res) => {
    res.json(await backupService.listBackups());
  }));

  router.post('/restore', requireEditAccess, asyncHandler(async (req, res) => {
    if (!req.body || !req.body.backupPath) {
      return res.status(400).json({ message: '请选择要恢复的备份' });
    }

    await backupService.restoreBackup(req.body.backupPath);
    sendUpdateToClients({ type: 'restoreComplete' });
    res.json({ message: '恢复成功' });
  }));

  router.delete('/backups', requireEditAccess, asyncHandler(async (req, res) => {
    if (!req.body || !req.body.backupPath) {
      return res.status(400).json({ message: '请指定要删除的备份' });
    }

    await backupService.deleteBackup(req.body.backupPath);
    res.json({ message: '备份已删除', backups: (await backupService.listBackups()).slice(0, 20) });
  }));

  router.get('/backups/:folder/:file', requireAdminPassword, asyncHandler(async (req, res) => {
    const filePath = await backupService.resolveBackupFile(`/backups/${req.params.folder}/${req.params.file}`);
    const data = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=backup.json');
    res.send(data);
  }));

  router.get('/admin/snapshot', requireAdminPassword, (req, res) => {
    const snapshot = store.createSnapshot();
    res.json({
      schedulesCount: snapshot.schedules.length,
      projectsCount: snapshot.schedules.reduce((sum, s) => sum + s.projects.length, 0),
      templatesCount: snapshot.settings.projectTemplates.length
    });
  });

  return router;
}

module.exports = { createBackupRouter };
