/**
 * 数据看板模块
 * 展示排期数据的统计分析
 */

/**
 * 创建数据看板模块
 */
export function createDashboardViewModule({ api }) {
  let currentRange = 'week';

  function init() {
    document.querySelectorAll('.dashboard-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dashboard-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRange = btn.dataset.range;
        render();
      });
    });

    document.addEventListener('viewInit', (e) => {
      if (e.detail.view === 'dashboard') render();
    });
  }

  async function render() {
    const { start, end } = getDateRange(currentRange);
    try {
      const schedules = await api.fetchSchedules(start, end) || {};
      const stats = computeStats(schedules);
      renderOverview(stats);
      renderCharts(stats);
    } catch (e) {
      console.error('[dashboard] 加载数据失败:', e);
    }
  }

  function getDateRange(range) {
    const now = new Date();
    let start;
    switch (range) {
      case 'week':
        start = getMonday(new Date(now));
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default: // 'all'
        start = new Date(2020, 0, 1);
    }
    return { start: formatDate(start), end: formatDate(now) };
  }

  function computeStats(schedules) {
    const typeMap = {};
    const directorMap = {};
    const locationMap = {};
    const weeklyMap = {};
    let total = 0;
    let pending = 0;
    const daysWithProjects = new Set();

    Object.entries(schedules).forEach(([date, dayData]) => {
      if (!dayData || !dayData.projects) return;
      if (dayData.projects.length > 0) daysWithProjects.add(date);

      dayData.projects.forEach(proj => {
        total++;
        if (proj.status === '待确认') pending++;

        const type = proj.type || '其他';
        typeMap[type] = (typeMap[type] || 0) + 1;

        if (proj.director) {
          directorMap[proj.director] = (directorMap[proj.director] || 0) + 1;
        }
        if (proj.location) {
          locationMap[proj.location] = (locationMap[proj.location] || 0) + 1;
        }

        // 按周统计
        const d = new Date(date + 'T00:00:00');
        const weekKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
        weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
      });
    });

    const totalDays = Object.keys(schedules).length || 1;
    const locationUsage = Math.round((daysWithProjects.size / totalDays) * 100);

    return {
      overview: { total, monthNew: total, locationUsage, pending },
      typeDistribution: Object.entries(typeMap).map(([type, count]) => ({
        type, count, percent: Math.round((count / (total || 1)) * 100)
      })).sort((a, b) => b.count - a.count),
      directorWorkload: Object.entries(directorMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      locationRanking: Object.entries(locationMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      weeklyTrend: Object.entries(weeklyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-5)
        .map(([week, count]) => ({ week: week.split('-W')[1] || week, count }))
    };
  }

  function renderOverview(stats) {
    const el = document.getElementById('dashboard-overview');
    if (!el) return;

    const cards = [
      { icon: '📋', value: stats.overview.total, label: '项目总数', trend: null },
      { icon: '📅', value: stats.overview.monthNew, label: '当前周期', trend: null },
      { icon: '🏢', value: `${stats.overview.locationUsage}%`, label: '场地使用率', trend: null },
      { icon: '⏳', value: stats.overview.pending, label: '待确认', trend: null }
    ];

    el.innerHTML = cards.map(c => `
      <div class="dashboard-card">
        <div class="card-icon">${c.icon}</div>
        <div class="card-value">${c.value}</div>
        <div class="card-label">${c.label}</div>
      </div>
    `).join('');
  }

  function renderCharts(stats) {
    const el = document.getElementById('dashboard-charts');
    if (!el) return;

    const maxType = Math.max(...stats.typeDistribution.map(t => t.count), 1);
    const maxDirector = Math.max(...stats.directorWorkload.map(d => d.count), 1);
    const maxLocation = Math.max(...stats.locationRanking.map(l => l.count), 1);
    const maxWeekly = Math.max(...stats.weeklyTrend.map(w => w.count), 1);

    const typeColors = { '视频': '#3B82F6', '外拍': '#10B981', '试做': '#F59E0B', '平面': '#8B5CF6', '直播': '#EF4444' };

    el.innerHTML = `
      <div class="dashboard-chart">
        <h3>项目类型分布</h3>
        ${stats.typeDistribution.map(t => `
          <div class="chart-bar-row">
            <span class="chart-bar-label">${t.type}</span>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width:${(t.count / maxType) * 100}%;background:${typeColors[t.type] || '#6B7280'}">${t.percent}%</div>
            </div>
            <span class="chart-bar-value">${t.count}</span>
          </div>
        `).join('')}
      </div>
      <div class="dashboard-chart">
        <h3>导演工作量 TOP5</h3>
        ${stats.directorWorkload.map(d => `
          <div class="chart-bar-row">
            <span class="chart-bar-label">${d.name}</span>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width:${(d.count / maxDirector) * 100}%;background:#3B82F6">${d.count}个</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="dashboard-chart">
        <h3>场地使用排行</h3>
        ${stats.locationRanking.map(l => `
          <div class="chart-bar-row">
            <span class="chart-bar-label">${l.name}</span>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width:${(l.count / maxLocation) * 100}%;background:#10B981">${l.count}次</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="dashboard-chart">
        <h3>每周项目数趋势</h3>
        <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding-top:10px">
          ${stats.weeklyTrend.map(w => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="font-size:10px;color:#666">${w.count}</div>
              <div style="width:100%;background:#3B82F6;border-radius:4px 4px 0 0;height:${(w.count / maxWeekly) * 80}px;min-height:4px"></div>
              <div style="font-size:10px;color:#999">W${w.week}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return { init, render };
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

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
