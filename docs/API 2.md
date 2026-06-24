# 罐头场通告排期系统 — API 文档

> 版本：v2.59 | Base URL: `/api`  
> 更新日期：2026-06-20

---

## 目录

- [认证](#认证)
- [系统](#系统)
- [排期](#排期)
- [设置](#设置)
- [备份](#备份)
- [Webhook](#webhook)
- [SSE 实时推送](#sse-实时推送)

---

## 认证

所有需要认证的接口通过 HTTP Header 传递密码：

| Header | 说明 |
|--------|------|
| `x-admin-password` | 管理员密码 |
| `x-edit-password` | 编辑密码 |

- **只读接口**（GET）通常不需要密码
- **写入接口**（POST/PUT/DELETE）需要编辑密码
- **管理接口**（访问设置、备份列表）需要管理员密码

密码验证失败返回 `401 Unauthorized`。

---

## 系统

### GET /api/health

健康检查。无需认证。

**响应：**
```json
{
  "status": "ok",
  "version": "2.59.0",
  "uptimeSeconds": 3600,
  "startedAt": "2026-06-20T10:00:00.000Z",
  "dataDir": "/app/data",
  "backupDir": "/app/backups",
  "schedulesCount": 15,
  "templateCount": 3,
  "shareEnabled": false
}
```

### GET /api/version

获取版本信息。无需认证。

**响应：**
```json
{
  "version": "2.59.0",
  "createDate": "2026-01-01",
  "buildDate": "2026-06-20"
}
```

---

## 排期

### GET /api/schedules

获取排期数据。无需认证。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `startDate` | string | 起始日期，格式 `YYYY-MM-DD` |
| `endDate` | string | 结束日期，格式 `YYYY-MM-DD` |

不传参数则返回全部排期。

**响应：**
```json
{
  "2026-06-20": [
    {
      "id": "proj_abc123",
      "name": "项目名称",
      "type": "视频",
      "location": "棚A",
      "director": "张三",
      "photographer": "李四",
      "production": "王五",
      "startTime": "09:00",
      "laodao": false,
      "status": "confirmed",
      "isAdvertiser": false,
      "advertiserNo": ""
    }
  ]
}
```

**项目字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 项目名称 |
| `type` | string | 类型：视频/平面/试做/外拍/直播 |
| `location` | string | 拍摄场地 |
| `director` | string | 导演 |
| `photographer` | string | 摄影师 |
| `production` | string | 制片 |
| `rd` | string | 研发 |
| `operational` | string | 运营 |
| `audio` | string | 录音 |
| `business` | string | 商务 |
| `startTime` | string | 开始时间，格式 `HH:mm` |
| `laodao` | boolean | 是否老刀 |
| `status` | string | 状态：confirmed/pending |
| `isAdvertiser` | boolean | 是否广告商单 |
| `advertiserNo` | string | 广告商单项目号 |
| `customFields` | object | 自定义职能字段 |

### POST /api/schedules

保存排期。需要编辑密码。

**请求体：**
```json
{
  "date": "2026-06-20",
  "projects": [
    {
      "name": "项目名称",
      "type": "视频",
      "location": "棚A",
      "startTime": "09:00"
    }
  ]
}
```

**响应：**
```json
{ "message": "保存成功" }
```

**错误：**

| 状态码 | 说明 |
|--------|------|
| 400 | 日期格式无效或 projects 不是数组 |
| 401 | 编辑密码错误 |

### DELETE /api/schedules/:date

删除指定日期的排期。需要编辑密码。

**路径参数：**

| 参数 | 说明 |
|------|------|
| `date` | 日期，格式 `YYYY-MM-DD` |

**响应：**
```json
{ "message": "删除成功" }
```

**错误：**

| 状态码 | 说明 |
|--------|------|
| 400 | 日期格式无效 |
| 401 | 编辑密码错误 |
| 404 | 未找到指定日期的排期 |

---

## 设置

### GET /api/settings

获取设置。无需认证。

**响应：**
```json
{
  "commonLocations": ["棚A", "棚B", "外景"],
  "projectTemplates": [
    {
      "id": "tpl_abc123",
      "name": "直播模板",
      "defaults": {
        "type": "直播",
        "location": "直播间"
      }
    }
  ],
  "roleCategories": [
    { "key": "director", "label": "导演", "type": "checkbox", "optionsKey": "commonDirector" }
  ],
  "webhook": {
    "enabled": false,
    "platform": "custom",
    "url": "",
    "dailyTemplate": "",
    "weeklyTemplate": ""
  }
}
```

### POST /api/settings

保存设置。需要编辑密码。

**请求体：** 与 GET 响应结构相同（部分更新，`access` 字段会被忽略）。

**响应：**
```json
{ "message": "设置已保存" }
```

### GET /api/settings/access

获取访问控制设置。需要管理员密码。

**响应：**
```json
{
  "editPasswordEnabled": true,
  "shareEnabled": false,
  "shareToken": "",
  "shareUrl": ""
}
```

### POST /api/settings/access

更新访问控制设置。需要管理员密码。

**请求体：**
```json
{
  "shareEnabled": true,
  "shareToken": "my-token",
  "editPassword": "new-password"
}
```

**响应：**
```json
{
  "message": "访问控制已保存",
  "access": {
    "editPasswordEnabled": true,
    "shareEnabled": true,
    "shareToken": "my-token",
    "shareUrl": "http://localhost:3000/notice?token=my-token"
  }
}
```

### GET /api/settings/templates

获取项目模板列表。无需认证。

**响应：**
```json
[
  {
    "id": "tpl_abc123",
    "name": "直播模板",
    "defaults": {
      "type": "直播",
      "location": "直播间",
      "director": ""
    }
  }
]
```

### POST /api/settings/templates

创建或更新模板。需要编辑密码。

**请求体：**
```json
{
  "id": "tpl_abc123",
  "name": "直播模板",
  "defaults": {
    "type": "直播",
    "location": "直播间"
  }
}
```

- 包含 `id` 时更新已有模板
- 不含 `id` 时创建新模板

**响应：**
```json
{
  "message": "模板已保存",
  "template": {
    "id": "tpl_abc123",
    "name": "直播模板",
    "defaults": { "type": "直播", "location": "直播间" }
  }
}
```

### DELETE /api/settings/templates/:id

删除模板。需要编辑密码。

**响应：**
```json
{ "message": "模板已删除" }
```

**错误：** `404` — 模板不存在

---

## 备份

### POST /api/backup

创建备份。需要编辑密码。

**响应：**
```json
{
  "message": "备份创建成功",
  "backup": {
    "name": "2026-06-20_10-30-00",
    "path": "2026-06-20_10-30-00"
  }
}
```

### GET /api/backups

获取备份列表。需要管理员密码。

**响应：**
```json
[
  {
    "name": "2026-06-20_10-30-00",
    "path": "2026-06-20_10-30-00",
    "time": 1718875800000,
    "projectsCount": 15
  }
]
```

### POST /api/restore

从备份恢复。需要编辑密码。

**请求体：**
```json
{
  "path": "2026-06-20_10-30-00"
}
```

**响应：**
```json
{
  "message": "恢复成功",
  "schedules": [...],
  "settings": {...}
}
```

### DELETE /api/backups

删除备份。需要编辑密码。

**请求体：**
```json
{
  "path": "2026-06-20_10-30-00"
}
```

**响应：**
```json
{ "message": "备份已删除" }
```

### GET /api/backups/:folder/:file

下载备份文件。需要管理员密码。

**路径参数：**

| 参数 | 说明 |
|------|------|
| `folder` | 备份文件夹名 |
| `file` | 文件名（如 `schedules.json`） |

**响应：** 文件内容（JSON）

### GET /api/admin/snapshot

获取当前数据快照。需要管理员密码。

**响应：**
```json
{
  "settings": {...},
  "schedules": [...],
  "version": {...}
}
```

### POST /api/verify-password

验证密码。无需认证（用于登录验证）。

**请求体：**
```json
{ "password": "admin123" }
```

**响应：**
```json
{ "valid": true }
```

---

## Webhook

### POST /api/webhook/test

测试 Webhook 推送。需要管理员密码。

**响应：**
```json
{ "message": "测试推送已发送" }
```

### POST /api/webhook/push/daily

推送日通告。需要管理员密码。

**请求体：**
```json
{ "date": "2026-06-20" }
```

**响应：**
```json
{ "message": "日通告已推送" }
```

### POST /api/webhook/push/weekly

推送周通告。需要管理员密码。

**请求体：**
```json
{
  "startDate": "2026-06-16",
  "endDate": "2026-06-22"
}
```

**响应：**
```json
{ "message": "周通告已推送" }
```

### GET /api/webhook/templates

获取 Webhook 模板预设。需要管理员密码。

**响应：**
```json
{
  "daily": [
    { "name": "标准详细版", "template": "..." },
    { "name": "紧凑卡片版", "template": "..." }
  ],
  "weekly": [
    { "name": "标准详细版", "template": "..." },
    { "name": "紧凑日历版", "template": "..." }
  ]
}
```

---

## SSE 实时推送

### GET /events

Server-Sent Events 端点，用于实时数据同步。无需认证。

**Content-Type:** `text/event-stream`

**事件类型：**

| type | 说明 | 数据 |
|------|------|------|
| `scheduleUpdate` | 排期更新 | `{ type, date, projects }` |
| `scheduleDelete` | 排期删除 | `{ type, date }` |
| `settingsUpdate` | 设置更新 | `{ type, settings }` |
| `templateUpdate` | 模板更新 | `{ type, templates }` |
| `heartbeat` | 心跳 | `{ type: "heartbeat" }` |

**连接方式：**
```javascript
const eventSource = new EventSource('/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 处理事件
};
```

---

## 错误响应格式

所有错误返回统一格式：

```json
{
  "message": "错误描述"
}
```

**常见状态码：**

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败（密码错误） |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |
