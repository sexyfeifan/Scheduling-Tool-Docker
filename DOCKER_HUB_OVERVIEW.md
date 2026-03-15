# 罐头场通告排期

轻量、易部署的周排期工具，支持共享排期、图片导出、只读预览、备份与恢复，适合内容团队、拍摄团队和小型工作室。

## 功能特点

- 周视图排期管理
- 新增、编辑、删除、复制项目
- 拖拽跨天调整
- 导出排期图片
- 只读预览页面
- 本地文件持久化
- 适合 Docker / NAS 部署

## 推荐标签

- 稳定版本：`2.17`
- 最新版本：`latest`

拉取镜像：

```bash
docker pull sexyfeifan/scheduling-tool:2.17
```

## 使用 Docker Compose

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

启动命令：

```bash
mkdir -p data backups
docker compose up -d
```

## 使用 docker run

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

## 持久化目录

- `./data`：排期与设置数据
- `./backups`：备份文件

升级镜像时保留这两个目录即可。

## GitHub

项目仓库：
[https://github.com/sexyfeifan/Scheduling-Tool-Docker](https://github.com/sexyfeifan/Scheduling-Tool-Docker)
