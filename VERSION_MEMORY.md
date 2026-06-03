# 版本记忆文件 - v2.59

> 自动生成于 2026-06-03，供 AI 快速了解当前版本状态

## 本次升级内容（v2.58 → v2.59）

### 1. 导出图片跨周数支持
- 导出模态框新增「跨周数导出」复选框
- 勾选后显示起始日/结束日选择器
- `drawScheduleToCanvas()` 支持任意日期范围
- 列数动态计算，>10列自动缩小字号
- 标题：单周「第X周通告」，跨周「通告排期」

### 2. 广告商单功能
- 项目新增 `isAdvertiser`（布尔）和 `advertiserNo`（字符串）字段
- 项目表单新增「广告商单」复选框 + 项目号输入
- 卡片显示：靛紫色 (#5856d6) 斜体小字 `商单 #xxx`
- 导出图片/通告弹窗均包含项目号

## 关键代码位置

| 功能 | 文件 |
|------|------|
| 跨周导出逻辑 | client/js/main.js:drawScheduleToCanvas |
| 跨周导出UI | client/index.html:export-modal |
| 广告商单表单 | client/index.html:project-form |
| 广告商单渲染 | client/js/main.js:createProjectCard |
| 广告商单字段 | server/utils/normalize.js:normalizeProject |
| 广告商单CSS | client/css/style.css:.advertiser-no |

## 项目字段（完整）

name, location, director, photographer, production, rd, operational, audio, business, type, startTime, laodao, status, isAdvertiser, advertiserNo, customFields
