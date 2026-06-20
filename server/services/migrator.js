/**
 * 数据 schema 迁移框架
 * 
 * 支持版本化迁移，保证数据升级安全。
 * 每个迁移按顺序执行，失败时中断并报错。
 * 
 * 用法：
 *   const { migrate, getCurrentVersion } = require('./migrator');
 *   const migrated = migrate(data, LATEST_VERSION);
 */

const MIGRATIONS = [
  {
    version: 1,
    description: '初始版本',
    up: (data) => data
  },
  {
    version: 2,
    description: '结构化 schema，添加 schemaVersion 和 data 字段',
    up: (data) => {
      // 已在 fileStore.loadStructuredCollection 中处理
      return data;
    }
  },
  // 后续迁移在此追加，例如：
  // {
  //   version: 3,
  //   description: '添加项目标签功能',
  //   up: (data) => {
  //     if (Array.isArray(data)) {
  //       return data.map(item => ({ ...item, tags: item.tags || [] }));
  //     }
  //     if (data && data.data && Array.isArray(data.data)) {
  //       data.data = data.data.map(item => ({ ...item, tags: item.tags || [] }));
  //     }
  //     return data;
  //   }
  // },
];

const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * 获取数据当前的 schema 版本
 * @param {object} data - 原始数据
 * @returns {number}
 */
function getCurrentVersion(data) {
  if (!data || typeof data !== 'object') return 1;
  return Number(data.schemaVersion) || 1;
}

/**
 * 执行迁移
 * @param {object} data - 原始数据
 * @param {number} targetVersion - 目标版本，默认为最新版本
 * @returns {object} 迁移后的数据
 */
function migrate(data, targetVersion = LATEST_VERSION) {
  const currentVersion = getCurrentVersion(data);

  if (currentVersion >= targetVersion) {
    return data;
  }

  const pending = MIGRATIONS.filter(
    (m) => m.version > currentVersion && m.version <= targetVersion
  );

  if (pending.length === 0) {
    return data;
  }

  let migrated = data;

  for (const migration of pending) {
    console.log(`[Migrator] 执行迁移 v${migration.version}: ${migration.description}`);
    try {
      migrated = migration.up(migrated);
      if (migrated && typeof migrated === 'object') {
        migrated.schemaVersion = migration.version;
      }
    } catch (err) {
      console.error(`[Migrator] 迁移 v${migration.version} 失败:`, err.message);
      throw new Error(`数据迁移失败 (v${migration.version}): ${err.message}`);
    }
  }

  return migrated;
}

/**
 * 检查是否需要迁移
 * @param {object} data
 * @returns {boolean}
 */
function needsMigration(data) {
  return getCurrentVersion(data) < LATEST_VERSION;
}

module.exports = {
  MIGRATIONS,
  LATEST_VERSION,
  getCurrentVersion,
  migrate,
  needsMigration
};
