/**
 * 月视图模块 — 甘特图式展示
 * 显示当月每天的项目条，支持点击查看、点击日期跳转
 */

/**
 * 创建月视图模块
 */
export function createMonthViewModule({ api, onJumpToWeek }) {
  let currentDate = new Date();
  let cachedData = {};
  const PERSON_COLORS = {
    director: '#3B82F6',
    photographer: '#10B981',
    production: '#F59E0B',
    rd: '#8B5CF6',
    operational: '#EC4899',
    audio: '#06B6D4',
    business: '#F97316'
  };
  const STATUS_COLORS = {
    '待确认': '#94A3B8',
    '已确认': '#3B82F6',
    '已完成': '#10B981',
    '取消': '#EF4444'
  };

  function init() {
    const prevBtn = document.getElementById('month-prev');
    const nextBtn = document.getElementById('month-next');
    const todayBtn = document.getElementById('month-today');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); });
    if (todayBtn) todayBtn.addEventListener('click', () => { currentDate = new Date(); render(); });
  }

  async function render() {
    const container = document.getElementById('month-view');
    if (!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = formatDate(firstDay);
    const endDate = formatDate(lastDay);

    // 更新标题
    const title = document.getElementById('month-title');
    if (title) title.textContent = `${year}年${month + 1}月`;

    // 获取数据
    try {
      const response = await api.fetchSchedules(startDate, endDate);
      cachedData = {};
      if (Array.isArray(response)) {
        response.forEach(item => { cachedData[item.date] = item.projects || []; });
      }
    } catch (e) {
      console.error('[monthview] 获取数据失败:', e);
    }

    // 构建日历网格
    const firstDayOfWeek = firstDay.getDay(); // 0=周日
    const totalDays = lastDay.getDate();
    const today = formatDate(new Date());

    let html = '<div class="month-gantt">';

    // 星期头部
    html += '<div class="month-header">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
      html += `<div class="month-header-cell">${d}</div>`;
    });
    html += '</div>';

    // 日期网格
    html += '<div class="month-grid">';
    // 填充月初空白
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

      // 甘特条
      if (projects.length > 0) {
        html += '<div class="month-gantt-bars">';
        projects.slice(0, 4).forEach(proj => {
          const color = STATUS_COLORS[proj.status] || STATUS_COLORS['待确认'];
          const persons = [proj.director, proj.photographer, proj.production].filter(Boolean);
          html += `<div class="month-gantt-bar" style="background:${color}" title="${escapeAttr(proj.name)}${persons.length ? ' · ' + persons.join(', ') : ''}">`;
          html += `<span class="gantt-bar-name">${escapeHtml(proj.name)}</span>`;
          html += `</div>`;
        });
        if (projects.length > 4) {
          html += `<div class="month-gantt-more">+${projects.length - 4} 个</div>`;
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';

    // 图例
    html += '<div class="month-legend">';
    Object.entries(STATUS_COLORS).forEach(([status, color]) => {
      html += `<span class="month-legend-item"><span class="legend-dot" style="background:${color}"></span>${status}</span>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    // 绑定点击事件
    container.querySelectorAll('.month-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date;
        if (onJumpToWeek) onJumpToWeek(date);
      });
    });
  }

  return { init, render };
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

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
