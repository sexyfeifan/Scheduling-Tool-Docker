# 版本管理总结

## 当前状态

### 版本文件夹结构

```
Code/
├── Scheduling-Tool-Docker/          # 主开发目录（当前活跃版本 v2.66）
├── Scheduling-Tool-Docker-v2.65/    # v2.65 版本备份（已发布）
└── Scheduling-Tool-Docker-v2.66/    # v2.66 版本（开发中）
```

### Docker 镜像

| 版本 | 标签 | 状态 |
|------|------|------|
| v2.65 | `sexyfeifan/scheduling-tool:2.65` | ✅ 已发布 |
| v2.65 | `sexyfeifan/scheduling-tool:latest` | ✅ 已发布 |
| v2.66 | `sexyfeifan/scheduling-tool:2.66` | ⏳ 待构建 |

## 版本历史

### v2.65 (2026-06-23) - 已发布

**主要变更：**
- 修复批量操作崩溃（batch.js req.body 空值保护）
- 修复 Webhook 异步错误（try-catch 包装）
- 时序攻击防护（timingSafeEqual）
- 前端 DOM 空值保护（addEventListener null 检查）
- SVG 图标系统（animal-icons.js）
- 时钟显示功能（initClock）
- 视图切换功能（viewSwitcher.js）

**文件修改：**
- `client/js/main.js` - 添加导入、时钟初始化、视图切换、SVG 图标
- `client/js/modules/viewSwitcher.js` - 更新为兼容现有 HTML 结构
- `client/js/modules/api.js` - 添加 fetchSchedules 方法
- `client/js/modules/monthView.js` - 修复容器 ID
- `client/js/modules/personnelView.js` - 修复容器 ID
- `server/routes/batch.js` - 添加 req.body 空值保护
- `server/routes/webhook.js` - 添加 try-catch 包装
- `server/middleware/auth.js` - 使用 timingSafeEqual
- `server/utils/normalize.js` - 修复 timingSafeEqual 长度泄露

### v2.66 (2026-06-23) - 开发中

**主要变更：**
- 版本隔离文件夹结构
- 独立的开发环境
- 便于回退和对比

**新增文件：**
- `VERSIONING.md` - 版本管理策略说明
- `VERSION_SUMMARY.md` - 版本管理总结（本文件）
- `README.md` - 更新为 v2.66 版本说明
- `CHANGELOG.md` - 添加 v2.66 条目

## 版本管理策略

### 1. 文件夹隔离

每个版本使用独立的文件夹，防止构建错误影响其他版本。

### 2. Docker 镜像标签

使用版本号作为 Docker 镜像标签，如 `sexyfeifan/scheduling-tool:2.66`。

### 3. 版本发布流程

1. 在主目录 `Scheduling-Tool-Docker/` 完成开发
2. 更新 `server/config.js` 中的版本号
3. 更新 `docker-compose.yml` 中的镜像标签
4. 构建并推送 Docker 镜像
5. 将当前版本复制为版本备份文件夹

### 4. 回退方法

**方法 1：使用版本文件夹**
```bash
docker stop scheduling-tool
cd Scheduling-Tool-Docker-v2.65
docker compose up -d
```

**方法 2：使用旧版本 Docker 镜像**
```bash
docker stop scheduling-tool
docker run -d --name scheduling-tool -p 3000:3000 sexyfeifan/scheduling-tool:2.65
```

## 下一步操作

### 构建 v2.66 Docker 镜像

```bash
cd Scheduling-Tool-Docker-v2.66
docker buildx build --platform linux/amd64,linux/arm64 -t sexyfeifan/scheduling-tool:2.66 -t sexyfeifan/scheduling-tool:latest --push .
```

### 测试 v2.66

```bash
docker pull sexyfeifan/scheduling-tool:2.66
docker compose up -d
# 访问 http://localhost:3000
```

### 回退到 v2.65

```bash
docker stop scheduling-tool
cd ../Scheduling-Tool-Docker-v2.65
docker compose up -d
```

## 注意事项

1. **数据目录**：版本文件夹中的 `data/` 和 `backups/` 目录包含测试数据，生产环境请使用独立的数据目录
2. **版本备份**：每次发布新版本后，建议保留前一个版本的备份文件夹
3. **Docker 镜像标签**：格式为 `sexyfeifan/scheduling-tool:版本号`
4. **主目录**：始终在主目录 `Scheduling-Tool-Docker/` 进行新开发

## 相关文档

- [VERSIONING.md](VERSIONING.md) - 版本管理策略详细说明
- [CHANGELOG.md](CHANGELOG.md) - 变更日志
- [README.md](README.md) - 项目说明
