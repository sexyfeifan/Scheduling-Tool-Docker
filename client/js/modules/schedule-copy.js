/**
 * schedule-copy.js — 复制项目
 * 包含：showCopyModal
 */
import { getWeekDates, formatDate } from './date.js';

export function createScheduleCopyModule(ctx) {
    const {
        getScheduleData, setScheduleData, getCurrentMonday,
        scheduleAPI, showToast,
        cloneScheduleState, pushUndoSnapshot, renderSchedule,
        persistScheduleDate, withEditAccess, apiClient,
    } = ctx;

    let copyProjectData = null;

    function showCopyModal(dateStr, projectIndex) {
        const scheduleData = getScheduleData();
        const project = scheduleData[dateStr][projectIndex];
        copyProjectData = { ...project };

        const modal = document.getElementById('copy-modal');
        if (!modal) return;

        const weekDates = getWeekDates(getCurrentMonday());
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

        const dateSelection = document.getElementById('copy-date-selection');
        if (dateSelection) {
            dateSelection.innerHTML = '';
            weekDates.forEach((date, index) => {
                const dateStrOption = formatDate(date);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tag-btn';
                btn.dataset.date = dateStrOption;
                btn.textContent = `${weekdays[index]} ${date.getMonth() + 1}/${date.getDate()}`;
                btn.addEventListener('click', () => {
                    dateSelection.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                dateSelection.appendChild(btn);
            });
        }

        const confirmBtn = document.getElementById('copy-confirm-btn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                const selectedBtn = dateSelection ? dateSelection.querySelector('.tag-btn.active') : null;
                if (!selectedBtn) {
                    showToast('请选择目标日期', 'warning');
                    return;
                }
                const targetDate = selectedBtn.dataset.date;
                const beforeState = cloneScheduleState();

                try {
                    const newProject = { ...copyProjectData, name: copyProjectData.name + ' (副本)' };
                    const currentScheduleData = getScheduleData();
                    if (!currentScheduleData[targetDate]) currentScheduleData[targetDate] = [];
                    currentScheduleData[targetDate].push(newProject);
                    setScheduleData(currentScheduleData);
                    await persistScheduleDate(targetDate);
                    pushUndoSnapshot('复制项目', beforeState, currentScheduleData);
                    renderSchedule();
                    showToast('项目已复制', 'success');
                    modal.style.display = 'none';
                } catch (error) {
                    console.error('复制项目失败:', error);
                    setScheduleData(beforeState);
                    showToast(error.message || '复制项目失败', 'error');
                }
            };
        }

        modal.style.display = 'block';
    }

    return { showCopyModal };
}
