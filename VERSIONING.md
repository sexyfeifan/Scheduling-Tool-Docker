# 版本管理策略

## 文件夹结构

```
Code/
├── Scheduling-Tool-Docker/          # 主开发目录（当前活跃版本）
├── Scheduling-Tool-Docker-v2.65/    # v2.65 版本备份（已发布）
└── Scheduling-Tool-Docker-v2.66/    # v2.66 版本（开发中）
```

## 版本隔离规则

1. **每个版本使用独立文件夹**：防止构建错误影响其他版本
2. **主目录为当前活跃版本**：所有新开发在主目录进行
3. **版本文件夹为备份**：用于回退和对比
4. **Docker 镜像使用版本标签**：如 `sexyfeifan/scheduling-tool:2.66`

## 版本发布流程

1. 在主目录 `Scheduling-Tool-Docker/` 完成开发
2. 更新 `server/config.js` 中的版本号
3. 更新 `docker-compose.yml` 中的镜像标签
4. 构建并推送 Docker 镜像
5. 将当前版本复制为版本备份文件夹

## 回退方法

如果新版本有问题，可以：

### 方法 1：使用版本文件夹
```bash
# 停止当前容器
docker stop scheduling-tool

# 使用旧版本文件夹启动
cd Scheduling-Tool-Docker-v2.65
docker compose up -d
```

### 方法 2：使用旧版本 Docker 镜像
```bash
# 停止当前容器
docker stop scheduling-tool

# 使用旧版本镜像启动
docker run -d --name scheduling-tool -p 3000:3000 sexyfeifan/scheduling-tool:2.65
```

## 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v2.65 | 2026-06-23 | 修复批量操作崩溃、Webhook异步错误、时序攻击防护、前端DOM空值保护、SVG图标系统、时钟显示、视图切换 |
| v2.66 | 2026-06-23 | 版本隔离管理、继续开发新功能 |

## 注意事项

- 版本文件夹中的 `data/` 和 `backups/` 目录包含测试数据，生产环境请使用独立的数据目录
- 每次发布新版本后，建议保留前一个版本的备份文件夹
- Docker 镜像标签格式：`sexyfeifan/scheduling-tool:版本号`
