const fsNative = require('fs');
const fs = fsNative.promises;
const path = require('path');

const { APP_CREATE_DATE, APP_VERSION, BACKUP_DIR, DATA_DIR } = require('../config');
const {
  DEFAULT_SETTINGS,
  normalizeScheduleList,
  normalizeSettingsPayload,
  normalizeVersionData,
  wrapStructuredData
} = require('../utils/normalize');

function createFileStore(options = {}) {
  const dataDir = options.dataDir || DATA_DIR;
  const backupDir = options.backupDir || BACKUP_DIR;
  const paths = {
    schedules: path.join(dataDir, 'schedules.json'),
    settings: path.join(dataDir, 'settings.json'),
    version: path.join(dataDir, 'version.json')
  };
  const writeQueues = new Map();

  function getBackupFile(filePath) {
    return `${filePath}.bak`;
  }

  function queueFileWrite(filePath, operation) {
    const previous = writeQueues.get(filePath) || Promise.resolve();
    const next = previous.then(operation, operation);
    writeQueues.set(filePath, next.catch(() => {}));
    return next;
  }

  async function writeFileAtomically(filePath, content) {
    const tempFile = path.join(
      path.dirname(filePath),
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
    );
    const fd = await fs.open(tempFile, 'w');
    try {
      await fd.writeFile(content, 'utf8');
      await fd.sync();
    } finally {
      await fd.close();
    }
    await fs.rename(tempFile, filePath);
  }

  async function parseJsonFile(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async function readJsonWithRecovery(filePath) {
    try {
      return await parseJsonFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw error;
      }

      const backupFile = getBackupFile(filePath);
      const recoveredData = await parseJsonFile(backupFile);
      await queueFileWrite(filePath, async () => {
        await writeFileAtomically(filePath, JSON.stringify(recoveredData, null, 2));
      });
      return recoveredData;
    }
  }

  async function writeJsonWithBackup(filePath, data) {
    return queueFileWrite(filePath, async () => {
      const payload = JSON.stringify(data, null, 2);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await writeFileAtomically(filePath, payload);
      await writeFileAtomically(getBackupFile(filePath), payload);
    });
  }

  async function ensureBootstrapFiles() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });

    // Verify the data directory is actually writable before proceeding.
    // If the Docker volume mount failed, the directory may exist in the image
    // layer but be unwritable, causing false-negative access() checks below.
    try {
      const probe = path.join(dataDir, `.write_probe_${process.pid}`);
      await fs.writeFile(probe, '', 'utf8');
      await fs.unlink(probe);
    } catch (err) {
      throw new Error(`数据目录不可写 (${dataDir})，请检查 Docker volume 挂载是否正确: ${err.message}`);
    }

    // Only create default files if they are genuinely absent (ENOENT).
    // Any other error (permission, I/O) is re-thrown so the server refuses
    // to start rather than silently overwriting live data with empty defaults.
    async function initIfAbsent(filePath, writer) {
      try {
        await fs.access(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        await writer();
      }
    }

    await initIfAbsent(paths.schedules, () => writeSchedules([]));
    await initIfAbsent(paths.settings, () => writeSettings(DEFAULT_SETTINGS));
    await initIfAbsent(paths.version, () =>
      writeVersion({ version: APP_VERSION, createDate: APP_CREATE_DATE, buildDate: '' })
    );
  }

  async function loadStructuredCollection(filePath, normalizer, defaultValue) {
    const raw = await readJsonWithRecovery(filePath);
    if (raw && typeof raw === 'object' && Number(raw.schemaVersion) >= 2 && raw.data !== undefined) {
      return {
        value: normalizer(raw.data),
        migrated: false
      };
    }

    return {
      value: normalizer(raw || defaultValue),
      migrated: true
    };
  }

  async function readSchedules() {
    const result = await loadStructuredCollection(paths.schedules, normalizeScheduleList, []);
    if (result.migrated) {
      await writeSchedules(result.value);
    }
    return result.value;
  }

  async function writeSchedules(schedules) {
    await writeJsonWithBackup(paths.schedules, wrapStructuredData(normalizeScheduleList(schedules)));
  }

  async function readSettings() {
    const result = await loadStructuredCollection(paths.settings, normalizeSettingsPayload, DEFAULT_SETTINGS);
    if (result.migrated) {
      await writeSettings(result.value);
    }
    return result.value;
  }

  async function writeSettings(settings) {
    await writeJsonWithBackup(paths.settings, wrapStructuredData(normalizeSettingsPayload(settings)));
  }

  async function readVersion() {
    const version = normalizeVersionData(await readJsonWithRecovery(paths.version));
    if (!version.buildDate) {
      version.buildDate = new Date().toISOString().split('T')[0];
      await writeVersion(version);
    }
    return version;
  }

  async function writeVersion(version) {
    await writeJsonWithBackup(paths.version, normalizeVersionData(version));
  }

  async function createSnapshot() {
    return {
      settings: await readSettings(),
      schedules: await readSchedules(),
      version: await readVersion()
    };
  }

  async function getHealthStatus() {
    const snapshot = await createSnapshot();
    return {
      dataDir,
      backupDir,
      schedulesCount: snapshot.schedules.length,
      templateCount: snapshot.settings.projectTemplates.length,
      shareEnabled: Boolean(snapshot.settings.access && snapshot.settings.access.shareEnabled)
    };
  }

  return {
    backupDir,
    dataDir,
    ensureBootstrapFiles,
    getHealthStatus,
    paths,
    readSchedules,
    readSettings,
    readVersion,
    writeSchedules,
    writeSettings,
    writeVersion,
    createSnapshot,
    writeJsonWithBackup
  };
}

module.exports = { createFileStore };
