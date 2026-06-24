/**
 * 人员排期视图模块
 * 以人员为行、日期为列的矩阵，显示每个人的排期
 * 显示设置中所有人员（含无排期的），按 roleCategories 顺序排列
 */

import { escapeHtml, escapeAttr, formatDate } from './utils.js';

const ROLE_COLORS = {
  director: '#3B82F6',
  photographer: '#10B981',
  production: '#F59E0B',
  rd: '#8B5CF6',
  operational: '#EC4899',
  audio: '#06B6D4',
  business: '#F97316',
  location: '#794f27'
};

export function createPersonnelViewModule({ api, onJumpToWeek }) {
  let currentDate = new Date();
  let cachedData = {};

  function init() {
    const prevBtn = document.getElementById('personnel-prev');
    const nextBtn = document.getElementById('personnel-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); });
    const toggleScheduled = document.getElementById('personnel-scheduled-only');
    if (toggleScheduled) toggleScheduled.addEventListener('change', () => render());
  }

  async function render() {
    const container = document.getElementById('personnel-view-table');
    if (!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let d = 1; d <= lastDay; d++) {
      dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }

    const endDate = dates[dates.length - 1];

    const title = document.getElementById('personnel-view-title');
    if (title) {
      title.textContent = `${year}年${month + 1}月 人员排期`;
    }

    let settings = null;
    try {
      settings = await api.getSettings();
    } catch (e) {
      console.error('[personnel] 获取设置失败:', e);
    }

    try {
      const response = await api.fetchSchedules(dates[0], endDate);
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
      console.error('[personnel] 获取数据失败:', e);
    }

    const roleCategories = (settings && settings.roleCategories) || [];
    const customRoleOptions = (settings && settings.customRoleOptions) || {};

    const persons = [];
    const seen = new Set();

    roleCategories.forEach(cat => {
      if (cat.key === 'location') return;
      const optionsKey = cat.optionsKey || `common${cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}s`;
      let names = customRoleOptions[cat.key] || settings?.[optionsKey] || [];
      if (!Array.isArray(names)) names = [];

      if (names.length === 0) {
        const discoveredNames = new Set();
        dates.forEach(date => {
          (cachedData[date] || []).forEach(proj => {
            const val = proj[cat.key];
            if (val && !seen.has(`${val}|${cat.key}`)) discoveredNames.add(val);
          });
        });
        discoveredNames.forEach(name => {
          const k = `${name}|${cat.key}`;
          if (!seen.has(k)) {
            seen.add(k);
            persons.push({ name, roleKey: cat.key, roleLabel: cat.label, color: ROLE_COLORS[cat.key] || '#999' });
          }
        });
      } else {
        names.forEach(name => {
          const k = `${name}|${cat.key}`;
          if (!seen.has(k)) {
            seen.add(k);
            persons.push({ name, roleKey: cat.key, roleLabel: cat.label, color: ROLE_COLORS[cat.key] || '#999' });
          }
        });
      }
    });

    const scheduledOnly = document.getElementById('personnel-scheduled-only');
    const filterScheduled = scheduledOnly && scheduledOnly.checked;

    if (filterScheduled) {
      const filtered = persons.filter(person => {
        return dates.some(date => {
          return (cachedData[date] || []).some(proj => proj[person.roleKey] === person.name);
        });
      });
      persons.length = 0;
      filtered.forEach(p => persons.push(p));
    }

    if (persons.length === 0) {
      container.innerHTML = filterScheduled
        ? '<p style="color:#999;padding:24px;text-align:center">当前时间范围内没有排期人员</p>'
        : '<p style="color:#999;padding:24px;text-align:center">请在设置中配置人员列表</p>';
      return;
    }

    let html = '<div class="personnel-matrix">';

    // 计算最长项目名，确定统一列宽
    let maxNameLen = 4; // 最少4个字符宽
    dates.forEach(date => {
      (cachedData[date] || []).forEach(proj => {
        if (proj.name && proj.name.length > maxNameLen) maxNameLen = proj.name.length;
      });
    });
    const nameColWidth = '140px';
    const dayColWidth = Math.max(80, maxNameLen * 14 + 16) + 'px';
    const gridCols = `${nameColWidth} repeat(${dates.length}, ${dayColWidth})`;

    html += `<div class="personnel-header" style="grid-template-columns:${gridCols}">`;
    html += '<div class="personnel-header-cell personnel-name-col">人员</div>';
    dates.forEach(date => {
      const d = new Date(date);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = date === formatDate(new Date());
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()} ${'日一二三四五六'[d.getDay()]}`;
      html += `<div class="personnel-header-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}" title="${date}">${dayLabel}</div>`;
    });
    html += '</div>';

    persons.forEach(person => {
      let scheduleCount = 0;
      dates.forEach(date => {
        (cachedData[date] || []).forEach(proj => {
          if (proj[person.roleKey] === person.name) scheduleCount++;
        });
      });

      html += `<div class="personnel-row" style="grid-template-columns:${gridCols}">`;
      html += `<div class="personnel-name-cell"><span class="person-role-dot" style="background:${person.color}"></span>${escapeHtml(person.name)}<span class="person-role-label">${escapeHtml(person.roleLabel)}</span>`;
      if (scheduleCount > 0) {
        html += `<span class="person-schedule-count">${scheduleCount}</span>`;
      }
      html += '</div>';

      dates.forEach(date => {
        const projects = (cachedData[date] || []).filter(p => p[person.roleKey] === person.name);
        const isToday = date === formatDate(new Date());
        const d = new Date(date);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        html += `<div class="personnel-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" data-date="${date}">`;
        projects.forEach(proj => {
          const tc = TYPE_COLORS[proj.type] || { bg: '#82d5bb', color: '#2a6b5a' };
          html += `<div class="personnel-project-tag" style="background:${tc.bg};color:${tc.color}" title="${escapeAttr(proj.name)} · ${proj.startTime || ''} · ${proj.type || ''}">`;
          html += escapeHtml(proj.name);
          html += '</div>';
        });
        html += '</div>';
      });

      html += '</div>';
    });

    html += '</div>';

    const totalSlots = dates.reduce((sum, d) => sum + (cachedData[d] || []).length, 0);
    html += '<div class="personnel-summary">';
    html += `<span>共 ${persons.length} 人</span>`;
    html += `<span>${dates.length} 天</span>`;
    html += `<span>${totalSlots} 个排期</span>`;
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.personnel-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (onJumpToWeek) onJumpToWeek(cell.dataset.date);
      });
    });
  }

  return { init, render };
}

const STATUS_COLORS = {
  '待确认': '#94A3B8',
  '已确认': '#3B82F6',
  '已完成': '#10B981',
  '取消': '#EF4444'
};

const TYPE_COLORS = {
  '平面': { bg: '#82d5bb', color: '#2a6b5a' },
  '视频': { bg: '#f8a6b2', color: '#a85565' },
  '直播': { bg: '#f7cd67', color: '#7a6528' },
  '试做': { bg: '#b77dee', color: '#fff' }
};
