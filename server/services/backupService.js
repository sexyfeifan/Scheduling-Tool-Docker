const fs = require('fs').promises;
const path = require('path');

const { APP_VERSION } = require('../config');
const { normalizeBackupPayload } = require('../utils/normalize');

function isSafeBackupSegment(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]+$/.test(value);
}

function createBackupFolderName(prefix = 'backup') {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:]/g, '-');
  return `${prefix}_${timestamp}`;
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

    return {
      backupPath: `/backups/${dirName}/backup.json`,
      backups: (await listBackups()).slice(0, 20)
    };
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

    await store.writeSettings(payload.settings);
    await store.writeSchedules(payload.schedules);
    await store.writeVersion(payload.version);
  }

  return {
    createBackup,
    listBackups,
    resolveBackupFile,
    restoreBackup
  };
}

module.exports = {
  createBackupFolderName,
  createBackupService,
  isSafeBackupSegment
};
