/**
 * 操作历史面板模块
 * 可视化展示操作历史，支持撤销指定操作
 */

import { escapeHtml, formatDate } from './utils.js';

/**
 * 创建操作历史面板模块
 */
export function createHistoryPanelModule({ apiClient, onUndone }) {
  function init() {
    const btn = document.getElementById('history-btn');
    if (btn) btn.addEventListener('click', togglePanel);
  }

  function togglePanel() {
    let panel = document.getElementById('history-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'history-panel';
      panel.className = 'slide-panel';
      panel.innerHTML = `
        <div class="slide-panel-header">
          <h3>📜 操作历史</h3>
          <button class="slide-panel-close" id="history-panel-close">✕</button>
        </div>
        <div id="history-list" class="slide-panel-body"></div>
      `;
      document.body.appendChild(panel);
      document.getElementById('history-panel-close').addEventListener('click', () => panel.classList.remove('open'));
    }

    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
    } else {
      panel.classList.add('open');
      loadHistory();
    }
  }

  async function loadHistory() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    try {
      const response = await apiClient.get('/history');
      const history = Array.isArray(response) ? response : (response.history || []);

      if (history.length === 0) {
        listEl.innerHTML = '<p style="color:#999;padding:16px;font-size:13px">暂无操作历史</p>';
        return;
      }

      // 按日期分组
      const groups = {};
      const today = formatDate(new Date());
      const yesterday = formatDate(new Date(Date.now() - 86400000));

      history.forEach(item => {
        const date = item.ts ? item.ts.split('T')[0] : '未知';
        const label = date === today ? '今天' : date === yesterday ? '昨天' : date;
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
      });

      let html = '';
      Object.entries(groups).forEach(([label, items]) => {
        html += `<div class="history-group"><div class="history-group-label">${escapeHtml(label)}</div>`;
        items.forEach(item => {
          const icon = getActionIcon(item.action);
          const desc = getActionDesc(item);
          const time = item.ts ? new Date(item.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
          const isLatest = item === history[0];

          html += `
            <div class="history-item ${isLatest ? 'latest' : ''}">
              <span class="history-icon">${icon}</span>
              <div class="history-content">
                <div class="history-desc">${escapeHtml(desc)}</div>
                <div class="history-time">${time}</div>
                ${item.detail ? `<div class="history-detail">${escapeHtml(item.detail)}</div>` : ''}
              </div>
              ${isLatest ? `<button class="btn icon-btn history-undo-btn" data-id="${item.id}">撤销</button>` : ''}
            </div>
          `;
        });
        html += '</div>';
      });

      listEl.innerHTML = html;

      // 绑定撤销按钮
      listEl.querySelectorAll('.history-undo-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            if (onUndone) await onUndone();
            loadHistory();
          } catch (e) {
            console.error('[history] 撤销失败:', e);
          }
        });
      });
    } catch (e) {
      console.error('[history] 加载历史失败:', e);
      listEl.innerHTML = '<p style="color:#ef4444;padding:16px;font-size:13px">加载失败</p>';
    }
  }

  function getActionIcon(action) {
    const icons = { create: '➕', update: '✏️', delete: '🗑', move: '🔄', reorder: '↕️' };
    return icons[action] || '●';
  }

  function getActionDesc(item) {
    const actionNames = { create: '新增', update: '编辑', delete: '删除', move: '移动', reorder: '排序' };
    const actionName = actionNames[item.action] || item.action;
    const detail = item.detail || item.date || '';
    return `${actionName}${detail ? ' ' + detail : ''}`;
  }

  return { init, togglePanel };
}
