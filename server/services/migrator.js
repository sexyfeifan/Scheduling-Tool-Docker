/**
 * 数据 schema 迁移框架
 * 
 * 支持版本化迁移，保证数据升级安全。
 * 每个迁移按顺序执行，失败时中断并报错。
 * 
 * 用法：
 *   const { migrate, needsMigration, runSqliteMigrations } = require('./migrator');
 *   const migrated = migrate(data);
 *   runSqliteMigrations(db);
 */

const logger = require('../logger');

const MIGRATIONS = [
  {
    version: 1,
    description: '初始版本',
    up: (data) => data
  },
  {
    version: 2,
    description: '结构化 schema，添加 schemaVersion 和 data 字段',
    up: (data) => data
  },
];

const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

const SQLITE_MIGRATIONS = [
  {
    version: 1,
    description: '创建 history 表 detail 列',
    up: (db) => {
      const cols = db.prepare("PRAGMA table_info(history)").all();
      if (!cols.some(c => c.name === 'detail')) {
        db.exec("ALTER TABLE history ADD COLUMN detail TEXT");
      }
    }
  },
  {
    version: 2,
    description: '创建 schema_migrations 追踪表',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          description TEXT,
          applied_at TEXT NOT NULL
        )
      `);
    }
  },
];

/**
 * 执行 SQLite schema 迁移
 * @param {object} db - better-sqlite3 数据库实例
 */
function runSqliteMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version)
  );

  for (const migration of SQLITE_MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    logger.info(`SQLite 迁移 v${migration.version}: ${migration.description}`);
    try {
      migration.up(db);
      db.prepare('INSERT OR IGNORE INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.description, new Date().toISOString());
    } catch (err) {
      logger.error(err, `SQLite 迁移 v${migration.version} 失败`);
      throw new Error(`SQLite 迁移失败 (v${migration.version}): ${err.message}`);
    }
  }
}

function getCurrentVersion(data) {
  if (!data || typeof data !== 'object') return 1;
  return Number(data.schemaVersion) || 1;
}

function migrate(data, targetVersion = LATEST_VERSION) {
  const currentVersion = getCurrentVersion(data);
  if (currentVersion >= targetVersion) return data;

  const pending = MIGRATIONS.filter(m => m.version > currentVersion && m.version <= targetVersion);
  if (pending.length === 0) return data;

  let migrated = data;
  for (const migration of pending) {
    logger.info(`数据迁移 v${migration.version}: ${migration.description}`);
    try {
      migrated = migration.up(migrated);
      if (migrated && typeof migrated === 'object') migrated.schemaVersion = migration.version;
    } catch (err) {
      logger.error(err, `数据迁移 v${migration.version} 失败`);
      throw new Error(`数据迁移失败 (v${migration.version}): ${err.message}`);
    }
  }
  return migrated;
}

function needsMigration(data) {
  return getCurrentVersion(data) < LATEST_VERSION;
}

module.exports = {
  MIGRATIONS,
  SQLITE_MIGRATIONS,
  LATEST_VERSION,
  getCurrentVersion,
  migrate,
  needsMigration,
  runSqliteMigrations
};
