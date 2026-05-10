# 罐头场通告排期 - Docker版本

> **作者**: 性感的非凡 | **邮箱**: zhoufeifan@gmail.com

> 当前版本：**v2.57** | Docker Hub: `sexyfeifan/scheduling-tool:2.57`

## 简介

这是一个简化的单用户共享版本，所有用户看到相同的数据，并且支持实时同步。使用Docker可以轻松部署在任何支持Docker的设备上，包括NAS。

## 功能特点

- 📅 周视图排期管理
- ➕ 项目添加/编辑/删除
- 🔄 拖拽调整日期
- 🖼️ 图片导出功能（导出时不会显示当日特别标注色）
- 📆 月视图浏览（按项目类型色块区分）
- 📤 一键导出本周通告文字
- ⚙️ 设置管理
- 👥 多用户实时同步
- 🐳 Docker一键部署
- 👀 只读预览页面（`/notice`）
- 📋 卡片复制功能
- 🔔 Webhook 推送通告（钉钉/飞书/企业微信）

## 最新特性（v2.57）

### Webhook 推送模板增强
- 新增 **7 种日通告预设模板**：标准详细版、紧凑卡片版、完整人员版、极简版、分类标签版、表格版（钉钉/飞书）、紧急通知版
- 新增 **6 种周通告预设模板**：标准详细版、紧凑日历版、完整人员版、极简版、表格版（飞书/企微）、每日分组带统计版
- 管理员设置新增 **预设模板下拉选择器**，支持一键应用预设模板到日/周通告模板输入框
- 后端新增模板预设库，通过 `/api/webhook/templates` 接口暴露给前端
- 新增独立参考文档 [`WEBHOOK_TEMPLATES.md`](WEBHOOK_TEMPLATES.md)，包含完整变量说明和所有模板的纯文本版本

### 备份功能改进
- 备份文件夹命名改为实际本地日期时间格式（如 `backup_2026-05-10_00-13-00`），替代原来的 ISO 时间戳
- 备份时间使用东八区（UTC+8）时间，确保与上海本地时间一致
- 新增 **手动删除备份** 功能，备份列表中每条记录新增"删除"按钮
- 后端新增 `DELETE /api/backups` 接口，支持按备份路径删除

### 导出图片优化
- 导出图片副标题改为单行显示：`第X周通告 5月4日 - 5月10日` 格式

### 版本号修复
- 修复 `server/config.js` 和 `client/index.html` 中版本号硬编码未更新的问题

## 快速开始

### 使用Docker Compose（推荐）

```bash
# 克隆仓库
git clone https://github.com/sexyfeifan/Scheduling-Tool-Docker.git
cd Scheduling-Tool-Docker

# 可选：先设置备份密码
export BACKUP_PASSWORD='your-strong-password'

# 启动服务
docker compose up -d

# 访问应用：http://localhost:3000
```

### 手动构建

```bash
docker build -t scheduling-tool .

docker run -d \
  --name scheduling-tool \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  -e DATA_DIR=/app/data \
  -e BACKUP_DIR=/app/backups \
  -e BACKUP_PASSWORD=change-me \
  --restart unless-stopped \
  scheduling-tool
```

## 更新到新版本

```bash
docker compose pull && docker compose up -d
```

## 推送到 Docker Hub（多架构）

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t sexyfeifan/scheduling-tool:2.57 \
  -t sexyfeifan/scheduling-tool:latest \
  --push .
```

## 访问路径

| 路径 | 说明 |
|------|------|
| `http://localhost:3000` | 主编辑页面，完整功能 |
| `http://localhost:3000/notice` | 只读预览页面（周视图 + 月视图） |

## 卡片复制功能

在主编辑页面，每个项目卡片下方都有「复制」按钮：
- 点击后在同一日期创建副本项目
- 副本默认保留原名称，可按需编辑

## 移动端功能

导出图片功能支持：
- **下载图片**：传统下载方式，适用于所有设备
- **在新标签页打开**：使用浏览器的保存图片功能

## 技术栈

- Node.js + Express 后端服务
- SQLite 数据存储（better-sqlite3）
- 原生 JavaScript 前端
- html2canvas 图片导出
- Server-Sent Events (SSE) 实时同步

## 部署要求

- Docker Engine 20.10+
- Docker Compose v2+
- 至少 2GB 可用磁盘空间
- 1GB RAM

## 数据持久化

通过 `docker-compose.yml` 挂载宿主机目录：
- `./data → /app/data`（排期数据）
- `./backups → /app/backups`（备份文件）

容器重启后数据不会丢失；迁移时直接备份这两个目录即可。

## 更新日志

详细更新信息请查看 [UPDATE_LOG.md](UPDATE_LOG.md)。
