/**
 * API 只读模式中间件
 * 当 settings.apiReadOnly === true 时，拒绝所有非 GET/HEAD/OPTIONS 请求
 */

function createApiReadOnlyGuard(store) {
  return function apiReadOnlyGuard(req, res, next) {
    // 允许安全方法
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    try {
      const settings = store.readSettings();
      if (settings && settings.apiReadOnly) {
        return res.status(403).json({
          error: 'API 只读模式已启用，不允许写入操作',
          code: 'API_READ_ONLY',
          hint: '请在管理后台 → API 管理 中关闭只读模式'
        });
      }
    } catch (e) {
      // 设置读取失败时默认允许（不阻断正常操作）
    }

    next();
  };
}

module.exports = { createApiReadOnlyGuard };
