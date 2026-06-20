const path = require('path');
const fsNative = require('fs');
const fs = fsNative.promises;

const { APP_CREATE_DATE, APP_VERSION, BACKUP_DIR, DATA_DIR } = require('../config');
const {
  DEFAULT_SETTINGS,
  normalizeScheduleList,
  normalizeSettingsPayload,
  normalizeVersionData
} = require('../utils/normalize');
const { migrate, needsMigration } = require('./migrator');

function createSqliteStore(options = {}) {
  const dataDir = options.dataDir || DATA_DIR;
  const backupDir = options.backupDir || BACKUP_DIR;
  const dbPath = path.join(dataDir, 'app.db');

  let db = null;

  function getDb() {
    if (!db) {
      throw new Error('数据库未初始化，请先调用 ensureBootstrapFiles()');
    }
    return db;
  }

  async function ensureBootstrapFiles() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
    // Ensure SQLite temp directory exists (set via TMPDIR env var)
    const tmpDir = path.join(dataDir, '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    // Verify the data directory is actually writable before proceeding.
    try {
      const probe = path.join(dataDir, `.write_probe_${process.pid}`);
      await fs.writeFile(probe, '', 'utf8');
      await fs.unlink(probe);
    } catch (err) {
      throw new Error(`数据目录不可写 (${dataDir})，请检查 Docker volume 挂载是否正确: ${err.message}`);
    }

    // Lazy-require so the module loads even when better-sqlite3 isn't installed yet
    const Database = require('better-sqlite3');
    db = new Database(dbPath);

    // WAL mode for concurrent readers + single writer
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    // Use memory for temp tables to avoid /tmp space issues in Docker
    db.pragma('temp_store = MEMORY');

    db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        date TEXT PRIMARY KEY,
        id   TEXT NOT NULL,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS version (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ts          TEXT    NOT NULL,
        action      TEXT    NOT NULL,
        date        TEXT,
        detail      TEXT,
        before_json TEXT,
        after_json  TEXT
      );
    `);

    // Migration: add detail column if missing
    try {
      const cols = db.prepare("PRAGMA table_info(history)").all();
      if (!cols.some(c => c.name === 'detail')) {
        db.exec("ALTER TABLE history ADD COLUMN detail TEXT");
      }
    } catch (_) {}

    // Seed default settings if absent
    const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('main');
    if (!settingsRow) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
        .run('main', JSON.stringify(DEFAULT_SETTINGS));
    }

    // Seed default version if absent
    const versionRow = db.prepare('SELECT value FROM version WHERE key = ?').get('main');
    if (!versionRow) {
      db.prepare('INSERT INTO version (key, value) VALUES (?, ?)')
        .run('main', JSON.stringify({
          version: APP_VERSION,
          createDate: APP_CREATE_DATE,
          buildDate: new Date().toISOString().split('T')[0]
        }));
    }

    // One-time migration from JSON flat files if they exist and DB is fresh
    await migrateFromJsonIfNeeded();
  }

  async function migrateFromJsonIfNeeded() {
    const jsonSchedules = path.join(dataDir, 'schedules.json');
    const jsonSettings = path.join(dataDir, 'settings.json');

    const schedulesExist = fsNative.existsSync(jsonSchedules);
    const settingsExist = fsNative.existsSync(jsonSettings);

    if (!schedulesExist && !settingsExist) return;

    const schedulesCount = db.prepare('SELECT COUNT(*) as c FROM schedules').get().c;
    // Only migrate if DB is empty (first run after upgrading from JSON store)
    if (schedulesCount > 0) return;

    if (schedulesExist) {
      try {
        const raw = JSON.parse(fsNative.readFileSync(jsonSchedules, 'utf8'));
        // 使用迁移框架升级数据格式
        const migrated = needsMigration(raw) ? migrate(raw) : raw;
        const data = migrated && migrated.data !== undefined ? migrated.data : migrated;
        const schedules = normalizeScheduleList(data || []);
        const insert = db.prepare('INSERT OR REPLACE INTO schedules (date, id, data) VALUES (?, ?, ?)');
        const insertMany = db.transaction((rows) => {
          for (const s of rows) insert.run(s.date, s.id, JSON.stringify(s.projects));
        });
        insertMany(schedules);
        console.log(`[migrate] Imported ${schedules.length} schedule(s) from schedules.json`);
      } catch (err) {
        console.warn('[migrate] schedules.json 迁移跳过:', err.message);
      }
    }

    if (settingsExist) {
      try {
        const raw = JSON.parse(fsNative.readFileSync(jsonSettings, 'utf8'));
        // 使用迁移框架升级数据格式
        const migrated = needsMigration(raw) ? migrate(raw) : raw;
        const data = migrated && migrated.data !== undefined ? migrated.data : migrated;
        const settings = normalizeSettingsPayload(data || {});
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .run('main', JSON.stringify(settings));
        console.log('[migrate] Imported settings from settings.json');
      } catch (err) {
        console.warn('[migrate] settings.json 迁移跳过:', err.message);
      }
    }
  }

  function readSchedules() {
    const rows = getDb().prepare('SELECT id, date, data FROM schedules ORDER BY date ASC').all();
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      projects: JSON.parse(r.data)
    }));
  }

  function readScheduleByDate(date) {
    const row = getDb().prepare('SELECT id, date, data FROM schedules WHERE date = ?').get(date);
    if (!row) return null;
    return { id: row.id, date: row.date, projects: JSON.parse(row.data) };
  }

  function writeSchedules(schedules) {
    const normalized = normalizeScheduleList(schedules);
    const upsert = getDb().prepare('INSERT OR REPLACE INTO schedules (date, id, data) VALUES (?, ?, ?)');
    const txn = getDb().transaction((rows) => {
      // Clear and reinsert — keeps it consistent with old fileStore semantics
      getDb().prepare('DELETE FROM schedules').run();
      for (const s of rows) upsert.run(s.date, s.id, JSON.stringify(s.projects));
    });
    txn(normalized);
  }

  function writeScheduleDate(date, id, projects) {
    getDb().prepare('INSERT OR REPLACE INTO schedules (date, id, data) VALUES (?, ?, ?)')
      .run(date, id, JSON.stringify(projects));
    // Periodic WAL checkpoint to prevent WAL file from growing unbounded
    try { getDb().pragma('wal_checkpoint(PASSIVE)'); } catch (_) {}
  }

  function deleteScheduleDate(date) {
    getDb().prepare('DELETE FROM schedules WHERE date = ?').run(date);
  }

  function readSettings() {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('main');
    return normalizeSettingsPayload(row ? JSON.parse(row.value) : DEFAULT_SETTINGS);
  }

  function writeSettings(settings) {
    const normalized = normalizeSettingsPayload(settings);
    getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('main', JSON.stringify(normalized));
  }

  function readVersion() {
    const row = getDb().prepare('SELECT value FROM version WHERE key = ?').get('main');
    const v = normalizeVersionData(row ? JSON.parse(row.value) : {});
    if (!v.buildDate) {
      v.buildDate = new Date().toISOString().split('T')[0];
      writeVersion(v);
    }
    return v;
  }

  function writeVersion(version) {
    const normalized = normalizeVersionData(version);
    getDb().prepare('INSERT OR REPLACE INTO version (key, value) VALUES (?, ?)')
      .run('main', JSON.stringify(normalized));
  }

  function appendHistory({ action, date, before, after, detail }) {
    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      // 每天最多保留 20 条记录
      const todayCount = getDb().prepare(
        "SELECT COUNT(*) as c FROM history WHERE ts LIKE ?"
      ).get(todayStr + '%').c;

      if (todayCount >= 20) {
        // 删除今天最早的记录，为新记录腾出空间
        const oldest = getDb().prepare(
          "SELECT id FROM history WHERE ts LIKE ? ORDER BY ts ASC LIMIT 1"
        ).get(todayStr + '%');
        if (oldest) {
          getDb().prepare('DELETE FROM history WHERE id = ?').run(oldest.id);
        }
      }

      getDb().prepare(
        'INSERT INTO history (ts, action, date, detail, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        now.toISOString(),
        String(action),
        date || null,
        detail || null,
        before !== undefined ? JSON.stringify(before) : null,
        after !== undefined ? JSON.stringify(after) : null
      );

      // 清理 30 天前的旧记录
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      getDb().prepare('DELETE FROM history WHERE ts < ?').run(thirtyDaysAgo);
    } catch (err) {
      console.error('[history] appendHistory failed:', err.message);
    }
  }

  function clearHistory() {
    getDb().prepare('DELETE FROM history').run();
  }

  function readHistory({ limit = 100, date } = {}) {
    if (date) {
      return getDb().prepare(
        'SELECT * FROM history WHERE date = ? ORDER BY ts DESC LIMIT ?'
      ).all(date, limit);
    }
    return getDb().prepare(
      'SELECT * FROM history ORDER BY ts DESC LIMIT ?'
    ).all(limit);
  }

  function createSnapshot() {
    return {
      settings: readSettings(),
      schedules: readSchedules(),
      version: readVersion()
    };
  }

  function getHealthStatus() {
    const snapshot = createSnapshot();
    return {
      dataDir,
      backupDir,
      schedulesCount: snapshot.schedules.length,
      templateCount: snapshot.settings.projectTemplates.length,
      shareEnabled: Boolean(snapshot.settings.access && snapshot.settings.access.shareEnabled)
    };
  }

  // Compatibility shim: write arbitrary JSON files (used by backupService)
  async function writeJsonWithBackup(filePath, data) {
    const payload = JSON.stringify(data, null, 2);
    const fsP = require('fs').promises;
    await fsP.mkdir(path.dirname(filePath), { recursive: true });
    await fsP.writeFile(filePath, payload, 'utf8');
    await fsP.writeFile(`${filePath}.bak`, payload, 'utf8');
  }

  return {
    backupDir,
    dataDir,
    dbPath,
    get db() { return db; },
    ensureBootstrapFiles,
    getHealthStatus,
    paths: {},
    readSchedules,
    readScheduleByDate,
    writeSchedules,
    writeScheduleDate,
    deleteScheduleDate,
    readSettings,
    writeSettings,
    readVersion,
    writeVersion,
    appendHistory,
    clearHistory,
    readHistory,
    createSnapshot,
    writeJsonWithBackup
  };
}

module.exports = { createSqliteStore };
