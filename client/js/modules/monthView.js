/**
 * 月视图模块 — 日历式展示
 * 显示当月每天的项目条，支持点击查看、点击日期跳转
 * 配色沿用周视图卡片颜色
 */

import { escapeHtml, escapeAttr, formatDate, getMonday } from './utils.js';

export function createMonthViewModule({ api, onJumpToWeek }) {
  let currentDate = new Date();
  let cachedData = {};
  let displayMode = 'project';

  const ROLE_LABELS = {
    director: '导演', photographer: '摄影', production: '制片',
    rd: '研发', operational: '运营', audio: '录音', business: '商务'
  };

  const ROLE_COLORS = {
    director: '#3B82F6', photographer: '#10B981', production: '#F59E0B',
    rd: '#8B5CF6', operational: '#EC4899', audio: '#06B6D4', business: '#F97316'
  };

  const TYPE_COLORS = {
    '平面': { bg: '#10B981', color: '#fff' },
    '视频': { bg: '#EC4899', color: '#fff' },
    '直播': { bg: '#F59E0B', color: '#fff' },
    '试做': { bg: '#8B5CF6', color: '#fff' },
  };
  const STATUS_COLORS = {
    '待确认': '#F59E0B',
    '已确认': '#10B981',
    '已完成': '#3B82F6',
    '取消': '#EF4444',
  };

  function init() {
    const prevBtn = document.getElementById('month-prev');
    const nextBtn = document.getElementById('month-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); });
  }

  async function render() {
    const container = document.getElementById('month-view-grid');
    if (!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = formatDate(firstDay);
    const endDate = formatDate(lastDay);

    const title = document.getElementById('month-view-title');
    if (title) title.textContent = `${year}年${month + 1}月`;

    try {
      const response = await api.fetchSchedules(startDate, endDate);
      cachedData = {};
      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          response.forEach(item => { cachedData[item.date] = item.projects || []; });
        } else {
          Object.keys(response).forEach(date => {
            cachedData[date] = Array.isArray(response[date]) ? response[date] : [];
          });
        }
      }
    } catch (e) {
      console.error('[monthview] 获取数据失败:', e);
    }

    const firstDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = formatDate(new Date());

    let html = '<div class="month-gantt">';

    html += '<div class="month-header">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
      html += `<div class="month-header-cell">${d}</div>`;
    });
    html += '</div>';

    html += '<div class="month-grid">';
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += '<div class="month-cell empty"></div>';
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const projects = cachedData[dateStr] || [];
      const isToday = dateStr === today;
      const dayOfWeek = new Date(year, month, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      html += `<div class="month-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" data-date="${dateStr}">`;
      html += `<div class="month-cell-header">`;
      html += `<span class="month-day-number">${day}</span>`;
      if (projects.length > 0) {
        html += `<span class="month-project-count">${projects.length}</span>`;
      }
      html += `</div>`;

      if (projects.length > 0) {
        html += '<div class="month-gantt-bars">';
        if (displayMode === 'personnel') {
          const personSet = new Set();
          projects.forEach(proj => {
            ['director','photographer','production','rd','operational','audio','business'].forEach(k => {
              if (proj[k]) proj[k].split(/、|，|,|\//).forEach(name => personSet.add(`${name}|${k}`));
            });
          });
          [...personSet].slice(0, 6).forEach(key => {
            const [name, role] = key.split('|');
            const c = ROLE_COLORS[role] || '#999';
            const label = ROLE_LABELS[role] || role;
            html += `<div class="month-gantt-bar" style="background:${c};color:#fff;" title="${escapeAttr(name)} (${label})">`;
            html += `<span class="gantt-bar-name">${escapeHtml(name)}</span>`;
            html += `<span style="font-size:9px;opacity:0.8;">${label}</span>`;
            html += `</div>`;
          });
          if (personSet.size > 6) {
            html += `<div class="month-gantt-more">+${personSet.size - 6} 人</div>`;
          }
        } else {
        projects.slice(0, 6).forEach(proj => {
          const tc = TYPE_COLORS[proj.type] || { bg: '#10B981', color: '#fff' };
          const statusDot = STATUS_COLORS[proj.status] || STATUS_COLORS['待确认'];
          const persons = [proj.director, proj.photographer].filter(Boolean).join('/');
          html += `<div class="month-gantt-bar" style="background:${tc.bg};color:${tc.color}" title="${escapeAttr(proj.name)}">`;
          html += `<span class="gantt-bar-name">${escapeHtml(proj.name)}</span>`;
          html += `</div>`;
        });
        if (projects.length > 6) {
          html += `<div class="month-gantt-more">+${projects.length - 6} 个</div>`;
        }
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.month-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        if (onJumpToWeek) onJumpToWeek(cell.dataset.date);
      });
    });
  }

  function setDisplayMode(mode) {
    displayMode = mode;
    render();
  }

  return { init, render, setDisplayMode };
}
