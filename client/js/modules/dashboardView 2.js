/**
 * 数据看板视图模块
 * 统计面板：项目类型分布、场地使用频率、人员工作量、状态分布、周趋势
 */

import { escapeHtml } from './utils.js';

/**
 * 创建数据看板视图模块
 */
export function createDashboardViewModule({ api }) {
  const STATUS_COLORS = {
    '待确认': '#94A3B8',
    '已确认': '#3B82F6',
    '已完成': '#10B981',
    '取消': '#EF4444'
  };
  const TYPE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

  function init() {
    // 看板在切换到该视图时自动渲染
  }

  async function render() {
    const overviewContainer = document.getElementById('dashboard-overview');
    const chartsContainer = document.getElementById('dashboard-charts');
    if (!chartsContainer) return;

    // 获取过去 4 周数据
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 28);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    let schedules = [];
    try {
      const response = await api.fetchSchedules(formatDate(startDate), formatDate(endDate));
      if (Array.isArray(response)) schedules = response;
    } catch (e) {
      console.error('[dashboard] 获取数据失败:', e);
    }

    // 统计数据
    const stats = computeStats(schedules);

    // 渲染看板
    if (overviewContainer) {
      overviewContainer.innerHTML = renderOverviewCards(stats);
    }

    let html = '<div class="dashboard-grid">';
    html += renderStatusChart(stats);
    html += renderTypeChart(stats);
    html += renderTopList('📍 场地使用 Top 10', stats.locationTop, '#3B82F6');
    html += renderTopList('👤 人员工作量 Top 10', stats.personTop, '#10B981');
    html += renderWeeklyTrend(stats);
    html += '</div>';
    chartsContainer.innerHTML = html;
  }

  function computeStats(schedules) {
    const stats = {
      totalProjects: 0,
      statusCounts: {},
      typeCounts: {},
      locationCounts: {},
      personCounts: {},
      weeklyCounts: {}
    };

    schedules.forEach(item => {
      const weekKey = getWeekKey(item.date);
      if (!stats.weeklyCounts[weekKey]) stats.weeklyCounts[weekKey] = 0;

      (item.projects || []).forEach(proj => {
        stats.totalProjects++;
        stats.weeklyCounts[weekKey]++;

        // 状态
        const status = proj.status || '待确认';
        stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;

        // 类型
        const type = proj.type || '未分类';
        stats.typeCounts[type] = (stats.typeCounts[type] || 0) + 1;

        // 场地
        if (proj.location) {
          stats.locationCounts[proj.location] = (stats.locationCounts[proj.location] || 0) + 1;
        }

        // 人员（所有角色）
        ['director', 'photographer', 'production', 'rd', 'operational', 'audio', 'business'].forEach(role => {
          const name = proj[role];
          if (name) {
            stats.personCounts[name] = (stats.personCounts[name] || 0) + 1;
          }
        });
      });
    });

    // 排序 Top 10
    stats.locationTop = Object.entries(stats.locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    stats.personTop = Object.entries(stats.personCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    stats.weeklySorted = Object.entries(stats.weeklyCounts).sort((a, b) => a[0].localeCompare(b[0]));

    return stats;
  }

  function renderOverviewCards(stats) {
    const confirmed = stats.statusCounts['已确认'] || 0;
    const pending = stats.statusCounts['待确认'] || 0;
    const completed = stats.statusCounts['已完成'] || 0;
    const cancelled = stats.statusCounts['取消'] || 0;

    return `
      <div class="dashboard-overview">
        <div class="dashboard-card overview-total">
          <div class="card-number">${stats.totalProjects}</div>
          <div class="card-label">总项目数</div>
        </div>
        <div class="dashboard-card" style="border-left:4px solid #3B82F6">
          <div class="card-number">${confirmed}</div>
          <div class="card-label">已确认</div>
        </div>
        <div class="dashboard-card" style="border-left:4px solid #94A3B8">
          <div class="card-number">${pending}</div>
          <div class="card-label">待确认</div>
        </div>
        <div class="dashboard-card" style="border-left:4px solid #10B981">
          <div class="card-number">${completed}</div>
          <div class="card-label">已完成</div>
        </div>
        <div class="dashboard-card" style="border-left:4px solid #EF4444">
          <div class="card-number">${cancelled}</div>
          <div class="card-label">已取消</div>
        </div>
      </div>
    `;
  }

  function renderStatusChart(stats) {
    const total = stats.totalProjects || 1;
    const entries = Object.entries(stats.statusCounts);

    let segments = '';
    let offset = 0;
    entries.forEach(([status, count]) => {
      const pct = (count / total * 100);
      const color = STATUS_COLORS[status] || '#94A3B8';
      segments += `<div class="pie-segment" style="--start:${offset}%;--pct:${pct}%;background:${color}" title="${status}: ${count}"></div>`;
      offset += pct;
    });

    let legend = '';
    entries.forEach(([status, count]) => {
      const color = STATUS_COLORS[status] || '#94A3B8';
      const pct = Math.round(count / total * 100);
      legend += `<div class="chart-legend-item"><span class="legend-dot" style="background:${color}"></span>${status}: ${count} (${pct}%)</div>`;
    });

    return `
      <div class="dashboard-card chart-card">
        <h3 class="dashboard-card-title">📊 状态分布</h3>
        <div class="chart-container">
          <div class="pie-chart">${segments}</div>
          <div class="chart-legend">${legend}</div>
        </div>
      </div>
    `;
  }

  function renderTypeChart(stats) {
    const entries = Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0][1] : 1;

    let bars = '';
    entries.forEach(([type, count], i) => {
      const pct = Math.round(count / max * 100);
      const color = TYPE_COLORS[i % TYPE_COLORS.length];
      bars += `
        <div class="bar-item">
          <div class="bar-label">${escapeHtml(type)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="bar-value">${count}</div>
        </div>
      `;
    });

    return `
      <div class="dashboard-card chart-card">
        <h3 class="dashboard-card-title">📋 项目类型分布</h3>
        <div class="bar-chart">${bars || '<p style="color:#999;font-size:13px">暂无数据</p>'}</div>
      </div>
    `;
  }

  function renderTopList(title, data, color) {
    const max = data.length > 0 ? data[0][1] : 1;

    let items = '';
    data.forEach(([name, count], i) => {
      const pct = Math.round(count / max * 100);
      items += `
        <div class="top-item">
          <span class="top-rank">${i + 1}</span>
          <span class="top-name">${escapeHtml(name)}</span>
          <div class="top-bar-track"><div class="top-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="top-count">${count}</span>
        </div>
      `;
    });

    return `
      <div class="dashboard-card chart-card">
        <h3 class="dashboard-card-title">${title}</h3>
        <div class="top-list">${items || '<p style="color:#999;font-size:13px">暂无数据</p>'}</div>
      </div>
    `;
  }

  function renderWeeklyTrend(stats) {
    let rows = '';
    stats.weeklySorted.forEach(([week, count]) => {
      rows += `<tr><td>${week}</td><td style="font-weight:600">${count}</td></tr>`;
    });

    return `
      <div class="dashboard-card chart-card">
        <h3 class="dashboard-card-title">📈 周趋势</h3>
        <table class="trend-table">
          <thead><tr><th>周</th><th>项目数</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" style="color:#999">暂无数据</td></tr>'}</tbody>
        </table>
      </div>
    `;
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

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
