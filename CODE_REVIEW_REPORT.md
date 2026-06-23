# 代码审查报告 - Scheduling-Tool-Docker

## 审查时间
2026年6月23日

## 审查范围
- 客户端代码：`client/js/main.js`, `client/js/modules/*.js`
- 服务端代码：`server/server.js`, `server/app.js`, `server/routes/*.js`, `server/services/*.js`

---

## 🔴 严重问题（Critical）

### 1. 客户端未验证 API 响应内容类型可能导致 JSON 解析错误
**位置**: `client/js/modules/api.js:49-50`
```javascript
const responseType = response.headers.get('content-type') || '';
if (responseType.includes('application/json')) {
    return response.json();
}
```
**问题**: 如果服务端返回 `content-type: application/json` 但响应体为空或非 JSON，会导致未捕获的异常。
**影响**: 客户端崩溃，用户体验受损
**修复建议**:
```javascript
if (responseType.includes('application/json')) {
    try {
        return response.json();
    } catch (error) {
        throw new Error('响应格式错误：无法解析 JSON');
    }
}
```

### 2. SSE 连接断开后无限重连可能导致 DoS
**位置**: `client/js/main.js:662-711`
```javascript
eventSource.onerror = function(err) {
    console.error('SSE连接错误:', err);
    eventSource.close();
    setTimeout(() => {
        showToast('实时同步断开，正在重新连接…', 'warning', 5000);
        connectSSE();
    }, 5000);
};
```
**问题**: 
- 无重连次数限制，服务器故障时会导致客户端无限重连
- 无指数退避策略，可能加重服务器负担
**影响**: 可能对服务器造成 DoS 攻击，消耗客户端资源
**修复建议**:
```javascript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 5000;

eventSource.onerror = function(err) {
    console.error('SSE连接错误:', err);
    eventSource.close();
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        showToast('连接失败次数过多，请刷新页面', 'error');
        return;
    }
    
    const delay = BASE_DELAY * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;
    
    setTimeout(() => {
        showToast(`正在重新连接（第${reconnectAttempts}次）...`, 'warning', 5000);
        connectSSE();
    }, delay);
};
```

### 3. SQL 注入风险（虽然使用了参数化查询，但历史记录查询存在潜在风险）
**位置**: `server/services/sqliteStore.js:224-227`
```javascript
const todayCount = getDb().prepare(
    "SELECT COUNT(*) as c FROM history WHERE ts LIKE ?"
).get(todayStr + '%').c;
```
**问题**: 使用 `LIKE` 搜索时，如果 `todayStr` 来源不可信，可能存在 SQL 通配符注入
**影响**: 数据泄露风险
**修复建议**: 虽然 `todayStr` 来自 `new Date().toISOString().slice(0, 10)`，看似安全，但建议添加格式验证：
```javascript
if (!/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
    throw new Error('Invalid date format');
}
```

### 4. 备份恢复操作无事务保护
**位置**: `server/services/backupService.js:104-123`
```javascript
async function restoreBackup(backupPath) {
    // ... 
    await store.writeSettings(payload.settings);
    await store.writeSchedules(payload.schedules);
    await store.writeVersion(payload.version);
}
```
**问题**: 三个写入操作不在同一事务中，如果中间某个操作失败，会导致数据不一致
**影响**: 数据完整性受损
**修复建议**: 使用 SQLite 事务包装：
```javascript
const db = getDb();
const transaction = db.transaction(() => {
    store.writeSettings(payload.settings);
    store.writeSchedules(payload.schedules);
    store.writeVersion(payload.version);
});
transaction();
```

---

## 🟠 高危问题（High）

### 5. 密码哈希算法成本因子可能不足
**位置**: `server/utils/normalize.js:132-134`
```javascript
function hashPassword(password) {
    return bcrypt.hashSync(String(password), 10);
}
```
**问题**: bcrypt 成本因子为 10，对于现代硬件来说可能偏低
**影响**: 密码破解风险
**修复建议**: 提高到 12 或更高：
```javascript
function hashPassword(password) {
    return bcrypt.hashSync(String(password), 12);
}
```

### 6. 未设置 SSE 连接超时，可能导致僵尸连接累积
**位置**: `server/app.js:93-112`
```javascript
app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    // ... 无连接总时长限制
});
```
**问题**: 没有设置连接最大存活时间，长时间未活动的连接会累积
**影响**: 内存泄漏，服务器资源耗尽
**修复建议**:
```javascript
const connectionTimeout = setTimeout(() => {
    res.end();
    connectedClients = connectedClients.filter((client) => client !== res);
}, 3600000); // 1小时超时

req.on('close', () => {
    clearTimeout(connectionTimeout);
    clearInterval(heartbeat);
    connectedClients = connectedClients.filter((client) => client !== res);
});
```

### 7. 大量数据时未分页，可能导致内存溢出
**位置**: `server/routes/schedules.js:8-22`
```javascript
router.get('/', (req, res) => {
    const schedules = store.readSchedules();
    // ... 返回所有数据
});
```
**问题**: 没有分页限制，当排期数据非常多时会一次性返回所有数据
**影响**: 内存溢出，响应缓慢
**修复建议**: 添加分页支持：
```javascript
router.get('/', (req, res) => {
    const { startDate, endDate, limit = 1000, offset = 0 } = req.query;
    // ... 添加 LIMIT 和 OFFSET
});
```

### 8. CORS 配置过于宽松
**位置**: `server/app.js:43`
```javascript
app.use(cors());
```
**问题**: 允许所有域名访问，存在 CSRF 风险
**影响**: 跨站请求伪造攻击
**修复建议**:
```javascript
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
```

### 9. 文件上传大小限制可能不足
**位置**: `server/app.js:44`
```javascript
app.use(express.json({ limit: '1mb' }));
```
**问题**: 1MB 限制对于备份文件可能不够，但也要防止超大文件攻击
**影响**: 功能受限或 DoS 攻击
**修复建议**: 根据实际需求调整，并添加验证：
```javascript
app.use(express.json({ 
    limit: '5mb',
    verify: (req, res, buf, encoding) => {
        if (buf.length > 5 * 1024 * 1024) {
            throw new Error('数据过大');
        }
    }
}));
```

---

## 🟡 中危问题（Medium）

### 10. 错误信息泄露敏感信息
**位置**: `server/app.js:143-147`
```javascript
app.use((error, req, res, next) => {
    console.error(error);
    const statusCode = error && error.message && /无效/.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ message: error.message || '服务器错误' });
});
```
**问题**: 直接返回 `error.message` 可能泄露内部实现细节
**影响**: 信息泄露
**修复建议**:
```javascript
app.use((error, req, res, next) => {
    console.error(error);
    const statusCode = error && error.message && /无效/.test(error.message) ? 400 : 500;
    const message = statusCode === 400 ? error.message : '服务器内部错误';
    res.status(statusCode).json({ message });
});
```

### 11. 未清理过期的 WAL 文件
**位置**: `server/services/sqliteStore.js:185`
```javascript
try { getDb().pragma('wal_checkpoint(PASSIVE)'); } catch (_) {}
```
**问题**: 使用 PASSIVE 模式可能无法及时清理 WAL 文件
**影响**: 磁盘空间占用增长
**修复建议**: 定期执行 TRUNCATE 模式：
```javascript
// 每小时执行一次 TRUNCATE
setInterval(() => {
    try { 
        getDb().pragma('wal_checkpoint(TRUNCATE)'); 
    } catch (err) {
        console.error('WAL checkpoint failed:', err);
    }
}, 3600000);
```

### 12. 缺少输入验证 - 项目名称长度
**位置**: `client/js/main.js:1465-1468`
```javascript
if (!project.name) {
    showToast('请输入项目名称', 'warning');
    return;
}
```
**问题**: 只检查是否为空，未检查最大长度
**影响**: 可能导致 UI 布局问题或数据库性能问题
**修复建议**:
```javascript
if (!project.name) {
    showToast('请输入项目名称', 'warning');
    return;
}
if (project.name.length > 120) {
    showToast('项目名称过长（最多120字符）', 'warning');
    return;
}
```

### 13. 日期验证不完整
**位置**: `server/utils/normalize.js:42-44`
```javascript
function isValidDateString(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
```
**问题**: 只验证格式，不验证日期合法性（如 2024-02-30）
**影响**: 可能接受无效日期
**修复建议**:
```javascript
function isValidDateString(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const date = new Date(value + 'T00:00:00');
    return !isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
```

### 14. 竞态条件 - 并发保存同一日期
**位置**: `server/routes/schedules.js:24-47`
```javascript
router.post('/', requireEditAccess, (req, res) => {
    const existing = store.readScheduleByDate(date);
    // ... 可能在读取和写入之间被其他请求修改
    store.writeScheduleDate(date, existing ? existing.id : generateId('schedule'), normalizedProjects);
});
```
**问题**: 没有锁机制，并发请求可能导致数据丢失
**影响**: 数据完整性问题
**修复建议**: 使用数据库事务或乐观锁

### 15. 未设置请求超时
**位置**: `client/js/modules/api.js:30-33`
```javascript
const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
});
```
**问题**: 没有设置请求超时，可能导致请求永久挂起
**影响**: 用户体验差，资源泄漏
**修复建议**:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal
    });
    clearTimeout(timeoutId);
    // ...
} catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
        throw new Error('请求超时');
    }
    throw error;
}
```

---

## 🔵 低危问题（Low）

### 16. console.error 在生产环境中暴露日志
**位置**: 多处使用 `console.error`
**问题**: 生产环境不应直接暴露详细错误日志
**影响**: 信息泄露
**修复建议**: 使用日志库（如 winston）并配置日志级别

### 17. 硬编码的魔法数字
**位置**: `server/services/sqliteStore.js:219`
```javascript
if (todayCount >= 20) {
```
**问题**: 硬编码限制不易维护
**修复建议**: 提取为配置常量：
```javascript
const MAX_DAILY_HISTORY_RECORDS = 20;
```

### 18. 未使用的变量
**位置**: `client/js/main.js:118`
```javascript
let selectedDate = null;
let currentDate = new Date(); // currentDate 未使用
```
**问题**: 代码冗余
**修复建议**: 删除未使用的变量

### 19. 缺少 JSDoc 注释
**位置**: 多处函数缺少注释
**问题**: 代码可维护性差
**修复建议**: 添加 JSDoc 注释，说明参数、返回值和功能

### 20. 魔法字符串
**位置**: `client/js/main.js:809-816`
```javascript
const typeClassMap = {
    '平面': 'plane',
    '视频': 'video',
    '直播': 'live',
    '试做': 'test'
};
```
**问题**: 硬编码类型映射
**修复建议**: 从配置文件或 API 加载

---

## ⚪ 代码质量问题（Code Quality）

### 21. 函数过长
**位置**: `client/js/main.js:2993-3224` (`drawScheduleToCanvas` 函数 231 行)
**问题**: 单个函数超过 200 行，难以维护
**修复建议**: 拆分为多个小函数

### 22. 重复代码
**位置**: 
- `client/js/main.js:1537-1601` 和 `1603-1677` (备份列表渲染)
**问题**: 两个函数几乎完全相同
**修复建议**: 提取公共逻辑

### 23. 深层嵌套
**位置**: `client/js/main.js:2993-3224` (多层嵌套)
**问题**: 嵌套超过 4 层，可读性差
**修复建议**: 提前返回，减少嵌套

### 24. 命名不一致
**位置**: 
- `laodao` vs `isAdvertiser` (一个用拼音，一个用英文)
**问题**: 命名风格不统一
**修复建议**: 统一使用英文或中文拼音

### 25. 未捕获的 Promise rejection
**位置**: 多处 async 函数调用未 catch
**问题**: 可能导致未处理的 rejection
**修复建议**: 添加 `.catch()` 或在 async 函数中 try-catch

---

## 🟢 性能问题（Performance）

### 26. 频繁的 DOM 操作
**位置**: `client/js/main.js:721-796` (`renderSchedule` 函数)
```javascript
column.innerHTML = '';
// ... 多次 appendChild
```
**问题**: 每次渲染都清空并重建 DOM
**影响**: 性能下降，尤其是数据量大时
**修复建议**: 使用虚拟 DOM 或 DocumentFragment

### 27. 未节流的搜索输入
**位置**: `client/js/main.js:1018`
```javascript
searchProjectsInput.addEventListener('input', updateFilterState);
```
**问题**: 每次按键都触发渲染
**影响**: 性能问题
**修复建议**: 添加防抖：
```javascript
let debounceTimer;
searchProjectsInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateFilterState, 300);
});
```

### 28. 大数组操作未优化
**位置**: `client/js/main.js:3009-3014`
```javascript
const allDates = [];
const d = new Date(startDate);
while (d <= endDate) {
    allDates.push(new Date(d));
    d.setDate(d.getDate() + 1);
}
```
**问题**: 可能生成大量日期对象
**影响**: 内存占用高
**修复建议**: 按需生成，不提前创建数组

### 29. 同步文件操作
**位置**: `server/services/sqliteStore.js:116-118`
```javascript
const schedulesExist = fsNative.existsSync(jsonSchedules);
const settingsExist = fsNative.existsSync(jsonSettings);
```
**问题**: 同步操作阻塞事件循环
**影响**: 服务器响应延迟
**修复建议**: 使用异步版本 `fs.promises.access()`

---

## 🛡️ 安全问题总结

### 30. 缺少 CSRF 保护
**问题**: 没有 CSRF token 验证
**修复建议**: 实现 CSRF token 机制或使用 SameSite cookies

### 31. 缺少请求频率限制细化
**位置**: `server/app.js:19-33`
**问题**: 只有密码和备份接口有限流，其他接口没有
**修复建议**: 为所有 API 添加适当的限流

### 32. 敏感操作无二次确认
**位置**: 备份恢复、清空历史等操作
**问题**: 服务端没有二次确认机制
**修复建议**: 添加确认 token 机制

---

## 📊 统计摘要

| 严重程度 | 数量 |
|---------|------|
| 🔴 严重 | 4 |
| 🟠 高危 | 5 |
| 🟡 中危 | 6 |
| 🔵 低危 | 5 |
| ⚪ 代码质量 | 5 |
| 🟢 性能 | 4 |
| 🛡️ 安全 | 3 |
| **总计** | **32** |

---

## ✅ 优点

1. **良好的代码结构**: 前后端分离清晰，模块化设计
2. **参数化查询**: 使用了 better-sqlite3 的参数化查询，防止 SQL 注入
3. **数据验证**: 有基本的输入验证和规范化函数
4. **错误处理**: 使用了 asyncHandler 中间件统一处理异步错误
5. **密码加密**: 使用 bcrypt 存储密码哈希
6. **XSS 防护**: 客户端使用了 `escapeHtml` 函数转义输出
7. **备份机制**: 实现了完整的备份和恢复功能
8. **WAL 模式**: SQLite 使用 WAL 模式提高并发性能

---

## 🎯 优先修复建议

### 立即修复（本周内）
1. ✅ SSE 无限重连问题（#2）
2. ✅ 备份恢复事务保护（#4）
3. ✅ CORS 配置过于宽松（#8）
4. ✅ SSE 连接超时问题（#6）

### 短期修复（2周内）
5. ✅ API 响应验证（#1）
6. ✅ 密码哈希成本因子（#5）
7. ✅ 数据分页支持（#7）
8. ✅ 请求超时设置（#15）
9. ✅ 日期验证完善（#13）

### 中期优化（1个月内）
10. ✅ 错误信息处理（#10）
11. ✅ 搜索防抖（#27）
12. ✅ 竞态条件处理（#14）
13. ✅ 代码重构（#21-23）

---

## 📝 建议的测试用例

1. **并发测试**: 测试同时保存同一日期的排期
2. **边界测试**: 测试超长输入、特殊字符、无效日期
3. **压力测试**: 测试大量数据、高并发请求
4. **安全测试**: XSS、SQL注入、CSRF、权限绕过
5. **恢复测试**: 测试备份恢复的完整性和一致性

---

## 结论

该项目整体代码质量良好，有基本的安全措施，但存在一些需要改进的问题。建议按优先级逐步修复，特别关注 SSE 重连、事务保护和 CORS 配置等严重问题。
