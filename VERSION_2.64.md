# v2.64 版本发布说明
发布日期：2026-06-23

## 🎉 版本概述

v2.64 是基于 v2.63 所有改进的稳定版本，作为新的开发基线。

---

## 📦 镜像信息

### Docker Hub
- **标签**: `sexyfeifan/scheduling-tool:2.64`
- **Digest**: `sha256:bdd32e9b1dadf90ba77d79d5f7df12ab23eb260a0d874a6b4d68826a14781785`
- **架构**: AMD64
- **大小**: ~212MB
- **基础镜像**: Node.js 22 Alpine

### 注意事项
当前推送的 2.64 镜像是从 2.63 的构建重新标记的。镜像内部版本显示可能仍为 2.63，但包含所有 2.63 的修复和改进。

如需完全匹配的版本号，需要重新构建：
```bash
docker buildx build --no-cache --platform linux/amd64,linux/arm64 \
  -t sexyfeifan/scheduling-tool:2.64 \
  -t sexyfeifan/scheduling-tool:latest \
  --push .
```

---

## ✨ 主要特性

### 1. 完整的 Null 安全检查
所有 DOM 元素访问都有 null 检查：
- ✅ `settingsBtn` - 设置按钮
- ✅ `exportImageBtn` - 导出按钮
- ✅ `pasteRecognitionBtn` - 粘贴识别
- ✅ `undoActionBtn` - 撤销按钮
- ✅ `searchProjectsInput` - 搜索输入
- ✅ `filterTypeSelect` - 类型过滤
- ✅ `clearFiltersBtn` - 清除过滤
- ✅ `saveTemplateFromFormBtn` - 保存模板
- ✅ `cancelEditBtn` - 取消编辑
- ✅ `closeModalButtons` - 关闭按钮
- ✅ `applyTemplateBtn` - 应用模板

### 2. API 请求优化
```javascript
// 30秒超时控制
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
    const response = await fetch(url, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(timeoutId);
    // 处理响应
} catch (error) {
    if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
    }
    throw error;
}
```

### 3. 搜索防抖优化
```javascript
let searchDebounceTimer;
if (searchProjectsInput) {
    searchProjectsInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(updateFilterState, 300);
    });
}
```

### 4. 密码安全增强
```javascript
// bcrypt cost factor 从 10 提升到 12
function hashPassword(password) {
    return bcrypt.hashSync(String(password), 12);
}
```

### 5. 备份恢复事务保护
```javascript
const restoreTransaction = db.transaction(() => {
    store.writeSettings(payload.settings);
    store.writeSchedules(payload.schedules);
    store.writeVersion(payload.version);
});

try {
    restoreTransaction(); // 事务会自动回滚失败的操作
} catch (error) {
    throw new Error(`恢复备份失败: ${error.message}`);
}
```

---

## 🔧 技术改进

### 前端
1. **模块化架构**
   - 代码拆分为多个独立模块
   - 更好的可维护性和可测试性

2. **CSS 重构**
   - 按功能分离 CSS 文件
   - 更清晰的样式组织

3. **错误处理**
   - 统一的错误处理机制
   - 用户友好的错误提示

### 后端
1. **路由优化**
   - 新增批量操作路由
   - 新增冲突检测路由
   - 新增统计路由

2. **中间件**
   - 统一的身份验证中间件
   - 请求日志记录

3. **数据库**
   - SQLite 事务保护
   - 原子写入操作

---

## 📊 与 v2.59 对比

| 功能 | v2.59 | v2.64 |
|------|-------|-------|
| Null 安全检查 | ❌ 缺失 | ✅ 完整 |
| API 超时控制 | ❌ 无 | ✅ 30秒 |
| 搜索防抖 | ⚠️ 基础 | ✅ 优化 |
| 密码哈希强度 | ⚠️ cost 10 | ✅ cost 12 |
| 备份事务 | ❌ 无 | ✅ 完整 |
| 代码模块化 | ⚠️ 部分 | ✅ 完整 |
| 错误处理 | ⚠️ 基础 | ✅ 完善 |

---

## 🚀 部署指南

### 本地测试
```bash
# 拉取镜像
docker pull sexyfeifan/scheduling-tool:2.64

# 启动
docker compose up -d

# 访问
open http://localhost:3000
```

### 远程服务器更新
```bash
# SSH 到服务器
ssh your-user@your-server

# 进入项目目录
cd /path/to/scheduling-tool

# 更新到 v2.64
docker compose down
docker pull sexyfeifan/scheduling-tool:2.64
docker tag sexyfeifan/scheduling-tool:2.64 sexyfeifan/scheduling-tool:latest
docker compose up -d
```

### 使用 Digest
```bash
# 使用 digest 确保版本准确
docker pull sexyfeifan/scheduling-tool@sha256:bdd32e9b1dadf90ba77d79d5f7df12ab23eb260a0d874a6b4d68826a14781785
docker tag sexyfeifan/scheduling-tool@sha256:bdd32e9b1dadf90ba77d79d5f7df12ab23eb260a0d874a6b4d68826a14781785 sexyfeifan/scheduling-tool:2.64
```

---

## 🌳 Git 分支结构

```
main (v2.64) ← 当前稳定版本
├── v2.64-dev (已合并)
├── backup-v2.63-20260623 (备份)
└── v2.59 (旧稳定版，已还原)
```

### 分支说明
- **main**: 主分支，当前为 v2.64
- **v2.64-dev**: 开发分支（已合并到 main）
- **backup-v2.63-20260623**: v2.63 的备份分支
- v2.59 相关提交保留在历史中

---

## 📝 开发建议

### 后续开发流程
1. **创建功能分支**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **开发和测试**
   - 小步迭代
   - 频繁测试
   - 及时提交

3. **合并到 main**
   ```bash
   git checkout main
   git merge feature/new-feature --no-ff
   git push origin main
   ```

4. **发布新版本**
   - 更新版本号（如 2.65）
   - 构建并推送 Docker 镜像
   - 更新文档

### 代码规范
1. **Null 检查**: 所有 DOM 操作前检查 null
2. **错误处理**: 所有异步操作都要有 try-catch
3. **超时控制**: 所有网络请求都要有超时
4. **事务保护**: 数据库关键操作使用事务
5. **模块化**: 新功能尽量独立模块

---

## 🐛 已知问题

### 版本号不一致
- **问题**: 镜像内部显示 2.63
- **原因**: 镜像是从 2.63 重新标记的
- **影响**: 不影响功能，仅显示问题
- **解决**: 需要时重新构建镜像

### 无其他已知问题
v2.64 基于经过测试的 v2.63，所有已知 bug 均已修复。

---

## 📚 相关文档

- **BUG_REPORT.md** - 详细的 bug 列表和修复方案
- **FIX_SUMMARY.md** - 修复总结和部署指南
- **RESTORE_INFO.md** - v2.59 还原说明
- **README.md** - 项目说明
- **docs/API.md** - API 文档

---

## 🎯 下一步计划

v2.64 作为稳定基线，后续版本将在此基础上添加新功能：

### 计划功能
- 🔄 更多视图选项
- 📊 更详细的统计分析
- 🔔 更强大的通知系统
- 🎨 主题定制
- 📱 移动端优化
- 🔐 更多安全选项

---

## 📞 支持

如有问题或建议，请：
- 提交 GitHub Issue: https://github.com/sexyfeifan/Scheduling-Tool-Docker/issues
- 邮箱: zhoufeifan@gmail.com

---

## 🎊 总结

v2.64 是一个稳定、可靠的版本，包含了：
- ✅ 完整的 bug 修复
- ✅ 性能优化
- ✅ 安全增强
- ✅ 代码质量提升

作为新的开发基线，v2.64 为后续功能开发提供了坚实的基础！

---

生成时间：2026-06-23
版本：v2.64
作者：性感的非凡
