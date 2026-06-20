/**
 * 快速创建模块
 * 一行输入多个关键词，自动解析为项目字段
 */

/**
 * 创建快速创建模块
 */
export function createQuickAddModule({ apiClient, onCreated }) {
  const HISTORY_KEY = 'quickAddHistory';
  const MAX_HISTORY = 10;

  let knownLocations = [];
  let knownDirectors = [];
  let knownPhotographers = [];
  let knownProduction = [];
  let knownRd = [];
  let knownAudio = [];
  let knownOperational = [];
  let knownBusiness = [];
  const typeKeywords = ['视频', '平面', '试做', '外拍', '直播'];

  /**
   * 初始化
   */
  function init() {
    const btn = document.getElementById('quick-add-btn');
    if (btn) btn.addEventListener('click', showPanel);

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hidePanel();
    });
  }

  /**
   * 更新已知列表（从设置中加载）
   */
  function updateKnownLists(settings) {
    if (!settings) return;
    knownLocations = settings.commonLocations || [];
    knownDirectors = settings.commonDirectors || [];
    knownPhotographers = settings.commonPhotographers || [];
    knownProduction = settings.commonProductionFacilities || [];
    knownRd = settings.commonRdFacilities || [];
    knownAudio = settings.commonAudioFacilities || [];
    knownOperational = settings.commonOperationalFacilities || [];
    knownBusiness = settings.commonBusinessFacilities || [];
  }

  function showPanel() {
    let panel = document.getElementById('quick-add-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'quick-add-panel';
      panel.className = 'modal';
      panel.innerHTML = buildPanelHTML();
      document.body.appendChild(panel);

      // 绑定事件
      panel.querySelector('.close').addEventListener('click', hidePanel);
      panel.querySelector('#quick-add-input').addEventListener('input', debounce(onInput, 200));
      panel.querySelector('#quick-add-parse-btn').addEventListener('click', onInput);
      panel.querySelector('#quick-add-confirm-btn').addEventListener('click', onConfirm);
      panel.querySelector('#quick-add-clear-btn').addEventListener('click', () => {
        panel.querySelector('#quick-add-input').value = '';
        panel.querySelector('#quick-add-preview').innerHTML = '';
      });
      panel.addEventListener('click', (e) => { if (e.target === panel) hidePanel(); });
    }

    panel.style.display = 'flex';
    renderHistory();
    setTimeout(() => panel.querySelector('#quick-add-input')?.focus(), 100);
  }

  function hidePanel() {
    const panel = document.getElementById('quick-add-panel');
    if (panel) panel.style.display = 'none';
  }

  function onInput() {
    const panel = document.getElementById('quick-add-panel');
    if (!panel) return;
    const text = panel.querySelector('#quick-add-input').value.trim();
    if (!text) {
      panel.querySelector('#quick-add-preview').innerHTML = '<p style="color:#999;font-size:13px">输入项目信息，空格分隔，点击"解析"</p>';
      return;
    }
    const result = parseInput(text);
    renderPreview(result);
  }

  /**
   * 解析输入文本
   */
  function parseInput(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const result = {
      name: '',
      location: '',
      director: '',
      photographer: '',
      production: '',
      rd: '',
      audio: '',
      operational: '',
      business: '',
      type: '',
      date: formatDate(new Date()),
      startTime: '09:00'
    };

    const unmatched = [];

    words.forEach(word => {
      // 匹配类型
      if (typeKeywords.includes(word)) {
        result.type = word;
        return;
      }
      // 匹配场地
      if (matchList(word, knownLocations)) {
        result.location = word;
        return;
      }
      // 匹配导演
      if (matchList(word, knownDirectors)) {
        result.director = word;
        return;
      }
      // 匹配摄影
      if (matchList(word, knownPhotographers)) {
        result.photographer = word;
        return;
      }
      // 匹配制片
      if (matchList(word, knownProduction)) {
        result.production = word;
        return;
      }
      // 匹配录音
      if (matchList(word, knownAudio)) {
        result.audio = word;
        return;
      }
      // 匹配时间格式
      if (/^\d{1,2}:\d{2}$/.test(word)) {
        result.startTime = word;
        return;
      }
      // 匹配日期格式
      if (/^\d{4}-\d{2}-\d{2}$/.test(word)) {
        result.date = word;
        return;
      }
      unmatched.push(word);
    });

    // 未匹配的词拼接为项目名称
    result.name = unmatched.join(' ') || '未命名项目';
    return result;
  }

  function matchList(word, list) {
    return list.some(item => item === word || item.includes(word) || word.includes(item));
  }

  function renderPreview(result) {
    const panel = document.getElementById('quick-add-panel');
    if (!panel) return;

    const fields = [
      { label: '项目名称', value: result.name, matched: true },
      { label: '场地', value: result.location, matched: !!result.location },
      { label: '导演', value: result.director, matched: !!result.director },
      { label: '摄影师', value: result.photographer, matched: !!result.photographer },
      { label: '类型', value: result.type, matched: !!result.type },
      { label: '日期', value: result.date, matched: true },
      { label: '时间', value: result.startTime, matched: true }
    ];

    panel.querySelector('#quick-add-preview').innerHTML = `
      <div style="margin:8px 0">
        ${fields.map(f => `
          <div style="display:flex;gap:8px;margin:4px 0;font-size:13px">
            <span style="min-width:70px;color:#666">${f.label}:</span>
            <span style="font-weight:500">${escapeHtml(f.value || '-')}</span>
            <span style="color:${f.matched ? '#10B981' : '#999'}">${f.matched ? '✓' : '-'}</span>
          </div>
        `).join('')}
      </div>
    `;

    // 保存解析结果到面板数据
    panel._parsedResult = result;
  }

  async function onConfirm() {
    const panel = document.getElementById('quick-add-panel');
    if (!panel || !panel._parsedResult) return;

    const result = panel._parsedResult;
    try {
      await apiClient.post('/schedules', {
        date: result.date,
        projects: [{
          name: result.name,
          location: result.location,
          director: result.director,
          photographer: result.photographer,
          production: result.production,
          rd: result.rd,
          audio: result.audio,
          operational: result.operational,
          business: result.business,
          type: result.type,
          startTime: result.startTime,
          status: '待确认'
        }]
      });

      saveHistory(result);
      hidePanel();
      if (onCreated) onCreated();
    } catch (e) {
      console.error('[quickadd] 创建失败:', e);
    }
  }

  function saveHistory(result) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const entry = {
        location: result.location,
        director: result.director,
        photographer: result.photographer,
        type: result.type,
        timestamp: Date.now()
      };
      // 去重
      const key = `${entry.location}|${entry.director}|${entry.photographer}|${entry.type}`;
      const filtered = history.filter(h => {
        const k = `${h.location}|${h.director}|${h.photographer}|${h.type}`;
        return k !== key;
      });
      filtered.unshift(entry);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
    } catch (e) { /* ignore */ }
  }

  function renderHistory() {
    const panel = document.getElementById('quick-add-panel');
    if (!panel) return;

    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const el = panel.querySelector('#quick-add-history');
      if (!el) return;

      if (history.length === 0) {
        el.innerHTML = '<p style="color:#999;font-size:12px">暂无历史记录</p>';
        return;
      }

      el.innerHTML = history.slice(0, 5).map(h => {
        const parts = [h.location, h.director, h.type, h.photographer].filter(Boolean);
        return `<div class="quick-add-history-item" data='${JSON.stringify(h)}' style="cursor:pointer;padding:4px 8px;margin:2px 0;background:#f8f9fa;border-radius:4px;font-size:12px">
          📌 ${parts.join(' · ')}
        </div>`;
      }).join('');

      el.querySelectorAll('.quick-add-history-item').forEach(item => {
        item.addEventListener('click', () => {
          const data = JSON.parse(item.dataset.attr || '{}');
          const input = panel.querySelector('#quick-add-input');
          const parts = [data.location, data.director, data.photographer, data.type].filter(Boolean);
          input.value = parts.join(' ');
          onInput();
        });
      });
    } catch (e) { /* ignore */ }
  }

  function buildPanelHTML() {
    return `
      <div class="modal-content" style="max-width:500px">
        <span class="close">&times;</span>
        <h2>⚡ 快速创建</h2>
        <div style="margin:12px 0">
          <input id="quick-add-input" class="toolbar-input" type="text" placeholder="输入项目信息，空格分隔（如：项目X 棚A 张导 视频）" style="width:100%;padding:8px;font-size:14px">
          <div style="display:flex;gap:8px;margin-top:8px">
            <button id="quick-add-parse-btn" class="btn secondary" style="font-size:13px">解析</button>
            <button id="quick-add-clear-btn" class="btn secondary" style="font-size:13px">清空</button>
          </div>
        </div>
        <div id="quick-add-preview" style="min-height:60px;border:1px solid #e0e0e0;border-radius:6px;padding:8px;margin:8px 0"></div>
        <div id="quick-add-history" style="margin:8px 0"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button id="quick-add-confirm-btn" class="btn primary">✓ 确认创建</button>
          <button class="btn secondary" onclick="document.getElementById('quick-add-panel').style.display='none'">取消</button>
        </div>
      </div>
    `;
  }

  return { init, updateKnownLists };
}

// ── 工具函数 ──

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
