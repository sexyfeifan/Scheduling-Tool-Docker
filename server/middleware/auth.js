/**
 * 认证中间件
 * 从 app.js 抽取，集中管理密码验证逻辑
 */

const { verifyPassword } = require('../utils/normalize');

/**
 * 创建管理员密码验证中间件
 * @param {string} backupPassword - 管理员密码
 */
function createRequireAdminPassword(backupPassword) {
  return function requireAdminPassword(req, res, next) {
    const headerPassword = req.headers['x-admin-password'];
    if (String(headerPassword || '') !== String(backupPassword)) {
      return res.status(401).json({ message: '管理员密码无效' });
    }
    next();
  };
}

/**
 * 创建编辑权限验证中间件
 * @param {object} store - 数据存储实例
 */
function createRequireEditAccess(store) {
  function resolveEditPasswordHash() {
    const settings = store.readSettings();
    return settings.access && settings.access.editPasswordHash
      ? settings.access.editPasswordHash
      : '';
  }

  return function requireEditAccess(req, res, next) {
    try {
      const expectedHash = resolveEditPasswordHash();
      if (!expectedHash) {
        next();
        return;
      }

      const candidate = String(req.headers['x-edit-password'] || '');
      if (!candidate || !verifyPassword(candidate, expectedHash)) {
        res.status(401).json({ message: '编辑密码无效' });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  createRequireAdminPassword,
  createRequireEditAccess
};
