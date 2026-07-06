# 罐头场通告排期 — Docker 版本

> 当前版本：**v3.33** | Docker Hub: `sexyfeifan/scheduling-tool:3.33`

[![Docker Pulls](https://img.shields.io/docker/pulls/sexyfeifan/scheduling-tool)](https://hub.docker.com/r/sexyfeifan/scheduling-tool)
[![Docker Image Size](https://img.shields.io/docker/image-size/sexyfeifan/scheduling-tool/latest)](https://hub.docker.com/r/sexyfeifan/scheduling-tool)
[![GitHub](https://img.shields.io/github/license/sexyfeifan/Scheduling-Tool-Docker)](https://github.com/sexyfeifan/Scheduling-Tool-Docker)

## 简介

单用户共享排期管理系统，所有用户看到相同数据，支持实时同步。Docker 一键部署，适用于 NAS、云服务器等任何支持 Docker 的环境。

**多架构支持**: ✅ AMD64 (Intel/AMD) | ✅ ARM64 (Apple Silicon, ARM服务器)

## 功能特点

### 核心排期

- 周视图排期管理（主视图，拖拽调整日期）
- 日视图（查看单日排期，左右切换日期）
- 月视图日历（项目/人员模式切换，显示每日排期名称）
- 人员排期矩阵（按自然月显示，按部门分组，角色颜色标记）
- 项目添加 / 编辑 / 删除 / 复制
- 卡片按项目类型鲜艳配色（平面=绿 / 视频=粉 / 直播=蓝 / 试做=紫 / 特殊=橘），支持自定义颜色
- 项目名单行不换行（响应式字号缩放）
- 人员姓名每行至多 2 人自动换行对齐

### 效率工具

- 快速创建（一行输入自动解析项目字段）
- 批量操作（删除 / 移动 / 状态更新）
- 键盘快捷键（`Ctrl+K` 搜索 / `Ctrl+N` 新增 / `Ctrl+Z` 撤销 / `Ctrl+E` 导出）
- 移动手势（左滑下一周 / 右滑上一周 / 长按新建）
- 撤销 / 重做（支持多步）
- 粘贴识别（从剪贴板解析排期文本）
- 冲突预警（检测同一人同天多项目，支持跳转删除）

### 导出与集成

- 周视图图片导出（html2canvas，预览 + 下载 + 新标签页打开）
- 跨周数导出（选择起止日期，完整渲染多周排期）
- 月视图 / 人员视图图片导出
- 本周通告文字导出
- JSON / CSV 数据导出
- iCal 日历订阅（Apple / Google / Outlook）
- Webhook 推送（钉钉 / 飞书 / 企微 / 自定义）

### 管理功能

- 管理员密码验证
- 编辑密码保护
- 只读分享子页面（`/canbox`，管理员控制开关和路径）
- 数据备份 / 恢复（服务端备份 + 本地文件导入导出）
- 操作历史记录
- 动态职能管理（单选 / 多选 radio 切换）
- 项目类型管理（颜色选择器 + 还原默认 + 自动分配不重复颜色）
- 项目模板
- 数据管理（姓名更替 / 任务交接，支持并列人名自动拆分）

### 移动端适配

- 响应式布局：手机竖屏 / iPad 竖屏 / iPad 横屏 / 桌面端自适应
- 触屏设备检测：UA + `maxTouchPoints` + `ontouchstart` 三重检测
- 移动端日/周视图：日期选择器（7天横向）+ 详情区（大面积卡片展示）
- 移动端月/人视图：日历/矩阵横向滚动
- 底部导航栏：日 / 周 / 月 / 人 / 导出
- 触摸区域 ≥ 44px，hover 效果禁用
- iOS Safari 下载兼容 / 新标签页降级
- viewport-fit=cover / safe-area-inset 适配

### UI 组件（Animal Island 风格）

- Switch 开关（动森规范 52×28px，黄色开启态）
- Select 自定义下拉（黄色下拉面板 + SVG chevron + pill 圆角）
- Radio 单选框（正圆 16px + 薄荷绿选中）
- Card 卡片（纯色背景 + 类型鲜艳配色 + 人员彩色圆点）
- Modal 弹窗（奶油底 + zoom-in 动画）
- Toast 提示（花纹底 + 类型边框色）
- HUD 时钟（周几 + 日期 + 时分秒，冒号闪烁）
- SVG 图标（40+ Feather 风格，替代 emoji）

### PWA 与离线

- Service Worker 预缓存静态资源（网络优先策略，确保更新及时生效）
- API 缓存 5 分钟过期
- 离线指示器（自动检测网络状态）
- 支持「添加到主屏幕」
- 强制刷新按钮（清除 SW + Cache Storage）

---

## 快速开始

### 使用 Docker Hub 镜像（推荐）

```bash
# 创建目录
mkdir -p scheduling-tool && cd scheduling-tool

# 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  scheduling-tool:
    image: sexyfeifan/scheduling-tool:3.33
    container_name: scheduling-tool
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    environment:
      - DATA_DIR=/app/data
      - BACKUP_DIR=/app/backups
      - BACKUP_PASSWORD=${BACKUP_PASSWORD:-sexyfeifan}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      start_period: 15s
      retries: 3
EOF

# 可选：设置管理员密码
export BACKUP_PASSWORD='your-strong-password'

# 启动
docker compose up -d

# 访问 http://localhost:3000
```

### 从源码构建

```bash
git clone https://github.com/sexyfeifan/Scheduling-Tool-Docker.git
cd Scheduling-Tool-Docker

# 可选：设置管理员密码
export BACKUP_PASSWORD='your-strong-password'

# 启动
docker compose up -d
```

### 更新到最新版本

```bash
docker compose pull && docker compose up -d
```

### 构建多架构镜像（开发者）

```bash
# 创建并使用 buildx builder
docker buildx create --name multiarch-builder --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE=$(date +%Y-%m-%d) \
  -t sexyfeifan/scheduling-tool:3.33 \
  -t sexyfeifan/scheduling-tool:latest \
  --push .
```

---

## 访问路径

| 路径 | 说明 |
|------|------|
| `http://localhost:3000` | 主编辑页面 |
| `http://localhost:3000/canbox` | 移动端只读子页面（需在管理后台启用） |
| `http://localhost:3000/?debug=1` | 带 eruda 调试工具的编辑页 |
| `http://localhost:3000/api/health` | 健康检查 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/version` | GET | 版本信息 + BUILD_DATE |
| `/api/schedules` | GET/POST | 排期 CRUD |
| `/api/schedules/search` | GET | 搜索排期 |
| `/api/schedules/batch` | POST | 批量操作 |
| `/api/schedules/conflicts` | GET | 冲突检测 |
| `/api/calendar` | GET | iCal 订阅 |
| `/api/export/json` | GET | JSON 导出 |
| `/api/export/excel` | GET | CSV 导出 |
| `/api/statistics` | GET | 统计数据 |
| `/api/settings` | GET/POST | 设置管理 |
| `/api/history` | GET | 操作历史 |
| `/api/webhook` | POST | Webhook 管理 |
| `/api/backup` | POST | 备份管理 |
| `/api/verify-password` | POST | 密码验证 |

---

## 技术栈

- **后端**: Node.js 22 + Express + pino 日志
- **数据库**: SQLite (better-sqlite3)
- **前端**: 原生 JavaScript (ES Modules)
- **图片导出**: html2canvas
- **实时同步**: Server-Sent Events (SSE)
- **部署**: Docker / Docker Compose

## 部署要求

- Docker Engine 20.10+
- Docker Compose v2+
- 2GB+ 磁盘空间
- 1GB RAM

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `DATA_DIR` | `/app/data` | 数据目录 |
| `BACKUP_DIR` | `/app/backups` | 备份目录 |
| `BACKUP_PASSWORD` | `sexyfeifan` | 管理员密码（强烈建议修改）|
| `BUILD_DATE` | 自动生成 | 镜像构建日期（Dockerfile ARG 注入）|

## 数据持久化

```
./data     → /app/data     (排期数据 + SQLite)
./backups  → /app/backups  (备份文件)
```

---

## 更新日志

### v3.33 (2026-07-07) - 里程碑版本：代码质量 + 移动端 + 导出 + 子页面

#### 🐛 Bug 修复
- **导出颜色淡修复**: 颜色烘焙循环从 DOM detach 状态移到 `appendChild` 之后执行，`getComputedStyle` 正确返回 CSS 类颜色
- **拖拽监听器泄漏**: 每次 `renderSchedule()` 重复添加 28 个监听器，改用 `dataset.dragBound` 只绑定一次
- **null 检查**: `showToast` / `renderSchedule` 中 `getElementById` 结果添加 null 守卫
- **闭包作用域修复**: `renderMobileDayPicker` 暴露到 `window`，修复 `renderSchedule`（全局函数）无法调用闭包内函数
- **桌面端误显移动端组件**: `renderMobileDayPicker` 添加 `mobile-device` class 检查

#### 📱 移动端响应式重构
- **设备检测**: UA + `maxTouchPoints > 0` + `ontouchstart` 三重检测，覆盖所有触屏设备
- **日/周视图统合**: 移动端日视图和周视图共享日期选择器 + 详情区
- **日期选择器**: 7 天横向排列（日期名 + 日期数字 + 项目数），可滚动，选中态高亮
- **详情区**: 点击日期后下方大面积显示当日项目卡片（含删除/复制/新增按钮）
- **自动选中**: 进入页面自动选中今天并显示当日项目，无需手动点击
- **周切换同步**: 左右切换周数时，日期选择器和详情区自动跟随更新
- **底部导航栏**: 日/周/月/人/导出 5 个按钮，触屏设备始终显示
- **工具栏保留**: 所有触屏设备完整显示桌面端工具栏
- **iPad 横屏**: 1024-1199px 紧凑样式（字号/间距缩小，7 列完整显示）
- **CSS 控制**: `body.mobile-device` + `body.view-xxx` class 控制各视图元素显隐

#### 🔗 只读分享子页面
- **路径**: `/canbox`（管理员可自定义）
- **控制**: 管理后台可开关 + 设置路径
- **调试**: URL 带 `?debug=1` 加载 eruda 移动端调试面板

#### 🏗️ 基础设施
- **SW 缓存**: 网络优先策略，确保更新及时生效，缓存名随版本更新
- **BUILD_DATE**: Dockerfile ARG 注入构建日期，`/api/version` 返回真实 build 时间
- **强制刷新按钮**: 版本号旁 🔄 按钮，清除 SW + Cache Storage + 强制重载

### v3.00 (2026-07-06) - 类型颜色系统重构

- 集中式类型颜色管理（`DEFAULT_TYPE_COLORS` + 15 色池）
- 药丸标和卡片背景同色系
- 设置页颜色选择器 + 还原默认 + 自动分配不重复颜色
- 默认类型：平面=绿 / 视频=粉 / 直播=蓝 / 试做=紫 / 特殊=橘

### v2.89 (2026-06-29) - 多视图 + 导出 + 管理功能

- 日/周/月/人四视图完整实现
- 周/月/人员视图图片导出
- 管理员密码修复 + 数据管理 + 访问控制
- 动森风格 UI 组件

### v2.63 (2026-06-23) - 稳定性与安全性

- SSE 无限重连修复 + 指数退避
- 备份恢复事务保护
- bcrypt cost factor 12
- 多架构 Docker 镜像（AMD64 + ARM64）
