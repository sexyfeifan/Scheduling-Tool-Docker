# 罐头场通告排期 — Docker 版本

> **作者**: 我是性感的非凡 | **邮箱**: zhoufeifan@gmail.com

> 当前版本：**v2.62** | Docker Hub: `sexyfeifan/scheduling-tool:2.62`

## 简介

单用户共享排期管理系统，所有用户看到相同数据，支持实时同步。Docker 一键部署，适用于 NAS、云服务器等任何支持 Docker 的环境。

## 功能特点

### 核心排期

- 周视图排期管理（主视图，拖拽调整日期）
- 单日视图（左右切换日期）
- 月视图甘特图（项目/人员模式切换）
- 人员排期矩阵（按部门分组，逗号分隔名字自动拆分）
- 项目添加 / 编辑 / 删除 / 复制
- 卡片按项目类型配色（平面=青 / 视频=粉 / 直播=黄 / 试做=紫）
- 动森风格花纹底纹（pattern-default）

### 效率工具

- 快速创建（一行输入自动解析项目字段）
- 批量操作（删除 / 移动 / 状态更新）
- 键盘快捷键（`Ctrl+K` 搜索 / `Ctrl+N` 新增 / `Ctrl+Z` 撤销）
- 移动手势（左滑下一周 / 右滑上一周 / 长按新建）
- 撤销 / 重做（支持多步）
- 粘贴识别（从剪贴板解析排期文本）
- 冲突预警（检测同一人同天多项目，支持跳转 / 删除）

### 导出与集成

- 图片导出（html2canvas，支持跨周数导出）
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

### UI 组件（Animal Island 风格）

- Switch 开关（动森规范 52×28px）
- Select 自定义下拉（黄色下拉 + pill 圆角）
- Radio 单选框（正圆 16px + 薄荷绿选中）
- Card 卡片（pattern-default 花纹 + 类型配色）
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

### Docker Compose（推荐）

```bash
cd Scheduling-Tool-Docker

# 可选：设置管理员密码
export BACKUP_PASSWORD='your-strong-password'

# 启动
docker compose up -d

# 访问 http://localhost:3000
```

### 手动构建

```bash
docker build -t scheduling-tool .

docker run -d \
  --name scheduling-tool \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  -e BACKUP_PASSWORD=your-password \
  --restart unless-stopped \
  scheduling-tool
```

### 更新

```bash
docker compose pull && docker compose up -d
```

### 推送到 Docker Hub

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t sexyfeifan/scheduling-tool:2.61 \
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

| 版本 | 日期 | 说明 |
|------|------|------|
| v2.62 | 2026-06-22 | 周切换数据修复 / SSE回退 / 人员全字段匹配 / 预警重复检测 / 管理页合并设置 |
| v2.61 | 2026-06-22 | 动森风格 UI / 多视图 / 冲突预警 / 安全加固 / 性能优化 |
| v2.60 | 2026-06-20 | 15 个功能模块：视图增强 / 效率工具 / PWA / 架构优化 |
| v2.59 | 2026-06-14 | 跨周导出 / 广告商单 / 暗色模式 / 快捷键 / CI |
| v2.58 | - | 动态职能管理 / 商务职能 |
| v2.54 | - | 月视图优化 / 数据安全与恢复 |
