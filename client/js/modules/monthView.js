/**
 * 月视图甘特图模块
 * 展示整月排期，项目以彩色条形跨越多天显示
 */

import { getMonday } from './date.js';

const TYPE_COLORS = {
  '视频': '#3B82F6',
  '外拍': '#10B981',
  '试做': '#F59E0B',
  '平面': '#8B5CF6',
  '直播': '#EF4444'
};
const DEFAULT_COLOR = '#6B7280';

/**
 * 创建月视图模块
 */
export function createMonthViewModule({ api, onJumpToWeek }) {
  let currentDate = new Date();
  let scheduleCache = {};

  /**
   * 初始化月视图
   */
  function init() {
    document.getElementById('month-prev')?.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });
    document.getElementById('month-next')?.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });
    document.getElementById('month-filter-type')?.addEventListener('change', () => {
      render();
    });

    // 监听视图切换事件
    document.addEventListener('viewInit', (e) => {
      if (e.detail.view === 'month') {
        currentDate = new Date();
        render();
      }
    });
  }

  /**
   * 渲染月视图
   */
  async function render() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 更新标题
    const display = document.getElementById('month-display');
    if (display) display.textContent = `${year}年${month + 1}月`;

    // 获取当月数据
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    try {
      const data = await api.fetchSchedules(startStr, endStr);
      scheduleCache = data || {};
    } catch (e) {
      console.error('[monthview] 加载数据失败:', e);
      scheduleCache = {};
    }

    renderGrid(year, month);
    renderStats(year, month);
  }

  /**
   * 渲染月历网格
   */
  function renderGrid(year, month) {
    const grid = document.getElementById('month-grid');
    if (!grid) return;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startMonday = getMonday(new Date(firstDay));
    const filterType = document.getElementById('month-filter-type')?.value || '';

    let html = '';

    // 表头：周几
    const dayLabels = ['', '一', '二', '三', '四', '五', '六', '日'];
    dayLabels.forEach(label => {
      html += `<div class="month-day-header">${label}</div>`;
    });

    // 计算所有周
    const weeks = [];
    let currentWeekStart = new Date(startMonday);
    while (currentWeekStart <= lastDay || currentWeekStart.getDay() !== 1) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeks.push(new Date(currentWeekStart));
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      if (weeks.length > 6) break;
    }

    const today = formatDate(new Date());

    // 渲染每周
    weeks.forEach((weekStart, weekIdx) => {
      // 周标签
      const weekNum = weekIdx + 1;
      html += `<div class="month-week-label">W${weekNum}</div>`;

      // 7天
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + d);
        const dateStr = formatDate(cellDate);
        const isCurrentMonth = cellDate.getMonth() === month;
        const isToday = dateStr === today;

        let classes = 'month-day-cell';
        if (!isCurrentMonth) classes += ' other-month';
        if (isToday) classes += ' today';

        html += `<div class="${classes}" data-date="${dateStr}">`;
        html += `<div class="month-day-number">${cellDate.getDate()}</div>`;

        // 渲染该天的项目条形
        const dayData = scheduleCache[dateStr];
        if (dayData && dayData.projects) {
          const projects = filterType
            ? dayData.projects.filter(p => p.type === filterType)
            : dayData.projects;

          projects.forEach(proj => {
            const colorClass = TYPE_COLORS[proj.type] ? `type-${proj.type}` : 'type-other';
            const label = `${proj.name}(${proj.type || '-'})`;
            html += `<div class="month-bar ${colorClass}" title="${escapeHtml(proj.name)} | ${escapeHtml(proj.type || '-')} | ${escapeHtml(proj.location || '-')} | ${escapeHtml(proj.director || '-')}" data-date="${dateStr}">${escapeHtml(label)}</div>`;
          });
        }

        html += '</div>';
      }
    });

    grid.innerHTML = html;

    // 点击条形跳转到周视图
    grid.querySelectorAll('.month-bar').forEach(bar => {
      bar.addEventListener('click', () => {
        const dateStr = bar.dataset.date;
        if (dateStr && onJumpToWeek) {
          onJumpToWeek(new Date(dateStr + 'T00:00:00'));
        }
      });
    });
  }

  /**
   * 渲染统计信息
   */
  function renderStats(year, month) {
    const statsEl = document.getElementById('month-stats');
    if (!statsEl) return;

    const typeCounts = {};
    let total = 0;

    Object.values(scheduleCache).forEach(dayData => {
      if (dayData && dayData.projects) {
        dayData.projects.forEach(proj => {
          total++;
          const t = proj.type || '其他';
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
      }
    });

    const parts = [`本月共 ${total} 个项目`];
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        parts.push(`${type} ${count}`);
      });

    statsEl.textContent = parts.join(' · ');
  }

  /**
   * 更新当前日期（从外部调用）
   */
  function setCurrentDate(date) {
    currentDate = new Date(date);
  }

  return { init, render, setCurrentDate };
}

// ── 工具函数 ──

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
