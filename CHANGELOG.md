# Changelog

## v2.65.0 (2026-06-23)

### 🐛 Bug 修复
- **批量操作崩溃修复**: `batch.js` 添加 `req.body` 空值保护，防止 `TypeError` 崩溃
- **批量移动日期验证**: `targetDate` 现在使用 `isValidDateString()` 验证，防止注入无效日期
- **Webhook 异步错误处理**: 所有 webhook 路由的 `store.readSettings()` 调用移入 try-catch，防止未处理的 Promise 拒绝导致进程崩溃
- **前端 DOM 空值保护**: 所有 `getElementById().addEventListener()` 调用添加 null 检查，防止缺失元素导致应用启动崩溃
- **弹窗阻止检测**: `window.open()` 添加 null 检查，弹窗被阻止时显示友好提示
- **Webhook API 方法补全**: `api.js` 添加 `webhookPreview` 和 `webhookPush` 方法，修复 webhook 推送按钮无响应问题

### 🔒 安全增强
- **时序攻击防护**: 管理员密码验证改用 `timingSafeEqual()`，防止时序侧信道攻击
- **长度泄露修复**: `timingSafeEqual()` 在长度不等时使用填充比较，不再泄露密码长度信息
- **ID 生成统一**: 批量操作的 ID 生成改用 `generateId()` (含 `crypto.randomBytes`)，避免 `Date.now()` 碰撞

## v2.60.0 (2026-06-20)

### 🎨 视图增强
- **月视图甘特图**：按月查看排期，甘特条显示项目状态，点击日期跳转到周视图
- **人员排期视图**：以人员为行、日期为列的矩阵视图，支持周/月切换
- **数据看板**：统计面板包含状态分布、类型分布、场地使用Top10、人员工作量Top10、周趋势

### ⚡ 效率工具
- **快速创建**：一行输入多个关键词（空格分隔），自动解析为项目字段
- **批量操作**：支持批量删除、批量移动、批量状态更新
- **键盘导航**：全局快捷键（Ctrl+K搜索、Ctrl+N新建、T跳今天、1-4切视图）
- **移动端手势**：左右滑动切换周，长按触发新建

### 🔗 集成与导出
- **iCal 日历订阅**：GET /api/calendar 生成 .ics 文件，支持 Apple/Google/Outlook 订阅
- **数据导出增强**：JSON 完整备份 + CSV 报表导出
- **全局搜索增强**：多条件过滤（场地/状态/角色/人员/日期范围），支持保存过滤器

### 🛡️ 安全与架构
- **认证中间件抽取**：admin/edit 认证逻辑独立为 server/middleware/auth.js
- **视图切换框架**：viewSwitcher.js 管理周/月/人员/看板四个视图的切换
- **数据验证模块**：前端表单验证（字段长度、格式、状态枚举）

### 📱 PWA 与离线
- **Service Worker**：缓存静态资源，API 请求网络优先回退缓存
- **离线指示器**：自动检测网络状态，显示在线/离线提示
- **PWA Manifest**：支持"添加到主屏幕"

### 🔍 辅助功能
- **操作历史面板**：侧边滑入面板，展示操作历史，支持撤销
- **人员冲突检测**：API + 前端报告，检测同一人同一天多项目冲突
- **后端统计 API**：GET /api/statistics 提供完整统计数据

### 🧪 测试与 CI
- CI 支持 v2.60-dev 分支
- GitHub Actions 19 个测试全部通过

---

## v2.59.0 (2026-06-14)

- 跨周导出
- 广告商订单
- 动态角色管理
- 暗色模式
- 快捷键系统
- CSV 导出
- 操作历史
- Dockerfile 多阶段构建
- ESLint + Prettier + GitHub Actions CI
