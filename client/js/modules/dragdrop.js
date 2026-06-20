/**
 * 拖拽功能模块
 * 包含：拖拽开始、结束、经过、进入、离开、放置等事件处理
 */
import { getWeekDates, formatDate } from './date.js';

export function createDragdropModule(ctx) {
    const { getScheduleData, setScheduleData, getCurrentMonday, renderSchedule, showToast, persistScheduleDate, pushUndoSnapshot, cloneScheduleState } = ctx;

    // 模块级变量：记录拖拽源元素
    let dragSrcElement = null;

    // 拖拽开始
    function handleDragStart(e) {
        dragSrcElement = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        this.classList.add('dragging');
    }

    // 拖拽结束
    function handleDragEnd() {
        this.classList.remove('dragging');
        // 移除所有列的拖拽样式
        document.querySelectorAll('.day-column').forEach(column => {
            column.classList.remove('drag-over');
        });
    }

    // 拖拽经过
    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    // 拖拽进入
    function handleDragEnter() {
        this.classList.add('drag-over');
    }

    // 拖拽离开
    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    // 放置
    async function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        // 如果不是同一个元素
        if (dragSrcElement !== this) {
            // 获取源数据
            const srcDate = dragSrcElement.dataset.date;
            const srcIndex = parseInt(dragSrcElement.dataset.index);

            // 获取目标日期
            const weekDates = getWeekDates(getCurrentMonday());
            const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            // 找到目标列对应的日期
            let targetDate = null;
            for (let i = 0; i < dayColumns.length; i++) {
                const column = document.getElementById(dayColumns[i]);
                if (column === this) {
                    targetDate = formatDate(weekDates[i]);
                    break;
                }
            }

            if (targetDate) {
                const beforeState = cloneScheduleState();
                const scheduleData = getScheduleData();
                try {
                    // 移动项目
                    const project = scheduleData[srcDate][srcIndex];

                    // 从源日期中移除
                    scheduleData[srcDate].splice(srcIndex, 1);
                    if (scheduleData[srcDate].length === 0) {
                        delete scheduleData[srcDate];
                    }

                    // 添加到目标日期
                    if (!scheduleData[targetDate]) {
                        scheduleData[targetDate] = [];
                    }
                    scheduleData[targetDate].push(project);

                    // 同步源日期和目标日期
                    await persistScheduleDate(srcDate);
                    await persistScheduleDate(targetDate);

                    // 重新渲染
                    pushUndoSnapshot('拖拽移动项目', beforeState, scheduleData);
                    renderSchedule();
                    showToast('项目已移动', 'success');
                } catch (error) {
                    console.error('拖拽项目时出错:', error);
                    setScheduleData(beforeState);
                    showToast(error.message || '拖拽项目时出错，请重试', 'error');
                }
            }
        }

        return false;
    }

    return { handleDragStart, handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave, handleDrop };
}
