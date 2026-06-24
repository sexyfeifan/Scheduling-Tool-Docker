# 🔄 项目交接文档 — 罐头场通告排期系统 v2.61

> **最后更新**: 2026-06-21
> **当前版本**: v2.61.0 (前端) / v2.60 (后端config.js)
> **仓库**: https://github.com/sexyfeifan/Scheduling-Tool-Docker
> **当前分支**: `main`（所有最新代码）
> **本地分支**: `v2.60-dev`（已合并到main，可忽略）

---

## 📌 一、项目概述

罐头场通告排期系统是一个**周视图日历排期工具**，用于管理影视通告排期（导演、摄影师、制片、R&D、运营、音频、商务等职能）。

### 技术栈
- **前端**: 原生 JavaScript (ES Modules) + CSS（无框架、无构建工具）
- **后端**: Node.js 22 + Express 4
- **数据库**: SQLite (better-sqlite3)
- **部署**: Orange Pi Zero 3 (ARM64, 3.8GB RAM, Armbian/Ubuntu 24.04)
- **运行方式**: Node.js 直接运行（非Docker，因ARM设备内存限制）
- **UI风格**: 动物森友会风格（Animal Island UI）

### 服务信息
- **生产地址**: `http://192.168.100.246:3000`
- **管理员密码**: `sexyfeifan`
- **Orange Pi SSH**: `root@192.168.100.246`，密码: `zhoufeifan`
- **GitHub Token**: （需从仓库设置或原管理员处获取）
- **systemd服务**: `scheduling-tool.service`（已创建、已enable，但当前仍由nohup进程运行）

---

## 📁 二、项目结构

```
Scheduling-Tool-Docker/
├── client/                          # 前端
│   ├── index.html                   # 主页面 (907行)
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service Worker
│   ├── css/                         # 样式文件 (15个, 6252行)
│   │   ├── style.css                # 主入口（引入所有CSS）
│   │   ├── base.css                 # CSS变量(:root) + 全局基础
│   │   ├── theme.css                # 动森风格主题变量 + 组件基础样式
│   │   ├── layout.css               # 布局（header/toolbar/week-display）
│   │   ├── components.css           # 按钮/日历列/分隔符
│   │   ├── schedule.css             # 项目卡片/人员标签/类型标签
│   │   ├── modal.css                # 弹窗基础样式
│   │   ├── panels.css               # 面板（历史/热力图/管理员/侧边栏）
│   │   ├── overlays.css             # 遮罩/确认框
│   │   ├── viewSwitcher.css         # 视图切换器/月视图/人员视图/数据看板
│   │   ├── animations.css           # 动画
│   │   ├── mobile.css               # 响应式媒体查询
│   │   ├── animal-island-components.css  # 【核心】Animal Island UI 组件 (720+行)
│   │   ├── animal-island-forms.css       # 【核心】Animal Island 表单样式
│   │   └── animal-island-icons.css       # SVG图标样式
│   └── js/
│       ├── main.js                  # 入口 (570+行)
│       └── modules/                 # JS模块 (36个, 6024行)
│           ├── schedule.js          # 排期核心（日历渲染/拖拽/CRUD）
│           ├── viewSwitcher.js      # 视图切换器（周/月/人员/数据看板）
│           ├── settings.js          # 设置管理
│           ├── modal.js             # 弹窗管理
│           ├── modal-project.js     # 项目编辑弹窗
│           ├── modal-backup.js      # 备份弹窗
│           ├── modal-export.js      # 导出弹窗
│           ├── api.js               # API封装
│           ├── animal-icons.js      # SVG图标库 (44+图标)
│           ├── monthView.js         # 月视图
│           ├── personnelView.js     # 人员排期视图
│           ├── dashboardView.js     # 数据看板
│           ├── quickAdd.js          # 快速添加
│           ├── search.js            # 搜索
│           ├── conflict.js          # 冲突检测
│           ├── heatmap.js           # 热力图
│           ├── webhook.js           # Webhook推送
│           ├── historyPanel.js      # 操作历史
│           ├── keyboardNav.js       # 键盘导航
│           ├── mobileGestures.js    # 移动端手势
│           ├── offlineIndicator.js  # 离线指示器
│           ├── clientExport.js      # 数据导出
│           ├── validation.js        # 表单验证
│           ├── dragdrop.js          # 拖拽
│           ├── filters.js           # 筛选
│           ├── undo.js              # 撤销
│           ├── clipboard.js         # 剪贴板
│           ├── sse.js               # SSE实时推送
│           ├── ui.js                # UI工具
│           ├── date.js              # 日期工具
│           ├── mobile.js            # 移动端工具
│           ├── schedule-card.js     # 卡片渲染
│           ├── schedule-copy.js     # 复制功能
│           ├── schedule-notice.js   # 通告单
│           ├── settings-role.js     # 职能设置
│           ├── settings-template.js # 模板设置
│           ├── export.js            # 导出工具
│           └── filters.js           # 筛选工具
├── server/                          # 后端
│   ├── server.js                    # 入口 (Node.js启动)
│   ├── app.js                       # Express应用配置 (183行)
│   ├── config.js                    # 配置（版本/路径）
│   ├── package.json                 # 依赖
│   ├── middleware/                   # 中间件
│   │   └── auth.js                  # 认证中间件
│   ├── routes/                      # 路由 (12个, 1050行)
│   │   ├── schedules.js             # 排期CRUD
│   │   ├── settings.js              # 设置
│   │   ├── backup.js                # 备份
│   │   ├── batch.js                 # 批量操作
│   │   ├── calendar.js              # iCal日历
│   │   ├── conflict.js              # 冲突检测
│   │   ├── export.js                # 导出
│   │   ├── history.js               # 历史记录
│   │   ├── search.js                # 搜索
│   │   ├── statistics.js            # 统计
│   │   ├── system.js                # 系统健康
│   │   └── webhook.js               # Webhook
│   └── services/
│       └── sqliteStore.js           # SQLite数据存储
├── data/                            # 数据目录
│   ├── schedules.json               # 排期数据
│   └── settings.json                # 设置数据
├── backups/                         # 备份目录
├── docs/                            # 文档
│   └── API.md                       # API文档
├── .github/workflows/               # CI
│   └── docker-build.yml             # Docker多架构构建workflow
├── docker-compose.yml               # Docker Compose配置
├── Dockerfile                       # Docker构建文件
├── README.md                        # 项目说明
├── CHANGELOG.md                     # 变更日志
├── HANDOVER_v2.61.md                # 【本文件】交接文档
├── CODE_REVIEW.md                   # 代码审查报告
├── DESIGN_SPEC_v2.60.md             # 设计规格说明书
├── PLAN_v2.60.md                    # 迭代计划
├── DEPLOYMENT_GUIDE.md              # 部署指南
└── WEBHOOK_TEMPLATES.md             # Webhook模板
```

---

## 🎨 三、Animal Island UI 改造完成清单

### ✅ 已完成的UI组件

| # | 组件 | 文件 | 状态 |
|---|------|------|------|
| 1 | **Switch 开关** | `animal-island-components.css` + `index.html` | ✅ 5个（老刀/广告商单/跨周数导出/分享/Webhook） |
| 2 | **Checkbox 复选框** | `animal-island-components.css` | ✅ 带弹跳动画 |
| 3 | **Select 选择器** | `animal-island-components.css` | ✅ 全部7个（类型筛选/人员职能/Webhook平台等） |
| 4 | **Tabs 标签页** | `animal-island-components.css` | ✅ 管理员设置页 |
| 5 | **Card 卡片风格** | `animal-island-components.css` | ✅ 全部9个弹窗 |
| 6 | **Tooltip 悬停提示** | `animal-island-components.css` | ✅ 工具栏12个按钮 |
| 7 | **SVG 图标库** | `animal-icons.js` + `animal-island-icons.css` | ✅ 44+图标，自动替换emoji |
| 8 | **实时时钟** | `index.html` + `main.js` | ✅ 每秒更新 |
| 9 | **搜索框SVG图标** | `animal-island-forms.css` | ✅ 内联SVG替换emoji🔍 |
| 10 | **弹窗入场动画** | `animal-island-components.css` | ✅ 弹性缩放 modalCardIn |
| 11 | **暗色模式** | `animal-island-components.css` + `index.html` | ✅ 全面覆盖（CSS变量+组件+全局） |
| 12 | **暗色模式切换** | `index.html`（内联JS） | ✅ 右下角按钮，SVG图标（moon/sun） |
| 13 | **移动端响应式** | `mobile.css` | ✅ Animal Island组件适配 |
| 14 | **Google Fonts** | `index.html` | ✅ Nunito + Noto Sans SC |
| 15 | **theme-color** | `index.html` | ✅ #19c8b9 |

### ⚠️ CSS变量命名现状

存在**两套变量命名**（已通过别名解决，但新开发者需注意）：

| 变量名 | 定义位置 | 说明 |
|--------|----------|------|
| `--animal-primary` | `theme.css` :root | 短名，forms.css使用 |
| `--animal-primary-color` | `animal-island-components.css` :root | 长名，components.css使用 |
| `--animal-primary` alias | `animal-island-components.css` :root | 别名，指向同一值 |

**建议**: 后续统一为短名（`--animal-primary`），移除`-color`后缀变体。

---

## 🛠️ 四、已完成的v2.60/v2.61功能

### v2.60 核心功能（15个模块）

| # | 功能 | 前端模块 | 后端路由 | 状态 |
|---|------|----------|----------|------|
| 1 | 月视图 | `monthView.js` | - | ✅ |
| 2 | 数据看板 | `dashboardView.js` | `statistics.js` | ✅ |
| 3 | 人员排期视图 | `personnelView.js` | - | ✅ |
| 4 | 全局搜索 | `search.js` | `search.js` | ✅ |
| 5 | 快速添加 | `quickAdd.js` | - | ✅ |
| 6 | 冲突检测 | `conflict.js` | `conflict.js` | ✅ |
| 7 | 工作量热力图 | `heatmap.js` | `statistics.js` | ✅ |
| 8 | Webhook推送 | `webhook.js` | `webhook.js` | ✅ |
| 9 | iCal日历订阅 | - | `calendar.js` | ✅ |
| 10 | 操作历史 | `historyPanel.js` | `history.js` | ✅ |
| 11 | 键盘导航 | `keyboardNav.js` | - | ✅ |
| 12 | 移动端手势 | `mobileGestures.js` | - | ✅ |
| 13 | PWA离线支持 | `offlineIndicator.js` | - | ✅ |
| 14 | 数据导出 | `clientExport.js` | `export.js` | ✅ |
| 15 | 批量操作 | - | `batch.js` | ✅ |

### v2.61 UI改造

| # | 改进项 | 说明 |
|---|--------|------|
| 1 | Animal Island组件全套 | Switch/Checkbox/Select/Tabs/Card/Tooltip |
| 2 | SVG图标库替换emoji | 44+图标 |
| 3 | 暗色模式全面适配 | 全部CSS组件+全局覆盖 |
| 4 | 移动端响应式 | 组件适配+触摸优化 |
| 5 | 字体引入 | Google Fonts (Nunito + Noto Sans SC) |

---

## 🔧 五、已知问题与待办事项

### 🔴 高优先级

| # | 问题 | 详情 | 建议修复方式 |
|---|------|------|-------------|
| 1 | **systemd服务未激活** | 当前仍由nohup进程运行(PID: 1610113)，systemd service已创建但未接管 | SSH执行 `kill 1610113 && systemctl start scheduling-tool` |
| 2 | **server/config.js版本号未更新** | 仍为`2.60`，前端已为`2.61` | 改为`2.61` |
| 3 | **CSS变量命名不统一** | `--animal-primary` vs `--animal-primary-color` | 统一为短名 |

### 🟡 中优先级

| # | 问题 | 详情 | 建议修复方式 |
|---|------|------|-------------|
| 4 | **暗色模式下部分新组件可能遗漏** | 如确认框、toast、加载动画等 | 逐个检查`[data-theme="dark"]`覆盖 |
| 5 | **后端console.log过多(195个)** | 生产环境日志未分级 | 使用winston或pino替换 |
| 6 | **无自动备份** | 数据库无定时备份 | 添加cron job每日备份 |
| 7 | **参考站点对比** | `https://planb.canbox.cool:8443/` 有更多完整功能 | 逐项对比补齐 |

### 🟢 低优先级

| # | 问题 | 详情 |
|---|------|------|
| 8 | 备份/恢复按钮SVG图标替换 | 管理员设置中的备份按钮仍用emoji |
| 9 | 动画性能优化 | 部分动画在低端设备可能卡顿 |
| 10 | 无障碍(A11y) | 缺少ARIA标签和键盘焦点管理 |
| 11 | 国际化(i18n) | 当前仅中文 |

---

## 📊 六、代码统计

| 模块 | 文件数 | 总行数 |
|------|--------|--------|
| 前端JS模块 | 36 | 6,024 |
| 前端CSS | 15 | 6,252 |
| 前端HTML | 1 | 907 |
| 后端路由 | 12 | 1,050 |
| 后端核心 | 3 | ~300 |
| **总计** | **67** | **~14,533** |

---

## 🔄 七、Git状态

### 分支

| 分支 | 说明 | 状态 |
|------|------|------|
| `main` | 主分支，所有最新代码 | ✅ 已推送到GitHub |
| `v2.60-dev` | 开发分支 | ⚠️ 已合并到main，落后main约5个提交 |

### 最近提交记录（main分支）

```
fe37907 fix: CSS变量别名统一(--animal-primary等)
b7197a2 feat: 暗色模式SVG图标切换 + 全局暗色覆盖 + systemd自启
ec68cfb fix: 添加Nunito/Noto Sans SC字体引入 + theme-color修正
d628ae7 feat: 全面暗色模式 + 移动端适配 + v2.61
06dd48b feat: 搜索框SVG图标 + 全面暗色模式适配
9006735 feat: SVG图标按钮样式 + 弹窗动画增强 + icons CSS引入
a50af6f feat: 暗色模式全面适配 + header布局优化
446271f feat: 所有弹窗应用Animal Island Card风格
578b884 feat: 剩余Select改造 + SVG图标库
b80c125 feat: Animal Island UI 组件全面升级 (续)
e9839ff feat: Animal Island UI 组件升级 (Switch/Clock/日历+修复)
01d101f fix: 修复系统状态显示 - 将API初始化移到模块创建之前
```

### 推送状态

- **GitHub**: `main` 分支已推送到 `https://github.com/sexyfeifan/Scheduling-Tool-Docker.git`
- **v2.60-dev**: 本地分支，未推送（已合并到main，可删除）

---

## 🖥️ 八、Orange Pi 服务器状态

### 运行中的服务

| 服务 | 端口 | 进程 | 状态 |
|------|------|------|------|
| 排期系统 | 3000 | node server.js (PID: 1610113, nohup) | ✅ 运行中 |
| 1Panel | 25888 | 1Panel | ✅ 运行中 |
| 1Panel-copaw | 8088 | Docker容器 | ✅ 运行中 |

### systemd服务（已创建但未接管）

```bash
# 文件: /etc/systemd/system/scheduling-tool.service
# 状态: enabled, inactive (因端口被nohup进程占用)
# 接管命令:
kill 1610113 && systemctl start scheduling-tool
```

### 磁盘/内存

- **RAM**: 3.8GB总，约2.9GB已用
- **Swap**: 1.9GB
- **关键**: Docker构建会导致内存死锁，**必须用Node.js直接运行**

---

## 🚀 九、新服务器部署步骤

### 1. 克隆仓库

```bash
git clone https://github.com/sexyfeifan/Scheduling-Tool-Docker.git
cd Scheduling-Tool-Docker
```

### 2. 安装依赖

```bash
cd server && npm install
```

### 3. 启动服务

```bash
node server.js
# 或使用pm2:
# pm2 start server.js --name scheduling-tool
```

### 4. 访问

```
http://<新服务器IP>:3000
管理员密码: sexyfeifan
```

### 5. 数据迁移（如需要）

```bash
# 从Orange Pi复制数据
scp root@192.168.100.246:/opt/Scheduling-Tool-Docker/data/ ./data/
scp root@192.168.100.246:/opt/Scheduling-Tool-Docker/backups/ ./backups/
```

---

## 📝 十、关键代码入口

### 前端入口

| 功能 | 文件 | 行号 | 说明 |
|------|------|------|------|
| 应用初始化 | `client/js/main.js` | `initApp()` | 所有模块初始化 |
| emoji→SVG替换 | `client/js/main.js` | `replaceEmojisWithIcons()` | 484行 |
| 暗色模式切换 | `client/index.html` | 内联script | 848行 |
| 视图切换 | `client/js/modules/viewSwitcher.js` | - | 周/月/人员/看板 |
| 排期渲染 | `client/js/modules/schedule.js` | - | 日历核心 |

### 后端入口

| 功能 | 文件 | 说明 |
|------|------|------|
| 服务器启动 | `server/server.js` | 入口，调用createApp() |
| Express配置 | `server/app.js` | 路由注册/中间件 |
| 数据存储 | `server/services/sqliteStore.js` | SQLite CRUD |
| 认证 | `server/middleware/auth.js` | JWT + 管理员密码 |

### CSS入口

| 功能 | 文件 | 说明 |
|------|------|------|
| 主样式表 | `client/css/style.css` | @import所有CSS |
| 动森变量 | `client/css/theme.css` | `:root` CSS变量 |
| 组件变量 | `client/css/animal-island-components.css` | 组件级变量+组件样式 |
| 表单样式 | `client/css/animal-island-forms.css` | 表单元素 |

---

## 🎯 十一、参考资源

| 资源 | URL/路径 |
|------|----------|
| GitHub仓库 | https://github.com/sexyfeifan/Scheduling-Tool-Docker |
| Animal Island UI参考 | https://guokaigdg.github.io/animal-island-ui/ |
| 用户生产版本(参考) | https://planb.canbox.cool:8443/ |
| 设计规格说明书 | `DESIGN_SPEC_v2.60.md` |
| 迭代计划 | `PLAN_v2.60.md` |
| 代码审查报告 | `CODE_REVIEW.md` |
| API文档 | `docs/API.md` |
| 变更日志 | `CHANGELOG.md` |
| 部署指南 | `DEPLOYMENT_GUIDE.md` |

---

## ⚡ 十二、给新Agent的快速上手指南

### 1. 理解项目
- 这是一个**纯原生JS前端**，无React/Vue/Angular，无构建工具
- 所有JS模块通过ES Modules (`import/export`) 组织
- CSS通过 `style.css` 的 `@import` 链式加载
- 后端是标准Express + SQLite

### 2. 修改代码的注意事项
- **不要**使用任何构建工具（webpack/vite等）
- **不要**引入npm前端依赖
- CSS变量有两套命名（短名和长名），优先使用短名
- 修改HTML后必须验证标签闭合（可用Python HTMLParser）
- 暗色模式通过 `[data-theme="dark"]` 选择器实现

### 3. 部署注意事项
- **必须**用Node.js直接运行，不要用Docker（ARM设备内存不足）
- 部署前先检查端口占用：`ss -tlnp | grep 3000`
- 静态文件（CSS/JS/HTML）修改后无需重启服务，刷新浏览器即可
- 后端代码修改后需要重启Node.js进程

### 4. 测试
- CI测试: `cd server && npm test`（19个测试用例）
- 前端无自动化测试，需手动浏览器验证
- 暗色模式测试: 点击右下角月亮/太阳图标切换

---

*文档生成时间: 2026-06-21 | 版本: v2.61.0 | 作者: AI Agent (default)*
