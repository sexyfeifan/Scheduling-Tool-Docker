/**
 * 人员排期视图模块
 * 以人员为行、日期为列的矩阵，显示每个人的排期
 */

/**
 * 创建人员排期视图模块
 */
export function createPersonnelViewModule({ api, onJumpToWeek }) {
  let currentDate = new Date();
  let cachedData = {};
  let viewMode = 'week'; // 'week' | 'month'
  const ROLES = [
    { key: 'director', label: '导演', color: '#3B82F6' },
    { key: 'photographer', label: '摄影师', color: '#10B981' },
    { key: 'production', label: '制片', color: '#F59E0B' },
    { key: 'rd', label: '研发', color: '#8B5CF6' },
    { key: 'operational', label: '运营', color: '#EC4899' },
    { key: 'audio', label: '录音', color: '#06B6D4' },
    { key: 'business', label: '商务', color: '#F97316' }
  ];

  function init() {
    const prevBtn = document.getElementById('personnel-prev');
    const nextBtn = document.getElementById('personnel-next');
    const todayBtn = document.getElementById('personnel-today');
    const toggleBtn = document.getElementById('personnel-toggle');
    if (prevBtn) prevBtn.addEventListener('click', () => { shiftDate(-1); render(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { shiftDate(1); render(); });
    if (todayBtn) todayBtn.addEventListener('click', () => { currentDate = new Date(); render(); });
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
      viewMode = viewMode === 'week' ? 'month' : 'week';
      toggleBtn.textContent = viewMode === 'week' ? '📅 切月视图' : '📅 切周视图';
      render();
    });
  }

  function shiftDate(direction) {
    if (viewMode === 'week') {
      currentDate.setDate(currentDate.getDate() + direction * 7);
    } else {
      currentDate.setMonth(currentDate.getMonth() + direction);
    }
  }

  async function render() {
    const container = document.getElementById('personnel-view');
    if (!container) return;

    const startDate = getMonday(new Date(currentDate));
    const days = viewMode === 'week' ? 7 : 35;
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(formatDate(d));
    }

    const endDate = dates[dates.length - 1];

    // 更新标题
    const title = document.getElementById('personnel-title');
    if (title) {
      if (viewMode === 'week') {
        title.textContent = `${dates[0]} ~ ${dates[6]}`;
      } else {
        title.textContent = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月 人员排期`;
      }
    }

    // 获取数据
    try {
      const response = await api.fetchSchedules(dates[0], endDate);
      cachedData = {};
      if (Array.isArray(response)) {
        response.forEach(item => { cachedData[item.date] = item.projects || []; });
      }
    } catch (e) {
      console.error('[personnel] 获取数据失败:', e);
    }

    // 收集所有出现的人员
    const personMap = new Map(); // name -> { role, count }
    dates.forEach(date => {
      (cachedData[date] || []).forEach(proj => {
        ROLES.forEach(r => {
          const name = proj[r.key];
          if (name) {
            const key = `${name}|${r.key}`;
            if (!personMap.has(key)) {
              personMap.set(key, { name, role: r.key, roleLabel: r.label, color: r.color, count: 0 });
            }
            personMap.get(key).count++;
          }
        });
      });
    });

    const persons = Array.from(personMap.values()).sort((a, b) => b.count - a.count);

    if (persons.length === 0) {
      container.innerHTML = '<p style="color:#999;padding:24px;text-align:center">当前时间范围内没有排期数据</p>';
      return;
    }

    // 构建矩阵表格
    let html = '<div class="personnel-matrix">';

    // 表头：日期
    html += '<div class="personnel-header">';
    html += '<div class="personnel-header-cell personnel-name-col">人员</div>';
    dates.forEach(date => {
      const d = new Date(date);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = date === formatDate(new Date());
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}\n${'日一二三四五六'[d.getDay()]}`;
      html += `<div class="personnel-header-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}" title="${date}">${dayLabel}</div>`;
    });
    html += '</div>';

    // 每个人员一行
    persons.forEach(person => {
      html += '<div class="personnel-row">';
      html += `<div class="personnel-name-cell"><span class="person-role-dot" style="background:${person.color}"></span>${escapeHtml(person.name)}<span class="person-role-label">${person.roleLabel}</span></div>`;

      dates.forEach(date => {
        const projects = (cachedData[date] || []).filter(p => p[person.role] === person.name);
        const isToday = date === formatDate(new Date());
        const d = new Date(date);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        html += `<div class="personnel-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" data-date="${date}">`;
        if (projects.length > 0) {
          projects.forEach(proj => {
            const statusColor = STATUS_COLORS[proj.status] || '#94A3B8';
            html += `<div class="personnel-project-tag" style="border-left:3px solid ${statusColor}" title="${escapeAttr(proj.name)} · ${proj.startTime || ''} · ${proj.status || '待确认'}">`;
            html += escapeHtml(proj.name);
            html += `</div>`;
          });
        }
        html += '</div>';
      });

      html += '</div>';
    });

    html += '</div>';

    // 统计摘要
    html += '<div class="personnel-summary">';
    html += `<span>共 ${persons.length} 人</span>`;
    html += `<span>${dates.length} 天</span>`;
    const totalSlots = dates.reduce((sum, d) => sum + (cachedData[d] || []).length, 0);
    html += `<span>${totalSlots} 个排期</span>`;
    html += '</div>';

    container.innerHTML = html;

    // 绑定点击跳转
    container.querySelectorAll('.personnel-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (onJumpToWeek) onJumpToWeek(cell.dataset.date);
      });
    });
  }

  return { init, render };
}

// ── 工具函数 ──

const STATUS_COLORS = {
  '待确认': '#94A3B8',
  '已确认': '#3B82F6',
  '已完成': '#10B981',
  '取消': '#EF4444'
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

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
