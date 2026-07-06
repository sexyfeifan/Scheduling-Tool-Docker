# Changelog

## v3.00 (2026-07-06) - 里程碑版本：类型颜色系统重构

### 🎨 项目类型颜色系统
- **集中式颜色管理**: `DEFAULT_TYPE_COLORS` + `TYPE_COLOR_PALETTE`（15 色不重复池）
- **药丸标卡片同色系**: 基于主色自动生成 rgba 12% 透明度背景 + 40% 边框 + 加深文字
- **颜色选择器**: 设置页每个类型左侧 `<input type="color">`，实时更新卡片颜色
- **还原默认颜色**: 一键重置为默认颜色
- **自动分配颜色**: 新增类型从 15 色池取第一个未使用颜色
- **类型重命名保留颜色**: 重命名时自动迁移颜色映射
- **无类型默认白色**: 未选择类型时卡片 background:#ffffff

### 🎨 默认类型颜色
- 平面=#10B981(绿) / 视频=#EC4899(粉) / 直播=#3B82F6(蓝) / 试做=#8B5CF6(紫) / 特殊=#FF8C00(橘)

### 🐛 导出修复
- **卡片颜色**: `getComputedStyle` 在 detach 元素返回默认值导致所有卡片同色，跳过 background/color 属性复制
- **类型小圆点**: 改为 inline style 渲染，与 staff-dot 导出方式一致

### 📱 移动端优化（v2.92~v2.97 累积）
- 触摸区域 ≥ 44px / 添加按钮触摸可见 / 管理页 Tab 横向滚动
- iOS Safari 下载兼容 / 新标签页降级 / blob URL 内存释放
- viewport-fit=cover / hover 禁用 / background-attachment 修复
- iOS PWA 元标签 / SW 缓存更新 / 手势去重
- 触摸拖拽（长按底部日期选择面板）
- 月视图 / 人员视图移动端横向滚动

### 🕐 时间显示修复（v2.92~v2.97 累积）
- 时间圆点统一为 staff-dot 风格（7×7px 柠檬黄 #FFD700）
- 时间文字 system-ui 字体（修复 canvas 渲染冒号字距）
- 导出容器恢复正常字距渲染

---

## v2.92.0 (2026-07-05) - 移动端全面优化

### 📱 触摸体验
- **触摸区域**: 删除按钮 44px、添加按钮 44px、关闭按钮 44px、日历 44px、复选框 28px、Tab 44px、复制按钮 min-height 44px
- **添加按钮可见**: 触摸设备上 `.add-btn` 始终显示（opacity 0.6），不再依赖 hover
- **横屏模式**: 删除按钮从 20px 增大至 36px
- **管理页 Tab**: 横向滚动 + flex-wrap: nowrap
- **按钮通用**: `.btn` min-height 44px、`.btn.icon-btn` min-width 44px

### 📤 导出修复（移动端）
- **iOS 下载**: 检测 iOS 设备，弹出新窗口显示图片 + "长按图片→保存到照片"引导
- **新标签页降级**: `window.open` 被拦截时 fallback 到 `location.href`
- **内存泄漏**: blob URL 60s 后自动 `revokeObjectURL`

### 🎨 样式修复
- **viewport-fit=cover**: 启用刘海屏 `env(safe-area-inset-*)`
- **hover 禁用**: 新增 5 个遗漏的 hover 效果（copy-btn、copy-date-option、month-cell、day、month-day-cell）
- **background-attachment**: `fixed` → `scroll` 消除 iOS 滚动卡顿
- **overscroll-behavior**: 弹窗添加 `contain` 防止背景滚动
- **version-info**: 避开 safe area 定位

### 🏗️ PWA
- **iOS 元标签**: apple-mobile-web-app-capable + status-bar-style
- **theme-color**: `<meta name="theme-color">`
- **SW 缓存**: v2.61 → v2.92
- **手势去重**: mobile.js 滑动逻辑移除，由 mobileGestures.js 统一管理

## v2.91.0 (2026-07-05) - 导出图片圆点彻底修复

### 🐛 导出修复
- **根因修复**: 移除 `getComputedStyle().cssText` 全量覆盖子元素样式循环，此循环会覆盖 CSS 类定义的 flex 布局导致圆点偏移
- **选择性样式复制**: 导出仅复制卡片级别必要属性（background、border、padding、box-shadow 等），子元素样式由 CSS 类自然继承
- **渲染恢复**: 白点和项目类型标签恢复 inline-flex（编辑页显示正确，不再被导出循环破坏）

## v2.90.0 (2026-07-05) - 导出图片圆点修复（已废弃）

### 🐛 导出修复
- **开始时间白点导出对齐**: 改用 `inline-block` + `vertical-align:middle` 替代 `inline-flex` wrapper，确保 html2canvas 正确渲染
- **项目类型彩色圆点导出**: `.project-type` 改用 `display:inline-block`，圆点使用 `vertical-align:middle` 对齐
- **导出样式复制跳过优化**: 扩展跳过条件，保留含 `inline-flex` 的 inline style 元素

## v2.89.0 (2026-06-29) - 里程碑版本

### 🎨 UI/UX
- **开始时间白点对齐修复**: 白点与时间文字垂直居中对齐（inline-flex + align-items:center）
- **人员姓名分组换行**: 3 人以上按每行 2 人分组换行，圆点上下对齐（hidden label 占位对齐）
- **项目类型鲜艳配色**: 平面绿 / 视频粉 / 直播琥珀 / 试做紫 + 白字
- **动森风格组件**: Select/Switch/下拉选择器 Animal Island UI 风格
- **拍摄地样式美化**: 地点标签视觉优化

### 📊 视图系统
- **日视图**: 查看单日排期，左右切换日期
- **月视图日历**: 项目/人员模式切换，显示每日排期名称
- **人员排期矩阵**: 按自然月显示，按月切换
- **视图切换**: 单/周/月/人四个视图按钮全部生效

### 📤 导出功能
- **周视图图片导出**: html2canvas，预览 + 下载 + 新标签页打开
- **跨周数导出**: 选择起止日期，完整渲染多周排期
- **月视图 / 人员视图导出**: 图片导出颜色与编辑页完全一致
- **彩色圆点修复**: inline style + &nbsp; 彻底修复导出圆点不显示

### 🛡️ 管理功能
- **管理员密码登录修复**: 认证流程稳定性提升
- **数据管理**: 姓名更替 / 任务交接，支持并列人名自动拆分
- **访问控制**: 独立 Tab 管理
- **项目类型管理**: 动态类型配置
- **预警弹窗**: 跳转 + 删除功能

### 🐛 稳定性
- settingsModal null 崩溃修复
- escapeAttr 函数补全
- 角色硬编码改动态 roleCategories
- loadHistoryRecords null 检查
- 78 个重复备份文件清理
- 版本号统一 2.89

---

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
