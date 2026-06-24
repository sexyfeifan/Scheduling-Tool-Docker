// heatmap.js - 热力图模块
// 包含：热力图模态框显示、日期范围计算、GitHub 风格日历渲染、排行榜统计。
// 工厂函数 createHeatmapModule(ctx) 接收外部依赖注入，返回所有热力图函数。

import { getMonday, formatDate, formatMonthDay } from './date.js';

export function createHeatmapModule(ctx) {
    const {
        getScheduleData,
        escapeHtml,
    } = ctx;

    // ── DOM 引用（模块内部自行查询） ──
    const heatmapChart = document.getElementById('heatmap-chart');
    const personList = document.getElementById('heatmap-person-list');
    const dayList = document.getElementById('heatmap-day-list');

    // ────────────────────────────────────────────────────────────
    // getHeatmapDateRange - 计算热力图的日期范围
    // ────────────────────────────────────────────────────────────
    function getHeatmapDateRange(range) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (range === 'today') {
            return { startDate: today, endDate: today };
        } else if (range === 'week') {
            const startDate = getMonday(today);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            return { startDate, endDate };
        } else if (range === 'month') {
            return {
                startDate: new Date(today.getFullYear(), today.getMonth(), 1),
                endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0)
            };
        } else if (range === 'quarter') {
            const quarterStart = Math.floor(today.getMonth() / 3) * 3;
            return {
                startDate: new Date(today.getFullYear(), quarterStart, 1),
                endDate: new Date(today.getFullYear(), quarterStart + 3, 0)
            };
        } else if (range === 'year') {
            return {
                startDate: new Date(today.getFullYear(), 0, 1),
                endDate: new Date(today.getFullYear(), 11, 31)
            };
        }
        return {
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0)
        };
    }

    // ────────────────────────────────────────────────────────────
    // renderHeatmapChart - 渲染 GitHub 风格的热力图日历格子
    // ────────────────────────────────────────────────────────────
    function renderHeatmapChart(range) {
        const { startDate, endDate } = getHeatmapDateRange(range);
        const scheduleData = getScheduleData();
        const dateProjectMap = {};
        const dateNamesMap = {};

        Object.entries(scheduleData).forEach(([dateStr, projects]) => {
            const d = new Date(dateStr + 'T00:00:00');
            if (d < startDate || d > endDate) return;
            dateProjectMap[dateStr] = (projects || []).length;
            dateNamesMap[dateStr] = (projects || []).map(p => p.name).filter(Boolean);
        });

        if (!heatmapChart) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allCounts = Object.values(dateProjectMap);
        const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1;

        function getHeatColor(count) {
            if (count === 0) return '#ebedf0';
            const ratio = count / maxCount;
            if (ratio <= 0.25) return '#9be9a8';
            if (ratio <= 0.5) return '#40c463';
            if (ratio <= 0.75) return '#30a14e';
            return '#216e39';
        }

        const dates = [];
        const d = new Date(startDate);
        while (d <= endDate) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }

        const weeks = [];
        let currentWeek = [];
        dates.forEach((date) => {
            const dayOfWeek = (date.getDay() + 6) % 7;
            if (dayOfWeek === 0 && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(date);
        });
        if (currentWeek.length > 0) weeks.push(currentWeek);

        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

        let html = '<div class="heatmap-chart-inner">';
        html += '<div class="heatmap-chart-labels">';
        weekdays.forEach(w => { html += `<div class="heatmap-label-cell">${w}</div>`; });
        html += '</div>';
        html += '<div class="heatmap-chart-grid">';
        weeks.forEach(week => {
            html += '<div class="heatmap-chart-week">';
            const firstDayOfWeek = (week[0].getDay() + 6) % 7;
            for (let i = 0; i < firstDayOfWeek; i++) {
                html += '<div class="heatmap-cell heatmap-cell-empty"></div>';
            }
            week.forEach(date => {
                const dateStr = formatDate(date);
                const count = dateProjectMap[dateStr] || 0;
                const color = getHeatColor(count);
                const isToday = dateStr === formatDate(today);
                const names = dateNamesMap[dateStr] || [];
                const tooltip = names.length > 0
                    ? `${dateStr}\n${count}个项目: ${names.join(', ')}`
                    : `${dateStr}\n${count}个项目`;
                html += `<div class="heatmap-cell${isToday ? ' heatmap-cell-today' : ''}" style="background:${color}" title="${escapeHtml(tooltip)}"></div>`;
            });
            html += '</div>';
        });
        html += '</div>';
        html += '<div class="heatmap-chart-legend"><span>少</span>';
        ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'].forEach(c => {
            html += `<div class="heatmap-cell" style="background:${c}"></div>`;
        });
        html += '<span>多</span></div>';
        html += '</div>';

        heatmapChart.innerHTML = html;
    }

    // ────────────────────────────────────────────────────────────
    // renderBars - 排行榜条形图辅助函数（模块内部使用）
    // ────────────────────────────────────────────────────────────
    const medals = ['🥇', '🥈', '🥉'];

    function renderBars(container, dataObj, emptyMsg, showMedals) {
        if (!container) return;
        const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            container.innerHTML = `<div class="heatmap-empty">${emptyMsg}</div>`;
            return;
        }
        const maxVal = entries[0][1];
        container.innerHTML = entries.map(([label, count], index) => {
            const medal = showMedals && index < 3 ? medals[index] + ' ' : '';
            return `
            <div class="heatmap-bar-row${showMedals && index < 3 ? ' heatmap-bar-top' : ''}">
                <div class="heatmap-bar-label">${medal}${escapeHtml(label)}</div>
                <div class="heatmap-bar-track">
                    <div class="heatmap-bar-fill" style="width:${Math.round(count / maxVal * 100)}%"></div>
                </div>
                <div class="heatmap-bar-count">${count}</div>
            </div>`;
        }).join('');
    }

    // ────────────────────────────────────────────────────────────
    // renderHeatmapStats - 渲染排行榜和每日项目数统计
    // ────────────────────────────────────────────────────────────
    function renderHeatmapStats(range) {
        const { startDate, endDate } = getHeatmapDateRange(range);
        const scheduleData = getScheduleData();
        const roles = ['director', 'photographer', 'production', 'operational', 'rd', 'audio'];
        const personCount = {};
        const dayCount = {};

        Object.entries(scheduleData).forEach(([dateStr, projects]) => {
            const d = new Date(dateStr + 'T00:00:00');
            if (d < startDate || d > endDate) return;

            (projects || []).forEach(project => {
                const dayLabel = formatMonthDay(new Date(dateStr + 'T00:00:00'));
                dayCount[dayLabel] = (dayCount[dayLabel] || 0) + 1;

                roles.forEach(role => {
                    const val = project[role];
                    if (!val) return;
                    const raw = Array.isArray(val) ? val : [val];
                    const names = raw.flatMap(s => String(s).split(/[,，、]+/));
                    names.forEach(name => {
                        const n = (name || '').trim();
                        if (n && n !== '无' && n !== '-') {
                            personCount[n] = (personCount[n] || 0) + 1;
                        }
                    });
                });
            });
        });

        renderBars(personList, personCount, '该时间段暂无人员排期', true);
        renderBars(dayList, dayCount, '该时间段暂无项目', false);
    }

    // ────────────────────────────────────────────────────────────
    // showHeatmapModal - 显示热力图模态框
    // ────────────────────────────────────────────────────────────
    function showHeatmapModal() {
        const modal = document.getElementById('heatmap-modal');
        if (!modal) return;

        const closeBtn = document.getElementById('close-heatmap-modal');
        if (closeBtn) {
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }

        // Tab 切换（只控制排行榜和每日项目数）
        modal.querySelectorAll('.heatmap-tab-btn').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.heatmap-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                try {
                    renderHeatmapStats(btn.dataset.range);
                } catch (err) {
                    console.error('热力图统计渲染失败:', err);
                }
            };
        });

        modal.style.display = 'block';

        // 热力图固定为年度
        try {
            renderHeatmapChart('year');
        } catch (err) {
            console.error('热力图渲染失败:', err);
            if (heatmapChart) heatmapChart.innerHTML = `<div class="heatmap-empty">渲染失败: ${escapeHtml(err.message)}</div>`;
        }

        // 默认渲染"今日"排行榜
        const defaultTab = modal.querySelector('.heatmap-tab-btn[data-range="today"]');
        if (defaultTab) {
            modal.querySelectorAll('.heatmap-tab-btn').forEach(b => b.classList.remove('active'));
            defaultTab.classList.add('active');
        }
        try {
            renderHeatmapStats('today');
        } catch (err) {
            console.error('热力图统计渲染失败:', err);
        }
    }

    return {
        showHeatmapModal,
        getHeatmapDateRange,
        renderHeatmapChart,
        renderHeatmapStats,
    };
}
