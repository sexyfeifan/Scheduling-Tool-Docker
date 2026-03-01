# 罐头场通告排期 - Docker版本

## 简介

这是一个简化的单用户共享版本，所有用户看到相同的数据，并且支持实时同步。使用Docker可以轻松部署在任何支持Docker的设备上，包括NAS。

## 功能特点

- 📅 周视图排期管理
- ➕ 项目添加/编辑/删除
- 🔄 拖拽调整日期
- 🖼️ 图片导出功能（导出时不会显示当日特别标注色）
- ⚙️ 设置管理
- 👥 多用户实时同步
- 🐳 Docker一键部署
- 👀 只读预览页面
- 📋 卡片复制功能

## 最新特性

### 图片导出优化
- **导出时去除当日高亮**：在导出图片时，不再显示当天日期的特别标注色，使导出的图片更加统一和专业
- **编辑页面保留高亮**：在编辑页面中，当天日期仍然保持高亮显示，便于用户识别当前日期
- **样式一致性**：导出的图片与编辑页面视觉分离，确保输出内容的一致性和美观性

## 快速开始

### 使用Docker Compose（推荐）

```
# 克隆或下载项目
git clone <repository-url>
cd scheduling-tool-docker

# 启动服务
docker-compose up -d

# 访问应用
# 打开浏览器访问 http://localhost:3000
```

### 手动构建

```
# 构建镜像
docker build -t scheduling-tool .

# 运行容器
docker run -d \
  --name scheduling-tool \
  -p 3000:3000 \
  -v scheduling-data:/app/data \
  scheduling-tool
```

## 访问路径

1. **主编辑页面**: `http://localhost:3000` - 完整功能，支持所有编辑操作
2. **只读预览页面**: `http://localhost:3000/date` - 仅查看功能，无法进行任何修改

## 卡片复制功能

在主编辑页面，每个项目卡片下方都有一个"📋 复制"按钮：
- 点击复制按钮会在同一日期创建一个副本项目
- 副本项目名称会自动添加"(副本)"后缀
- 可以快速复制相似项目并进行微调

## 预览页面说明

预览页面(/date 路径）是一个完全只读的页面，用于展示主页面的所有内容：
- 实时同步主页面的所有数据变更
- 无法进行任何编辑操作
- 适合用于展示或分享排期信息
- 刷新页面后仍能正确显示所有历史数据

## 移动端功能

在移动设备上使用时，导出图片功能提供了多种保存方式：
- **下载图片**: 传统下载方式，适用于所有设备
- **在新标签页打开**: 在新标签页查看图片，然后使用浏览器的保存图片功能

## 技术栈

- Node.js + Express 后端服务
- 原生JavaScript前端应用
- html2canvas 图片导出库
- 文件系统数据存储（无需数据库）
- Server-Sent Events (SSE) 实现实时同步

## 部署要求

- Docker Engine 18.06.0+
- Docker Compose 1.22.0+
- 至少2GB可用磁盘空间
- 1GB RAM

## 数据持久化

应用数据存储在Docker卷中，确保容器重启或删除后数据不会丢失。

## 更新日志

详细更新信息请查看 [UPDATE_LOG.md](UPDATE_LOG.md)、[UPDATE_LOG_v1.2.md](UPDATE_LOG_v1.2.md)、[UPDATE_LOG_v1.3.md](UPDATE_LOG_v1.3.md)、[UPDATE_LOG_v1.4.md](UPDATE_LOG_v1.4.md)、[UPDATE_LOG_v1.5.md](UPDATE_LOG_v1.5.md)、[UPDATE_LOG_v1.6.md](UPDATE_LOG_v1.6.md)、[UPDATE_LOG_v1.7.md](UPDATE_LOG_v1.7.md)、[UPDATE_LOG_v1.8.md](UPDATE_LOG_v1.8.md)、[UPDATE_LOG_v1.9.md](UPDATE_LOG_v1.9.md)、[UPDATE_LOG_v1.10.md](UPDATE_LOG_v1.10.md)、[UPDATE_LOG_v1.11.md](UPDATE_LOG_v1.11.md)、[UPDATE_LOG_v1.12.md](UPDATE_LOG_v1.12.md)、[UPDATE_LOG_v1.13.md](UPDATE_LOG_v1.13.md)、[UPDATE_LOG_v1.13.1.md](UPDATE_LOG_v1.13.1.md)、[UPDATE_LOG_v1.14.md](UPDATE_LOG_v1.14.md)、[UPDATE_LOG_v1.14.1.md](UPDATE_LOG_v1.14.1.md)、[UPDATE_LOG_v1.15.md](UPDATE_LOG_v1.15.md) 和 [UPDATE_LOG_v1.15.1.md](UPDATE_LOG_v1.15.1.md)