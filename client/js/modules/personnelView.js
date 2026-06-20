/**
 * 人员排期视图模块
 * 按人员×日期展示排期，支持冲突检测和筛选
 */

const ROLE_CONFIG = {
  director: { label: '导演', icon: '🎬', order: 1 },
  photographer: { label: '摄影', icon: '📷', order: 2 },
  production: { label: '制片', icon: '🎬', order: 3 },
  rd: { label: '研发', icon: '🔬', order: 4 },
  operational: { label: '运营', icon: '📢', order: 5 },
  audio: { label: '录音', icon: '🎤', order: 6 },
  business: { label: '商务', icon: '💼', order: 7 }
};

const TYPE_STYLES = {
  '视频': { bg: '#DBEAFE', color: '#1E40AF', darkBg: '#1e3a5f', darkColor: '#93c5fd' },
  '外拍': { bg: '#D1FAE5', color: '#065F46', darkBg: '#1a3a2a', darkColor: '#6ee7b7' },
  '试做': { bg: '#FEF3C7', color: '#92400E', darkBg: '#3a2a0a', darkColor: '#fcd34d' },
  '平面': { bg: '#EDE9FE', color: '#5B21B6', darkBg: '#2d1b4e', darkColor: '#c4b5fd' },
  '直播': { bg: '#FEE2E2', color: '#991B1B', darkBg: '#3b1b1b', darkColor: '#fca5a5' }
};

/**
 * 创建人员排期视图模块
 */
export function createPersonnelViewModule({ api, onJumpToWeek }) {
  let currentStart = null;
  let currentRange = 'week';
  let cachedData = null;

  function init() {
    // 日期导航
    document.getElementById('personnel-prev')?.addEventListener('click', () => {
      shiftRange(-1);
    });
    document.getElementById('personnel-next')?.addEventListener('click', () => {
      shiftRange(1);
    });

    // 范围切换
    document.querySelectorAll('.personnel-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.personnel-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRange = btn.dataset.range;
        initDates();
        render();
      });
    });

    // 筛选
    document.getElementById('personnel-search')?.addEventListener('input', () => applyFilters());
    document.getElementById('personnel-filter-role')?.addEventListener('change', () => applyFilters());
    document.getElementById('personnel-conflict-only')?.addEventListener('change', () => applyFilters());

    // 监听视图初始化
    document.addEventListener('viewInit', (e) => {
      if (e.detail.view === 'personnel') {
        initDates();
        render();
      }
    });
  }

  function initDates() {
    const today = new Date();
    currentStart = getMonday(new Date(today));
  }

  function shiftRange(direction) {
    const days = currentRange === 'week' ? 7 : currentRange === 'biweek' ? 14 : 30;
    currentStart.setDate(currentStart.getDate() + direction * days);
    render();
  }

  async function render() {
    if (!currentStart) initDates();

    const days = currentRange === 'week' ? 7 : currentRange === 'biweek' ? 14 : 30;
    const endDate = new Date(currentStart);
    endDate.setDate(endDate.getDate() + days - 1);

    // 更新显示
    const display = document.getElementById('personnel-display');
    if (display) {
      display.textContent = `${formatDateShort(currentStart)} - ${formatDateShort(endDate)}`;
    }

    const startStr = formatDate(currentStart);
    const endStr = formatDate(endDate);

    try {
      // 获取排期数据
      const schedules = await api.fetchSchedules(startStr, endStr) || {};
      cachedData = buildPersonnelData(schedules, currentStart, days);
      renderGrid(cachedData);
      renderConflictSummary(cachedData);
      renderStats(cachedData);
      applyFilters();
    } catch (e) {
      console.error('[personnel] 加载数据失败:', e);
    }
  }

  function buildPersonnelData(schedules, startDate, days) {
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(formatDate(d));
    }

    const roles = {};
    const conflicts = [];

    // 初始化职能分组
    Object.entries(ROLE_CONFIG).forEach(([key, cfg]) => {
      roles[key] = { ...cfg, personnel: {} };
    });

    // 遍历排期数据
    dates.forEach(dateStr => {
      const dayData = schedules[dateStr];
      if (!dayData || !dayData.projects) return;

      dayData.projects.forEach(proj => {
        Object.entries(ROLE_CONFIG).forEach(([roleKey]) => {
          const personName = proj[roleKey];
          if (!personName) return;

          if (!roles[roleKey].personnel[personName]) {
            roles[roleKey].personnel[personName] = { totalCount: 0, schedule: {} };
          }
          const person = roles[roleKey].personnel[personName];
          person.totalCount++;
          if (!person.schedule[dateStr]) person.schedule[dateStr] = [];
          person.schedule[dateStr].push({
            projectName: proj.name,
            type: proj.type,
            startTime: proj.startTime
          });
        });
      });
    });

    // 冲突检测
    Object.values(roles).forEach(role => {
      Object.entries(role.personnel).forEach(([name, person]) => {
        Object.entries(person.schedule).forEach(([date, projects]) => {
          if (projects.length > 1) {
            conflicts.push({ person: name, date, count: projects.length });
            person.conflictCount = (person.conflictCount || 0) + 1;
          }
        });
      });
    });

    return { dates, roles, conflicts };
  }

  function renderGrid(data) {
    const grid = document.getElementById('personnel-grid');
    if (!grid) return;

    const isDark = document.body.classList.contains('dark-mode');
    let html = '<table><thead><tr>';
    html += '<th style="min-width:120px">人员</th>';

    data.dates.forEach(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      html += `<th>${dayNames[d.getDay()]} ${d.getDate()}</th>`;
    });
    html += '</tr></thead><tbody>';

    Object.entries(data.roles).forEach(([roleKey, role]) => {
      const persons = Object.entries(role.personnel);
      if (persons.length === 0) return;

      // 职能标题行
      html += `<tr><td class="role-header" colspan="${data.dates.length + 1}">${role.icon} ${role.label}</td></tr>`;

      // 每个人员一行
      persons.sort((a, b) => b[1].totalCount - a[1].totalCount);
      persons.forEach(([name, person]) => {
        html += `<tr data-person="${escapeHtml(name)}" data-role="${roleKey}">`;
        html += `<td><span class="person-name">${escapeHtml(name)}</span><span class="person-count">(${person.totalCount})</span></td>`;

        data.dates.forEach(dateStr => {
          const projects = person.schedule[dateStr] || [];
          const hasConflict = projects.length > 1;
          const cellClass = hasConflict ? 'personnel-cell has-conflict' : 'personnel-cell';

          html += `<td class="${cellClass}">`;
          if (hasConflict) {
            html += '<div style="font-size:10px;color:#DC2626;margin-bottom:2px">⚠️ 冲突</div>';
          }
          projects.forEach(proj => {
            const style = TYPE_STYLES[proj.type] || { bg: '#F3F4F6', color: '#374151', darkBg: '#2a2a3e', darkColor: '#ddd' };
            const bgColor = isDark ? style.darkBg : style.bg;
            const textColor = isDark ? style.darkColor : style.color;
            html += `<div class="personnel-project" style="background:${bgColor};color:${textColor}" data-date="${dateStr}" title="${escapeHtml(proj.projectName)} | ${escapeHtml(proj.type)} | ${proj.startTime || '-'}">${escapeHtml(proj.projectName)}</div>`;
          });
          html += '</td>';
        });

        html += '</tr>';
      });
    });

    html += '</tbody></table>';
    grid.innerHTML = html;

    // 点击项目跳转到周视图
    grid.querySelectorAll('.personnel-project').forEach(el => {
      el.addEventListener('click', () => {
        const dateStr = el.dataset.date;
        if (dateStr && onJumpToWeek) onJumpToWeek(new Date(dateStr + 'T00:00:00'));
      });
    });
  }

  function renderConflictSummary(data) {
    const el = document.getElementById('personnel-conflict-summary');
    if (!el) return;

    if (data.conflicts.length === 0) {
      el.className = 'personnel-conflict-summary';
      el.textContent = '';
      return;
    }

    el.className = 'personnel-conflict-summary has-conflicts';
    const parts = data.conflicts.map(c => {
      const d = new Date(c.date + 'T00:00:00');
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      return `${c.person}(${dayNames[d.getDay()]} ${c.count}个项目)`;
    });
    el.textContent = `⚠️ 本周冲突：${parts.join(' · ')}`;
  }

  function renderStats(data) {
    const el = document.getElementById('personnel-stats');
    if (!el) return;

    const parts = [];
    Object.values(data.roles).forEach(role => {
      Object.entries(role.personnel).forEach(([name, person]) => {
        const conflictStr = person.conflictCount ? `(含${person.conflictCount}冲突)` : '';
        parts.push(`${name} ${person.totalCount}个${conflictStr}`);
      });
    });
    el.textContent = `📊 统计：${parts.join(' · ')}`;
  }

  function applyFilters() {
    const searchText = (document.getElementById('personnel-search')?.value || '').toLowerCase();
    const roleFilter = document.getElementById('personnel-filter-role')?.value || '';
    const conflictOnly = document.getElementById('personnel-conflict-only')?.checked || false;

    const grid = document.getElementById('personnel-grid');
    if (!grid) return;

    grid.querySelectorAll('tr[data-person]').forEach(row => {
      const person = row.dataset.person?.toLowerCase() || '';
      const role = row.dataset.role || '';
      const hasConflict = row.querySelector('.has-conflict') !== null;

      let visible = true;
      if (searchText && !person.includes(searchText)) visible = false;
      if (roleFilter && role !== roleFilter) visible = false;
      if (conflictOnly && !hasConflict) visible = false;

      row.style.display = visible ? '' : 'none';
    });

    // 隐藏空的职能分组
    grid.querySelectorAll('tr td.role-header').forEach(header => {
      const row = header.closest('tr');
      let nextRow = row.nextElementSibling;
      let hasVisible = false;
      while (nextRow && nextRow.dataset.person) {
        if (nextRow.style.display !== 'none') hasVisible = true;
        nextRow = nextRow.nextElementSibling;
      }
      row.style.display = hasVisible ? '' : 'none';
    });
  }

  function setCurrentDate(date) {
    currentStart = getMonday(new Date(date));
  }

  return { init, render, setCurrentDate };
}

// ── 工具函数 ──

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

function formatDateShort(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
