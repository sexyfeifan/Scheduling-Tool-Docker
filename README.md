# 罐头场通告排期 - Docker版本

> **作者**: 我是性感的非凡 | **邮箱**: zhoufeifan@gmail.com

> 当前版本：**v2.60** | Docker Hub: `sexyfeifan/scheduling-tool:2.60`

## 简介

这是一个简化的单用户共享版本，所有用户看到相同的数据，并且支持实时同步。使用Docker可以轻松部署在任何支持Docker的设备上，包括NAS。

## 功能特点

- 📅 周视图排期管理（主视图）
- 📆 月视图甘特图（辅助视图）
- 👤 人员排期矩阵（辅助视图）
- 📊 数据看板统计（辅助视图）
- ➕ 项目添加/编辑/删除
- ⚡ 快速创建（一行输入自动解析）
- 🔄 拖拽调整日期
- 📋 批量操作（删除/移动/状态更新）
- 🖼️ 图片导出功能（导出时不会显示当日特别标注色）
- 📤 一键导出本周通告文字
- 📤 跨周数导出图片
- 📤 数据导出（JSON/CSV/iCal）
- 🔍 全局搜索 + 多条件过滤
- ⚙️ 设置管理
- 👥 多用户实时同步
- 🐳 Docker一键部署
- 👀 只读预览页面（`/notice`）
- 📋 卡片复制功能
- 💼 广告商单标记
- 🔧 动态职能管理
- ⌨️ 键盘快捷键
- 📱 PWA 离线支持
- 📱 移动手势操作
- ⚠️ 人员冲突检测
- 📜 操作历史面板
- 📅 iCal 日历订阅

---

## 🆕 最新特性（v2.60）

### 视图增强

#### 月视图甘特图
- 按月查看排期，每天以甘特条展示项目
- 甘特条颜色映射项目状态（待确认灰/已确认蓝/已完成绿/取消红）
- 底部状态图例，点击任意日期跳转到该周视图
- 状态统计 badge 显示每天项目数

#### 人员排期视图
- 以人员为行、日期为列的矩阵视图
- 自动从排期数据中提取所有出现过的人员
- 支持周视图（7天）和月视图（35天）两种模式
- 每个角色独立圆点标识（导演蓝/摄影绿/制片橙/研发紫/运营粉/录音青/商务橘）
- 底部统计摘要（人数/天数/排期数）

#### 数据看板
- **概览卡片**：总项目数、已确认、待确认、已完成、已取消
- **状态分布**：饼图可视化（CSS 实现，无外部依赖）
- **项目类型分布**：横向柱状图
- **场地使用 Top 10**：排名列表 + 进度条
- **人员工作量 Top 10**：排名列表 + 进度条
- **周趋势**：表格展示各周项目数量
- 完整暗色模式适配

### 效率工具

#### 快速创建
- 导航栏「⚡ 快速」按钮打开快速创建面板
- 一行输入多个关键词（空格分隔），自动解析为项目字段
- 智能匹配：场地/导演/摄影/类型/时间/日期自动识别
- 解析预览：实时显示字段匹配结果（✓ 已匹配 / - 未匹配）
- 历史记录：记住最近 5 次常用组合，点击快速填充

#### 批量操作
- 后端 API：`POST /api/schedules/batch`
- 支持三种操作：`delete`（批量删除）、`move`（批量移动）、`updateStatus`（批量状态更新）
- 返回操作影响的项目数

#### 键盘导航
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 聚焦搜索框 |
| `Ctrl+N` | 新增项目 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `Ctrl+←` | 上一周 |
| `Ctrl+→` | 下一周 |
| `T` | 跳转本周 |
| `1/2/3/4` | 切换视图（周/月/人员/看板） |
| `Tab` | 项目卡片间导航 |
| `Enter` | 激活聚焦卡片 |
| `Esc` | 清除焦点/关闭面板 |

#### 移动手势
- **左滑**：切换到下一周
- **右滑**：切换到上一周
- **长按**：触发新建项目
- 触屏设备自动启用，滑动时显示方向提示，支持震动反馈

### 集成与导出

#### iCal 日历订阅
- `GET /api/calendar?weeks=4` — 生成标准 iCal (.ics) 文件
- 支持 Apple Calendar / Google Calendar / Outlook 订阅
- 每个项目包含：名称、类型、场地、人员信息、状态
- 状态映射：待确认→TENTATIVE / 已确认→CONFIRMED / 已完成→CONFIRMED / 取消→CANCELLED

#### 数据导出增强
- **JSON 完整备份**：`GET /api/export/json` — 包含排期数据 + 设置
- **CSV 报表**：`GET /api/export/excel` — 支持日期范围过滤，UTF-8 BOM 兼容 Excel
- 前端模块自动下载文件，文件名包含日期

#### 全局搜索增强
- 导航栏搜索框支持实时搜索（300ms 防抖）
- 高级过滤器面板：场地/状态/角色/人员/日期范围
- **保存过滤器**：常用过滤条件可保存为命名方案，点击快速应用
- 右键删除已保存的过滤器
- 后端 API：`GET /api/schedules/search?q=&location=&status=&role=&person=&dateFrom=&dateTo=`

### 安全与架构

#### 代码架构优化
- 认证中间件独立为 `server/middleware/auth.js`
- 支持 admin 和 edit 两种权限级别
- `requireAdminPassword` 和 `requireEditAccess` 中间件可复用

#### 视图切换框架
- `viewSwitcher.js` 管理四个视图的切换
- 切换时触发 `viewChanged` / `viewInit` CustomEvent
- 各视图模块监听事件自动渲染，首次切换时懒加载数据
- 视图容器：`#week-view` / `#month-view` / `#personnel-view` / `#dashboard-view`

#### 数据验证
- 前端字段验证：名称必填、各字段最大长度、时间格式、状态枚举
- `validateProject(project)` — 验证完整项目对象
- `validateForm(formElement)` — 验证表单，自动高亮错误字段

### PWA 与离线支持

#### Service Worker
- 预缓存所有静态资源（HTML/CSS/JS）
- API 请求：网络优先策略，失败时回退缓存
- 静态资源：缓存优先策略
- 版本化缓存名（`scheduling-tool-v2.60`），更新时自动清理旧缓存

#### 离线指示器
- 自动监听 `online` / `offline` 事件
- 离线时顶部黄色提示条："📡 当前处于离线模式，数据将在恢复连接后同步"
- 恢复时绿色提示条："✅ 网络已恢复"（2 秒后自动消失）

#### PWA Manifest
- 支持「添加到主屏幕」
- 主题色：#3B82F6（蓝色）
- 支持横竖屏

### 辅助功能

#### 操作历史面板
- 导航栏「📜 历史」按钮，侧边滑入面板
- 按日期分组（今天/昨天/具体日期）
- 每条记录显示：操作类型图标、描述、时间、详情
- 最新一条高亮显示，附「撤销」按钮

#### 人员冲突检测
- 导航栏「⚠️ 冲突」按钮
- 后端 API：`GET /api/schedules/conflicts?start=&end=`
- 自动检测同一人同一天有多个项目的情况
- 冲突报告：人员姓名、角色、日期、冲突项目列表、严重程度（高/中）
- 弹窗展示检测结果

#### 后端统计 API
- `GET /api/statistics?start=&end=&type=overview`
- 返回：状态分布、类型分布、场地Top10、人员Top20、周趋势

---

## v2.59 版本特性

### 导出图片跨周数支持
- 导出模态框新增「跨周数导出」复选框
- 勾选后可选择起始日和结束日，支持导出任意天数范围的通告排期
- 标题自动适配：单周显示「第X周通告」，跨周显示「通告排期」
- 列数超过 7 列时自动缩小卡片字号和间距

### 广告商单功能
- 项目新增「广告商单」复选框 + 项目号输入
- 卡片以靛紫色斜体小字显示「商单 #项目号」
- 导出图片和通告弹窗中均包含项目号信息

### 职能管理动态化（v2.58）
- 常用项管理模块重构为动态职能管理系统
- 新增"商务"职能，支持动态添加/删除职能类别
- 每个职能可配置显示名称和选择类型（单选/多选）
- 前端职能颜色区分：导演(蓝) / 摄影师(紫) / 制片(绿) / 研发(橙) / 运营(天蓝) / 录音(玫红) / 商务(靛紫)

### 月视图优化（v2.54）
- 每个日期格不再限制最多 3 条，所有项目全部展开显示
- 按类型区分颜色：视频(蓝) / 试做(橙) / 外拍(绿) / 平面(紫)

### 数据安全与恢复（v2.54）
- **原子写入**：排期和设置改为原子写入，降低断电或异常退出导致 JSON 损坏的风险
- **自动恢复副本**：主数据文件损坏时自动从 `.bak` 副本恢复
- **恢复前快照**：执行恢复前自动生成 `before_restore` 快照，便于回滚

### 其他 v2.59 改进
- 暗色模式支持
- 快捷键系统（基础版）
- CSV 导出
- 操作历史面板（基础版）
- Dockerfile 多阶段构建（Node 22）
- ESLint + Prettier 代码规范
- GitHub Actions CI

---

## 快速开始

### 使用Docker Compose（推荐）

```bash
# 下载发布目录后进入项目
cd scheduling-tool-docker-v2.60

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
  -t sexyfeifan/scheduling-tool:2.60 \
  -t sexyfeifan/scheduling-tool:latest \
  --push .
```

## 访问路径

| 路径 | 说明 |
|------|------|
| `http://localhost:3000` | 主编辑页面，完整功能 |
| `http://localhost:3000/notice` | 只读预览页面（周视图 + 月视图） |

## API 端点一览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/schedules` | GET/POST | 排期数据 |
| `/api/schedules/search` | GET | 搜索排期 |
| `/api/schedules/batch` | POST | 批量操作 |
| `/api/schedules/conflicts` | GET | 冲突检测 |
| `/api/calendar` | GET | iCal 日历订阅 |
| `/api/export/json` | GET | JSON 导出 |
| `/api/export/excel` | GET | CSV 导出 |
| `/api/statistics` | GET | 统计数据 |
| `/api/settings` | GET/POST | 设置管理 |
| `/api/history` | GET | 操作历史 |
| `/api/webhook` | POST | Webhook 管理 |
| `/api/backup` | POST | 备份管理 |

## 卡片复制功能

在主编辑页面，每个项目卡片下方都有「复制」按钮：
- 点击后在同一日期创建副本项目
- 副本默认保留原名称，可按需编辑

## 移动端功能

导出图片功能支持：
- **下载图片**：传统下载方式，适用于所有设备
- **在新标签页打开**：使用浏览器的保存图片功能

手势操作（v2.60 新增）：
- 左右滑动切换周
- 长按触发新建项目

## 技术栈

- Node.js 22 + Express 后端服务
- SQLite 数据存储（better-sqlite3）
- 原生 JavaScript 前端（ES Modules）
- html2canvas 图片导出
- Server-Sent Events (SSE) 实时同步
- PWA Service Worker 离线支持

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

## 项目结构

```
├── client/
│   ├── index.html          # 主页面
│   ├── manifest.json       # PWA Manifest
│   ├── sw.js               # Service Worker
│   ├── css/
│   │   ├── style.css       # 主样式入口
│   │   ├── viewSwitcher.css # 视图切换 + 月视图/人员/看板/暗色模式样式
│   │   └── ...
│   └── js/
│       ├── main.js         # 应用入口
│       └── modules/
│           ├── api.js           # API 客户端
│           ├── viewSwitcher.js  # 视图切换器
│           ├── monthView.js     # 月视图甘特图
│           ├── personnelView.js # 人员排期矩阵
│           ├── dashboardView.js # 数据看板
│           ├── quickAdd.js      # 快速创建
│           ├── historyPanel.js  # 操作历史面板
│           ├── search.js        # 全局搜索
│           ├── clientExport.js  # 前端导出
│           ├── conflict.js      # 冲突检测
│           ├── keyboardNav.js   # 键盘导航
│           ├── mobileGestures.js # 移动手势
│           ├── offlineIndicator.js # 离线指示器
│           ├── validation.js    # 数据验证
│           └── ...
├── server/
│   ├── app.js              # Express 应用
│   ├── middleware/
│   │   └── auth.js         # 认证中间件
│   ├── routes/
│   │   ├── calendar.js     # iCal 日历订阅
│   │   ├── batch.js        # 批量操作
│   │   ├── search.js       # 搜索 API
│   │   ├── conflict.js     # 冲突检测
│   │   ├── export.js       # 数据导出
│   │   └── statistics.js   # 统计 API
│   └── services/
│       └── sqliteStore.js  # SQLite 数据存储
├── CHANGELOG.md
├── DESIGN_SPEC_v2.60.md    # v2.60 设计规格说明书
└── PLAN_v2.60.md           # v2.60 迭代计划
```

## 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| v2.60 | 2026-06-20 | 15 个功能模块：视图增强/效率工具/集成导出/PWA/架构优化 |
| v2.59 | 2026-06-14 | 跨周导出/广告商单/暗色模式/快捷键/CI |
| v2.58 | - | 动态职能管理/商务职能 |
| v2.54 | - | 月视图优化/数据安全与恢复 |

详细更新信息请查看 [CHANGELOG.md](CHANGELOG.md)。
