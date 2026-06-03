# 版本记忆文件 - v2.58

> 自动生成于 2026-06-03，供 AI 快速了解当前版本状态

## 项目概述

**项目名称**: 罐头场通告排期（Docker版）
**作者**: 性感的非凡 (zhoufeifan@gmail.com)
**技术栈**: Node.js + Express 后端 / 原生 JavaScript 前端 / better-sqlite3 数据存储 / Docker 部署
**Docker Hub**: `sexyfeifan/scheduling-tool:2.58`

## 本次升级内容（v2.57 → v2.58）

### 核心变更：职能管理动态化
- 常用项管理重构为动态职能系统
- 保留全部原有职能，新增"商务"（business）独立职能
- 去掉标签"常用"前缀
- 支持前端动态增删职能类别

### 职能列表（8个默认职能）
| key | 标签 | 类型 | 设置字段 | 卡片颜色 |
|-----|------|------|----------|---------|
| location | 拍摄地 | 单选 | commonLocations | - |
| director | 导演 | 多选 | commonDirectors | 蓝色 #0071e3 |
| photographer | 摄影师 | 多选 | commonPhotographers | 紫色 #af52de |
| production | 制片 | 多选 | commonProductionFacilities | 绿色 #34c759 |
| rd | 研发 | 多选 | commonRdFacilities | 橙色 #ff9500 |
| operational | 运营 | 多选 | commonOperationalFacilities | 天蓝 #5a91ff |
| audio | 录音 | 多选 | commonAudioFacilities | 玫红 #ff2d55 |
| business | 商务 | 多选 | commonBusinessFacilities | 靛紫 #5856d6 |

### 数据兼容
- 所有现有字段不变
- 新增 `business` 字段和 `commonBusinessFacilities` 设置项
- 自定义职能使用 `customFields` 存储
- 旧数据无需迁移

## 目录结构

```
scheduling-tool-docker-v2.58/
├── client/
│   ├── index.html             # 主编辑页面（动态职能导出）
│   ├── preview.html           # 只读预览（动态职能渲染）
│   ├── css/style.css          # 样式（含8个职能颜色）
│   ├── js/
│   │   ├── main.js            # 主逻辑（动态职能系统）
│   │   └── modules/
│   │       ├── api.js
│   │       ├── date.js
│   │       ├── filters.js     # 筛选（支持business+customFields）
│   │       └── undo.js
│   └── assets/
├── server/
│   ├── server.js
│   ├── app.js
│   ├── config.js              # 版本2.58
│   ├── routes/
│   │   ├── schedules.js       # 含business字段标签
│   │   ├── settings.js
│   │   ├── backup.js
│   │   ├── webhook.js
│   │   ├── history.js
│   │   └── system.js
│   ├── services/
│   │   ├── webhookService.js  # 含商务模板变量
│   │   └── ...
│   ├── utils/
│   │   └── normalize.js       # DEFAULT_ROLE_CATEGORIES + business
│   └── test/
├── data/
│   ├── settings.json
│   ├── schedules.json
│   └── version.json
├── docker-compose.yml
├── Dockerfile
├── README.md
├── UPDATE_LOG.md
├── WEBHOOK_TEMPLATES.md       # 含商务变量说明
└── VERSION_MEMORY.md
```

## 数据模型

### 设置 (settings.json)
```json
{
  "roleCategories": [...],
  "commonLocations": [],
  "commonDirectors": [],
  "commonPhotographers": [],
  "commonProductionFacilities": [],
  "commonRdFacilities": [],
  "commonOperationalFacilities": [],
  "commonAudioFacilities": [],
  "commonBusinessFacilities": [],
  "customRoleOptions": {},
  "projectTemplates": [],
  "access": {},
  "webhook": {}
}
```

### 项目字段
name, location, director, photographer, production, rd, operational, audio, business, type, startTime, laodao, status, customFields

## 核心功能

1. **动态职能管理** - 设置中增删职能，支持单选/多选
2. **8个默认职能** - 各有独立颜色标识
3. **周/月视图排期** - 拖拽调整
4. **导出图片/通告** - 动态职能渲染
5. **Webhook推送** - 含商务变量
6. **备份恢复** - 密码保护
7. **只读预览** - /notice
8. **SSE实时同步**

## 关键代码位置

| 功能 | 文件 |
|------|------|
| 职能默认配置 | server/utils/normalize.js:5 |
| 项目字段标准化 | server/utils/normalize.js:52 |
| 设置保存 | server/routes/settings.js:20 |
| 职能设置渲染 | client/js/main.js:renderRoleSettings |
| 项目表单渲染 | client/js/main.js:renderProjectRoleFields |
| 卡片渲染 | client/js/main.js:createProjectCard |
| 职能颜色 | client/css/style.css:.staff-role.* |

## 版本历史

- v1.16.1: 运营和录音设置颜色
- v2.0-2.4: 移动端优化
- v2.5-2.9: 导出图片、备份功能
- v2.10-2.12: 备份密码、数据持久化
- v2.16-2.17: Bug修复、安全加固
- v2.54: 月视图、一键导出通告
- v2.57: Webhook模板增强
- **v2.58**: 职能管理动态化、新增商务职能
