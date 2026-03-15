# 罐头场通告排期 (Scheduling Tool)

轻量、易部署的周排期工具，支持多人共享排期、图片导出、只读预览、备份与恢复。  
适合内容团队、拍摄团队和小型工作室，支持 Docker / NAS 快速部署。

## 功能亮点

- 周视图排期（新增 / 编辑 / 删除 / 复制）
- 拖拽跨天调整项目
- 导出排期图片
- 只读预览页（`/date`、`/canbox`）
- 本地文件持久化（无需数据库）
- 备份与恢复

## 镜像标签

- 稳定版本: `2.17`
- 最新版本: `latest`

拉取镜像:

```bash
docker pull sexyfeifan/scheduling-tool:2.17
```

## 快速部署 (Docker Compose 推荐)

1. 创建 `docker-compose.yml`:

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

2. 启动:

```bash
mkdir -p data backups
docker compose up -d
```

3. 访问:

- 主页面: `http://localhost:3000`
- 预览页面: `http://localhost:3000/date`
- 兼容预览路径: `http://localhost:3000/canbox`

## 一条命令部署 (docker run)

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

## 持久化与升级

- `./data`: 排期与设置数据
- `./backups`: 备份文件

升级镜像时保留以上两个目录即可无损升级。

## 常见操作

查看日志:

```bash
docker logs -f scheduling-tool
```

停止容器:

```bash
docker stop scheduling-tool
```

## 项目地址

- GitHub: https://github.com/sexyfeifan/Scheduling-Tool-Docker
