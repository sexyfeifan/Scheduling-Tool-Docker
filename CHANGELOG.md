# Changelog

## v3.33 (2026-07-07) - 里程碑版本

### 🐛 Bug 修复
- **导出颜色淡**: 颜色烘焙从 detach 状态移到 `appendChild` 之后，`getComputedStyle` 返回正确 CSS 类颜色
- **拖拽监听器泄漏**: `renderSchedule()` 重复添加 28 个监听器/次，改用 `dataset.dragBound` 只绑定一次
- **null 守卫**: `showToast` / `renderSchedule` header/column 添加 null 检查
- **闭包作用域**: `renderMobileDayPicker` 暴露到 `window`，修复全局函数无法调用闭包函数
- **桌面端误显**: `renderMobileDayPicker` 添加 `mobile-device` class 检查

### 📱 移动端响应式重构
- **设备检测**: UA + `maxTouchPoints` + `ontouchstart` 三重检测
- **日/周视图统合**: 共享日期选择器 + 详情区
- **日期选择器**: 7 天横向排列（日期名 + 数字 + 项目数），选中态高亮
- **详情区**: 点击日期展开大面积卡片列表（含操作按钮）
- **自动选中**: 进入页面自动显示今日项目
- **周切换同步**: 切换周数时 picker + 详情自动跟随
- **底部导航栏**: 日/周/月/人/导出
- **iPad 横屏**: 1024-1199px 紧凑样式，7 列完整显示

### 🔗 只读分享子页面
- **路径**: `/canbox`（管理员可自定义）
- **控制**: 管理后台可开关 + 设置路径
- **调试**: `?debug=1` 加载 eruda 调试面板

### 🏗️ 基础设施
- **SW 缓存**: 网络优先策略 + 缓存名随版本更新
- **BUILD_DATE**: Dockerfile ARG 注入构建日期
- **强制刷新按钮**: 清除 SW + Cache Storage + 强制重载

## v3.00 (2026-07-06) - 类型颜色系统重构

### 🎨 项目类型颜色系统
- 集中式颜色管理（`DEFAULT_TYPE_COLORS` + 15 色池）
- 药丸标和卡片背景同色系
- 颜色选择器 + 还原默认 + 自动分配不重复颜色
- 默认：平面=绿 / 视频=粉 / 直播=蓝 / 试做=紫 / 特殊=橘

### 🐛 导出修复
- 修复 detach 元素 `getComputedStyle` 返回默认值导致颜色丢失

## v2.89 (2026-06-29) - 多视图 + 导出 + 管理

### 📊 视图系统
- 日/周/月/人四视图完整实现
- 月视图日历（项目/人员模式）
- 人员排期矩阵

### 📤 导出功能
- 周/月/人员视图图片导出
- 跨周数导出
- 本周通告文字导出

### 🛡️ 管理功能
- 管理员密码修复
- 数据管理（姓名更替 / 任务交接）
- 访问控制 + 项目类型管理

### 🎨 UI
- 动森风格组件（Select/Switch/Card/Modal/Toast）
- SVG 图标系统
- HUD 时钟

## v2.63 (2026-06-23) - 稳定性与安全性

- SSE 无限重连修复 + 指数退避
- 备份恢复事务保护（SQLite 原子性）
- bcrypt cost factor 12
- API 请求 30s 超时
- 多架构 Docker 镜像（AMD64 + ARM64）
