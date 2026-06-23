/**
 * modal.js — 模态框管理模块（精简版）
 * 保留：showSettingsModal, showMultiProjectDateSelectionModal,
 *       createMultipleProjects, showWebhookPushModal, showAdminModal
 *
 * 项目编辑相关已拆分到 modal-project.js
 * 导出相关已拆分到 modal-export.js
 * 备份相关已拆分到 modal-backup.js
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
        renderRoleSettings,
        loadWebhookSettings,
        loadAccessSettings,
        loadHistoryRecords,
        setupBackupEvents,
        getCheckedValues, setCheckedValues,
        loadBackupList,
        renderBackupListFromData,
    } = ctx;

    // ── 模块级状态 ──
    let webhookPushMode = null;
    let webhookSelectedDate = null;
    let webhookSelectedRange = null;

    // ── DOM 引用 ──
    const settingsModal = document.getElementById('settings-modal');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const backupList = document.getElementById('backup-list');

    // ─────────────────────────────────────────────────────────
    // showSettingsModal
    // ─────────────────────────────────────────────────────────
    function showSettingsModal() {
        settingsModal.style.display = 'block';
        loadBackupList();
        loadAccessSettings();
        loadWebhookSettings();
    }

    // ─────────────────────────────────────────────────────────
    // showMultiProjectDateSelectionModal
    // ─────────────────────────────────────────────────────────
    function showMultiProjectDateSelectionModal(projectNames) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        `;

        const title = document.createElement('h3');
        title.textContent = '识别到多个项目，请设置日期';
        title.style.marginTop = '0';

        const description = document.createElement('p');
        description.textContent = '系统从剪贴板文本中识别到以下项目，请为每个项目设置日期：';
        description.style.color = '#666';

        modalContent.appendChild(title);
        modalContent.appendChild(description);

        const projectDateInputs = [];

        projectNames.forEach((projectName, index) => {
            const projectItem = document.createElement('div');
            projectItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                padding: 12px;
                background: #f9f9f9;
                border-radius: 6px;
                border: 1px solid #eee;
            `;

            const nameLabel = document.createElement('div');
            nameLabel.style.cssText = `
                flex: 1;
                font-weight: 500;
                word-break: break-all;
            `;
            nameLabel.textContent = `${index + 1}. ${projectName}`;

            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.style.cssText = `
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            `;
            // 设置默认日期为当前周的周一
            const weekDates = getWeekDates(getCurrentMonday());
            dateInput.value = formatDate(weekDates[0]);

            projectItem.appendChild(nameLabel);
            projectItem.appendChild(dateInput);
            modalContent.appendChild(projectItem);

            projectDateInputs.push({
                name: projectName,
                dateInput: dateInput
            });
        });

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        `;

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.className = 'btn';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 确认按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确认创建';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        confirmBtn.addEventListener('click', async () => {
            const projectsWithDates = projectDateInputs.map(item => ({
                name: item.name,
                date: item.dateInput.value
            }));

            // 验证所有日期都已选择
            const missingDates = projectsWithDates.filter(p => !p.date);
            if (missingDates.length > 0) {
                showToast('请为所有项目选择日期', 'warning');
                return;
            }

            document.body.removeChild(modal);

            // 创建多个项目
            await createMultipleProjects(projectsWithDates);
        });

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        modalContent.appendChild(buttonContainer);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // ─────────────────────────────────────────────────────────
    // createMultipleProjects
    // ─────────────────────────────────────────────────────────
    async function createMultipleProjects(projectNames, date) {
        // 如果传入的是数组对象（来自 showMultiProjectDateSelectionModal），则使用对象中的日期
        let projectsToCreate;
        if (Array.isArray(projectNames) && typeof projectNames[0] === 'object') {
            projectsToCreate = projectNames;
        } else {
            // 兼容旧的调用方式（字符串数组和统一日期）
            projectsToCreate = projectNames.map(name => ({ name, date }));
        }

        if (!projectsToCreate || projectsToCreate.length === 0) {
            showToast('没有要创建的项目', 'warning');
            return;
        }

        const beforeState = cloneScheduleState();
        let scheduleData = getScheduleData();

        try {
            let createdCount = 0;

            for (const item of projectsToCreate) {
                const { name, date: projectDate } = item;
                if (!name || !projectDate) continue;

                const newProject = {
                    name: name,
                    location: '',
                    director: '',
                    photographer: '',
                    production: '',
                    rd: '',
                    operational: '',
                    audio: '',
                    business: '',
                    type: '',
                    laodao: false,
                    isAdvertiser: false,
                    advertiserNo: ''
                };

                if (!scheduleData[projectDate]) {
                    scheduleData[projectDate] = [];
                }
                scheduleData[projectDate].push(newProject);

                // 保存到服务器
                await persistScheduleDate(projectDate);
                createdCount++;
            }

            setScheduleData(scheduleData);
            pushUndoSnapshot(`批量创建${createdCount}个项目`, beforeState, getScheduleData());
            renderSchedule();
            showToast(`成功创建 ${createdCount} 个项目`, 'success');
        } catch (error) {
            console.error('批量创建项目时出错:', error);
            setScheduleData(beforeState);
            showToast(error.message || '批量创建项目时出错，请重试', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────
    // showWebhookPushModal
    // ─────────────────────────────────────────────────────────
    function showWebhookPushModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        `;

        const title = document.createElement('h3');
        title.textContent = 'Webhook 推送';
        title.style.marginTop = '0';

        const description = document.createElement('p');
        description.textContent = '选择推送类型和日期范围，然后点击推送按钮：';
        description.style.color = '#666';

        // 推送类型选择
        const pushTypeContainer = document.createElement('div');
        pushTypeContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        `;

        const dailyBtn = document.createElement('button');
        dailyBtn.textContent = '日通告';
        dailyBtn.className = 'btn';
        dailyBtn.style.cssText = `
            flex: 1;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        `;

        const weeklyBtn = document.createElement('button');
        weeklyBtn.textContent = '周通告';
        weeklyBtn.className = 'btn';
        weeklyBtn.style.cssText = `
            flex: 1;
            padding: 10px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        `;

        pushTypeContainer.appendChild(dailyBtn);
        pushTypeContainer.appendChild(weeklyBtn);

        // 日期选择
        const dateContainer = document.createElement('div');
        dateContainer.style.cssText = `
            margin-bottom: 20px;
        `;

        const dateLabel = document.createElement('label');
        dateLabel.textContent = '选择日期：';
        dateLabel.style.display = 'block';
        dateLabel.style.marginBottom = '8px';
        dateLabel.style.fontWeight = '500';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        `;

        // 设置默认日期为今天
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];

        dateContainer.appendChild(dateLabel);
        dateContainer.appendChild(dateInput);

        // 预览区域
        const previewArea = document.createElement('div');
        previewArea.style.cssText = `
            background: #f9f9f9;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            min-height: 100px;
            max-height: 200px;
            overflow-y: auto;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
        `;
        previewArea.textContent = '点击"预览"按钮查看推送内容...';

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            gap: 10px;
        `;

        // 预览按钮
        const previewBtn = document.createElement('button');
        previewBtn.textContent = '预览';
        previewBtn.className = 'btn';
        previewBtn.style.cssText = `
            padding: 8px 16px;
            background: #FF9800;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        // 推送按钮
        const pushBtn = document.createElement('button');
        pushBtn.textContent = '推送';
        pushBtn.className = 'btn btn-primary';
        pushBtn.style.cssText = `
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        `;

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.className = 'btn';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
        `;

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(previewBtn);
        buttonContainer.appendChild(pushBtn);

        modalContent.appendChild(title);
        modalContent.appendChild(description);
        modalContent.appendChild(pushTypeContainer);
        modalContent.appendChild(dateContainer);
        modalContent.appendChild(previewArea);
        modalContent.appendChild(buttonContainer);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // 事件处理
        let selectedPushType = 'daily';

        dailyBtn.addEventListener('click', () => {
            selectedPushType = 'daily';
            dailyBtn.style.opacity = '1';
            weeklyBtn.style.opacity = '0.7';
        });

        weeklyBtn.addEventListener('click', () => {
            selectedPushType = 'weekly';
            dailyBtn.style.opacity = '0.7';
            weeklyBtn.style.opacity = '1';
        });

        // 初始化按钮状态
        dailyBtn.style.opacity = '1';
        weeklyBtn.style.opacity = '0.7';

        previewBtn.addEventListener('click', async () => {
            const date = dateInput.value;
            if (!date) {
                showToast('请选择日期', 'warning');
                return;
            }

            try {
                const response = await apiClient.webhookPreview({
                    type: selectedPushType,
                    date: date
                });

                previewArea.textContent = response.preview || '无预览内容';
            } catch (error) {
                console.error('预览失败:', error);
                showToast(error.message || '预览失败', 'error');
            }
        });

        pushBtn.addEventListener('click', async () => {
            const date = dateInput.value;
            if (!date) {
                showToast('请选择日期', 'warning');
                return;
            }

            try {
                pushBtn.disabled = true;
                pushBtn.textContent = '推送中...';

                const response = await apiClient.webhookPush({
                    type: selectedPushType,
                    date: date
                });

                showToast(response.message || '推送成功', 'success');
                document.body.removeChild(modal);
            } catch (error) {
                console.error('推送失败:', error);
                showToast(error.message || '推送失败', 'error');
                pushBtn.disabled = false;
                pushBtn.textContent = '推送';
            }
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    // ─────────────────────────────────────────────────────────
    // showAdminModal
    // ─────────────────────────────────────────────────────────
    function showAdminModal() {
        const adminModal = document.getElementById('admin-modal');
        adminModal.style.display = 'block';
    }

    return {
        showSettingsModal,
        showMultiProjectDateSelectionModal,
        createMultipleProjects,
        showWebhookPushModal,
        showAdminModal,
    };
}
