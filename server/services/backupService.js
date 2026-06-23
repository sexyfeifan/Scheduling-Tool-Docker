const fs = require('fs').promises;
const path = require('path');

const { APP_VERSION } = require('../config');
const logger = require('../logger');
const { normalizeBackupPayload } = require('../utils/normalize');

function isSafeBackupSegment(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]+$/.test(value);
}

function createBackupFolderName(prefix = 'backup') {
  // 使用东八区（UTC+8）时间
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utcMs + 8 * 3600000);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  const hours = String(local.getHours()).padStart(2, '0');
  const minutes = String(local.getMinutes()).padStart(2, '0');
  const seconds = String(local.getSeconds()).padStart(2, '0');
  return `${prefix}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function createBackupService(store) {
  async function listBackups(prefix = 'backup_') {
    try {
      await fs.access(store.backupDir);
    } catch (error) {
      return [];
    }

    const backupFiles = await fs.readdir(store.backupDir);
    const backups = await Promise.all(
      backupFiles
        .filter((file) => file.startsWith(prefix))
        .sort()
        .reverse()
        .map(async (file) => {
          const filePath = path.join(store.backupDir, file, 'backup.json');
          const stats = await fs.stat(path.join(store.backupDir, file));
          let projectsCount = 0;

          try {
            const payload = normalizeBackupPayload(JSON.parse(await fs.readFile(filePath, 'utf8')));
            projectsCount = payload.schedules.reduce((sum, schedule) => sum + schedule.projects.length, 0);
          } catch (error) {
            projectsCount = 0;
          }

          return {
            name: file,
            date: stats.mtime.toISOString().split('T')[0],
            time: stats.mtime.toISOString(),
            path: `/backups/${file}/backup.json`,
            projectsCount
          };
        })
    );

    return backups;
  }

  async function createBackup() {
    await store.ensureBootstrapFiles();
    const snapshot = await store.createSnapshot();
    const dirName = createBackupFolderName();
    const targetDir = path.join(store.backupDir, dirName);
    const backupFile = path.join(targetDir, 'backup.json');

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(backupFile, JSON.stringify({
      settings: snapshot.settings,
      schedules: snapshot.schedules,
      version: snapshot.version,
      backupDate: new Date().toISOString(),
      appVersion: APP_VERSION
    }, null, 2), 'utf8');

    // 自动清理：保留最近 20 份备份
    await autoCleanupBackups(20);

    return {
      backupPath: `/backups/${dirName}/backup.json`,
      backups: (await listBackups()).slice(0, 20)
    };
  }

  async function autoCleanupBackups(keepCount = 20) {
    try {
      const entries = await fs.readdir(store.backupDir, { withFileTypes: true });
      const dirs = entries
        .filter(e => e.isDirectory() && e.name.startsWith('backup_'))
        .map(e => e.name)
        .sort()
        .reverse();

      if (dirs.length <= keepCount) return;

      const toDelete = dirs.slice(keepCount);
      for (const dir of toDelete) {
        await fs.rm(path.join(store.backupDir, dir), { recursive: true, force: true });
      }
    } catch (err) {
      logger.error(err, '自动清理备份失败');
    }
  }

  async function resolveBackupFile(backupPath) {
    const normalizedPath = String(backupPath || '').replace(/^\/+/, '');
    const relativeToBackups = normalizedPath.replace(/^backups[\\/]/, '');
    const backupFile = path.resolve(store.backupDir, relativeToBackups);
    const backupRoot = path.resolve(store.backupDir);

    if (!backupFile.startsWith(backupRoot + path.sep)) {
      throw new Error('无效的备份路径');
    }

    const parsedPath = path.parse(backupFile);
    if (!isSafeBackupSegment(path.basename(parsedPath.dir)) || parsedPath.base !== 'backup.json') {
      throw new Error('无效的备份路径');
    }

    return backupFile;
  }

  async function restoreBackup(backupPath) {
    await store.ensureBootstrapFiles();
    const backupFile = await resolveBackupFile(backupPath);
    const payload = normalizeBackupPayload(JSON.parse(await fs.readFile(backupFile, 'utf8')));

    // 先创建恢复前快照
    const snapshotDir = path.join(store.backupDir, createBackupFolderName('before_restore'));
    await fs.mkdir(snapshotDir, { recursive: true });
    await fs.writeFile(
      path.join(snapshotDir, 'backup.json'),
      JSON.stringify({
        ...(await store.createSnapshot()),
        backupDate: new Date().toISOString(),
        appVersion: APP_VERSION
      }, null, 2),
      'utf8'
    );

    // 使用事务保证原子性：要么全部成功，要么全部回滚
    const db = store.db;
    const restoreTransaction = db.transaction(() => {
      store.writeSettings(payload.settings);
      store.writeSchedules(payload.schedules);
      store.writeVersion(payload.version);
    });

    try {
      restoreTransaction();
    } catch (error) {
      // 事务会自动回滚
      throw new Error(`恢复备份失败: ${error.message}`);
    }
  }

  async function deleteBackup(backupPath) {
    const backupFile = await resolveBackupFile(backupPath);
    const targetDir = path.dirname(backupFile);

    // 确保要删除的是备份目录，防止误删
    const backupRoot = path.resolve(store.backupDir);
    if (!targetDir.startsWith(backupRoot + path.sep) || targetDir === backupRoot) {
      throw new Error('无效的备份路径');
    }

    await fs.rm(targetDir, { recursive: true, force: true });
  }

  return {
    createBackup,
    listBackups,
    resolveBackupFile,
    restoreBackup,
    deleteBackup
  };
}

module.exports = {
  createBackupFolderName,
  createBackupService,
  isSafeBackupSegment
};
