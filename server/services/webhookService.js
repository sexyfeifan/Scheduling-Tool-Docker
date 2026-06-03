const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Webhook 推送服务
 * 支持：钉钉、飞书、企业微信、自定义 Webhook
 */

// 默认日通告模板（标题由平台 payload 的 title 字段提供，模板中不重复）
const DEFAULT_DAILY_TEMPLATE = `共 {{count}} 个项目：

{{#projects}}
{{index}}. **{{name}}**
⏰ {{startTime}}  📍 {{location}}
导演: {{director}}  摄影: {{photographer}}
制片: {{production}}  类型: {{type}}
{{/projects}}`;

// 默认周通告模板（每天序号独立从1开始）
const DEFAULT_WEEKLY_TEMPLATE = `本周共 {{totalCount}} 个项目：

{{#days}}
📅 **{{date}}** ({{dayCount}}个项目)
{{#projects}}
{{index}}. {{name}} | ⏰{{startTime}} | 📍{{location}} | {{type}}
{{/projects}}
{{/days}}`;

// ── 预设模板库 ──
const TEMPLATE_PRESETS = {
  daily: {
    standard: {
      name: '标准详细版',
      template: DEFAULT_DAILY_TEMPLATE
    },
    card: {
      name: '紧凑卡片版',
      template: `📢 今日通告 | 共 {{count}} 个项目
━━━━━━━━━━━━━━━━━━━━━━
{{#projects}}
🎬 {{index}}. {{name}}
   ⏰{{startTime}} | 📍{{location}} | {{type}}
   👤{{director}} / {{photographer}} / {{production}}
{{/projects}}
━━━━━━━━━━━━━━━━━━━━━━
祝拍摄顺利！🎉`
    },
    full: {
      name: '完整人员版',
      template: `📋 {{date}} 通告单

共 {{count}} 个项目：
{{#projects}}
━━━━━━━━━━━━━━━
{{index}}. **{{name}}**
   ⏰ {{startTime}} | 📍 {{location}} | 🏷️ {{type}}
   🎬 {{director}} | 📷 {{photographer}} | 📋 {{production}}
   👤 运营:{{operational}} | 研发:{{rd}} | 录音:{{audio}} | 商务:{{business}}
{{laodao}}
{{/projects}}

以上，请各位注意查看！`
    },
    minimal: {
      name: '极简版',
      template: `{{date}} | {{count}}个项目
{{#projects}}
{{index}}. {{name}} {{startTime}} {{location}}
{{/projects}}`
    },
    boxed: {
      name: '分类标签版',
      template: `🔔 {{date}} 通告

{{#projects}}
┌─────────────────────────
│ {{index}}. {{name}}
│ ⏰ {{startTime}}  📍 {{location}}
│ 🏷️ {{type}}
│ 👥 {{director}} | {{photographer}} | {{production}}
└─────────────────────────
{{/projects}}

共 {{count}} 个项目，祝一切顺利！✨`
    },
    markdown_table: {
      name: '表格版（钉钉/飞书）',
      template: `## 📋 {{date}} 通告单

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

> 请各组提前做好准备，祝拍摄顺利！🎬`
    },
    urgent: {
      name: '紧急通知版',
      template: `⚠️ 紧急通告 | {{date}}

{{#projects}}
🔴 {{index}}. {{name}}
   时间：{{startTime}}
   场地：{{location}}
   导演：{{director}} | 摄影：{{photographer}}
   制片：{{production}}
{{/projects}}

共 {{count}} 个项目，请各组立即确认！`
    }
  },
  weekly: {
    standard: {
      name: '标准详细版',
      template: DEFAULT_WEEKLY_TEMPLATE
    },
    compact: {
      name: '紧凑日历版',
      template: `📊 周通告 {{weekRange}}
━━━━━━━━━━━━━━━━━━━━━━
本周共 {{totalCount}} 个项目
━━━━━━━━━━━━━━━━━━━━━━
{{#days}}
📅 {{date}} [{{dayCount}}项]
{{#projects}}
  {{index}}. {{name}} ⏰{{startTime}} 📍{{location}}
{{/projects}}
{{/days}}
━━━━━━━━━━━━━━━━━━━━━━`
    },
    full: {
      name: '完整人员版',
      template: `📋 周通告 | {{weekRange}}

本周共 **{{totalCount}}** 个项目

{{#days}}
━━━━━━━━━━━━━━━
📅 **{{date}}** — {{dayCount}} 个项目
━━━━━━━━━━━━━━━
{{#projects}}
{{index}}. **{{name}}**
   ⏰ {{startTime}} | 📍 {{location}} | 🏷️ {{type}}
   🎬 {{director}} | 📷 {{photographer}} | 📋 {{production}}
   👤 运营:{{operational}} | 研发:{{rd}} | 录音:{{audio}} | 商务:{{business}}
{{/projects}}
{{/days}}

━━━━━━━━━━━━━━━
祝各位本周工作顺利！🎉`
    },
    minimal: {
      name: '极简版',
      template: `周通告 {{weekRange}} | 共{{totalCount}}个项目
{{#days}}
{{date}}: {{#projects}}{{name}} {{/projects}}
{{/days}}`
    },
    table: {
      name: '表格版（飞书/企微）',
      template: `## 📊 周通告 {{weekRange}}

> 本周共 **{{totalCount}}** 个项目

{{#days}}
### 📅 {{date}} ({{dayCount}}个项目)

| 序号 | 项目名称 | 时间 | 场地 | 类型 | 导演 | 摄影 |
|------|----------|------|------|------|------|------|
{{#projects}}
| {{index}} | {{name}} | {{startTime}} | {{location}} | {{type}} | {{director}} | {{photographer}} |
{{/projects}}

{{/days}}

> 请各部门提前协调资源，确保项目顺利推进！`
    },
    grouped: {
      name: '每日分组带统计版',
      template: `📈 周通告 | {{weekRange}}

本周统计：共 {{totalCount}} 个项目

{{#days}}
▎{{date}} · {{dayCount}}个项目
{{#projects}}
  {{index}}. {{name}}
     └ {{startTime}} | {{location}} | {{type}}
     └ {{director}} / {{photographer}} / {{production}}
{{/projects}}

{{/days}}

祝大家工作愉快！💪`
    }
  }
};

// 本地日期格式化（避免 toISOString 的 UTC 偏移）
function formatDateLocal(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 平台预设配置
const PLATFORM_PRESETS = {
  dingtalk: {
    name: '钉钉',
    contentType: 'application/json',
    buildPayload: (title, content) => ({
      msgtype: 'markdown',
      markdown: { title, text: content }
    })
  },
  feishu: {
    name: '飞书',
    contentType: 'application/json',
    buildPayload: (title, content) => ({
      msg_type: 'interactive',
      card: {
        header: { title: { tag: 'plain_text', content: title } },
        elements: [{ tag: 'markdown', content }]
      }
    })
  },
  wecom: {
    name: '企业微信',
    contentType: 'application/json',
    buildPayload: (title, content) => ({
      msgtype: 'markdown',
      markdown: { content: `## ${title}\n${content}` }
    })
  },
  custom: {
    name: '自定义',
    contentType: 'application/json',
    buildPayload: (title, content) => ({
      title,
      content,
      timestamp: new Date().toISOString()
    })
  }
};

function createWebhookService(store) {
  /**
   * 渲染模板：将 {{变量}} 和 {{#循环}} 替换为实际数据
   */
  function renderTemplate(template, data) {
    let result = template;

    // 递归替换循环块（支持嵌套）
    function processLoops(text, ctx) {
      return text.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, inner) => {
        const items = ctx[key];
        if (!Array.isArray(items)) return '';
        return items.map((item, index) => {
          let block = inner;
          // 先处理嵌套循环（递归），再替换当前层的 {{index}}
          block = processLoops(block, item);
          block = block.replace(/\{\{index\}\}/g, String(index + 1));
          // 替换简单变量
          block = block.replace(/\{\{(\w+)\}\}/g, (m, k) => {
            return item[k] !== undefined ? String(item[k]) : '';
          });
          return block;
        }).join('');
      });
    }

    // 先处理循环块
    result = processLoops(result, data);

    // 再替换顶层简单变量
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });

    return result.trim();
  }

  /**
   * 格式化日通告数据
   */
  function formatDailyNotice(dateStr, projects) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const d = new Date(dateStr + 'T00:00:00');
    const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

    return {
      date: dateLabel,
      count: projects.length,
      projects: projects.map((p, i) => ({
        index: i + 1,
        name: p.name || '',
        startTime: p.startTime || '未设置',
        location: p.location || '未设置',
        director: p.director || '',
        photographer: p.photographer || '',
        production: p.production || '',
        type: p.type || '-',
        operational: p.operational || '',
        rd: p.rd || '',
        audio: p.audio || '',
        laodao: p.laodao ? '🔥 老刀出镜' : '',
        directorLine: p.director ? `导演: ${p.director}` : '',
        photographerLine: p.photographer ? `摄影: ${p.photographer}` : '',
        productionLine: p.production ? `制片: ${p.production}` : '',
        operationalLine: p.operational ? `运营: ${p.operational}` : '',
        rdLine: p.rd ? `研发: ${p.rd}` : '',
        audioLine: p.audio ? `录音: ${p.audio}` : '',
        business: p.business || '',
        businessLine: p.business ? `商务: ${p.business}` : ''
      }))
    };
  }

  /**
   * 格式化周通告数据
   */
  function formatWeeklyNotice(startDate, endDate, scheduleData) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = [];
    let totalCount = 0;

    const endDateStr = String(endDate);
    const d = new Date(String(startDate) + 'T00:00:00');
    while (formatDateLocal(d) <= endDateStr) {
      const dateStr = formatDateLocal(d);
      const projects = scheduleData[dateStr] || [];
      if (projects.length > 0) {
        totalCount += projects.length;
        days.push({
          date: `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`,
          dayCount: projects.length,
          projects: projects.map((p, i) => ({
            index: i + 1,
            name: p.name || '',
            startTime: p.startTime || '未设置',
            location: p.location || '未设置',
            type: p.type || '-',
            director: p.director || '-',
            photographer: p.photographer || '-',
            production: p.production || '-',
            operational: p.operational || '-',
            rd: p.rd || '-',
            audio: p.audio || '-',
            business: p.business || '-'
          }))
        });
      }
      d.setDate(d.getDate() + 1);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weekRange = `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;

    return { weekRange, totalCount, days };
  }

  /**
   * 发送 HTTP 请求
   */
  function sendRequest(url, payload, contentType) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;
      const body = JSON.stringify(payload);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': contentType || 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 10000
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode, body: data });
          } else {
            resolve({ success: false, statusCode: res.statusCode, body: data });
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`请求失败: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时（10秒）'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 测试 webhook 连通性
   */
  async function testWebhook(webhookUrl, platform) {
    const preset = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.custom;
    const payload = preset.buildPayload(
      '🔗 Webhook 连通性测试',
      '这是一条来自罐头场通告排期系统的测试消息。\n\n如果你看到了这条消息，说明 Webhook 配置成功！✅'
    );
    return sendRequest(webhookUrl, payload, preset.contentType);
  }

  /**
   * 推送日通告
   */
  async function pushDailyNotice(webhookUrl, platform, dateStr, projects, template) {
    const preset = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.custom;
    const data = formatDailyNotice(dateStr, projects);
    const tpl = template || DEFAULT_DAILY_TEMPLATE;
    const content = renderTemplate(tpl, data);
    const title = `${data.date} 通告单`;
    const payload = preset.buildPayload(title, content);
    return sendRequest(webhookUrl, payload, preset.contentType);
  }

  /**
   * 推送周通告
   */
  async function pushWeeklyNotice(webhookUrl, platform, startDate, endDate, scheduleData, template) {
    const preset = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.custom;
    const data = formatWeeklyNotice(startDate, endDate, scheduleData);
    const tpl = template || DEFAULT_WEEKLY_TEMPLATE;
    const content = renderTemplate(tpl, data);
    const title = `${data.weekRange} 周通告`;
    const payload = preset.buildPayload(title, content);
    return sendRequest(webhookUrl, payload, preset.contentType);
  }

  return {
    testWebhook,
    pushDailyNotice,
    pushWeeklyNotice,
    renderTemplate,
    formatDailyNotice,
    formatWeeklyNotice,
    PLATFORM_PRESETS,
    TEMPLATE_PRESETS,
    DEFAULT_DAILY_TEMPLATE,
    DEFAULT_WEEKLY_TEMPLATE
  };
}

module.exports = { createWebhookService };
