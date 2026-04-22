# 罐头场通告排期 - Docker版本

> 当前版本：**v2.31** | Docker Hub: `sexyfeifan/scheduling-tool:2.31`

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

## 最新特性（v2.31）

### 月视图优化
- **完整显示所有项目**：每个日期格不再限制最多3条，所有项目全部展开显示
- **按类型区分颜色**：
  - 视频 → 蓝色
  - 试做 → 橙色
  - 外拍 → 绿色
  - 平面 → 紫色

### 一键导出本周通告
- 编辑页顶部新增「导出本周通告」按钮
- 按日期列出本周所有项目，包含：开始时间→结束时间、地点、各类别人员名单
- 结束时间自动补全：开始时间 ≤ 18:00 补全至 `18:00`，开始时间 > 18:00 则补全至 `23:59`
- 弹窗内可一键复制全部文字

### 预览路径简化
- 只保留 `/notice` 作为唯一只读预览入口
- 已移除 `/canbox`、`/date`、`/share/:token` 等旧路由

### 数据安全与恢复
- **原子写入**：排期和设置改为原子写入，降低断电或异常退出导致 JSON 损坏的风险
- **自动恢复副本**：主数据文件损坏时自动从 `.bak` 副本恢复
- **恢复前快照**：执行恢复前自动生成 `before_restore` 快照，便于回滚

## 快速开始

### 使用Docker Compose（推荐）

```bash
# 下载发布目录后进入项目
cd scheduling-tool-docker-v2.18

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
  -t sexyfeifan/scheduling-tool:2.31 \
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
