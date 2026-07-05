# 罐头场通告排期 — Docker 版本

> 当前版本：**v2.90** | Docker Hub: `sexyfeifan/scheduling-tool:2.90`

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
- 卡片按项目类型鲜艳配色（平面=绿 / 视频=粉 / 直播=琥珀 / 试做=紫）
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
- 只读分享链接
- 数据备份 / 恢复（服务端备份 + 本地文件导入导出）
- 操作历史记录
- 动态职能管理（单选 / 多选 radio 切换）
- 项目类型管理
- 项目模板
- 数据管理（姓名更替 / 任务交接，支持并列人名自动拆分）

### UI 组件（Animal Island 风格）

- Switch 开关（动森规范 52×28px，黄色开启态）
- Select 自定义下拉（黄色下拉面板 + SVG chevron + pill 圆角）
- Radio 单选框（正圆 16px + 薄荷绿选中）
- Card 卡片（纯色背景 + 类型鲜艳配色 + 人员彩色圆点）
- Modal 弹窗（奶油底 + zoom-in 动画）
- Toast 提示（花纹底 + 类型边框色）
- HUD 时钟（周几 + 日期 + 时:分:秒，冒号闪烁）
- SVG 图标（40+ Feather 风格，替代 emoji）

### PWA 与离线

- Service Worker 预缓存静态资源
- API 缓存 5 分钟过期
- 离线指示器（自动检测网络状态）
- 支持「添加到主屏幕」

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
    image: sexyfeifan/scheduling-tool:2.90
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
  -t sexyfeifan/scheduling-tool:2.90 \
  -t sexyfeifan/scheduling-tool:latest \
  --push .
```

---

## 访问路径

| 路径 | 说明 |
|------|------|
| `http://localhost:3000` | 主编辑页面 |
| `http://localhost:3000/notice` | 只读预览页面 |
| `http://localhost:3000/api/health` | 健康检查 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/version` | GET | 版本信息 |
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

**支持的平台**:
- ✅ Intel/AMD 64位服务器
- ✅ Apple Silicon (M1/M2/M3) Mac
- ✅ ARM 服务器 (AWS Graviton, 树莓派等)

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `DATA_DIR` | `/app/data` | 数据目录 |
| `BACKUP_DIR` | `/app/backups` | 备份目录 |
| `BACKUP_PASSWORD` | `sexyfeifan` | 管理员密码（强烈建议修改）|

## 数据持久化

```
./data     → /app/data     (排期数据 + SQLite)
./backups  → /app/backups  (备份文件)
```

## 项目结构

```
├── client/
│   ├── index.html              # 主页面
│   ├── sw.js                   # Service Worker
│   ├── css/
│   │   ├── style.css           # 样式入口 (@import 所有子模块)
│   │   ├── animal-island-components.css  # 动森组件
│   │   ├── animal-island-forms.css       # 动森表单
│   │   ├── components.css      # 视图组件
│   │   ├── schedule.css        # 项目卡片
│   │   ├── modal.css           # 弹窗
│   │   └── ...
│   └── js/
│       ├── main.js             # 应用入口（单体架构）
│       └── modules/
│           ├── api.js          # API 客户端
│           ├── date.js         # 日期工具
│           ├── filters.js      # 过滤器
│           ├── undo.js         # 撤销管理
│           └── utils.js        # 公共工具
├── server/
│   ├── app.js                  # Express 应用
│   ├── config.js               # 配置
│   ├── logger.js               # pino 日志
│   ├── middleware/auth.js      # 认证 + CSRF
│   ├── routes/                 # API 路由 (12 个)
│   ├── services/
│   │   ├── sqliteStore.js      # SQLite 存储
│   │   ├── backupService.js    # 备份服务
│   │   └── migrator.js         # Schema 迁移
│   └── utils/normalize.js      # 数据标准化
├── Dockerfile                  # 多阶段构建
├── docker-compose.yml          # Compose 配置
└── .dockerignore
```

---

## 更新日志

### v2.90 (2026-07-05) - 导出图片圆点修复

**🐛 导出修复**:
- 开始时间白点导出对齐修复（inline-block 替代 inline-flex）
- 项目类型彩色圆点导出渲染修复（inline-block 替代 inline-flex）
- 导出样式复制跳过 inline-flex 容器，保留原始 inline style

### v2.89 (2026-06-29) - 里程碑版本

**🎨 UI/UX**:
- 项目类型鲜艳配色（平面绿 / 视频粉 / 直播琥珀 / 试做紫 + 白字）
- 人员姓名每行至多 2 人自动换行对齐（3 人以上按每行 2 人分组，圆点上下对齐）
- 开始时间白点与时间文字垂直居中对齐
- 导出图片彩色圆点彻底修复（inline style + &nbsp;）
- 动森风格 Select/Switch/下拉选择器
- 拍摄地样式美化
- 全局 Select 选择器 Animal Island UI 风格

**📊 视图系统**:
- 日视图（查看单日排期，左右切换日期）
- 月视图日历（项目/人员模式切换，显示每日排期名称）
- 人员排期矩阵（按自然月显示，按月切换）
- 视图切换按钮（单/周/月/人）全部生效

**📤 导出功能**:
- 周视图图片导出（html2canvas，预览 + 下载 + 新标签页）
- 跨周数导出（选择起止日期，卡片样式与编辑页一致）
- 月视图 / 人员视图图片导出
- 导出图片颜色与编辑页完全一致

**🛡️ 管理功能**:
- 管理员密码登录修复
- 数据管理（姓名更替 / 任务交接，支持并列人名拆分）
- 访问控制独立 Tab
- 项目类型管理
- 预警弹窗跳转 + 删除

**🐛 稳定性**:
- settingsModal null 崩溃修复
- escapeAttr 函数补全
- 角色硬编码改动态 roleCategories
- loadHistoryRecords null 检查
- 78 个重复备份文件清理
- 版本号统一 2.89

### v2.63 (2026-06-23) - 稳定性与安全性重大更新

**🐛 Bug 修复**:
- 修复 SSE 无限重连问题（添加最多5次重连限制和指数退避策略）
- 修复备份恢复操作无事务保护问题（使用 SQLite 事务保证原子性）
- 修复 API 响应 JSON 解析错误可能导致客户端崩溃
- 修复导出图片颜色偏淡问题（使用不透明背景色）
- 完善日期验证（检查日期合法性，拒绝如 2024-02-30 的无效日期）

**🔒 安全增强**:
- 提高密码哈希强度（bcrypt cost factor 从 10 提升到 12）
- 添加 SSE 连接超时限制（1小时自动断开，防止僵尸连接累积）
- 添加所有 API 请求 30 秒超时设置

**⚡ 性能优化**:
- 优化搜索性能（添加 300ms 防抖，减少不必要的渲染）
- 添加项目名称长度验证（最多 120 字符，避免 UI 问题）

**🏗️ 架构改进**:
- 导出图片样式修复
- 事件绑定 null 守卫
- 全量按钮功能恢复
- 多架构 Docker 镜像支持（AMD64 + ARM64）

### v2.62 (2026-06-22)
- 周切换数据修复
- SSE 回退机制
- 人员全字段匹配
- 预警重复检测
- 管理页合并设置

### v2.61 (2026-06-22)
- 动森风格 UI
- 多视图支持
- 冲突预警
- 安全加固
- 性能优化

### v2.60 (2026-06-20)
- 15 个功能模块
- 视图增强
- 效率工具
- PWA 支持
- 架构优化

### v2.59 (2026-06-14)
- 跨周导出
- 广告商单
- 暗色模式
- 快捷键
- CI/CD

### 早期版本
- v2.58: 动态职能管理 / 商务职能
- v2.54: 月视图优化 / 数据安全与恢复
