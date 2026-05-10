# 📤 Webhook 推送模板参考

本文档提供多种风格的 Webhook 推送模板，可直接复制粘贴到系统设置中的模板区域使用。

---

## 📋 可用变量说明

### 日通告模板变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `{{date}}` | 日期标签 | 5月9日 周五 |
| `{{count}}` | 项目总数 | 3 |
| `{{#projects}}...{{/projects}}` | 项目循环块 | - |
| `{{index}}` | 项目序号 | 1, 2, 3 |
| `{{name}}` | 项目名称 | 品牌宣传片 |
| `{{startTime}}` | 开始时间 | 09:00 |
| `{{location}}` | 拍摄场地 | 摄影棚A |
| `{{type}}` | 项目类型 | 视频/平面/直播/试做 |
| `{{director}}` | 导演 | 张三 |
| `{{photographer}}` | 摄影师 | 李四 |
| `{{production}}` | 制片 | 王五 |
| `{{operational}}` | 运营 | 赵六 |
| `{{rd}}` | 研发 | 钱七 |
| `{{audio}}` | 录音 | 孙八 |
| `{{laodao}}` | 老刀出镜标记 | 🔥 老刀出镜 (有值时显示) |
| `{{directorLine}}` | 导演行（有值才显示） | 导演: 张三 |
| `{{photographerLine}}` | 摄影行（有值才显示） | 摄影: 李四 |
| `{{productionLine}}` | 制片行（有值才显示） | 制片: 王五 |
| `{{operationalLine}}` | 运营行（有值才显示） | 运营: 赵六 |
| `{{rdLine}}` | 研发行（有值才显示） | 研发: 钱七 |
| `{{audioLine}}` | 录音行（有值才显示） | 录音: 孙八 |

### 周通告模板变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `{{weekRange}}` | 周日期范围 | 5/5 - 5/11 |
| `{{totalCount}}` | 本周项目总数 | 12 |
| `{{#days}}...{{/days}}` | 日期循环块 | - |
| `{{date}}` | 日期标签 | 5月9日 周五 |
| `{{dayCount}}` | 当天项目数 | 3 |
| `{{#projects}}...{{/projects}}` | 项目循环块（嵌套在 days 内） | - |
| `{{index}}` | 项目序号 | 1, 2, 3 |
| `{{name}}` | 项目名称 | 品牌宣传片 |
| `{{startTime}}` | 开始时间 | 09:00 |
| `{{location}}` | 拍摄场地 | 摄影棚A |
| `{{type}}` | 项目类型 | 视频 |
| `{{director}}` | 导演 | 张三 |
| `{{photographer}}` | 摄影师 | 李四 |
| `{{production}}` | 制片 | 王五 |
| `{{operational}}` | 运营 | 赵六 |
| `{{rd}}` | 研发 | 钱七 |
| `{{audio}}` | 录音 | 孙八 |

---

## 📅 日通告模板

### 模板 1：标准详细版

```
共 {{count}} 个项目：

{{#projects}}
{{index}}. **{{name}}**
⏰ {{startTime}}  📍 {{location}}
{{directorLine}}  {{photographerLine}}
{{productionLine}}  {{type}}
{{/projects}}
```

### 模板 2：紧凑卡片版

```
📢 今日通告 | 共 {{count}} 个项目
━━━━━━━━━━━━━━━━━━━━━━
{{#projects}}
🎬 {{index}}. {{name}}
   ⏰{{startTime}} | 📍{{location}} | {{type}}
   👤{{director}} / {{photographer}} / {{production}}
{{/projects}}
━━━━━━━━━━━━━━━━━━━━━━
祝拍摄顺利！🎉
```

### 模板 3：完整人员版（显示所有角色）

```
📋 {{date}} 通告单

共 {{count}} 个项目：
{{#projects}}
━━━━━━━━━━━━━━━
{{index}}. **{{name}}**
⏰ 时间：{{startTime}}
📍 场地：{{location}}
🎬 类型：{{type}}
{{directorLine}}
{{photographerLine}}
{{productionLine}}
{{operationalLine}}
{{rdLine}}
{{audioLine}}
{{laodao}}
{{/projects}}

以上，请各位注意查看！
```

### 模板 4：极简版

```
{{date}} | {{count}}个项目
{{#projects}}
{{index}}. {{name}} {{startTime}} {{location}}
{{/projects}}
```

### 模板 5：分类标签版

```
🔔 {{date}} 通告

{{#projects}}
┌─────────────────────────
│ {{index}}. {{name}}
│ ⏰ {{startTime}}  📍 {{location}}
│ 🏷️ {{type}}
│ 👥 {{director}} | {{photographer}} | {{production}}
└─────────────────────────
{{/projects}}

共 {{count}} 个项目，祝一切顺利！✨
```

### 模板 6：钉钉/飞书友好版（带分隔线）

```
## 📋 {{date}} 通告单

> 共 **{{count}}** 个项目

{{#projects}}
---

### {{index}}. {{name}}

| 项目 | 详情 |
|------|------|
| ⏰ 时间 | {{startTime}} |
| 📍 场地 | {{location}} |
| 🏷️ 类型 | {{type}} |
| 🎬 导演 | {{director}} |
| 📷 摄影 | {{photographer}} |
| 📋 制片 | {{production}} |

{{/projects}}

---

> 请各组提前做好准备，祝拍摄顺利！🎬
```

---

## 📋 周通告模板

### 模板 1：标准详细版

```
本周共 {{totalCount}} 个项目：

{{#days}}
📅 **{{date}}** ({{dayCount}}个项目)
{{#projects}}
{{index}}. {{name}} | ⏰{{startTime}} | 📍{{location}} | {{type}}
{{/projects}}
{{/days}}
```

### 模板 2：紧凑日历版

```
📊 周通告 {{weekRange}}
━━━━━━━━━━━━━━━━━━━━━━
本周共 {{totalCount}} 个项目
━━━━━━━━━━━━━━━━━━━━━━
{{#days}}
📅 {{date}} [{{dayCount}}项]
{{#projects}}
  {{index}}. {{name}} ⏰{{startTime}} 📍{{location}}
{{/projects}}
{{/days}}
━━━━━━━━━━━━━━━━━━━━━━
```

### 模板 3：完整人员版

```
📋 周通告 | {{weekRange}}

本周共 **{{totalCount}}** 个项目

{{#days}}
━━━━━━━━━━━━━━━━━━━━━━
📅 **{{date}}** — {{dayCount}} 个项目
━━━━━━━━━━━━━━━━━━━━━━
{{#projects}}
{{index}}. **{{name}}**
   ⏰ {{startTime}} | 📍 {{location}} | 🏷️ {{type}}
   🎬 {{director}} | 📷 {{photographer}} | 📋 {{production}}
   👤 运营:{{operational}} | 研发:{{rd}} | 录音:{{audio}}
{{/projects}}
{{/days}}

━━━━━━━━━━━━━━━━━━━━━━
祝各位本周工作顺利！🎉
```

### 模板 4：极简版

```
周通告 {{weekRange}} | 共{{totalCount}}个项目
{{#days}}
{{date}}: {{#projects}}{{name}} {{/projects}}
{{/days}}
```

### 模板 5：表格版（适合飞书/企业微信）

```
## 📊 周通告 {{weekRange}}

> 本周共 **{{totalCount}}** 个项目

{{#days}}
### 📅 {{date}} ({{dayCount}}个项目)

| 序号 | 项目名称 | 时间 | 场地 | 类型 | 导演 | 摄影 |
|------|----------|------|------|------|------|------|
{{#projects}}
| {{index}} | {{name}} | {{startTime}} | {{location}} | {{type}} | {{director}} | {{photographer}} |
{{/projects}}

{{/days}}

> 请各部门提前协调资源，确保项目顺利推进！
```

### 模板 6：每日分组带统计版

```
📈 周通告 | {{weekRange}}

本周统计：共 {{totalCount}} 个项目

{{#days}}
▎{{date}} · {{dayCount}}个项目
{{#projects}}
  {{index}}. {{name}}
     └ {{startTime}} | {{location}} | {{type}}
     └ {{director}} / {{photographer}} / {{production}}
{{/projects}}

{{/days}}

祝大家工作愉快！💪
```

---

## 🎯 特殊场景模板

### 老刀出镜专用日通告

```
📋 {{date}} 通告

{{#projects}}
{{index}}. **{{name}}**
⏰ {{startTime}} | 📍 {{location}} | {{type}}
{{directorLine}} {{photographerLine}}
{{productionLine}}
{{laodao}}
{{/projects}}

共 {{count}} 个项目，请注意老刀出镜安排！🔥
```

### 紧急通知版（日通告）

```
⚠️ 紧急通告 | {{date}}

{{#projects}}
🔴 {{index}}. {{name}}
   时间：{{startTime}}
   场地：{{location}}
   导演：{{director}} | 摄影：{{photographer}}
   制片：{{production}}
{{/projects}}

共 {{count}} 个项目，请各组立即确认！
```

### 客户汇报版（周通告）

```
尊敬的团队：

以下是本周工作安排（{{weekRange}}）

本周共安排 {{totalCount}} 个项目：

{{#days}}
📅 {{date}}
{{#projects}}
  {{index}}. {{name}}
     - 时间：{{startTime}}
     - 场地：{{location}}
     - 类型：{{type}}
     - 负责人：{{director}}
{{/projects}}

{{/days}}

如有任何问题，请及时沟通。

谢谢！
```

---

## 💡 使用说明

1. 复制上述任意模板
2. 进入系统设置 → 管理员设置 → Webhook 推送
3. 将模板粘贴到"日通告推送格式模板"或"周通告推送格式模板"输入框
4. 点击"保存设置"
5. 使用"加载默认模板"按钮可恢复系统默认模板

### 注意事项

- 模板中的 `{{#projects}}...{{/projects}}` 和 `{{#days}}...{{/days}}` 是循环块，必须成对出现
- 变量名区分大小写
- 如果变量值为空，使用 `{{xxLine}}` 格式的变量会自动隐藏该行
- `{{laodao}}` 变量仅在项目标记为老刀出镜时有值
- 建议先使用"测试连通性"功能验证 Webhook 配置
