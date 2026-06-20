import { formatDate } from './date.js';

/**
 * 设置管理模块
 * @param {object} ctx
 * @param {Function} ctx.getScheduleData - getter 返回当前排期数据
 * @param {object} ctx.scheduleAPI - 排期 API
 * @param {object} ctx.settingAPI - 设置 API
 * @param {object} ctx.versionAPI - 版本 API
 * @param {Function} ctx.showToast
 * @param {Function} ctx.escapeHtml
 * @param {Function} ctx.loadScheduleData - 加载排期数据
 * @param {Function} ctx.getRoleCategories - getter
 * @param {Function} ctx.setRoleCategories - setter
 * @param {Function} ctx.getAdminPassword - getter
 */
export function createSettingsModule(ctx) {
    const {
        getScheduleData,
        scheduleAPI,
        settingAPI,
        versionAPI,
        showToast,
        escapeHtml,
        loadScheduleData,
        getRoleCategories,
        setRoleCategories,
        getAdminPassword
    } = ctx;

    // ── 模块内部状态 ──
    let accessSettings = {};
    let pendingRestorePath = '';
    let projectTemplates = [];

    // ── DOM 元素缓存 ──
    const settingsModal = document.getElementById('settings-modal');
    const roleSettingsContainer = document.getElementById('role-settings-container');
    const backupPreviewModal = document.getElementById('backup-preview-modal');
    const backupPreviewBody = document.getElementById('backup-preview-body');
    const templateList = document.getElementById('template-list');
    const projectTemplateSelect = document.getElementById('project-template-select');
    const projectNameInput = document.getElementById('project-name');
    const projectTypeSelect = document.getElementById('project-type');
    const projectStartTimeSelect = document.getElementById('project-start-time');
    const projectLaodaoCheckbox = document.getElementById('project-laodao');
    const locationOptionsDiv = document.getElementById('location-options');
    const projectRoleFieldsDiv = document.getElementById('project-role-fields');
    const projectAdvertiserCheckbox = document.getElementById('project-advertiser');
    const projectAdvertiserNoInput = document.getElementById('project-advertiser-no');
    const advertiserNoWrap = document.getElementById('advertiser-no-wrap');
    const healthBadge = document.getElementById('health-badge');
    const shareLinkDisplay = document.getElementById('share-link-display');
    const shareEnabledSetting = document.getElementById('share-enabled-setting');
    const shareTokenSetting = document.getElementById('share-token-setting');
    const editPasswordSetting = document.getElementById('edit-password-setting');

    // ── 内部工具函数 ──

    function wrapWithToast(fn, successMsg) {
        return async (...args) => {
            try {
                const result = await fn(...args);
                if (successMsg) showToast(successMsg, 'success');
                return result;
            } catch (err) {
                showToast(err.message || '操作失败', 'error');
                throw err;
            }
        };
    }

    function getRoleOptionsKey(cat) {
        return cat.optionsKey || `commonCustom_${cat.key}`;
    }

    function getRoleOptions(settings, cat) {
        const key = getRoleOptionsKey(cat);
        if (settings.customRoleOptions && settings.customRoleOptions[cat.key]) {
            return settings.customRoleOptions[cat.key];
        }
        return settings[key] || [];
    }

    // 渲染 tag 按钮组（多选）
    function renderCheckboxGroup(container, items) {
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tag-btn';
            btn.dataset.value = item;
            btn.textContent = item;
            btn.addEventListener('click', () => btn.classList.toggle('active'));
            container.appendChild(btn);
        });
        if (items.length === 0) {
            container.innerHTML = '<span class="checkbox-empty">暂无选项，请在设置中添加</span>';
        }
    }

    // 渲染 tag 按钮组（单选）
    function renderRadioGroup(container, items) {
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tag-btn';
            btn.dataset.value = item;
            btn.textContent = item;
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            container.appendChild(btn);
        });
        if (items.length === 0) {
            container.innerHTML = '<span class="checkbox-empty">暂无选项，请在设置中添加</span>';
        }
    }

    // 获取 tag 按钮组选中值（逗号分隔）
    function getCheckedValues(container) {
        if (!container) return '';
        return Array.from(container.querySelectorAll('.tag-btn.active')).map(btn => btn.dataset.value).join(', ');
    }

    // 设置 tag 按钮组选中状态
    function setCheckedValues(container, valueStr) {
        if (!container) return;
        const values = valueStr ? valueStr.split(', ').map(s => s.trim()).filter(Boolean) : [];
        container.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.toggle('active', values.includes(btn.dataset.value));
        });
    }

    // ── 职能字段渲染 ──

    // 渲染设置页的职能管理区域
    function renderRoleSettings(settings) {
        if (!roleSettingsContainer) return;
        roleSettingsContainer.innerHTML = '';
        const cats = settings.roleCategories || [];

        cats.forEach((cat, index) => {
            const options = getRoleOptions(settings, cat);
            const item = document.createElement('div');
            item.className = 'role-category-item';
            item.innerHTML = `
                <div class="role-category-header">
                    <input type="text" class="role-label-input" data-index="${index}" value="${escapeHtml(cat.label)}" placeholder="职能名称">
                    <select class="role-type-select" data-index="${index}">
                        <option value="checkbox" ${cat.type === 'checkbox' ? 'selected' : ''}>多选</option>
                        <option value="radio" ${cat.type === 'radio' ? 'selected' : ''}>单选</option>
                    </select>
                    <button type="button" class="role-category-remove" data-index="${index}" title="删除">×</button>
                </div>
                <div class="role-category-options">
                    <textarea class="role-options-textarea" data-index="${index}" placeholder="每行一个选项">${options.join('\n')}</textarea>
                </div>
            `;
            roleSettingsContainer.appendChild(item);
        });

        roleSettingsContainer.querySelectorAll('.role-category-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                if (cats.length <= 1) {
                    showToast('至少保留一个职能', 'warning');
                    return;
                }
                const removed = cats.splice(idx, 1)[0];
                renderRoleSettings({ ...settings, roleCategories: cats });
                showToast(`已删除职能「${removed.label}」`, 'success');
            });
        });
    }

    // 渲染项目表单中的动态职能字段
    function renderProjectRoleFields(settings, projectData) {
        if (!projectRoleFieldsDiv) return;
        projectRoleFieldsDiv.innerHTML = '';
        const cats = (settings.roleCategories || []).filter(c => c.key !== 'location');

        cats.forEach(cat => {
            const options = getRoleOptions(settings, cat);
            const group = document.createElement('div');
            group.className = 'form-group';
            const label = document.createElement('label');
            label.textContent = cat.label + '：';
            group.appendChild(label);

            const container = document.createElement('div');
            container.className = 'checkbox-group';
            container.id = `project-role-${cat.key}`;
            container.dataset.roleKey = cat.key;
            container.dataset.roleType = cat.type || 'checkbox';

            if (cat.type === 'radio') {
                renderRadioGroup(container, options);
            } else {
                renderCheckboxGroup(container, options);
            }

            if (projectData) {
                const value = projectData[cat.key] || (projectData.customFields && projectData.customFields[cat.key]) || '';
                setCheckedValues(container, value);
            }

            group.appendChild(container);
            projectRoleFieldsDiv.appendChild(group);
        });
    }

    // 获取项目表单中所有动态职能的值
    function getProjectRoleValues() {
        const values = {};
        if (!projectRoleFieldsDiv) return values;
        projectRoleFieldsDiv.querySelectorAll('.checkbox-group').forEach(container => {
            const key = container.dataset.roleKey;
            if (key) {
                values[key] = getCheckedValues(container);
            }
        });
        return values;
    }

    // 设置项目表单中所有动态职能的值
    function setProjectRoleValues(projectData) {
        if (!projectRoleFieldsDiv) return;
        projectRoleFieldsDiv.querySelectorAll('.checkbox-group').forEach(container => {
            const key = container.dataset.roleKey;
            if (key) {
                const value = projectData[key] || (projectData.customFields && projectData.customFields[key]) || '';
                setCheckedValues(container, value);
            }
        });
    }

    // 更新项目表单选项
    function updateProjectFormOptions() {
        const settings = window.__currentSettings || {};
        const locations = (settings.commonLocations || []);

        renderRadioGroup(locationOptionsDiv, locations);
        renderProjectRoleFields(settings);
    }

    // ── 模板管理 ──

    function populateTemplateSelect() {
        projectTemplateSelect.innerHTML = '<option value="">选择项目模板</option>';
        projectTemplates.forEach((template) => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            projectTemplateSelect.appendChild(option);
        });
    }

    function findTemplate(templateId) {
        return projectTemplates.find((template) => template.id === templateId) || null;
    }

    function applyTemplateToForm(template) {
        if (!template) {
            return;
        }

        const defaults = template.defaults || {};
        projectNameInput.value = defaults.name || projectNameInput.value;
        projectTypeSelect.value = defaults.type || '';
        projectStartTimeSelect.value = defaults.startTime || '';
        projectLaodaoCheckbox.checked = Boolean(defaults.laodao);

        setCheckedValues(locationOptionsDiv, defaults.location || '');
        setProjectRoleValues(defaults);

        // 广告商单
        if (projectAdvertiserCheckbox) {
            projectAdvertiserCheckbox.checked = Boolean(defaults.isAdvertiser);
            if (advertiserNoWrap) advertiserNoWrap.style.display = defaults.isAdvertiser ? 'block' : 'none';
        }
        if (projectAdvertiserNoInput) projectAdvertiserNoInput.value = defaults.advertiserNo || '';
    }

    function applySelectedTemplate() {
        const template = findTemplate(projectTemplateSelect.value);
        if (!template) {
            showToast('请选择模板', 'warning');
            return;
        }

        applyTemplateToForm(template);
        showToast(`已应用模板：${template.name}`, 'success');
    }

    async function saveTemplateFromCurrentForm() {
        const templateName = window.prompt('请输入模板名称：', projectNameInput.value || '');
        if (!templateName) {
            return;
        }

        const roleValues = getProjectRoleValues();
        const payload = {
            name: templateName,
            defaults: {
                name: projectNameInput.value,
                location: getCheckedValues(locationOptionsDiv),
                ...roleValues,
                isAdvertiser: projectAdvertiserCheckbox ? projectAdvertiserCheckbox.checked : false,
                advertiserNo: projectAdvertiserNoInput ? projectAdvertiserNoInput.value.trim() : '',
                type: projectTypeSelect.value,
                startTime: projectStartTimeSelect.value,
                laodao: projectLaodaoCheckbox.checked
            }
        };

        const response = await settingAPI.saveTemplate(payload);
        const existingIndex = projectTemplates.findIndex((template) => template.id === response.template.id);
        if (existingIndex >= 0) {
            projectTemplates[existingIndex] = response.template;
        } else {
            projectTemplates.push(response.template);
        }

        populateTemplateSelect();
        renderTemplateList();
        showToast('模板已保存', 'success');
    }

    async function loadTemplateData() {
        try {
            projectTemplates = await settingAPI.getTemplates();
        } catch (error) {
            console.error('加载模板数据失败:', error);
            projectTemplates = [];
        }
    }

    function renderTemplateList() {
        if (!templateList) {
            return;
        }

        if (projectTemplates.length === 0) {
            templateList.innerHTML = '<p class="no-template">暂无模板</p>';
            return;
        }

        templateList.innerHTML = '';
        projectTemplates.forEach((template) => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `
                <div class="template-item-info">
                    <strong>${escapeHtml(template.name)}</strong>
                    <span>${escapeHtml(template.defaults.type) || '未设置类型'} · ${escapeHtml(template.defaults.location) || '未设置场地'}</span>
                </div>
                <div class="template-item-actions">
                    <button class="btn use-template-btn" data-template-id="${escapeHtml(template.id)}">应用</button>
                    <button class="btn delete-template-btn" data-template-id="${escapeHtml(template.id)}">删除</button>
                </div>
            `;
            templateList.appendChild(item);
        });

        templateList.querySelectorAll('.use-template-btn').forEach((button) => {
            button.addEventListener('click', () => {
                projectTemplateSelect.value = button.dataset.templateId;
                applySelectedTemplate();
            });
        });

        templateList.querySelectorAll('.delete-template-btn').forEach((button) => {
            button.addEventListener('click', async () => {
                try {
                    await settingAPI.deleteTemplate(button.dataset.templateId);
                    projectTemplates = projectTemplates.filter((template) => template.id !== button.dataset.templateId);
                    populateTemplateSelect();
                    renderTemplateList();
                    showToast('模板已删除', 'success');
                } catch (error) {
                    showToast('删除模板失败', 'error');
                }
            });
        });
    }

    // ── 设置管理 ──

    async function saveSettings() {
        const cats = [];
        const customRoleOptions = {};

        if (roleSettingsContainer) {
            const items = roleSettingsContainer.querySelectorAll('.role-category-item');
            items.forEach((item, index) => {
                const labelInput = item.querySelector('.role-label-input');
                const typeSelect = item.querySelector('.role-type-select');
                const textarea = item.querySelector('.role-options-textarea');
                const label = (labelInput ? labelInput.value : '').trim();
                const type = typeSelect ? typeSelect.value : 'checkbox';
                const options = (textarea ? textarea.value : '').split('\n').filter(s => s.trim() !== '');

                if (!label) return;

                const existingCats = getRoleCategories();
                const existingCat = existingCats[index];
                const key = existingCat ? existingCat.key : `custom_${Date.now()}_${index}`;
                const optionsKey = existingCat ? (existingCat.optionsKey || `commonCustom_${key}`) : `commonCustom_${key}`;

                cats.push({ key, label, type, optionsKey });
                customRoleOptions[key] = options;
            });
        }

        if (cats.length === 0) {
            showToast('至少保留一个职能', 'warning');
            return;
        }

        setRoleCategories(cats);

        try {
            const payload = {
                roleCategories: cats,
                customRoleOptions
            };

            // 保留 location 的 commonLocations 字段兼容
            const locationCat = cats.find(c => c.key === 'location');
            if (locationCat) {
                payload.commonLocations = customRoleOptions.location || [];
            }

            await settingAPI.saveSettings(payload);

            const settings = await settingAPI.getSettings();
            window.__currentSettings = settings;
            setRoleCategories(settings.roleCategories || []);

            renderRoleSettings(settings);
            updateProjectFormOptions();

            showToast('设置已保存', 'success');
            settingsModal.style.display = 'none';
        } catch (error) {
            console.error('保存设置时出错:', error);
            showToast('保存设置时出错，请重试', 'error');
        }
    }

    // 加载设置
    async function loadSettings() {
        try {
            const settings = await settingAPI.getSettings();
            window.__currentSettings = settings;
            setRoleCategories(settings.roleCategories || []);

            renderRoleSettings(settings);
            updateProjectFormOptions();
        } catch (error) {
            console.error('加载设置时出错:', error);
        }
    }

    // ── 备份管理 ──

    function closeBackupPreviewModal() {
        pendingRestorePath = '';
        backupPreviewModal.style.display = 'none';
    }

    async function openBackupPreview(backupPath) {
        const backupAPI = settingAPI;
        const backupPayload = await backupAPI.fetchBackupPayload(backupPath);
        const schedules = Array.isArray(backupPayload.schedules)
            ? backupPayload.schedules
            : Object.entries(backupPayload.schedules || {}).map(([date, projects]) => ({ date, projects }));
        const projectCount = schedules.reduce((sum, item) => sum + (item.projects || []).length, 0);
        const dateRange = schedules.length > 0
            ? `${schedules[0].date} 至 ${schedules[schedules.length - 1].date}`
            : '无排期数据';

        backupPreviewBody.innerHTML = `
            <p><strong>备份时间：</strong>${backupPayload.backupDate || backupPayload.exportDate || '未知'}</p>
            <p><strong>排期日期数：</strong>${schedules.length}</p>
            <p><strong>项目总数：</strong>${projectCount}</p>
            <p><strong>日期范围：</strong>${dateRange}</p>
            <p><strong>模板数量：</strong>${(backupPayload.settings && backupPayload.settings.projectTemplates ? backupPayload.settings.projectTemplates.length : 0)}</p>
            <p class="backup-preview-warning">恢复会覆盖当前排期与设置，系统会先自动生成一份恢复前快照。</p>
        `;
        pendingRestorePath = backupPath;
        backupPreviewModal.style.display = 'block';
    }

    function showSettingsModal() {
        settingsModal.style.display = 'block';
        renderTemplateList();
    }

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
                    const backupAPI = settingAPI;
                    const result = await backupAPI.deleteBackup(backupPath);
                    showToast('备份已删除', 'success');
                    if (result && result.backups) {
                        renderBackupListFromData(result.backups);
                    } else {
                        await loadBackupList();
                    }
                } catch (error) {
                    showToast(error.message || '删除备份失败', 'error');
                }
            });
        });
    }

    async function loadBackupList() {
        const backupList = document.getElementById('backup-list');
        if (!backupList) return;

        try {
            const backupAPI = settingAPI;
            const backups = await backupAPI.getBackups();

            if (backups.length === 0) {
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
            document.querySelectorAll('.restore-backup-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const backupPath = e.target.dataset.path;
                    try {
                        await openBackupPreview(backupPath);
                    } catch (error) {
                        console.error('读取备份预览失败:', error);
                        showToast(error.message || '读取备份预览失败', 'error');
                    }
                });
            });

            // 绑定删除按钮事件
            document.querySelectorAll('.delete-backup-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const backupPath = e.target.dataset.path;
                    if (!confirm('确定要删除这个备份吗？此操作不可恢复。')) return;
                    try {
                        const backupAPI = settingAPI;
                        const result = await backupAPI.deleteBackup(backupPath);
                        showToast('备份已删除', 'success');
                        // 用返回的最新列表重新渲染
                        if (result && result.backups) {
                            renderBackupListFromData(result.backups);
                        } else {
                            await loadBackupList();
                        }
                    } catch (error) {
                        showToast(error.message || '删除备份失败', 'error');
                    }
                });
            });
        } catch (error) {
            console.error('加载备份列表失败:', error);
            backupList.innerHTML = '<p class="no-backup">加载备份列表失败</p>';
        }
    }

    function setupBackupEvents() {
        // 一键备份按钮
        const backupToHostBtn = document.getElementById('backup-to-host');
        if (backupToHostBtn) {
            backupToHostBtn.onclick = async () => {
                try {
                    const backupAPI = settingAPI;
                    await backupAPI.createBackup();
                    showToast('备份成功', 'success');
                    // 刷新备份列表
                    await loadBackupList();
                } catch (error) {
                    showToast('备份失败: ' + error.message, 'error');
                }
            };
        }

        // 从备份恢复按钮
        const restoreFromHostBtn = document.getElementById('restore-from-host');
        if (restoreFromHostBtn) {
            restoreFromHostBtn.onclick = () => {
                loadBackupList();
                showToast('请从下方备份列表选择要恢复的版本', 'info');
            };
        }
    }

    // ── 访问与系统状态 ──

    function updateShareLinkDisplay() {
        if (!shareLinkDisplay) {
            return;
        }

        if (accessSettings.shareEnabled && accessSettings.shareUrl) {
            shareLinkDisplay.textContent = accessSettings.shareUrl;
        } else {
            shareLinkDisplay.textContent = '分享链接尚未启用';
        }
    }

    async function loadAccessSettings() {
        if (!getAdminPassword()) {
            accessSettings = {
                editPasswordEnabled: false,
                shareEnabled: false,
                shareToken: '',
                shareUrl: ''
            };
            updateShareLinkDisplay();
            return;
        }

        try {
            accessSettings = await settingAPI.getAccessSettings();
            shareEnabledSetting.checked = accessSettings.shareEnabled;
            shareTokenSetting.value = accessSettings.shareToken || '';
            editPasswordSetting.value = '';
            updateShareLinkDisplay();
        } catch (error) {
            console.error('加载访问设置失败:', error);
            showToast('访问设置加载失败', 'warning');
        }
    }

    async function loadHealthStatus() {
        try {
            const health = await versionAPI.getHealth();
            healthBadge.textContent = `系统正常 · ${health.schedulesCount}天排期`;
            healthBadge.dataset.state = 'ok';
        } catch (error) {
            healthBadge.textContent = '系统状态异常';
            healthBadge.dataset.state = 'error';
        }
    }

    async function loadVersionInfo() {
        try {
            const versionData = await versionAPI.getVersion();
            const versionInfo = document.getElementById('version-info');
            if (versionInfo) {
                const versionNumber = versionInfo.querySelector('.version-number');
                const versionDate = versionInfo.querySelector('.version-date');
                if (versionNumber) {
                    versionNumber.textContent = 'v' + versionData.version;
                }
                if (versionDate) {
                    versionDate.textContent = `${versionData.createDate} · build ${versionData.buildDate}`;
                }
            }
        } catch (error) {
            console.error('加载版本信息失败:', error);
        }
    }

    return {
        // 设置管理
        saveSettings,
        loadSettings,
        showSettingsModal,

        // 职能管理
        renderRoleSettings,
        renderProjectRoleFields,
        getProjectRoleValues,
        setProjectRoleValues,
        updateProjectFormOptions,
        renderCheckboxGroup,
        renderRadioGroup,
        getCheckedValues,
        setCheckedValues,
        getRoleOptionsKey,
        getRoleOptions,

        // 模板管理
        populateTemplateSelect,
        findTemplate,
        applyTemplateToForm,
        applySelectedTemplate,
        saveTemplateFromCurrentForm,
        loadTemplateData,
        renderTemplateList,

        // 备份管理
        closeBackupPreviewModal,
        openBackupPreview,
        renderBackupListFromData,
        loadBackupList,
        setupBackupEvents,

        // 访问与系统状态
        updateShareLinkDisplay,
        loadAccessSettings,
        loadHealthStatus,
        loadVersionInfo
    };
}
