/**
 * modal-project.js — 项目编辑模态框
 * 包含：showProjectModal, showDatePicker, renderCalendar, confirmDateSelection, editProject, saveProject
 */

import { getWeekDates, formatDate } from './date.js';

export function createModalProjectModule(ctx) {
    const {
        getScheduleData, setScheduleData,
        getCurrentMonday,
        showToast, escapeHtml,
        renderSchedule,
        persistScheduleDate, cloneScheduleState, pushUndoSnapshot,
        updateProjectFormOptions, initStartTimeOptions,
        getProjectRoleValues, setProjectRoleValues,
        renderTemplateList, populateTemplateSelect,
        loadAccessSettings,
        getCheckedValues, setCheckedValues,
    } = ctx;

    // ── 局部状态 ──
    let currentEditingProject = null;
    let currentEditingDay = null;
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedDate = null;

    // ── DOM 引用 ──
    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    const projectNameInput = document.getElementById('project-name');
    const projectDateInput = document.getElementById('project-date');
    const projectTypeSelect = document.getElementById('project-type');
    const projectStartTimeSelect = document.getElementById('project-start-time');
    const projectLaodaoCheckbox = document.getElementById('project-laodao');
    const projectTemplateSelect = document.getElementById('project-template-select');
    const locationOptionsDiv = document.getElementById('project-location-options');

    const projectAdvertiserCheckbox = document.getElementById('project-advertiser');
    const advertiserNoWrap = document.getElementById('advertiser-no-wrap');
    const projectAdvertiserNoInput = document.getElementById('project-advertiser-no');

    const datePickerModal = document.getElementById('date-picker-modal');
    const currentMonthYearSpan = document.getElementById('current-month-year');
    const calendarDaysDiv = document.getElementById('calendar-days');
    const selectedDateDisplaySpan = document.getElementById('selected-date-display');

    // ─────────────────────────────────────────────────────────
    // showProjectModal
    // ─────────────────────────────────────────────────────────
    function showProjectModal(dayColumn = null) {
        // 重置表单
        projectForm.reset();
        currentEditingProject = null;
        currentEditingDay = dayColumn;

        // 更新选项
        updateProjectFormOptions();

        // 重置 tag 按钮
        document.querySelectorAll('#project-modal .tag-btn').forEach(btn => btn.classList.remove('active'));
        projectLaodaoCheckbox.checked = false;
        projectTemplateSelect.value = '';

        // 设置默认日期：如果指定了日期则使用，否则使用当前周的周一
        if (dayColumn && dayColumn.includes('-')) {
            // dayColumn 是日期字符串 (如 "2024-01-15")
            projectDateInput.value = dayColumn;
        } else {
            const defaultDate = formatDate(getWeekDates(getCurrentMonday())[0]);
            projectDateInput.value = defaultDate;
        }

        projectModal.style.display = 'block';
        projectNameInput.focus();
    }

    // ─────────────────────────────────────────────────────────
    // showDatePicker
    // ─────────────────────────────────────────────────────────
    function showDatePicker() {
        // 设置当前月份和年份为选中日期或当前日期
        if (projectDateInput.value) {
            const dateParts = projectDateInput.value.split('-');
            currentYear = parseInt(dateParts[0]);
            currentMonth = parseInt(dateParts[1]) - 1;
            selectedDate = new Date(projectDateInput.value);
        } else {
            currentYear = new Date().getFullYear();
            currentMonth = new Date().getMonth();
            selectedDate = null;
        }

        renderCalendar();
        datePickerModal.style.display = 'block';
    }

    // ─────────────────────────────────────────────────────────
    // renderCalendar
    // ─────────────────────────────────────────────────────────
    function renderCalendar() {
        // 更新月份年份显示
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        currentMonthYearSpan.textContent = `${currentYear}年 ${monthNames[currentMonth]}`;

        // 清空日历
        calendarDaysDiv.innerHTML = '';

        // 获取月份的第一天和最后一天
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        // 获取第一天是星期几 (周一=0, 周日=6)
        const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

        // 获取上个月的最后一天
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

        // 添加上个月的日期
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = document.createElement('div');
            day.className = 'day other-month';
            day.textContent = prevMonthLastDay - i;
            calendarDaysDiv.appendChild(day);
        }

        // 添加当前月的日期
        const today = new Date();
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const day = document.createElement('div');
            day.className = 'day';
            day.textContent = i;

            // 检查是否是今天
            if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && i === today.getDate()) {
                day.classList.add('today');
            }

            // 检查是否是选中的日期
            if (selectedDate &&
                selectedDate.getFullYear() === currentYear &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getDate() === i) {
                day.classList.add('selected');
            }

            // 添加点击事件
            day.addEventListener('click', () => {
                // 移除其他选中状态
                document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));

                // 设置选中状态
                day.classList.add('selected');

                // 设置选中的日期
                selectedDate = new Date(currentYear, currentMonth, i);

                // 更新选中日期显示
                selectedDateDisplaySpan.textContent = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            });

            calendarDaysDiv.appendChild(day);
        }

        // 添加下个月的日期（填充到7x6网格）
        const totalCells = 42; // 7天 x 6行
        const remainingCells = totalCells - (firstDayOfWeek + lastDay.getDate());
        for (let i = 1; i <= remainingCells; i++) {
            const day = document.createElement('div');
            day.className = 'day other-month';
            day.textContent = i;
            calendarDaysDiv.appendChild(day);
        }

        // 更新选中日期显示
        if (selectedDate) {
            selectedDateDisplaySpan.textContent = formatDate(selectedDate);
        } else {
            selectedDateDisplaySpan.textContent = '未选择';
        }
    }

    // ─────────────────────────────────────────────────────────
    // confirmDateSelection
    // ─────────────────────────────────────────────────────────
    function confirmDateSelection() {
        if (selectedDate) {
            projectDateInput.value = formatDate(selectedDate);
        }
        datePickerModal.style.display = 'none';
    }

    // ─────────────────────────────────────────────────────────
    // editProject
    // ─────────────────────────────────────────────────────────
    function editProject(dateStr, projectIndex) {
        const scheduleData = getScheduleData();
        const project = scheduleData[dateStr][projectIndex];
        currentEditingProject = { date: dateStr, index: projectIndex };

        // 更新选项
        updateProjectFormOptions();

        // 填充表单数据
        projectNameInput.value = project.name || '';
        projectDateInput.value = dateStr;
        projectStartTimeSelect.value = project.startTime || '';

        // 设置拍摄地（单选）
        setCheckedValues(locationOptionsDiv, project.location || '');

        // 设置各职能（动态）
        setProjectRoleValues(project);

        // 设置老刀出镜选项
        projectLaodaoCheckbox.checked = project.laodao || false;

        // 设置广告商单
        if (projectAdvertiserCheckbox) {
            projectAdvertiserCheckbox.checked = project.isAdvertiser || false;
            if (advertiserNoWrap) {
                advertiserNoWrap.style.display = projectAdvertiserCheckbox.checked ? 'block' : 'none';
            }
        }
        if (projectAdvertiserNoInput) {
            projectAdvertiserNoInput.value = project.advertiserNo || '';
        }

        projectTypeSelect.value = project.type || '';

        // 设置项目状态
        const projectStatusSelect = document.getElementById('project-status');
        if (projectStatusSelect) projectStatusSelect.value = project.status || '已确认';

        projectModal.style.display = 'block';
        projectNameInput.focus();
    }

    // ─────────────────────────────────────────────────────────
    // saveProject
    // ─────────────────────────────────────────────────────────
    async function saveProject() {
        const beforeState = cloneScheduleState();
        let scheduleData = getScheduleData();

        const roleValues = getProjectRoleValues();
        const project = {
            name: projectNameInput.value,
            location: getCheckedValues(locationOptionsDiv),
            ...roleValues,
            laodao: projectLaodaoCheckbox.checked,
            isAdvertiser: projectAdvertiserCheckbox ? projectAdvertiserCheckbox.checked : false,
            advertiserNo: (projectAdvertiserCheckbox && projectAdvertiserCheckbox.checked && projectAdvertiserNoInput) ? projectAdvertiserNoInput.value.trim() : '',
            type: projectTypeSelect.value,
            startTime: projectStartTimeSelect.value,
            status: (document.getElementById('project-status') || {}).value || '已确认'
        };

        if (!project.name) {
            showToast('请输入项目名称', 'warning');
            return;
        }

        // 获取项目日期
        let projectDate = projectDateInput.value;
        if (!projectDate) {
            // 如果没有选择日期，默认使用当前周的周一
            const weekDates = getWeekDates(getCurrentMonday());
            projectDate = formatDate(weekDates[0]);
        }

        try {
            const sourceDate = currentEditingProject ? currentEditingProject.date : null;

            if (currentEditingProject) {
                // 更新现有项目
                if (!scheduleData[currentEditingProject.date]) {
                    scheduleData[currentEditingProject.date] = [];
                }
                scheduleData[currentEditingProject.date][currentEditingProject.index] = project;

                // 如果日期改变了，需要移动项目到新的日期
                if (currentEditingProject.date !== projectDate) {
                    // 从原日期移除项目
                    scheduleData[currentEditingProject.date].splice(currentEditingProject.index, 1);
                    if (scheduleData[currentEditingProject.date].length === 0) {
                        delete scheduleData[currentEditingProject.date];
                    }

                    // 添加到新日期
                    if (!scheduleData[projectDate]) {
                        scheduleData[projectDate] = [];
                    }
                    scheduleData[projectDate].push(project);
                }
            } else {
                // 添加新项目到指定日期
                if (!scheduleData[projectDate]) {
                    scheduleData[projectDate] = [];
                }
                scheduleData[projectDate].push(project);
            }

            setScheduleData(scheduleData);

            // 保存目标日期
            await persistScheduleDate(projectDate);
            // 如果是跨日期编辑，还要同步源日期，防止源日期残留旧项目
            if (sourceDate && sourceDate !== projectDate) {
                await persistScheduleDate(sourceDate);
            }

            // 关闭模态框并重新渲染
            projectModal.style.display = 'none';
            pushUndoSnapshot(currentEditingProject ? '编辑项目' : '新增项目', beforeState, getScheduleData());
            renderSchedule();
            showToast(currentEditingProject ? '项目已更新' : '项目已创建', 'success');
        } catch (error) {
            console.error('保存项目时出错:', error);
            setScheduleData(beforeState);
            showToast(error.message || '保存项目时出错，请重试', 'error');
        }
    }

    return {
        showProjectModal,
        showDatePicker,
        renderCalendar,
        confirmDateSelection,
        editProject,
        saveProject,
    };
}
