/**
 * modal.js — 模态框管理模块
 * 从 main.js 提取的所有模态框相关函数：
 * showProjectModal, showDatePicker, renderCalendar, confirmDateSelection,
 * editProject, saveProject, showSettingsModal, renderBackupListFromData,
 * showMultiProjectDateSelectionModal, showExportModal, showWebhookPushModal,
 * showAdminModal
 *
 * 使用工厂函数模式，通过 ctx 注入共享状态和依赖。
 */

import { getWeekDates, formatDate } from './date.js';

export function createModalModule(ctx) {
    const {
        getScheduleData, setScheduleData,
        getCurrentMonday,
        getAdminPassword, setAdminPassword,
        getRoleCategories, setRoleCategories,
        scheduleAPI, settingAPI, backupAPI, apiClient,
        showToast, showLoading, hideLoading, escapeHtml,
        renderSchedule, loadScheduleData,
        persistScheduleDate, cloneScheduleState, pushUndoSnapshot,
        updateProjectFormOptions, initStartTimeOptions,
        getProjectRoleValues, setProjectRoleValues,
        renderRoleSettings, renderTemplateList, populateTemplateSelect,
        loadWebhookSettings,
        loadAccessSettings,
        loadHistoryRecords,
        setupBackupEvents,
        openBackupPreview,
        getCheckedValues, setCheckedValues,
        drawScheduleToCanvas,
    } = ctx;

    // ── 模块级状态 ──
    let currentEditingProject = null;
    let currentEditingDay = null;

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedDate = null;

    // webhook 模态框状态
    let webhookPushMode = null;   // 'daily' or 'weekly'
    let webhookSelectedDate = null;
    let webhookSelectedRange = null;

    // ── DOM 引用（模块内自行查询） ──
    const projectModal = document.getElementById('project-modal');
    const settingsModal = document.getElementById('settings-modal');

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

    const exportModal = document.getElementById('export-modal');
    const downloadImageBtn = document.getElementById('download-image');
    const openInNewTabBtn = document.getElementById('open-in-new-tab');
    const exportCrossWeekCheckbox = document.getElementById('export-cross-week');
    const exportDateRangeDiv = document.getElementById('export-date-range');
    const exportStartDateInput = document.getElementById('export-start-date');
    const exportEndDateInput = document.getElementById('export-end-date');

    // ── 加载备份列表（供 showAdminModal 内部使用） ──
    async function loadBackupList() {
        const backupList = document.getElementById('backup-list');
        if (!backupList) return;

        try {
            const backups = await backupAPI.getBackups();

            if (backups.length === 0) {
                backupList.innerHTML = '<p class="no-backup">暂无备份记录</p>';
                return;
            }

            renderBackupListFromData(backups);
        } catch (error) {
            console.error('加载备份列表失败:', error);
            backupList.innerHTML = '<p class="no-backup">加载失败，请重试</p>';
        }
    }

    // ─────────────────────────────────────────────────────────
    // 1. showProjectModal
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
    // 2. showDatePicker
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
    // 3. renderCalendar
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
    // 4. confirmDateSelection
    // ─────────────────────────────────────────────────────────
    function confirmDateSelection() {
        if (selectedDate) {
            projectDateInput.value = formatDate(selectedDate);
        }
        datePickerModal.style.display = 'none';
    }

    // ─────────────────────────────────────────────────────────
    // 5. editProject
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
    // 6. saveProject
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

    // ─────────────────────────────────────────────────────────
    // 7. showSettingsModal
    // ─────────────────────────────────────────────────────────
    function showSettingsModal() {
        settingsModal.style.display = 'block';
        renderTemplateList();
    }

    // ─────────────────────────────────────────────────────────
    // 8. renderBackupListFromData
    // ─────────────────────────────────────────────────────────
    /**
     * 从备份数据渲染列表（供删除后直接刷新，无需重新请求）
     */
    function renderBackupListFromData(backups) {
        const backupList = document.getElementById('backup-list');
        if (!backupList) return;

        if (!backups || backups.length === 0) {
            backupList.innerHTML = '<p class="no-backup">暂无备份记录</p>';
            return;
        }

        backupList.innerHTML = '';
        backups.slice(0, 10).forEach(backup => {
            const nameMatch = (backup.name || '').match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
            const displayDate = nameMatch ? nameMatch[1] : backup.date;
            const displayTime = nameMatch ? nameMatch[2].replace(/-/g, ':') : new Date(backup.time).toLocaleTimeString();

            const item = document.createElement('div');
            item.className = 'backup-item';
            item.innerHTML = `
                <div class="backup-item-info">
                    <span class="backup-item-date">${escapeHtml(displayDate)}</span>
                    <span class="backup-item-time">${escapeHtml(displayTime)} · ${backup.projectsCount || 0}个项目</span>
                </div>
                <div class="backup-item-actions">
                    <button class="btn restore-backup-btn" data-path="${escapeHtml(backup.path)}">预览并恢复</button>
                    <button class="btn delete-backup-btn" data-path="${escapeHtml(backup.path)}" style="color:#e74c3c;">🗑 删除</button>
                </div>
            `;
            backupList.appendChild(item);
        });

        // 绑定恢复按钮事件
        backupList.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const backupPath = e.target.dataset.path;
                try {
                    await openBackupPreview(backupPath);
                } catch (error) {
                    showToast(error.message || '读取备份预览失败', 'error');
                }
            });
        });

        // 绑定删除按钮事件
        backupList.querySelectorAll('.delete-backup-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const backupPath = e.target.dataset.path;
                if (!confirm('确定要删除这个备份吗？此操作不可恢复。')) return;
                try {
                    showLoading('正在删除...');
                    const result = await backupAPI.deleteBackup(backupPath);
                    hideLoading();
                    showToast('备份已删除', 'success');
                    if (result && result.backups) {
                        renderBackupListFromData(result.backups);
                    } else {
                        await loadBackupList();
                    }
                } catch (error) {
                    hideLoading();
                    showToast(error.message || '删除备份失败', 'error');
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────
    // 9. showMultiProjectDateSelectionModal
    // ─────────────────────────────────────────────────────────
    function showMultiProjectDateSelectionModal(projectNames) {
        // 创建模态框元素
        const modal = document.createElement('div');
        modal.id = 'date-selection-modal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: block;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        `;

        // 创建模态框内容
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background-color: white;
            margin: 5% auto;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        // 添加标题
        const title = document.createElement('h2');
        title.textContent = '选择日期 - 多项目';
        title.style.cssText = `
            margin-top: 0;
            color: #2c3e50;
        `;

        // 添加项目列表显示
        const projectListDiv = document.createElement('div');
        projectListDiv.style.cssText = `
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            max-height: 150px;
            overflow-y: auto;
        `;

        const projectListTitle = document.createElement('strong');
        projectListTitle.textContent = '识别到的项目 (' + projectNames.length + '个):';
        projectListDiv.appendChild(projectListTitle);

        const projectList = document.createElement('ul');
        projectList.style.cssText = `
            margin: 10px 0 0 0;
            padding-left: 20px;
        `;

        projectNames.forEach((name, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${index + 1}. ${name}`;
            projectList.appendChild(listItem);
        });

        projectListDiv.appendChild(projectList);

        // 创建日期选择区域
        const dateSelectionArea = document.createElement('div');
        dateSelectionArea.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        `;

        // 获取当前周的日期
        const weekDates = getWeekDates(getCurrentMonday());
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

        // 为每一天创建按钮
        for (let i = 0; i < 7; i++) {
            const dayButton = document.createElement('button');
            dayButton.className = 'btn';
            dayButton.style.cssText = `
                padding: 15px;
                text-align: center;
                background-color: #ecf0f1;
            `;

            const date = weekDates[i];
            const month = date.getMonth() + 1;
            const day = date.getDate();

            dayButton.innerHTML = `
                <div>${weekdays[i]}</div>
                <div style="font-size: 12px; margin-top: 5px;">${month}/${day}</div>
            `;

            // 添加点击事件
            dayButton.addEventListener('click', () => {
                // 关闭模态框
                document.body.removeChild(modal);

                // 为所有项目创建新项目
                createMultipleProjects(projectNames, date);
            });

            dateSelectionArea.appendChild(dayButton);
        }

        // 添加取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn';
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            background-color: #95a5a6;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 组装模态框
        modalContent.appendChild(title);
        modalContent.appendChild(projectListDiv);
        modalContent.appendChild(dateSelectionArea);
        modalContent.appendChild(cancelButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    // ── 内部辅助：批量创建项目（供 showMultiProjectDateSelectionModal 调用） ──
    async function createMultipleProjects(projectNames, date) {
        const beforeState = cloneScheduleState();
        try {
            const dateStr = formatDate(date);
            let scheduleData = getScheduleData();

            // 如果该日期还没有项目数组，则创建一个
            if (!scheduleData[dateStr]) {
                scheduleData[dateStr] = [];
            }

            // 为每个项目名称创建项目
            const newProjects = projectNames.map(name => ({
                name: name,
                location: '',
                director: '',
                photographer: '',
                startTime: '',
                type: '平面'
            }));

            // 将新项目添加到日期的项目数组中
            scheduleData[dateStr].push(...newProjects);

            setScheduleData(scheduleData);

            // 保存到API
            await scheduleAPI.saveSchedule({
                date: dateStr,
                projects: scheduleData[dateStr]
            });

            // 重新渲染
            pushUndoSnapshot('粘贴识别创建项目', beforeState, getScheduleData());
            renderSchedule();

            showToast(`成功创建 ${projectNames.length} 个项目`, 'success');
        } catch (error) {
            console.error('创建项目时出错:', error);
            setScheduleData(beforeState);
            showToast('创建项目时出错，请重试', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────
    // 10. showExportModal
    // ─────────────────────────────────────────────────────────
    function showExportModal() {
        // 设置默认日期
        const weekDates = getWeekDates(getCurrentMonday());
        if (exportStartDateInput) exportStartDateInput.value = formatDate(weekDates[0]);
        if (exportEndDateInput) exportEndDateInput.value = formatDate(weekDates[6]);
        if (exportCrossWeekCheckbox) exportCrossWeekCheckbox.checked = false;
        if (exportDateRangeDiv) exportDateRangeDiv.style.display = 'none';

        exportModal.style.display = 'block';
        downloadImageBtn.disabled = true;
        openInNewTabBtn.disabled = true;
        downloadImageBtn.textContent = '生成中…';
        openInNewTabBtn.textContent = '生成中…';
        drawScheduleToCanvas();
    }

    // ─────────────────────────────────────────────────────────
    // 11. showWebhookPushModal
    // ─────────────────────────────────────────────────────────
    function showWebhookPushModal() {
        const modal = document.getElementById('webhook-push-modal');
        if (!modal) return;
        webhookPushMode = null;
        webhookSelectedDate = null;
        webhookSelectedRange = null;
        document.getElementById('webhook-push-daily-section').style.display = 'none';
        document.getElementById('webhook-push-weekly-section').style.display = 'none';
        document.getElementById('webhook-push-confirm').disabled = true;

        // 生成本周日期选项
        const weekDates = getWeekDates(getCurrentMonday());
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const dailyContainer = document.getElementById('webhook-daily-dates');
        dailyContainer.innerHTML = '';
        weekDates.forEach((date, i) => {
            const dateStr = formatDate(date);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tag-btn';
            btn.dataset.value = dateStr;
            btn.textContent = `${weekdays[i]} ${date.getMonth()+1}/${date.getDate()}`;
            btn.addEventListener('click', () => {
                dailyContainer.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                webhookSelectedDate = dateStr;
                document.getElementById('webhook-push-confirm').disabled = false;
            });
            dailyContainer.appendChild(btn);
        });

        // 生成周选项（前后各2周）
        const weeklyContainer = document.getElementById('webhook-weekly-ranges');
        weeklyContainer.innerHTML = '';
        for (let i = -2; i <= 2; i++) {
            const monday = new Date(getCurrentMonday());
            monday.setDate(monday.getDate() + (i * 7));
            const dates = getWeekDates(monday);
            const startStr = formatDate(dates[0]);
            const endStr = formatDate(dates[6]);
            const label = i === 0 ? '本周' : i === -1 ? '上一周' : i === 1 ? '下一周' : `${startStr.slice(5)} ~ ${endStr.slice(5)}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tag-btn';
            btn.dataset.start = startStr;
            btn.dataset.end = endStr;
            btn.textContent = label;
            btn.addEventListener('click', () => {
                weeklyContainer.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                webhookSelectedRange = { startDate: startStr, endDate: endStr };
                document.getElementById('webhook-push-confirm').disabled = false;
            });
            weeklyContainer.appendChild(btn);
        }

        modal.style.display = 'block';
    }

    // ─────────────────────────────────────────────────────────
    // 12. showAdminModal
    // ─────────────────────────────────────────────────────────
    function showAdminModal() {
        const modal = document.getElementById('admin-modal');
        if (!modal) return;

        const passwordSection = document.getElementById('admin-password-section');
        const unlockedContent = document.getElementById('admin-unlocked-content');
        const passwordInput = document.getElementById('admin-password-input');
        const confirmBtn = document.getElementById('confirm-admin-password');
        const closeBtn = document.getElementById('close-admin-modal');

        // 重置为密码输入状态（每次打开都要求重新验证以防会话变更）
        if (getAdminPassword()) {
            passwordSection.style.display = 'none';
            unlockedContent.style.display = 'flex';
            setupBackupEvents();
            loadBackupList();
            loadAccessSettings();
            loadHistoryRecords();
            loadWebhookSettings();
        } else {
            passwordSection.style.display = 'block';
            unlockedContent.style.display = 'none';
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }

        // 关闭按钮
        if (closeBtn) {
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }

        // 确认密码
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                const pwd = passwordInput ? passwordInput.value : '';
                if (!pwd) { showToast('请输入密码', 'warning'); return; }
                try {
                    const result = await backupAPI.verifyPassword(pwd);
                    if (result && result.valid) {
                        setAdminPassword(pwd);
                        passwordSection.style.display = 'none';
                        unlockedContent.style.display = 'flex';
                        setupBackupEvents();
                        loadBackupList();
                        loadAccessSettings();
                        loadHistoryRecords();
                        loadWebhookSettings();
                        showToast('解锁成功', 'success');
                    } else {
                        showToast('密码错误', 'error');
                    }
                } catch (err) {
                    showToast('验证失败', 'error');
                }
            };
        }

        if (passwordInput) {
            passwordInput.onkeypress = (e) => {
                if (e.key === 'Enter' && confirmBtn) confirmBtn.click();
            };
        }

        // Tab 切换
        modal.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.admin-tab-panel').forEach(p => p.style.display = 'none');
                btn.classList.add('active');
                const panel = document.getElementById(`admin-tab-${btn.dataset.tab}`);
                if (panel) panel.style.display = 'block';
            };
        });

        // 操作记录刷新按钮
        const historyRefreshBtn = document.getElementById('history-refresh-btn');
        if (historyRefreshBtn) {
            historyRefreshBtn.onclick = loadHistoryRecords;
        }

        // 操作记录清空按钮
        const historyClearBtn = document.getElementById('history-clear-btn');
        if (historyClearBtn) {
            historyClearBtn.onclick = async () => {
                if (!confirm('确定要清空所有操作记录吗？此操作不可恢复。')) return;
                try {
                    await apiClient.clearHistory();
                    loadHistoryRecords();
                    showToast('操作记录已清空', 'success');
                } catch (err) {
                    showToast('清空失败: ' + (err.message || '未知错误'), 'error');
                }
            };
        }

        modal.style.display = 'block';
    }

    // ── 返回所有公开函数 ──
    return {
        showProjectModal,
        showDatePicker,
        renderCalendar,
        confirmDateSelection,
        editProject,
        saveProject,
        showSettingsModal,
        renderBackupListFromData,
        showMultiProjectDateSelectionModal,
        showExportModal,
        showWebhookPushModal,
        showAdminModal,
    };
}
