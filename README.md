# 罐头场通告排期

一个适合小团队和内容制作场景的周排期工具，支持共享排期、拖拽调整、图片导出、只读预览、数据备份与恢复。

## 项目简介

- 周视图管理排期
- 支持新增、编辑、删除、复制项目
- 支持拖拽跨天调整
- 支持导出排期图片
- 支持只读预览页面
- 支持本地数据持久化
- 支持 Docker / NAS 部署

## Docker Hub

- 仓库地址：[sexyfeifan/scheduling-tool](https://hub.docker.com/r/sexyfeifan/scheduling-tool)
- 当前推荐标签：`2.17`
- 通用标签：`latest`

拉取镜像：

```bash
docker pull sexyfeifan/scheduling-tool:2.17
```

## 快速部署

### 方式一：Docker Compose

```bash
mkdir -p scheduling-tool
cd scheduling-tool
mkdir -p data backups
```

创建 `docker-compose.yml`：

```yaml
services:
  scheduling-tool:
    image: sexyfeifan/scheduling-tool:2.17
    container_name: scheduling-tool
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    environment:
      - BACKUP_DIR=/app/backups
      - BACKUP_PASSWORD=change-me
    restart: unless-stopped
```

启动：

```bash
docker compose up -d
```

### 方式二：docker run

```bash
docker run -d \
  --name scheduling-tool \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  -e BACKUP_DIR=/app/backups \
  -e BACKUP_PASSWORD=change-me \
  --restart unless-stopped \
  sexyfeifan/scheduling-tool:2.17
```

## 访问地址

- 主页面：`http://localhost:3000`
- 预览页面：`http://localhost:3000/date`
- 兼容预览路径：`http://localhost:3000/canbox`

## 数据说明

- 排期数据默认保存在 `./data`
- 备份文件默认保存在 `./backups`
- 升级镜像时，只要保留这两个目录，数据不会丢失

## 更新镜像

```bash
docker pull sexyfeifan/scheduling-tool:2.17
docker compose up -d
```

如果你使用 `latest`：

```bash
docker pull sexyfeifan/scheduling-tool:latest
docker compose up -d
```

## 适合写在 Docker Hub 的短介绍

`轻量、易部署的周排期工具，支持共享排期、图片导出、预览页和备份恢复。`

## 更多说明

- 详细部署文档见 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- 更新记录见 [UPDATE_LOG.md](UPDATE_LOG.md)
