/**
 * schedule.js — 排期核心（精简版）
 * 包含：persistScheduleDate, cloneScheduleState, collectDatesFromStates,
 *       syncScheduleDates, pushUndoSnapshot, undoLastChange,
 *       renderSchedule, loadScheduleData, deleteProject, loadHistoryRecords
 */
import { getWeekDates, formatDate, formatMonthDay } from './date.js';
import { createDefaultFilters, matchesProjectFilters } from './filters.js';

export function createScheduleModule(ctx) {
    const {
        getScheduleData, setScheduleData, getCurrentMonday,
        getRoleCategories, getFilterState,
        apiClient, scheduleAPI, undoManager,
        showToast, showLoading, hideLoading, escapeHtml,
        updateUndoButton, withEditAccess,
        createProjectCard, showProjectModal,
    } = ctx;

    let scheduleData = getScheduleData();

    async function persistScheduleDate(dateStr) {
        const projects = scheduleData[dateStr] || [];
        if (projects.length === 0) {
            try {
                await withEditAccess(() => apiClient.deleteSchedule(dateStr));
            } catch (error) {
                if (!/404|未找到/.test(error.message || '')) {
                    await withEditAccess(() => apiClient.saveSchedule({
                        date: dateStr,
                        projects: []
                    }));
                }
            }
            return;
        }
        await withEditAccess(() => apiClient.saveSchedule({
            date: dateStr,
            projects
        }));
    }

    function cloneScheduleState() {
        return JSON.parse(JSON.stringify(scheduleData));
    }

    function collectDatesFromStates(...states) {
        return [...new Set(states.flatMap((state) => Object.keys(state || {})))];
    }

    async function syncScheduleDates(dateList) {
        const uniqueDates = [...new Set((dateList || []).filter(Boolean))];
        for (const date of uniqueDates) {
            await persistScheduleDate(date);
        }
    }

    function pushUndoSnapshot(label, beforeState, afterState) {
        undoManager.push({ label, before: beforeState, after: afterState });
        updateUndoButton();
    }

    async function undoLastChange() {
        const snapshot = undoManager.pop();
        updateUndoButton();
        if (!snapshot) return;

        scheduleData = JSON.parse(JSON.stringify(snapshot.before));
        setScheduleData(scheduleData);
        await syncScheduleDates(collectDatesFromStates(snapshot.before, snapshot.after));
        renderSchedule();
        showToast(`已撤销：${snapshot.label}`, 'success');
    }

    function renderSchedule() {
        scheduleData = getScheduleData();
        const weekDates = getWeekDates(getCurrentMonday());
        const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
        const filterState = getFilterState();
        const roleCategories = getRoleCategories();

        const today = new Date();
        const todayStr = formatDate(today);

        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        dayHeaders.forEach((headerId, index) => {
            const header = document.getElementById(headerId);
            const date = weekDates[index];
            const dateStr = formatDate(date);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            header.innerHTML = `${weekdays[index]} (${month}/${day}) <button class="notice-day-btn" data-date="${dateStr}">通告单</button><button class="sort-day-btn" data-date="${dateStr}" title="按开始时间一键排序">⇅ 排序</button>`;
            if (dateStr === todayStr) {
                header.classList.add('today-highlight');
            } else {
                header.classList.remove('today-highlight');
            }
        });

        dayColumns.forEach((columnId, index) => {
            const column = document.getElementById(columnId);
            const dateStr = formatDate(weekDates[index]);

            if (dateStr === todayStr) {
                column.classList.add('today-highlight');
            } else {
                column.classList.remove('today-highlight');
            }

            column.innerHTML = '';

            const addBtn = document.createElement('button');
            addBtn.className = 'add-btn';
            addBtn.innerHTML = '+';
            addBtn.title = '点击添加项目';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ctx.showProjectModal(dateStr);
            });
            column.appendChild(addBtn);

            column.addEventListener('dragover', ctx.handleDragOver);
            column.addEventListener('dragenter', ctx.handleDragEnter);
            column.addEventListener('dragleave', ctx.handleDragLeave);
            column.addEventListener('drop', ctx.handleDrop);

            const projects = scheduleData[dateStr] || [];
            const filteredProjects = projects.filter((project, idx) => {
                if (!matchesProjectFilters(project, filterState)) return false;
                return true;
            });

            filteredProjects.forEach((project, idx) => {
                const originalIndex = projects.indexOf(project);
                const card = createProjectCard(project, dateStr, originalIndex);
                column.appendChild(card);
            });
        });

        // 更新周显示
        const weekDisplay = document.getElementById('week-display');
        if (weekDisplay) {
            const weekNumber = getWeekNumber(getCurrentMonday());
            const startDate = weekDates[0];
            const endDate = weekDates[6];
            weekDisplay.textContent = `第${weekNumber}周 ${formatMonthDay(startDate)} - ${formatMonthDay(endDate)}`;
        }
    }

    async function loadScheduleData() {
        try {
            const data = await scheduleAPI.getSchedules();
            scheduleData = data;
            setScheduleData(scheduleData);
            renderSchedule();
        } catch (error) {
            console.error('加载排期数据时出错:', error);
            scheduleData = {};
            setScheduleData(scheduleData);
            renderSchedule();
        }
    }

    async function deleteProject(dateStr, projectIndex) {
        const project = scheduleData[dateStr][projectIndex];
        const projectName = project ? project.name : '该项目';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `display:flex;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5);align-items:center;justify-content:center;`;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `background-color:white;padding:25px;border-radius:8px;max-width:400px;width:90%;text-align:center;box-shadow:0 4px 6px rgba(0,0,0,0.1);`;

        modalContent.innerHTML = `
            <h3 style="margin-top:0;color:#2c3e50">确认删除</h3>
            <p style="color:#7f8c8d">确定要删除项目 "<strong>${escapeHtml(projectName)}</strong>" 吗？</p>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
                <button id="cancel-delete" style="padding:8px 20px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer">取消</button>
                <button id="confirm-delete" style="padding:8px 20px;border:none;border-radius:4px;background:#e74c3c;color:white;cursor:pointer">删除</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        return new Promise((resolve) => {
            modalContent.querySelector('#cancel-delete').onclick = () => {
                modal.remove();
                resolve(false);
            };
            modalContent.querySelector('#confirm-delete').onclick = async () => {
                const beforeState = cloneScheduleState();
                try {
                    scheduleData[dateStr].splice(projectIndex, 1);
                    if (scheduleData[dateStr].length === 0) {
                        delete scheduleData[dateStr];
                    }
                    setScheduleData(scheduleData);
                    await persistScheduleDate(dateStr);
                    pushUndoSnapshot('删除项目', beforeState, scheduleData);
                    renderSchedule();
                    showToast('项目已删除', 'success');
                    modal.remove();
                    resolve(true);
                } catch (error) {
                    console.error('删除项目时出错:', error);
                    setScheduleData(beforeState);
                    showToast(error.message || '删除项目时出错', 'error');
                    modal.remove();
                    resolve(false);
                }
            };
        });
    }

    async function loadHistoryRecords() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        historyList.innerHTML = '<p style="color:var(--text-secondary)">加载中...</p>';
        try {
            const records = await scheduleAPI.getHistory();
            if (!records || records.length === 0) {
                historyList.innerHTML = '<p class="no-history">暂无操作记录</p>';
                return;
            }
            historyList.innerHTML = '';
            records.slice(0, 50).forEach(record => {
                const item = document.createElement('div');
                item.className = 'history-item';
                const time = new Date(record.timestamp).toLocaleString();
                item.innerHTML = `
                    <div class="history-item-info">
                        <span class="history-item-action">${escapeHtml(record.action || '')}</span>
                        <span class="history-item-time">${escapeHtml(time)}</span>
                    </div>
                    <div class="history-item-detail">${escapeHtml(record.detail || '')}</div>
                `;
                historyList.appendChild(item);
            });
        } catch (error) {
            historyList.innerHTML = '<p style="color:var(--red-accent)">加载失败</p>';
        }
    }

    return {
        persistScheduleDate,
        cloneScheduleState,
        collectDatesFromStates,
        syncScheduleDates,
        pushUndoSnapshot,
        undoLastChange,
        renderSchedule,
        loadScheduleData,
        deleteProject,
        loadHistoryRecords
    };
}
