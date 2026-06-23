import { createApiClient } from './modules/api.js';
import { getMonday, formatDate, formatMonthDay, getWeekDates, getWeekNumber } from './modules/date.js';
import { createDefaultFilters, matchesProjectFilters } from './modules/filters.js';
import { createUndoManager } from './modules/undo.js';

// XSS 安全：转义 HTML 特殊字符
function escapeHtml(str) {
    const s = String(str == null ? '' : str);
    const map = { '&': '\u0026amp;', '<': '\u0026lt;', '>': '\u0026gt;', '"': '\u0026quot;', "'": '\u0026#39;' };
    return s.replace(/[&<>"']/g, (ch) => map[ch]);
}

// 动森风格自定义 Select 组件
function initAnimalSelect(nativeSelect) {
    if (!nativeSelect || nativeSelect.dataset.animalSelect === '1') return;
    nativeSelect.dataset.animalSelect = '1';
    nativeSelect.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'animal-select-wrapper';

    const trigger = document.createElement('div');
    trigger.className = 'animal-select-trigger';
    trigger.tabIndex = 0;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'animal-select-value';

    const arrow = document.createElement('span');
    arrow.className = 'animal-select-arrow';
    arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    trigger.appendChild(valueSpan);
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);

    const dropdown = document.createElement('div');
    dropdown.className = 'animal-select-dropdown';

    function buildOptions() {
        dropdown.innerHTML = '';
        Array.from(nativeSelect.options).forEach((opt, idx) => {
            const item = document.createElement('div');
            item.className = 'animal-select-option';
            if (opt.value === nativeSelect.value) item.classList.add('active');
            item.dataset.value = opt.value;
            item.dataset.index = idx;

            const dot = document.createElement('span');
            dot.className = 'animal-select-dot';
            dot.textContent = opt.value === nativeSelect.value ? '●' : '';

            const label = document.createElement('span');
            label.textContent = opt.textContent;

            item.appendChild(dot);
            item.appendChild(label);

            item.addEventListener('click', () => {
                nativeSelect.value = opt.value;
                nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                closeDropdown();
                refreshDisplay();
            });

            item.addEventListener('mouseenter', () => {
                dropdown.querySelectorAll('.animal-select-option').forEach(o => o.classList.remove('hovered'));
                item.classList.add('hovered');
            });

            dropdown.appendChild(item);
        });
    }

    function refreshDisplay() {
        const sel = nativeSelect.options[nativeSelect.selectedIndex];
        valueSpan.textContent = sel ? sel.textContent : (nativeSelect.dataset.placeholder || '请选择');
        valueSpan.classList.toggle('placeholder', !sel || !sel.value);
        buildOptions();
    }

    let open = false;
    function openDropdown() {
        if (open) return;
        open = true;
        buildOptions();
        wrapper.appendChild(dropdown);
        trigger.classList.add('open');
        requestAnimationFrame(() => dropdown.classList.add('visible'));
        document.addEventListener('click', outsideClick);
    }
    function closeDropdown() {
        if (!open) return;
        open = false;
        trigger.classList.remove('open');
        dropdown.classList.remove('visible');
        setTimeout(() => { if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown); }, 200);
        document.removeEventListener('click', outsideClick);
    }
    function outsideClick(e) { if (!wrapper.contains(e.target)) closeDropdown(); }

    trigger.addEventListener('click', () => open ? closeDropdown() : openDropdown());
    trigger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? closeDropdown() : openDropdown(); } });

    nativeSelect.parentNode.insertBefore(wrapper, nativeSelect.nextSibling);
    refreshDisplay();

    if (nativeSelect._animalObserver) {
        nativeSelect._animalObserver.disconnect();
    }
    const observer = new MutationObserver(() => refreshDisplay());
    observer.observe(nativeSelect, { childList: true, attributes: true });
    nativeSelect._animalObserver = observer;
    nativeSelect.addEventListener('change', refreshDisplay);
}

function initAllAnimalSelects() {
    document.querySelectorAll('select').forEach(s => initAnimalSelect(s));
}

// 当前周的周一
let currentMonday = getMonday(new Date());

// 项目数据存储
let scheduleData = {};

// 向非模块脚本暴露实时引用
Object.defineProperty(window, '__scheduleData', { get: () => scheduleData, configurable: true });
Object.defineProperty(window, '__currentMonday', { get: () => currentMonday, configurable: true });

// DOM元素
const weekDisplay = document.getElementById('week-display');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const thisWeekBtn = document.getElementById('this-week');
const addProjectBtn = document.getElementById('add-project');
const exportImageBtn = document.getElementById('export-image');
const settingsBtn = document.getElementById('settings');
const undoActionBtn = document.getElementById('undo-action');
const searchProjectsInput = document.getElementById('search-projects');
const filterTypeSelect = document.getElementById('filter-type');
const clearFiltersBtn = document.getElementById('clear-filters');
const healthBadge = document.getElementById('health-badge');
const adminBtn = document.getElementById('admin-btn');
const heatmapBtn = document.getElementById('heatmap-btn');

// 模态框元素
const projectModal = document.getElementById('project-modal');
const settingsModal = document.getElementById('admin-modal');
const closeModalButtons = document.querySelectorAll('.close');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveSettingsBtn = document.getElementById('save-settings');

// 表单元素
const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectDateInput = document.getElementById('project-date');
const selectDateBtn = document.getElementById('select-date-btn');
const projectTypeSelect = document.getElementById('project-type');
const projectStartTimeSelect = document.getElementById('project-start-time');
const projectLaodaoCheckbox = document.getElementById('project-laodao');
const projectTemplateSelect = document.getElementById('project-template-select');
const applyTemplateBtn = document.getElementById('apply-template');
const saveTemplateFromFormBtn = document.getElementById('save-template-from-form');

// 复选框/单选容器
const locationOptionsDiv = document.getElementById('project-location-options');
const projectRoleFieldsDiv = document.getElementById('project-role-fields');

// 设置元素
const roleSettingsContainer = document.getElementById('role-settings-container');
const addRoleCategoryBtn = document.getElementById('add-role-category');
const projectTypesContainer = document.getElementById('project-types-container');
const addProjectTypeBtn = document.getElementById('add-project-type');
const externalApiEnabledCheckbox = document.getElementById('external-api-enabled');
const externalApiInfoDiv = document.getElementById('external-api-info');
const templateList = document.getElementById('template-list');

// 数据导出导入元素
const exportDataBtn = document.getElementById('export-data');
const importDataBtn = document.getElementById('import-data');
const importFileInput = document.getElementById('import-file');
const saveAccessSettingsBtn = document.getElementById('save-access-settings');
const copyShareLinkBtn = document.getElementById('copy-share-link');
const shareEnabledSetting = document.getElementById('share-enabled-setting');
const shareTokenSetting = document.getElementById('share-token-setting');
const editPasswordSetting = document.getElementById('edit-password-setting');
const shareLinkDisplay = document.getElementById('share-link-display');

// 日期选择器元素
const datePickerModal = document.getElementById('date-picker-modal');
const closeDatePickerBtn = document.getElementById('close-date-picker');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthYearSpan = document.getElementById('current-month-year');
const calendarDaysDiv = document.getElementById('calendar-days');
const selectedDateDisplaySpan = document.getElementById('selected-date-display');
const confirmDateBtn = document.getElementById('confirm-date');
const cancelDateBtn = document.getElementById('cancel-date');

// 图片导出元素
const exportModal = document.getElementById('export-modal');
const closeExportBtn = document.getElementById('close-export');
const exportCanvas = document.getElementById('export-canvas');
const downloadImageBtn = document.getElementById('download-image');
const openInNewTabBtn = document.getElementById('open-in-new-tab');
const cancelExportBtn = document.getElementById('cancel-export');
const backupPreviewModal = document.getElementById('backup-preview-modal');
const backupPreviewBody = document.getElementById('backup-preview-body');
const closeBackupPreviewBtn = document.getElementById('close-backup-preview');
const cancelBackupRestoreBtn = document.getElementById('cancel-backup-restore');
const confirmBackupRestoreBtn = document.getElementById('confirm-backup-restore');

// 粘贴识别按钮
const pasteRecognitionBtn = document.getElementById('paste-recognition');

// 广告商单元素
const projectAdvertiserCheckbox = document.getElementById('project-advertiser');
const advertiserNoWrap = document.getElementById('advertiser-no-wrap');
const projectAdvertiserNoInput = document.getElementById('project-advertiser-no');

// 跨周导出元素
const exportCrossWeekCheckbox = document.getElementById('export-cross-week');
const exportDateRangeDiv = document.getElementById('export-date-range');
const exportStartDateInput = document.getElementById('export-start-date');
const exportEndDateInput = document.getElementById('export-end-date');
const regenerateExportBtn = document.getElementById('regenerate-export');

// 日期选择器变量
let selectedDate = null;
let currentDate = new Date();
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// 当前编辑的项目信息
let currentEditingProject = null;
let currentEditingDay = null;

// 拖拽相关变量
let dragSrcElement = null;
let projectTemplates = [];
let pendingRestorePath = '';
let adminPassword = '';
let editPassword = '';
let accessSettings = {
    editPasswordEnabled: false,
    shareEnabled: false,
    shareToken: '',
    shareUrl: ''
};
let filterState = createDefaultFilters();
let roleCategories = [];
let currentSettings = null;
const undoManager = createUndoManager();

const apiClient = createApiClient({
    baseUrl: '/api',
    getAdminPassword: () => adminPassword,
    getEditPassword: () => editPassword
});

// Toast 提示函数
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // 自动消失
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Loading 显示/隐藏
function showLoading(text = '加载中...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = overlay.querySelector('.loading-text');
    loadingText.textContent = text;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
}

function isAuthError(error, keyword = '编辑密码') {
    return error && (error.status === 401 || String(error.message || '').includes(keyword));
}

async function promptForEditPassword() {
    const password = window.prompt('该操作已启用编辑密码，请输入后继续：', '');
    if (!password) {
        return false;
    }

    editPassword = password;
    showToast('已临时解锁编辑操作', 'success');
    return true;
}

async function withEditAccess(task) {
    try {
        return await task();
    } catch (error) {
        if (isAuthError(error) && await promptForEditPassword()) {
            return task();
        }
        throw error;
    }
}

function updateUndoButton() {
    undoActionBtn.disabled = !undoManager.canUndo();
}

const scheduleAPI = {
    getSchedules: (params = {}) => apiClient.getSchedules(params),
    saveSchedule: (payload) => withEditAccess(() => apiClient.saveSchedule(payload)),
    deleteSchedule: (date) => withEditAccess(() => apiClient.deleteSchedule(date))
};

const settingAPI = {
    getSettings: () => apiClient.getSettings(),
    saveSettings: (payload) => withEditAccess(() => apiClient.saveSettings(payload)),
    getTemplates: () => apiClient.getTemplates(),
    saveTemplate: (payload) => withEditAccess(() => apiClient.saveTemplate(payload)),
    deleteTemplate: (templateId) => withEditAccess(() => apiClient.deleteTemplate(templateId)),
    getAccessSettings: () => apiClient.getAccessSettings(),
    saveAccessSettings: (payload) => apiClient.saveAccessSettings(payload)
};

const versionAPI = {
    getVersion: () => apiClient.version(),
    getHealth: () => apiClient.health()
};

const backupAPI = {
    createBackup: () => withEditAccess(() => apiClient.createBackup()),
    getBackups: () => apiClient.getBackups(),
    deleteBackup: (backupPath) => withEditAccess(() => apiClient.deleteBackup(backupPath)),
    restoreBackup: (backupPath) => withEditAccess(() => apiClient.restoreBackup(backupPath)),
    fetchBackupPayload: (backupPath) => apiClient.fetchBackupPayload(backupPath),
    verifyPassword: (password) => apiClient.verifyAdminPassword(password)
};

// 按日期持久化排期：无项目时删除当天记录，避免残留空数组数据
async function persistScheduleDate(dateStr) {
    const projects = scheduleData[dateStr] || [];
    if (projects.length === 0) {
        try {
            await withEditAccess(() => apiClient.deleteSchedule(dateStr));
        } catch (error) {
            // 如果后端该日期已不存在（404），视为成功
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
    await Promise.all(uniqueDates.map(date => persistScheduleDate(date)));
}

function pushUndoSnapshot(label, beforeState) {
    undoManager.push({
        label,
        before: beforeState,
        after: cloneScheduleState()
    });
    updateUndoButton();
}

async function undoLastChange() {
    const snapshot = undoManager.pop();
    updateUndoButton();
    if (!snapshot) {
        return;
    }

    scheduleData = JSON.parse(JSON.stringify(snapshot.before));
    await syncScheduleDates(collectDatesFromStates(snapshot.before, snapshot.after));
    renderSchedule();
    showToast(`已撤销：${snapshot.label}`, 'success');
}

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
    if (!adminPassword) {
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
        if (healthBadge) {
            healthBadge.textContent = `系统正常 · ${health.schedulesCount}天排期`;
            healthBadge.dataset.state = 'ok';
        }
    } catch (error) {
        if (healthBadge) {
            healthBadge.textContent = '系统状态异常';
            healthBadge.dataset.state = 'error';
        }
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
                console.error('删除模板失败:', error);
                showToast(error.message || '删除模板失败', 'error');
            }
        });
    });
}

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
        console.error('加载模板失败:', error);
        projectTemplates = [];
    }

    populateTemplateSelect();
    renderTemplateList();
}

function updateFilterState() {
    filterState = {
        search: searchProjectsInput ? searchProjectsInput.value.trim() : '',
        type: filterTypeSelect ? filterTypeSelect.value : '',
        person: ''
    };
    renderSchedule();
}

function closeBackupPreviewModal() {
    pendingRestorePath = '';
    backupPreviewModal.style.display = 'none';
}

async function openBackupPreview(backupPath) {
    const backupPayload = await backupAPI.fetchBackupPayload(backupPath);
    const schedules = Array.isArray(backupPayload.schedules)
        ? backupPayload.schedules
        : Object.entries(backupPayload.schedules || {}).map(([date, projects]) => ({ date, projects }));
    const projectCount = schedules.reduce((sum, item) => sum + (item.projects || []).length, 0);
    const dateRange = schedules.length > 0
        ? `${schedules[0].date} 至 ${schedules[schedules.length - 1].date}`
        : '无排期数据';

    backupPreviewBody.innerHTML = `
        <p><strong>备份时间：</strong>${escapeHtml(backupPayload.backupDate || backupPayload.exportDate || '未知')}</p>
        <p><strong>排期日期数：</strong>${escapeHtml(schedules.length)}</p>
        <p><strong>项目总数：</strong>${escapeHtml(projectCount)}</p>
        <p><strong>日期范围：</strong>${escapeHtml(dateRange)}</p>
        <p><strong>模板数量：</strong>${escapeHtml(backupPayload.settings && backupPayload.settings.projectTemplates ? backupPayload.settings.projectTemplates.length : 0)}</p>
        <p class="backup-preview-warning">恢复会覆盖当前排期与设置，系统会先自动生成一份恢复前快照。</p>
    `;
    pendingRestorePath = backupPath;
    backupPreviewModal.style.display = 'block';
}

function getIcon(name, size = '') {
    const icons = {
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
        add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        notice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
        heatmap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
        webhook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
        settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
        backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        restore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    };
    const svg = icons[name];
    if (!svg) return '';
    const sizeClass = size ? ` animal-icon-${size}` : '';
    return `<span class="animal-icon${sizeClass}">${svg}</span>`;
}

function replaceEmojisWithIcons() {
    const emojiMap = {
        '◀': getIcon('prev'),
        '▶': getIcon('next'),
        '➕': getIcon('add'),
        '↩': getIcon('undo'),
        '🖼': getIcon('export'),
        '📋': getIcon('notice'),
        '📌': getIcon('paste'),
        '🔥': getIcon('heatmap'),
        '📤': getIcon('webhook'),
        '⚙': getIcon('settings'),
        '🔐': getIcon('admin'),
        '📦': getIcon('backup'),
        '📥': getIcon('restore'),
        '💾': getIcon('download'),
    };
    document.querySelectorAll('.toolbar .btn, .btn.icon-btn').forEach(btn => {
        let html = btn.innerHTML;
        for (const [emoji, icon] of Object.entries(emojiMap)) {
            if (html.includes(emoji)) {
                html = html.replace(emoji, icon);
            }
        }
        btn.innerHTML = html;
    });
}

// ── 视图切换 ──
let currentView = 'week';
let dayViewDate = new Date();
let monthViewDate = new Date();
let personnelViewDate = getMonday(new Date());
let monthShowMode = 'project';

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');
    if (view === 'week') {
        document.querySelector('.main-content .schedule-container').style.display = 'grid';
        document.querySelector('.main-content .week-header').style.display = 'grid';
    } else {
        document.querySelector('.main-content .schedule-container').style.display = 'none';
        document.querySelector('.main-content .week-header').style.display = 'none';
        document.getElementById(view + '-view').style.display = 'block';
    }
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('view-' + view);
    if (btn) btn.classList.add('active');
    if (view === 'day') renderDayView();
    if (view === 'month') renderMonthView();
    if (view === 'personnel') renderPersonnelView();
}

function renderDayView() {
    const dateStr = formatDate(dayViewDate);
    const title = document.getElementById('day-view-date');
    const content = document.getElementById('day-view-content');
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    title.textContent = `${dateStr} ${weekdays[dayViewDate.getDay()]}`;

    const projects = scheduleData[dateStr] || [];
    if (projects.length === 0) {
        content.innerHTML = '<div class="day-view-empty">当日暂无排期</div>';
        return;
    }
    content.innerHTML = projects.map((p, i) => {
        const typeClass = {'平面':'plane','视频':'video','直播':'live','试做':'test'}[p.type] || '';
        return `<div class="project-card" data-type="${escapeHtml(p.type || '')}" data-status="${escapeHtml(p.status || '')}" style="max-width:600px;">
            <div class="project-title"><span>${escapeHtml(p.name)}</span><span class="project-type ${typeClass}">${escapeHtml(p.type || '')}</span></div>
            <div class="project-info">${[p.location, p.startTime, p.director, p.photographer].filter(Boolean).map(escapeHtml).join(' · ')}</div>
        </div>`;
    }).join('');
}

function getTypeBg(type) {
    const map = {'平面':'#e8faf5','视频':'#fde4e8','直播':'#fff8e0','试做':'#f0e8ff'};
    return map[type] || '#f8f8f0';
}

function getTypeColor(type) {
    const map = {'平面':'#2a6b5a','视频':'#a85565','直播':'#7a6528','试做':'#6a3a9a'};
    return map[type] || '#725d42';
}

function renderMonthView() {
    const year = monthViewDate.getFullYear();
    const month = monthViewDate.getMonth();
    const title = document.getElementById('month-view-title');
    title.textContent = `${year}年${month + 1}月`;

    const grid = document.getElementById('month-view-grid');
    const weekdays = ['一','二','三','四','五','六','日'];
    let html = weekdays.map(d => `<div class="month-day-header">${d}</div>`).join('');

    const firstDay = new Date(year, month, 1);
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(new Date());

    for (let i = 0; i < startOffset; i++) {
        html += '<div class="month-day-cell empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;
        const projects = scheduleData[dateStr] || [];
        let items = '';
        if (monthShowMode === 'project') {
            items = projects.slice(0, 3).map(p =>
                `<div class="month-day-item" style="background:${getTypeBg(p.type)};color:${getTypeColor(p.type)};">${escapeHtml(p.name)}</div>`
            ).join('');
            if (projects.length > 3) items += `<div class="month-day-item" style="color:#a09080;">+${projects.length - 3}</div>`;
        } else {
            const persons = [...new Set(projects.flatMap(p => [p.director, p.photographer, p.production].filter(Boolean)))];
            items = persons.slice(0, 4).map(name =>
                `<div class="month-day-item" style="background:#e8faf5;color:#2a6b5a;">${escapeHtml(name)}</div>`
            ).join('');
            if (persons.length > 4) items += `<div class="month-day-item" style="color:#a09080;">+${persons.length - 4}</div>`;
        }
        html += `<div class="month-day-cell${isToday ? ' today' : ''}" data-date="${dateStr}">
            <div class="month-day-num">${d}</div>${items}
        </div>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.month-day-cell:not(.empty)').forEach(cell => {
        cell.addEventListener('click', () => {
            dayViewDate = new Date(cell.dataset.date + 'T00:00:00');
            switchView('day');
        });
    });
}

function splitNames(str) {
    if (!str) return [];
    return String(str).split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
}

function personMatches(name, project) {
    if (project.director && splitNames(project.director).includes(name)) return true;
    if (project.photographer && splitNames(project.photographer).includes(name)) return true;
    if (project.production && splitNames(project.production).includes(name)) return true;
    if (project.rd && splitNames(project.rd).includes(name)) return true;
    if (project.operational && splitNames(project.operational).includes(name)) return true;
    if (project.audio && splitNames(project.audio).includes(name)) return true;
    if (project.business && splitNames(project.business).includes(name)) return true;
    if (project.laodao && name === '老刀') return true;
    return false;
}

function renderPersonnelView() {
    const weekStart = new Date(personnelViewDate);
    const title = document.getElementById('personnel-view-title');
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    title.textContent = `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`;

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
    }

    const todayStr = formatDate(new Date());
    const weekdays = ['一','二','三','四','五','六','日'];

    let html = '<table class="personnel-matrix"><thead><tr><th>人员</th>';
    dates.forEach((d, i) => {
        const isToday = d === todayStr;
        html += `<th class="${isToday ? 'today-col' : ''}">${weekdays[i]}<br>${d.slice(5)}</th>`;
    });
    html += '</tr></thead><tbody>';

    // 从设置中提取全部人员（通过 optionsKey 读取实际数据），排除影棚
    const persons = [];
    if (currentSettings) {
        (roleCategories || []).forEach(cat => {
            if (cat.label && cat.label.includes('影棚')) return;
            const key = cat.optionsKey;
            const list = key ? (currentSettings[key] || []) : (cat.options || []);
            list.filter(Boolean).forEach(name => {
                if (!persons.includes(name)) persons.push(name);
            });
        });
    }

    if (persons.length === 0) {
        html += `<tr><td colspan="8" style="text-align:center;color:#a09080;padding:40px;">暂无人员数据，请在设置 > 常用项管理中添加</td></tr>`;
    }

    persons.forEach(name => {
        html += `<tr><td class="person-name">${escapeHtml(name)}</td>`;
        dates.forEach(d => {
            const isToday = d === todayStr;
            const projects = (scheduleData[d] || []).filter(p => personMatches(name, p));
            const items = projects.map(p =>
                `<div class="personnel-cell-item" style="background:${getTypeBg(p.type)};color:${getTypeColor(p.type)};">${escapeHtml(p.name)}</div>`
            ).join('');
            html += `<td class="${isToday ? 'today-col' : ''}">${items || '<span style="color:#d4c4a8;">—</span>'}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('personnel-view-table').innerHTML = html;
}

function detectConflicts() {
    const conflicts = [];
    const duplicates = [];
    for (const [dateStr, projects] of Object.entries(scheduleData)) {
        // 检测重复数据：同名项目（含副本）
        const nameCount = {};
        projects.forEach((p, idx) => {
            const baseName = p.name.replace(/\s*\(副本\)\s*$/, '');
            if (!nameCount[baseName]) nameCount[baseName] = [];
            nameCount[baseName].push({ fullName: p.name, index: idx });
        });
        for (const [baseName, items] of Object.entries(nameCount)) {
            if (items.length > 1) {
                duplicates.push({ date: dateStr, baseName, items });
            }
        }

        // 检测人员冲突：同人同天不同项目
        const personMap = {};
        projects.forEach((p, idx) => {
            const names = new Set();
            splitNames(p.director).forEach(n => names.add(n));
            splitNames(p.photographer).forEach(n => names.add(n));
            splitNames(p.production).forEach(n => names.add(n));
            splitNames(p.rd).forEach(n => names.add(n));
            splitNames(p.operational).forEach(n => names.add(n));
            splitNames(p.audio).forEach(n => names.add(n));
            splitNames(p.business).forEach(n => names.add(n));
            if (p.laodao) names.add('老刀');
            names.forEach(name => {
                if (!personMap[name]) personMap[name] = [];
                personMap[name].push({ name: p.name, index: idx });
            });
        });
        for (const [person, items] of Object.entries(personMap)) {
            const uniqueProjects = [...new Set(items.map(i => i.name.replace(/\s*\(副本\)\s*$/, '')))];
            if (uniqueProjects.length > 1) {
                conflicts.push({ person, date: dateStr, projects: uniqueProjects });
            }
        }
    }
    return { conflicts: conflicts.sort((a, b) => a.date.localeCompare(b.date)), duplicates };
}

function showConflictModal() {
    const modal = document.getElementById('conflict-modal');
    const content = document.getElementById('conflict-content');
    const { conflicts, duplicates } = detectConflicts();

    if (conflicts.length === 0 && duplicates.length === 0) {
        content.innerHTML = '<div class="conflict-none">排期无冲突，一切正常</div>';
    } else {
        let html = '';

        // 重复数据
        if (duplicates.length > 0) {
            html += `<p style="margin:0 0 12px;color:#f0a030;font-weight:600;">发现 ${duplicates.length} 处重复数据</p>`;
            html += duplicates.map(d => `
                <div class="conflict-item" style="border-color:#f0a030;background:#fff8e0;">
                    <div class="conflict-person" style="color:#7a6528;">${escapeHtml(d.baseName)}</div>
                    <div class="conflict-date">${d.date}</div>
                    <div class="conflict-projects">
                        ${d.items.map(item => `
                            <span class="conflict-project" data-date="${d.date}" data-index="${item.index}" style="cursor:pointer;background:#fff0e8;border-color:#e59266;" title="点击查看">
                                ${escapeHtml(item.fullName)}
                                <span class="conflict-delete" data-date="${d.date}" data-index="${item.index}" title="删除此项目">×</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

         // 人员冲突
        if (conflicts.length > 0) {
            html += `<p style="margin:${duplicates.length > 0 ? '20px' : '0'} 0 12px;color:#e59266;font-weight:600;">发现 ${conflicts.length} 处人员冲突</p>`;
            html += conflicts.map(c => `
                <div class="conflict-item">
                    <div class="conflict-person">${escapeHtml(c.person)}</div>
                    <div class="conflict-date">${c.date}</div>
                    <div class="conflict-projects">
                        ${c.projects.map(p => `<span class="conflict-project conflict-jump" data-date="${c.date}" style="cursor:pointer;" title="点击跳转到该周">${escapeHtml(p)}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        content.innerHTML = html;
    }
    modal.style.display = 'flex';

    content.querySelectorAll('.conflict-project[data-index]').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('conflict-delete')) return;
            const date = el.dataset.date;
            currentMonday = getMonday(new Date(date + 'T00:00:00'));
            updateWeekDisplay();
            loadScheduleData().then(() => renderSchedule());
            switchView('week');
            modal.style.display = 'none';
        });
    });

    content.querySelectorAll('.conflict-delete').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.stopPropagation();
            const date = el.dataset.date;
            const index = parseInt(el.dataset.index, 10);
            if (!confirm(`确定删除「${scheduleData[date][index].name}」？`)) return;
            scheduleData[date].splice(index, 1);
            if (scheduleData[date].length === 0) delete scheduleData[date];
            await persistScheduleDate(date);
            renderSchedule();
            showConflictModal();
            showToast('已删除项目', 'success');
        });
    });

    content.querySelectorAll('.conflict-jump').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.dataset.date;
            currentMonday = getMonday(new Date(date + 'T00:00:00'));
            updateWeekDisplay();
            loadScheduleData().then(() => renderSchedule());
            switchView('week');
            modal.style.display = 'none';
        });
    });

    updateConflictBadge(conflicts.length + duplicates.length);
}

function updateConflictBadge(count) {
    let badge = document.querySelector('.conflict-badge');
    const btn = document.getElementById('conflict-btn');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'conflict-badge';
            btn.appendChild(badge);
        }
        badge.textContent = count;
    } else {
        if (badge) badge.remove();
    }
}

// 初始化应用
async function initApp() {
    // 检测是否为移动端
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
    
    // 移动端默认跳转到今日
    if (isMobile) {
        const today = new Date();
        currentMonday = getMonday(today);
    }
    
    updateWeekDisplay();
    setupEventListeners();
    setupMobileDateSwitch(); // 移动端日期切换功能
    updateUndoButton();
    
    // 加载版本信息
    loadVersionInfo();
    loadHealthStatus();
    
    // 从API加载数据
    await loadSettings();
    await loadScheduleData();
    await loadTemplateData();

    // Initial conflict check
    const { conflicts, duplicates } = detectConflicts();
    updateConflictBadge(conflicts.length + duplicates.length);
    
    // 移动端默认显示今日日期
    if (isMobile) {
        showTodayOnMobile();
    }
    
    // 更新项目表单选项
    updateProjectFormOptions();
    updateProjectTypeSelect();
    
    // 初始化开始时间选项
    initStartTimeOptions();
    
    // 初始化动森风格选择器
    initAllAnimalSelects();
    
    // 重新渲染排期（确保 roleCategories 已加载后再渲染卡片）
    renderSchedule();
    
    // 连接SSE实现实时同步
    connectSSE();
    setupWebhookEvents();
    setInterval(loadHealthStatus, 30000);

    // Initialize Animal Island Switches
    document.querySelectorAll('.animal-switch').forEach(label => {
        const input = label.querySelector('.switch-input');
        const switchEl = label.querySelector('.switch');
        if (!input || !switchEl) return;
        if (input.checked) switchEl.classList.add('switch-checked');
        if (input.disabled) switchEl.classList.add('switch-disabled');
        input.addEventListener('change', () => {
            switchEl.classList.toggle('switch-checked', input.checked);
        });
    });

    replaceEmojisWithIcons();
}

// 加载版本信息
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
                versionDate.textContent = `build ${versionData.buildDate || versionData.createDate}`;
            }
        }
    } catch (error) {
        console.error('加载版本信息失败:', error);
    }

    try {
        const health = await versionAPI.getHealth();
        const versionInfo = document.getElementById('version-info');
        if (versionInfo && health.startedAt) {
            let startedSpan = versionInfo.querySelector('.version-started');
            if (!startedSpan) {
                startedSpan = document.createElement('span');
                startedSpan.className = 'version-started';
                versionInfo.appendChild(startedSpan);
            }
            const startedDate = new Date(health.startedAt);
            startedSpan.textContent = `首次启动: ${startedDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
        }
    } catch (error) {
        console.error('获取服务器启动时间失败:', error);
    }
}

// 移动端显示今日日期
function showTodayOnMobile() {
    const today = new Date();
    const todayStr = formatDate(today);
    const weekDates = getWeekDates(currentMonday);
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // 找到今日对应的列
    const todayIndex = weekDates.findIndex(date => formatDate(date) === todayStr);
    if (todayIndex !== -1) {
        switchToDayOnMobile(weekdays[todayIndex], todayIndex);
    }
}

// 移动端切换到指定日期
function switchToDayOnMobile(dayId, dayIndex) {
    const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
    
    // 隐藏所有列，显示选中的列
    dayColumns.forEach((colId, index) => {
        const column = document.getElementById(colId);
        if (index === dayIndex) {
            column.style.display = 'block';
            column.classList.add('active-day');
        } else {
            column.style.display = 'none';
            column.classList.remove('active-day');
        }
    });
    
    // 更新标题选中状态
    dayHeaders.forEach((headerId, index) => {
        const header = document.getElementById(headerId);
        if (index === dayIndex) {
            header.classList.add('active');
        } else {
            header.classList.remove('active');
        }
    });
    
    // 更新周显示
    const weekDates = getWeekDates(currentMonday);
    const selectedDate = weekDates[dayIndex];
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    weekDisplay.textContent = `${weekdays[dayIndex]} ${month}月${day}日`;
}

// 移动端日期切换功能
function setupMobileDateSwitch() {
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    dayHeaders.forEach((headerId, index) => {
        const header = document.getElementById(headerId);
        
        // 添加点击事件
        header.addEventListener('click', () => {
            // 检查是否为移动端
            if (window.innerWidth <= 768 || 'ontouchstart' in window) {
                switchToDayOnMobile(weekdays[index], index);
            }
        });
        
        // 添加切换提示的指针样式
        header.style.cursor = 'pointer';
    });
}

// 连接SSE实现实时同步
function connectSSE() {
    const eventSource = new EventSource('/events');
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'scheduleUpdate':
                // 更新本地数据
                scheduleData[data.date] = data.projects;
                // 重新渲染当前周的视图
                renderSchedule();
                break;
            case 'scheduleDelete':
                // 从本地数据中删除
                delete scheduleData[data.date];
                // 重新渲染当前周的视图
                renderSchedule();
                break;
            case 'settingsUpdate':
                window.__currentSettings = data.settings;
                currentSettings = data.settings;
                roleCategories = data.settings.roleCategories || [];
                renderRoleSettings(data.settings);
                renderProjectTypes(data.settings);
                updateProjectFormOptions();
                updateProjectTypeSelect();
                break;
            case 'templateUpdate':
                projectTemplates = data.templates || [];
                populateTemplateSelect();
                renderTemplateList();
                break;
            case 'restoreComplete':
                // 备份恢复后重新拉取完整数据，避免本地状态残留
                loadScheduleData();
                loadSettings();
                loadTemplateData();
                break;
        }
    };
    
    eventSource.onerror = function(err) {
        console.error('SSE连接错误:', err);
        eventSource.close();
        // 自动重连，延迟 5 秒
        setTimeout(() => {
            showToast('实时同步断开，正在重新连接…', 'warning', 5000);
            connectSSE();
        }, 5000);
    };
}

// 更新周显示
function updateWeekDisplay() {
    const weekDates = getWeekDates(currentMonday);
    const startDate = formatMonthDay(weekDates[0]);
    const endDate = formatMonthDay(weekDates[6]);
    weekDisplay.textContent = `${startDate} - ${endDate}`;
}

let lastRenderedSchedule = {};

// 渲染排期表
function renderSchedule() {
    const weekDates = getWeekDates(new Date(currentMonday));
    const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
    
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

        // 全量清空重渲染
        column.innerHTML = '';
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-btn';
        addBtn.innerHTML = '+';
        addBtn.title = '点击添加项目';
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showProjectModal(dateStr);
        });
        column.appendChild(addBtn);
        
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
        
        const dayProjects = (scheduleData[dateStr] || []).filter((project) => matchesProjectFilters(project, filterState));

        if (dayProjects.length > 0) {
            dayProjects.forEach((project) => {
                const originalIndex = (scheduleData[dateStr] || []).indexOf(project);
                const projectCard = createProjectCard(project, dateStr, originalIndex);
                column.appendChild(projectCard);
            });
        } else {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = (scheduleData[dateStr] && scheduleData[dateStr].length > 0) ? '未匹配筛选条件' : '🈚️';
            column.appendChild(emptyState);
        }
    });
}

// 创建项目卡片
function createProjectCard(project, dateStr, projectIndex) {
    const card = document.createElement('div');
    card.className = `project-card`;
    card.draggable = true;
    card.dataset.date = dateStr;
    card.dataset.index = projectIndex;
    if (project.status) card.dataset.status = project.status;
    if (project.type) card.dataset.type = project.type;
    
    const typeClassMap = {
        '平面': 'plane',
        '视频': 'video',
        '直播': 'live',
        '试做': 'test'
    };
    
    const typeClass = typeClassMap[project.type] || 'plane';
    
    // 构建工作人员信息（动态）
    const cats = (roleCategories || []).filter(c => c.key !== 'location');
    let staffInfo = '';
    const hasStartTime = project.startTime;
    const hasAnyRole = hasStartTime || cats.some(cat => {
        const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
        return val;
    });

    if (hasAnyRole) {
        staffInfo = '<div class="staff-info">';
        if (hasStartTime) {
            staffInfo += `<span class="staff-role start-time">⏰ ${escapeHtml(project.startTime)}</span>`;
        }
        cats.forEach(cat => {
            const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
            if (val) {
                staffInfo += `<span class="staff-role ${escapeHtml(cat.key)}">${escapeHtml(cat.label)}：${escapeHtml(val)}</span>`;
            }
        });
        staffInfo += '</div>';
    }
    
    // 添加老刀出镜标记
    const laodaoMark = project.laodao ? '<div class="laodao-mark">老刀出镜</div>' : '';

    // 广告商单项目号
    const advertiserMark = (project.isAdvertiser && project.advertiserNo)
        ? `<div class="advertiser-no">商单 #${escapeHtml(project.advertiserNo)}</div>` : '';

    // 状态标签
    const statusClassMap = { '待确认': 'pending', '已确认': 'confirmed', '已完成': 'done', '取消': 'cancelled' };
    const statusClass = statusClassMap[project.status] || 'pending';
    const statusBadge = `<span class="status-badge status-${statusClass}">${project.status || '待确认'}</span>`;
    
    card.innerHTML = `
        <div class="project-title">
            <span>${escapeHtml(project.name)}</span>
            <button class="delete-btn" data-date="${escapeHtml(dateStr)}" data-index="${projectIndex}">×</button>
        </div>
        ${laodaoMark}
        ${advertiserMark}
        ${statusBadge}
        ${staffInfo}
        <div class="project-location">📍 ${escapeHtml(project.location)}</div>
        <div>
            <span class="project-type ${typeClass}">${escapeHtml(project.type)}</span>
        </div>
        <div class="card-actions">
            <button class="copy-btn" data-date="${escapeHtml(dateStr)}" data-index="${projectIndex}">📋 复制</button>
        </div>
    `;
    
    // 添加点击事件
    card.addEventListener('click', (e) => {
        // 如果点击的是删除按钮或复制按钮，则不触发编辑
        if (e.target.classList.contains('delete-btn') || e.target.classList.contains('copy-btn')) {
            return;
        }
        editProject(dateStr, projectIndex);
    });
    
    // 添加拖拽事件
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    // 添加删除按钮事件
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(dateStr, projectIndex);
    });
    
    // 添加复制按钮事件 - 调用新的多日期复制模态框
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showCopyModal(dateStr, projectIndex);
    });
    
    return card;
}

// 设置事件监听器
function setupEventListeners() {
    // 键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        // ESC 关闭模态框
        if (e.key === 'Escape') {
            projectModal.style.display = 'none';
            settingsModal.style.display = 'none';
            exportModal.style.display = 'none';
            datePickerModal.style.display = 'none';
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) adminModal.style.display = 'none';
            const heatmapModal = document.getElementById('heatmap-modal');
            if (heatmapModal) heatmapModal.style.display = 'none';
        }
        
        // Ctrl/Cmd + S 保存项目
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (projectModal.style.display === 'block') {
                projectForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Ctrl/Cmd + N 新建项目
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showProjectModal();
        }
        
        // Ctrl/Cmd + E 导出图片
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            showExportModal();
        }
        
        // 左箭头 上周
        if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea, select')) {
            currentMonday.setDate(currentMonday.getDate() - 7);
            updateWeekDisplay();
            renderSchedule();
        }
        
        // 右箭头 下周
        if (e.key === 'ArrowRight' && !e.target.matches('input, textarea, select')) {
            currentMonday.setDate(currentMonday.getDate() + 7);
            updateWeekDisplay();
            renderSchedule();
        }
        
        // Home 回到本周
        if (e.key === 'Home' && !e.target.matches('input, textarea, select')) {
            currentMonday = getMonday(new Date());
            updateWeekDisplay();
            renderSchedule();
        }
    });
    
    // 周切换按钮
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        lastRenderedSchedule = {};
        updateWeekDisplay();
        loadScheduleData();
    });
    
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        lastRenderedSchedule = {};
        updateWeekDisplay();
        loadScheduleData();
    });

    if (thisWeekBtn) thisWeekBtn.addEventListener('click', () => {
        currentMonday = getMonday(new Date());
        updateWeekDisplay();
        switchView('week');
        loadScheduleData();
    });
    
    // 添加项目按钮
    if (addProjectBtn) addProjectBtn.addEventListener('click', () => {
        showProjectModal();
    });
    
    // 导出图片按钮
    if (exportImageBtn) exportImageBtn.addEventListener('click', showExportModal);
    
    // 粘贴识别按钮
    if (pasteRecognitionBtn) pasteRecognitionBtn.addEventListener('click', handlePasteRecognition);
    
    // 设置按钮（已合并到管理页面）
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
        showSettingsModal();
    });

    // 管理员设置按钮
    if (adminBtn) adminBtn.addEventListener('click', showAdminModal);

    // 热力图按钮
    if (heatmapBtn) heatmapBtn.addEventListener('click', showHeatmapModal);

    // 通告单按钮（事件委托，因为按钮在 renderSchedule 每次重建）
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('notice-day-btn')) {
            showNoticeModal(e.target.dataset.date);
        }
        if (e.target.classList.contains('sort-day-btn')) {
            sortDayProjects(e.target.dataset.date);
        }
    });

    if (undoActionBtn) undoActionBtn.addEventListener('click', async () => {
        try {
            await undoLastChange();
        } catch (error) {
            console.error('撤销失败:', error);
            showToast(error.message || '撤销失败', 'error');
        }
    });

    if (searchProjectsInput) searchProjectsInput.addEventListener('input', updateFilterState);
    if (filterTypeSelect) filterTypeSelect.addEventListener('change', updateFilterState);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => {
        if (searchProjectsInput) searchProjectsInput.value = '';
        if (filterTypeSelect) filterTypeSelect.value = '';
        updateFilterState();
    });

    if (applyTemplateBtn) applyTemplateBtn.addEventListener('click', applySelectedTemplate);
    if (saveTemplateFromFormBtn) saveTemplateFromFormBtn.addEventListener('click', async () => {
        try {
            await saveTemplateFromCurrentForm();
        } catch (error) {
            console.error('保存模板失败:', error);
            showToast(error.message || '保存模板失败', 'error');
        }
    });
    
    // 模态框关闭按钮
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            projectModal.style.display = 'none';
            settingsModal.style.display = 'none';
            exportModal.style.display = 'none';
        });
    });
    
    // 取消编辑按钮
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => {
        projectModal.style.display = 'none';
    });
    
    // 保存设置按钮
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

    // 添加职能按钮
    if (addRoleCategoryBtn) {
        addRoleCategoryBtn.addEventListener('click', () => {
            const settings = window.__currentSettings || {};
            const cats = settings.roleCategories || [];
            const newIndex = cats.length;
            const newKey = `custom_${Date.now()}`;
            cats.push({ key: newKey, label: '新职能', type: 'checkbox', optionsKey: `commonCustom_${newKey}` });
            settings.roleCategories = cats;
            window.__currentSettings = settings;
            roleCategories = cats;
            renderRoleSettings(settings);
        });
    }

    // 添加项目类型按钮
    if (addProjectTypeBtn) {
        addProjectTypeBtn.addEventListener('click', () => {
            projectTypes.push('新类型');
            renderProjectTypes({ projectTypes });
        });
    }

    // 外部 API 开关切换
    if (externalApiEnabledCheckbox && externalApiInfoDiv) {
        externalApiEnabledCheckbox.addEventListener('change', () => {
            externalApiInfoDiv.style.display = externalApiEnabledCheckbox.checked ? 'block' : 'none';
        });
    }

    // 广告商单勾选切换
    if (projectAdvertiserCheckbox && advertiserNoWrap) {
        projectAdvertiserCheckbox.addEventListener('change', () => {
            advertiserNoWrap.style.display = projectAdvertiserCheckbox.checked ? 'block' : 'none';
        });
    }

    // 跨周导出勾选切换
    if (exportCrossWeekCheckbox && exportDateRangeDiv) {
        exportCrossWeekCheckbox.addEventListener('change', () => {
            exportDateRangeDiv.style.display = exportCrossWeekCheckbox.checked ? 'block' : 'none';
        });
    }

    // 跨周导出生成按钮
    if (regenerateExportBtn) {
        regenerateExportBtn.addEventListener('click', () => {
            if (!exportStartDateInput.value || !exportEndDateInput.value) {
                showToast('请选择起始日和结束日', 'warning');
                return;
            }
            if (exportStartDateInput.value > exportEndDateInput.value) {
                showToast('起始日不能晚于结束日', 'warning');
                return;
            }
            downloadImageBtn.disabled = true;
            openInNewTabBtn.disabled = true;
            downloadImageBtn.textContent = '生成中…';
            openInNewTabBtn.textContent = '生成中…';
            drawScheduleToCanvas();
        });
    }

    if (saveAccessSettingsBtn) {
        saveAccessSettingsBtn.addEventListener('click', async () => {
            if (!adminPassword) {
                showToast('请先解锁管理员功能', 'warning');
                return;
            }

            try {
                const response = await settingAPI.saveAccessSettings({
                    editPassword: editPasswordSetting.value,
                    shareEnabled: shareEnabledSetting.checked,
                    shareToken: shareTokenSetting.value.trim()
                });
                accessSettings = response.access;
                editPassword = editPasswordSetting.value ? editPasswordSetting.value : editPassword;
                updateShareLinkDisplay();
                showToast('访问控制已保存', 'success');
            } catch (error) {
                console.error('保存访问控制失败:', error);
                showToast(error.message || '访问控制保存失败', 'error');
            }
        });
    }

    if (copyShareLinkBtn) {
        copyShareLinkBtn.addEventListener('click', async () => {
            if (!accessSettings.shareUrl) {
                showToast('请先启用分享链接', 'warning');
                return;
            }

            try {
                await navigator.clipboard.writeText(accessSettings.shareUrl);
                showToast('分享链接已复制', 'success');
            } catch (error) {
                showToast('复制失败，请手动复制', 'warning');
            }
        });
    }
    
    // 数据导出按钮
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);
    if (importDataBtn) importDataBtn.addEventListener('click', () => {
        importFileInput.click();
    });
    if (importFileInput) importFileInput.addEventListener('change', handleImportFile);
    if (closeBackupPreviewBtn) closeBackupPreviewBtn.addEventListener('click', closeBackupPreviewModal);
    if (cancelBackupRestoreBtn) cancelBackupRestoreBtn.addEventListener('click', closeBackupPreviewModal);
    if (confirmBackupRestoreBtn) confirmBackupRestoreBtn.addEventListener('click', async () => {
        if (!pendingRestorePath) {
            return;
        }

        try {
            showLoading('正在恢复...');
            await backupAPI.restoreBackup(pendingRestorePath);
            await loadScheduleData();
            await loadSettings();
            await loadTemplateData();
            closeBackupPreviewModal();
            showToast('恢复成功', 'success');
        } catch (error) {
            console.error('恢复失败:', error);
            showToast(`恢复失败: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });
    
    // 添加新选项按钮
    // 日期选择功能
    // 日期选择功能
    if (selectDateBtn) selectDateBtn.addEventListener('click', showDatePicker);
    if (projectDateInput) projectDateInput.addEventListener('click', showDatePicker);
    
    // 日期选择器事件
    if (closeDatePickerBtn) closeDatePickerBtn.addEventListener('click', () => {
        datePickerModal.style.display = 'none';
    });
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    if (confirmDateBtn) confirmDateBtn.addEventListener('click', confirmDateSelection);
    
    if (cancelDateBtn) cancelDateBtn.addEventListener('click', () => {
        datePickerModal.style.display = 'none';
    });
    
    if (datePickerModal) datePickerModal.addEventListener('click', (e) => {
        if (e.target === datePickerModal) {
            datePickerModal.style.display = 'none';
        }
    });
    
    if (projectForm) projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject();
    });
    
    if (closeExportBtn) closeExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    if (downloadImageBtn) downloadImageBtn.addEventListener('click', downloadImage);
    if (openInNewTabBtn) openInNewTabBtn.addEventListener('click', openImageInNewTab);
    const refreshExportBtn = document.getElementById('refresh-export');
    if (refreshExportBtn) refreshExportBtn.addEventListener('click', () => {
        downloadImageBtn.disabled = true;
        openInNewTabBtn.disabled = true;
        downloadImageBtn.textContent = '生成中…';
        openInNewTabBtn.textContent = '生成中…';
        drawScheduleToCanvas();
    });
    if (cancelExportBtn) cancelExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    if (exportModal) exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.style.display = 'none';
        }
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            projectModal.style.display = 'none';
        }
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (e.target === exportModal) {
            exportModal.style.display = 'none';
        }
        if (e.target === backupPreviewModal) {
            closeBackupPreviewModal();
        }
        const adminModal = document.getElementById('admin-modal');
        if (adminModal && e.target === adminModal) {
            adminModal.style.display = 'none';
        }
        const heatmapModal = document.getElementById('heatmap-modal');
        if (heatmapModal && e.target === heatmapModal) {
            heatmapModal.style.display = 'none';
        }
    });

    // ── 视图切换 ──
    document.getElementById('view-day').addEventListener('click', () => switchView('day'));
    document.getElementById('view-week').addEventListener('click', () => switchView('week'));
    document.getElementById('view-month').addEventListener('click', () => switchView('month'));
    document.getElementById('view-personnel').addEventListener('click', () => switchView('personnel'));

    // ── 单日视图导航 ──
    document.getElementById('day-prev').addEventListener('click', () => { dayViewDate.setDate(dayViewDate.getDate() - 1); renderDayView(); });
    document.getElementById('day-next').addEventListener('click', () => { dayViewDate.setDate(dayViewDate.getDate() + 1); renderDayView(); });
    document.getElementById('day-today').addEventListener('click', () => { dayViewDate = new Date(); renderDayView(); });

    // ── 月视图导航 ──
    document.getElementById('month-prev').addEventListener('click', () => { monthViewDate.setMonth(monthViewDate.getMonth() - 1); renderMonthView(); });
    document.getElementById('month-next').addEventListener('click', () => { monthViewDate.setMonth(monthViewDate.getMonth() + 1); renderMonthView(); });
    document.getElementById('month-show-project').addEventListener('click', () => {
        monthShowMode = 'project';
        document.getElementById('month-show-project').classList.add('active');
        document.getElementById('month-show-person').classList.remove('active');
        renderMonthView();
    });
    document.getElementById('month-show-person').addEventListener('click', () => {
        monthShowMode = 'person';
        document.getElementById('month-show-person').classList.add('active');
        document.getElementById('month-show-project').classList.remove('active');
        renderMonthView();
    });

    // ── 人员视图导航 ──
    document.getElementById('personnel-prev').addEventListener('click', () => { personnelViewDate.setDate(personnelViewDate.getDate() - 7); renderPersonnelView(); });
    document.getElementById('personnel-next').addEventListener('click', () => { personnelViewDate.setDate(personnelViewDate.getDate() + 7); renderPersonnelView(); });

    // ── 冲突预警 ──
    document.getElementById('conflict-btn').addEventListener('click', showConflictModal);
    document.getElementById('close-conflict').addEventListener('click', () => { document.getElementById('conflict-modal').style.display = 'none'; });
    document.getElementById('conflict-modal').addEventListener('click', (e) => { if (e.target.id === 'conflict-modal') e.target.style.display = 'none'; });
}

// 显示项目编辑模态框
function showProjectModal(dayColumn = null) {
    // 重置表单
    projectForm.reset();
    currentEditingProject = null;
    currentEditingDay = dayColumn;
    
    // 更新选项
    updateProjectFormOptions();
    updateProjectTypeSelect();
    
    // 重置 tag 按钮
    document.querySelectorAll('#project-modal .tag-btn').forEach(btn => btn.classList.remove('active'));
    projectLaodaoCheckbox.checked = false;
    projectTemplateSelect.value = '';
    
    // 默认开始时间 11:00
    projectStartTimeSelect.value = '11:00';
    projectStartTimeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 设置默认日期：如果指定了日期则使用，否则使用当前周的周一
    if (dayColumn && dayColumn.includes('-')) {
        // dayColumn 是日期字符串 (如 "2024-01-15")
        projectDateInput.value = dayColumn;
    } else {
        const defaultDate = formatDate(getWeekDates(currentMonday)[0]);
        projectDateInput.value = defaultDate;
    }
    
    projectModal.style.display = 'block';
    projectNameInput.focus();
}

// 显示日期选择器
function showDatePicker() {
    // 设置当前月份和年份为选中日期或当前日期
    if (projectDateInput.value) {
        const dateParts = projectDateInput.value.split('-');
        currentYear = parseInt(dateParts[0], 10);
        currentMonth = parseInt(dateParts[1], 10) - 1;
        selectedDate = new Date(projectDateInput.value);
    } else {
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth();
        selectedDate = null;
    }
    
    renderCalendar();
    datePickerModal.style.display = 'block';
}

// 渲染日历
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

// 确认日期选择
function confirmDateSelection() {
    if (selectedDate) {
        projectDateInput.value = formatDate(selectedDate);
    }
    datePickerModal.style.display = 'none';
}

// 编辑项目
function editProject(dateStr, projectIndex) {
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

// 保存项目
async function saveProject() {
    const beforeState = cloneScheduleState();
    
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
        const weekDates = getWeekDates(currentMonday);
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
        
        // 保存目标日期
        await persistScheduleDate(projectDate);
        // 如果是跨日期编辑，还要同步源日期，防止源日期残留旧项目
        if (sourceDate && sourceDate !== projectDate) {
            await persistScheduleDate(sourceDate);
        }
        
        // 关闭模态框并重新渲染
        projectModal.style.display = 'none';
        pushUndoSnapshot(currentEditingProject ? '编辑项目' : '新增项目', beforeState);
        renderSchedule();
        showToast(currentEditingProject ? '项目已更新' : '项目已创建', 'success');
    } catch (error) {
        console.error('保存项目时出错:', error);
        scheduleData = beforeState;
        showToast(error.message || '保存项目时出错，请重试', 'error');
    }
}

// 显示设置模态框
function showSettingsModal() {
    showAdminModal();
    // 切换到设置标签页
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.style.display = 'none');
    const settingsTab = document.querySelector('.admin-tab-btn[data-tab="settings"]');
    const settingsPanel = document.getElementById('admin-tab-settings');
    if (settingsTab) settingsTab.classList.add('active');
    if (settingsPanel) settingsPanel.style.display = 'block';
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

// 加载备份列表
async function loadBackupList() {
    const backupList = document.getElementById('backup-list');
    if (!backupList) return;
    
    try {
        const backups = await backupAPI.getBackups();
        
        if (backups.length === 0) {
            backupList.innerHTML = '<p class="no-backup">暂无备份记录</p>';
            return;
        }
        
        backupList.innerHTML = '';
        backups.slice(0, 10).forEach(backup => {
            // 从备份文件夹名解析日期（格式：backup_2026-05-10_00-13-00）
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
                    showLoading('正在删除...');
                    const result = await backupAPI.deleteBackup(backupPath);
                    hideLoading();
                    showToast('备份已删除', 'success');
                    // 用返回的最新列表重新渲染
                    if (result && result.backups) {
                        renderBackupListFromData(result.backups);
                    } else {
                        await loadBackupList();
                    }
                } catch (error) {
                    hideLoading();
                    console.error('删除备份失败:', error);
                    showToast(error.message || '删除备份失败', 'error');
                }
            });
        });
    } catch (error) {
        console.error('加载备份列表失败:', error);
        backupList.innerHTML = '<p class="no-backup">加载失败</p>';
    }
}

// 设置备份恢复按钮事件
function setupBackupEvents() {
    // 一键备份按钮
    const backupToHostBtn = document.getElementById('backup-to-host');
    if (backupToHostBtn) {
        backupToHostBtn.onclick = async () => {
            try {
                showLoading('正在备份...');
                await backupAPI.createBackup();
                hideLoading();
                showToast('备份成功', 'success');
                // 刷新备份列表
                await loadBackupList();
            } catch (error) {
                hideLoading();
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

// ── 管理员设置 Modal ──
function showAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;

    const passwordSection = document.getElementById('admin-password-section');
    const unlockedContent = document.getElementById('admin-unlocked-content');
    const passwordInput = document.getElementById('admin-password-input');
    const confirmBtn = document.getElementById('confirm-admin-password');
    const closeBtn = document.getElementById('close-admin-modal');

    // 重置为密码输入状态（每次打开都要求重新验证以防会话变更）
    if (adminPassword) {
        passwordSection.style.display = 'none';
        unlockedContent.style.display = 'block';
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
                    adminPassword = pwd;
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

// ── 热力图 Modal ──
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
        const chart = document.getElementById('heatmap-chart');
        if (chart) chart.innerHTML = `<div class="heatmap-empty">渲染失败: ${escapeHtml(err.message)}</div>`;
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

// 计算日期范围
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

// 渲染热力图日历格子（固定年度）
function renderHeatmapChart(range) {
    const { startDate, endDate } = getHeatmapDateRange(range);
    const dateProjectMap = {};
    const dateNamesMap = {};

    Object.entries(scheduleData).forEach(([dateStr, projects]) => {
        const d = new Date(dateStr + 'T00:00:00');
        if (d < startDate || d > endDate) return;
        dateProjectMap[dateStr] = (projects || []).length;
        dateNamesMap[dateStr] = (projects || []).map(p => p.name).filter(Boolean);
    });

    const container = document.getElementById('heatmap-chart');
    if (!container) return;

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

    container.innerHTML = html;
}

// 渲染排行榜和每日项目数（按时间范围切换）
function renderHeatmapStats(range) {
    const { startDate, endDate } = getHeatmapDateRange(range);
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

    const personList = document.getElementById('heatmap-person-list');
    const dayList = document.getElementById('heatmap-day-list');

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

    renderBars(personList, personCount, '该时间段暂无人员排期', true);
    renderBars(dayList, dayCount, '该时间段暂无项目', false);
}

// ── Webhook 推送 ──
let webhookPushMode = null; // 'daily' or 'weekly'
let webhookSelectedDate = null;
let webhookSelectedRange = null;
let webhookTemplatePresets = null; // 预设模板缓存

function loadWebhookSettings() {
    const settings = window.__currentSettings || {};
    const wh = settings.webhook || {};
    const enabledEl = document.getElementById('webhook-enabled');
    const platformEl = document.getElementById('webhook-platform');
    const urlEl = document.getElementById('webhook-url');
    const dailyTplEl = document.getElementById('webhook-daily-template');
    const weeklyTplEl = document.getElementById('webhook-weekly-template');
    if (enabledEl) enabledEl.checked = Boolean(wh.enabled);
    if (platformEl) platformEl.value = wh.platform || 'custom';
    if (urlEl) urlEl.value = wh.url || '';
    if (dailyTplEl) dailyTplEl.value = wh.dailyTemplate || '';
    if (weeklyTplEl) weeklyTplEl.value = wh.weeklyTemplate || '';
}

async function saveWebhookSettings() {
    const payload = {
        webhook: {
            enabled: document.getElementById('webhook-enabled').checked,
            platform: document.getElementById('webhook-platform').value,
            url: document.getElementById('webhook-url').value.trim(),
            dailyTemplate: document.getElementById('webhook-daily-template').value,
            weeklyTemplate: document.getElementById('webhook-weekly-template').value
        }
    };
    try {
        await settingAPI.saveSettings(payload);
        showToast('Webhook 设置已保存', 'success');
    } catch (err) {
        showToast('保存失败: ' + (err.message || '未知错误'), 'error');
    }
}

async function testWebhook() {
    try {
        showToast('正在测试连通性...', 'info');
        const result = await apiClient.testWebhook();
        showToast(result.message || '测试成功', 'success');
    } catch (err) {
        showToast('测试失败: ' + (err.message || '未知错误'), 'error');
    }
}

async function loadDefaultWebhookTemplates() {
    try {
        const tpl = await apiClient.getWebhookTemplates();
        document.getElementById('webhook-daily-template').value = tpl.daily || '';
        document.getElementById('webhook-weekly-template').value = tpl.weekly || '';
        // 缓存预设模板
        if (tpl.presets) {
            webhookTemplatePresets = tpl.presets;
            populateWebhookPresetSelects(tpl.presets);
        }
        showToast('已加载默认模板', 'success');
    } catch (err) {
        showToast('加载失败: ' + (err.message || '未知错误'), 'error');
    }
}

/**
 * 填充预设模板下拉框
 */
function populateWebhookPresetSelects(presets) {
    const dailySelect = document.getElementById('webhook-daily-preset');
    const weeklySelect = document.getElementById('webhook-weekly-preset');

    if (dailySelect && presets.daily) {
        dailySelect.innerHTML = '<option value="">-- 选择预设模板 --</option>';
        Object.entries(presets.daily).forEach(([key, item]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = item.name;
            dailySelect.appendChild(opt);
        });
    }

    if (weeklySelect && presets.weekly) {
        weeklySelect.innerHTML = '<option value="">-- 选择预设模板 --</option>';
        Object.entries(presets.weekly).forEach(([key, item]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = item.name;
            weeklySelect.appendChild(opt);
        });
    }
}

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
    const weekDates = getWeekDates(currentMonday);
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
        const monday = new Date(currentMonday);
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

function setupWebhookEvents() {
    const webhookBtn = document.getElementById('webhook-btn');
    if (webhookBtn) webhookBtn.addEventListener('click', showWebhookPushModal);

    const closeBtn = document.getElementById('close-webhook-push');
    if (closeBtn) closeBtn.onclick = () => { document.getElementById('webhook-push-modal').style.display = 'none'; };

    const cancelBtn = document.getElementById('webhook-push-cancel');
    if (cancelBtn) cancelBtn.onclick = () => { document.getElementById('webhook-push-modal').style.display = 'none'; };

    const dailyBtn = document.getElementById('webhook-push-daily-btn');
    if (dailyBtn) dailyBtn.onclick = () => {
        webhookPushMode = 'daily';
        document.getElementById('webhook-push-daily-section').style.display = 'block';
        document.getElementById('webhook-push-weekly-section').style.display = 'none';
        document.getElementById('webhook-push-confirm').disabled = !webhookSelectedDate;
    };

    const weeklyBtn = document.getElementById('webhook-push-weekly-btn');
    if (weeklyBtn) weeklyBtn.onclick = () => {
        webhookPushMode = 'weekly';
        document.getElementById('webhook-push-daily-section').style.display = 'none';
        document.getElementById('webhook-push-weekly-section').style.display = 'block';
        document.getElementById('webhook-push-confirm').disabled = !webhookSelectedRange;
    };

    const confirmBtn = document.getElementById('webhook-push-confirm');
    if (confirmBtn) confirmBtn.onclick = async () => {
        try {
            showLoading('正在推送...');
            if (webhookPushMode === 'daily' && webhookSelectedDate) {
                await apiClient.pushDailyNotice(webhookSelectedDate);
                showToast('日通告推送成功', 'success');
            } else if (webhookPushMode === 'weekly' && webhookSelectedRange) {
                await apiClient.pushWeeklyNotice(webhookSelectedRange.startDate, webhookSelectedRange.endDate);
                showToast('周通告推送成功', 'success');
            } else {
                showToast('请选择推送日期', 'warning');
                return;
            }
            document.getElementById('webhook-push-modal').style.display = 'none';
        } catch (err) {
            showToast('推送失败: ' + (err.message || '未知错误'), 'error');
        } finally {
            hideLoading();
        }
    };

    // 管理员设置中的 webhook 按钮
    const webhookSaveBtn = document.getElementById('webhook-save');
    if (webhookSaveBtn) webhookSaveBtn.onclick = saveWebhookSettings;
    const webhookTestBtn = document.getElementById('webhook-test');
    if (webhookTestBtn) webhookTestBtn.onclick = testWebhook;
    const webhookLoadDefaultsBtn = document.getElementById('webhook-load-defaults');
    if (webhookLoadDefaultsBtn) webhookLoadDefaultsBtn.onclick = loadDefaultWebhookTemplates;

    // 预设模板应用按钮
    const applyDailyPresetBtn = document.getElementById('webhook-apply-daily-preset');
    if (applyDailyPresetBtn) applyDailyPresetBtn.onclick = () => {
        const select = document.getElementById('webhook-daily-preset');
        const key = select.value;
        if (!key) { showToast('请先选择一个预设模板', 'warning'); return; }
        if (webhookTemplatePresets && webhookTemplatePresets.daily && webhookTemplatePresets.daily[key]) {
            document.getElementById('webhook-daily-template').value = webhookTemplatePresets.daily[key].template;
            showToast(`已应用：${webhookTemplatePresets.daily[key].name}`, 'success');
        }
    };
    const applyWeeklyPresetBtn = document.getElementById('webhook-apply-weekly-preset');
    if (applyWeeklyPresetBtn) applyWeeklyPresetBtn.onclick = () => {
        const select = document.getElementById('webhook-weekly-preset');
        const key = select.value;
        if (!key) { showToast('请先选择一个预设模板', 'warning'); return; }
        if (webhookTemplatePresets && webhookTemplatePresets.weekly && webhookTemplatePresets.weekly[key]) {
            document.getElementById('webhook-weekly-template').value = webhookTemplatePresets.weekly[key].template;
            showToast(`已应用：${webhookTemplatePresets.weekly[key].name}`, 'success');
        }
    };
}

// 切换输入框显示
function toggleInput(selectElement, inputElement) {
    if (selectElement.style.display !== 'none') {
        selectElement.style.display = 'none';
        inputElement.style.display = 'block';
        inputElement.focus();
    } else {
        selectElement.style.display = 'block';
        inputElement.style.display = 'none';
    }
}

// 保存设置
async function saveSettings() {
    const cats = [];
    const customRoleOptions = {};

    if (roleSettingsContainer) {
        const items = roleSettingsContainer.querySelectorAll('.role-category-item');
        items.forEach((item, index) => {
            const labelInput = item.querySelector('.role-label-input');
            const typeRadio = item.querySelector('.role-type-input:checked');
            const textarea = item.querySelector('.role-options-textarea');
            const label = (labelInput ? labelInput.value : '').trim();
            const type = typeRadio ? typeRadio.value : 'checkbox';
            const options = (textarea ? textarea.value : '').split('\n').filter(s => s.trim() !== '');

            if (!label) return;

            const existingCat = roleCategories[index];
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

    // 从 DOM 收集项目类型
    const collectedTypes = [];
    if (projectTypesContainer) {
        projectTypesContainer.querySelectorAll('.project-type-input').forEach(input => {
            const val = (input.value || '').trim();
            if (val) collectedTypes.push(val);
        });
    }
    if (collectedTypes.length === 0) {
        showToast('至少保留一个项目类型', 'warning');
        return;
    }
    projectTypes = collectedTypes;

    roleCategories = cats;

    try {
        const payload = {
            roleCategories: cats,
            customRoleOptions,
            projectTypes: projectTypes,
            externalApi: {
                enabled: externalApiEnabledCheckbox ? externalApiEnabledCheckbox.checked : false
            }
        };

        // 保留 location 的 commonLocations 字段兼容
        const locationCat = cats.find(c => c.key === 'location');
        if (locationCat) {
            payload.commonLocations = customRoleOptions.location || [];
        }

        await settingAPI.saveSettings(payload);

        const settings = await settingAPI.getSettings();
        window.__currentSettings = settings;
        roleCategories = settings.roleCategories || [];

        renderRoleSettings(settings);
        renderProjectTypes(settings);
        updateProjectFormOptions();
        updateProjectTypeSelect();

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
        currentSettings = settings;
        roleCategories = settings.roleCategories || [];

        renderRoleSettings(settings);
        renderProjectTypes(settings);
        updateProjectFormOptions();

        // 外部 API 开关
        if (externalApiEnabledCheckbox) {
            externalApiEnabledCheckbox.checked = Boolean(settings.externalApi && settings.externalApi.enabled);
            if (externalApiInfoDiv) {
                externalApiInfoDiv.style.display = externalApiEnabledCheckbox.checked ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('加载设置时出错:', error);
    }
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

// 获取职能选项的 settings key
function getRoleOptionsKey(cat) {
    return cat.optionsKey || `commonCustom_${cat.key}`;
}

// 从 settings 对象中获取某个职能的选项数组
function getRoleOptions(settings, cat) {
    const key = getRoleOptionsKey(cat);
    if (settings.customRoleOptions && settings.customRoleOptions[cat.key]) {
        return settings.customRoleOptions[cat.key];
    }
    return settings[key] || [];
}

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
                <label class="animal-radio-item">
                    <input type="radio" name="role-type-${index}" value="checkbox" ${cat.type === 'checkbox' ? 'checked' : ''} class="role-type-input" data-index="${index}">
                    <span class="radio-label">多选</span>
                </label>
                <label class="animal-radio-item">
                    <input type="radio" name="role-type-${index}" value="radio" ${cat.type === 'radio' ? 'checked' : ''} class="role-type-input" data-index="${index}">
                    <span class="radio-label">单选</span>
                </label>
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

// 渲染项目类型管理
let projectTypes = ['平面', '视频', '直播', '试做'];
function renderProjectTypes(settings) {
    if (!projectTypesContainer) return;
    projectTypes = (settings.projectTypes && settings.projectTypes.length > 0) ? settings.projectTypes : ['平面', '视频', '直播', '试做'];
    projectTypesContainer.innerHTML = '';
    projectTypes.forEach((type, index) => {
        const item = document.createElement('div');
        item.className = 'role-category-item';
        item.style.padding = '8px 12px';
        item.style.marginBottom = '6px';
        item.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <input type="text" class="project-type-input" data-index="${index}" value="${escapeHtml(type)}" style="flex:1;padding:4px 8px;border:1.5px solid #c4b89e;border-radius:8px;font-size:13px;background:#fff;color:#725d42;font-weight:500;" placeholder="类型名称">
                <button type="button" class="role-category-remove project-type-remove" data-index="${index}" title="删除">×</button>
            </div>
        `;
        projectTypesContainer.appendChild(item);
    });

    projectTypesContainer.querySelectorAll('.project-type-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            if (projectTypes.length <= 1) {
                showToast('至少保留一个项目类型', 'warning');
                return;
            }
            projectTypes.splice(idx, 1);
            renderProjectTypes({ projectTypes });
        });
    });
}

// 更新项目表单中的类型下拉
function updateProjectTypeSelect() {
    if (!projectTypeSelect) return;
    const currentVal = projectTypeSelect.value;
    projectTypeSelect.innerHTML = '<option value="">请选择</option>';
    projectTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        projectTypeSelect.appendChild(opt);
    });
    if (currentVal && projectTypes.includes(currentVal)) {
        projectTypeSelect.value = currentVal;
    }
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

// 初始化开始时间选项
function initStartTimeOptions() {
    // 清空现有选项
    projectStartTimeSelect.innerHTML = '<option value="">请选择开始时间</option>';
    
    // 生成每半小时的时间选项
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            projectStartTimeSelect.appendChild(option);
        }
    }
}

// 从API加载排期数据
async function loadScheduleData() {
    try {
        scheduleData = await scheduleAPI.getSchedules();
        renderSchedule();
    } catch (error) {
        console.error('加载排期数据时出错:', error);
        scheduleData = {};
        renderSchedule();
    }
}

// 删除项目（带确认对话框）
async function deleteProject(dateStr, projectIndex) {
    const project = scheduleData[dateStr][projectIndex];
    const projectName = project ? project.name : '该项目';
    
    // 创建自定义确认对话框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        align-items: center;
        justify-content: center;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white;
        padding: 25px;
        border-radius: 12px;
        width: 90%;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;
    
    modalContent.innerHTML = `
        <h3 style="margin-top: 0; color: #e74c3c;">确认删除</h3>
        <p style="color: #666; margin: 20px 0;">确定要删除项目 "<strong>${escapeHtml(projectName)}</strong>" 吗？</p>
        <p style="color: #999; font-size: 12px;">此操作无法撤销</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
            <button id="confirm-delete-btn" class="btn" style="background-color: #e74c3c; color: white;">确认删除</button>
            <button id="cancel-delete-btn" class="btn" style="background-color: #95a5a6; color: white;">取消</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 绑定事件
    modal.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
        document.body.removeChild(modal);
        const beforeState = cloneScheduleState();
        try {
            scheduleData[dateStr].splice(projectIndex, 1);
            if (scheduleData[dateStr].length === 0) {
                delete scheduleData[dateStr];
            }
            
            await persistScheduleDate(dateStr);
            
            pushUndoSnapshot('删除项目', beforeState);
            renderSchedule();
            showToast('项目已删除', 'success');
        } catch (error) {
            console.error('删除项目时出错:', error);
            scheduleData = beforeState;
            showToast(error.message || '删除项目时出错，请重试', 'error');
        }
    });
    
    modal.querySelector('#cancel-delete-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 粘贴识别按钮事件处理函数
async function handlePasteRecognition() {
    try {
        // 从剪贴板读取文本
        const clipboardText = await navigator.clipboard.readText();
        
        if (!clipboardText) {
            showToast('剪贴板中没有文本内容', 'warning');
            return;
        }
        
        // 解析文本内容，提取项目名称
        const projectNames = extractProjectNames(clipboardText);
        
        if (!projectNames || projectNames.length === 0) {
            showToast('未能从剪贴板内容中识别出有效的项目名称', 'warning');
            return;
        }
        
        // 显示确认页面，让用户选择日期
        showMultiProjectDateSelectionModal(projectNames);
    } catch (err) {
        console.error('读取剪贴板失败:', err);
        showToast('读取剪贴板失败，请确保已复制文本内容', 'error');
    }
}

// 从文本中提取项目名称的函数
function extractProjectNames(text) {
    // 升级后的多项目识别逻辑
    // 按行分割文本
    const lines = text.split('\n');
    const projectNames = [];
    
    // 遍历每一行，提取项目名称
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine.length > 0) {
            // 移除可能的标点符号和特殊字符
            const projectName = trimmedLine.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\(\)\-\_]/g, '').trim();
            if (projectName) {
                projectNames.push(projectName);
            }
        }
    }
    
    return projectNames;
}

// 显示多项目日期选择模态框
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
    const weekDates = getWeekDates(currentMonday);
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

// 创建多个新项目
async function createMultipleProjects(projectNames, date) {
    const beforeState = cloneScheduleState();
    try {
        const dateStr = formatDate(date);
        
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
        
        // 保存到API
        await scheduleAPI.saveSchedule({
            date: dateStr,
            projects: scheduleData[dateStr]
        });
        
        // 重新渲染
        pushUndoSnapshot('粘贴识别创建项目', beforeState);
        renderSchedule();
        
        showToast(`成功创建 ${projectNames.length} 个项目`, 'success');
    } catch (error) {
        console.error('创建项目时出错:', error);
        scheduleData = beforeState;
        showToast('创建项目时出错，请重试', 'error');
    }
}

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
        const srcIndex = parseInt(dragSrcElement.dataset.index, 10);
        
        // 获取目标日期
        const weekDates = getWeekDates(currentMonday);
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
                pushUndoSnapshot('拖拽移动项目', beforeState);
                renderSchedule();
                showToast('项目已移动', 'success');
            } catch (error) {
                console.error('拖拽项目时出错:', error);
                scheduleData = beforeState;
                showToast(error.message || '拖拽项目时出错，请重试', 'error');
            }
        }
    }
    
    return false;
}

// 显示导出模态框
function showExportModal() {
    const weekDates = getWeekDates(currentMonday);
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

// 在canvas上绘制排期表 — 直接截取页面上已渲染的内容
function drawScheduleToCanvas() {
    const target = document.querySelector('.main-content');
    if (!target) {
        showToast('未找到排期区域', 'error');
        return;
    }

    downloadImageBtn.disabled = true;
    openInNewTabBtn.disabled = true;
    downloadImageBtn.textContent = '生成中…';
    openInNewTabBtn.textContent = '生成中…';

    html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8f8f0',
        logging: false,
        allowTaint: true
    }).then(canvas => {
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        exportCtx.drawImage(canvas, 0, 0);
        downloadImageBtn.disabled = false;
        openInNewTabBtn.disabled = false;
        downloadImageBtn.textContent = '下载图片';
        openInNewTabBtn.textContent = '在新标签页打开';
    }).catch(error => {
        console.error('导出图片时出错:', error);
        downloadImageBtn.disabled = false;
        openInNewTabBtn.disabled = false;
        downloadImageBtn.textContent = '下载图片';
        openInNewTabBtn.textContent = '在新标签页打开';
        showToast('导出图片时出错，请重试', 'error');
    });
}

// 下载图片
function downloadImage() {
    drawScheduleToCanvas();
    // 等渲染完成后下载（drawScheduleToCanvas 内部会在成功后启用按钮）
    const checkReady = setInterval(() => {
        if (!downloadImageBtn.disabled) {
            clearInterval(checkReady);
            const canvas = exportCanvas;
            const link = document.createElement('a');
            link.download = '罐头场通告排期.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    }, 200);
}

// 移动端保存图片到相册
// 已移除此功能

// 在新标签页打开图片
function openImageInNewTab() {
    drawScheduleToCanvas();
    const checkReady = setInterval(() => {
        if (!openInNewTabBtn.disabled) {
            clearInterval(checkReady);
            const canvas = exportCanvas;
            try {
                const dataURL = canvas.toDataURL('image/png');
                const newWindow = window.open();
                if (!newWindow) {
                    showToast('浏览器拦截了弹出窗口，请允许弹窗后重试', 'warning');
                    return;
                }
                newWindow.document.write(`<img src="${dataURL}" alt="罐头场通告排期" style="width:100%;height:auto;" />`);
                newWindow.document.close();
            } catch (error) {
                console.error('在新标签页打开图片时出错:', error);
                showToast('无法在新标签页打开图片，请尝试下载图片', 'warning');
            }
        }
    }, 200);
}

// 导出所有数据
async function exportAllData() {
    try {
        // 获取当前设置
        const settings = await settingAPI.getSettings();
        
        // 获取所有排期数据
        const schedules = await scheduleAPI.getSchedules();
        
        // 构造导出数据对象
        const exportData = {
            settings: settings,
            schedules: schedules,
            exportDate: new Date().toISOString(),
            version: '2.54'
        };
        
        // 创建Blob对象
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `罐头场通告排期_数据备份_${formatDate(new Date())}.json`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 释放URL对象
        URL.revokeObjectURL(url);
        
        showToast('数据导出成功！', 'success');
    } catch (error) {
        console.error('导出数据时出错:', error);
        showToast('导出数据失败：' + error.message, 'error');
    }
}

function normalizeImportedSchedules(rawSchedules) {
    if (Array.isArray(rawSchedules)) {
        return rawSchedules.reduce((result, schedule) => {
            if (
                schedule &&
                typeof schedule.date === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(schedule.date) &&
                Array.isArray(schedule.projects)
            ) {
                result[schedule.date] = schedule.projects;
            }
            return result;
        }, {});
    }

    if (rawSchedules && typeof rawSchedules === 'object') {
        return Object.entries(rawSchedules).reduce((result, [date, projects]) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(projects)) {
                result[date] = projects;
            }
            return result;
        }, {});
    }

    return {};
}

// 处理导入文件
async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (file.type && file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
        showToast('请选择JSON格式的备份文件', 'warning');
        return;
    }
    
    try {
        // 读取文件内容
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                // 解析JSON数据
                const importData = JSON.parse(e.target.result);
                
                // 确认是否导入
                const confirmImport = confirm(`确定要导入以下数据吗？

备份日期: ${importData.exportDate || '未知'}
版本: ${importData.version || '未知'}

注意：这将覆盖当前的所有设置和排期数据！`);
                if (!confirmImport) return;

                const beforeState = cloneScheduleState();
                const importedSchedules = normalizeImportedSchedules(importData.schedules);
                
                try {
                    // 保存设置
                    await settingAPI.saveSettings(importData.settings || {});
                    
                    // 先清理当前排期，再写入备份，确保导入结果是完整恢复而不是叠加
                    const existingSchedules = await scheduleAPI.getSchedules();
                    for (const date of Object.keys(existingSchedules)) {
                        try {
                            await scheduleAPI.deleteSchedule(date);
                        } catch (error) {
                            if (!/404|未找到/.test(error.message || '')) {
                                throw error;
                            }
                        }
                    }

                    // 保存排期数据
                    for (const [date, projects] of Object.entries(importedSchedules)) {
                        await scheduleAPI.saveSchedule({
                            date,
                            projects
                        });
                    }
                    
                    // 重新加载数据
                    await loadScheduleData();
                    await loadSettings();
                    await loadTemplateData();
                    
                    // 更新项目表单选项
                    updateProjectFormOptions();
                    pushUndoSnapshot('导入备份文件', beforeState);
                    
                    showToast('数据导入成功！', 'success');
                    
                    // 清空文件输入
                    importFileInput.value = '';
                } catch (importError) {
                    console.error('导入过程中出错，正在恢复…:', importError);
                    scheduleData = JSON.parse(JSON.stringify(beforeState));
                    await syncScheduleDates(Object.keys(beforeState));
                    renderSchedule();
                    showToast('导入失败，已恢复到导入前状态：' + importError.message, 'error');
                }
            } catch (error) {
                console.error('解析导入数据时出错:', error);
                showToast('导入数据失败：' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('读取文件时出错:', error);
        showToast('读取文件失败：' + error.message, 'error');
    }
}

// 改进的复制项目功能 - 支持跨周选择日期
let copyProjectData = null; // 存储待复制的项目信息

function showCopyModal(dateStr, projectIndex) {
    copyProjectData = { date: dateStr, index: projectIndex };
    const copyModal = document.getElementById('copy-modal');
    const dateOptionsContainer = document.getElementById('copy-date-options');
    
    // 获取前后各2周的日期（共5周可选）
    const allDates = [];
    for (let i = -2; i <= 2; i++) {
        const monday = new Date(currentMonday);
        monday.setDate(monday.getDate() + (i * 7));
        const weekDates = getWeekDates(monday);
        allDates.push({ weekOffset: i, dates: weekDates, monday: monday });
    }
    
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    // 清空并生成日期选项
    dateOptionsContainer.innerHTML = '';
    
    // 按周分组显示
    allDates.forEach((weekData, weekIndex) => {
        // 添加周标签
        const weekLabel = document.createElement('div');
        weekLabel.className = 'copy-week-label';
        
        const weekNumber = getWeekNumber(weekData.monday);
        const year = weekData.monday.getFullYear();
        const startDate = formatMonthDay(weekData.dates[0]);
        const endDate = formatMonthDay(weekData.dates[6]);
        
        let labelText = '';
        if (weekData.weekOffset === 0) {
            labelText = '本周';
        } else if (weekData.weekOffset === -1) {
            labelText = '上一周';
        } else if (weekData.weekOffset === 1) {
            labelText = '下一周';
        } else {
            labelText = `${year}年第${weekNumber}周`;
        }
        
        weekLabel.innerHTML = `<span>${labelText}</span><span style="font-size:11px;color:#999;">(${startDate}-${endDate})</span>`;
        weekLabel.style.cssText = 'grid-column: 1 / -1; padding: 8px 0; font-size: 12px; color: #667eea; font-weight: 600; text-align: center; border-bottom: 1px solid #eee; margin-bottom: 8px;';
        dateOptionsContainer.appendChild(weekLabel);
        
        // 添加该周的7天选项
        weekData.dates.forEach((date, dayIndex) => {
            const dateStr = formatDate(date);
            const option = document.createElement('div');
            option.className = 'copy-date-option';
            option.dataset.date = dateStr;
            option.innerHTML = `
                <span class="date-label">${date.getDate()}日</span>
                <span class="day-label">${weekdays[dayIndex]}</span>
            `;
            option.addEventListener('click', () => {
                option.classList.toggle('selected');
            });
            dateOptionsContainer.appendChild(option);
        });
    });
    
    // 绑定确认和取消按钮
    document.getElementById('confirm-copy').onclick = async () => {
        const selectedOptions = document.querySelectorAll('.copy-date-option.selected');
        if (selectedOptions.length === 0) {
            showToast('请至少选择一个目标日期', 'warning');
            return;
        }
        
        try {
            const beforeState = cloneScheduleState();
            const project = scheduleData[copyProjectData.date][copyProjectData.index];
            
            for (const option of selectedOptions) {
                const targetDate = option.dataset.date;
                
                if (!scheduleData[targetDate]) {
                    scheduleData[targetDate] = [];
                }
                
                // 创建副本项目（不添加后缀）
                const copiedProject = {
                    ...project,
                    name: project.name
                };
                
                scheduleData[targetDate].push(copiedProject);
                
                // 保存到API
                await scheduleAPI.saveSchedule({
                    date: targetDate,
                    projects: scheduleData[targetDate]
                });
            }
            
            pushUndoSnapshot('跨周复制项目', beforeState);
            renderSchedule();
            showToast(`成功复制到 ${selectedOptions.length} 个日期`, 'success');
        } catch (error) {
            console.error('复制项目时出错:', error);
            showToast(error.message || '复制项目时出错，请重试', 'error');
        }
        
        copyModal.style.display = 'none';
    };
    
    document.getElementById('cancel-copy').onclick = () => {
        copyModal.style.display = 'none';
    };
    
    document.getElementById('close-copy-modal').onclick = () => {
        copyModal.style.display = 'none';
    };
    
    // 点击遮罩关闭
    copyModal.onclick = (e) => {
        if (e.target === copyModal) {
            copyModal.style.display = 'none';
        }
    };
    
    copyModal.style.display = 'block';
}

// ── 操作记录 ──
async function loadHistoryRecords() {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">加载中...</td></tr>';

    const dateFilter = document.getElementById('history-date-filter').value;
    const params = { limit: 200 };
    if (dateFilter) params.date = dateFilter;

    try {
        const records = await apiClient.getHistory(params);

        if (!records || records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">暂无记录</td></tr>';
            return;
        }

        const actionLabels = { saveSchedule: '保存排期', deleteSchedule: '删除排期', add: '新增', edit: '编辑', delete: '删除' };
        const actionClasses = { saveSchedule: 'history-action-add', deleteSchedule: 'history-action-delete', add: 'history-action-add', edit: 'history-action-edit', delete: 'history-action-delete' };

        tbody.innerHTML = records.map(r => {
            const ts = new Date(r.ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const actionLabel = actionLabels[r.action] || r.action;
            const actionClass = actionClasses[r.action] || '';

            // 优先使用后端生成的 detail 字段
            let detail = r.detail || '';

            // 如果没有 detail，尝试从 before/after 推导
            if (!detail) {
                if (r.before_json && r.after_json) {
                    try {
                        const before = JSON.parse(r.before_json);
                        const after = JSON.parse(r.after_json);
                        if (Array.isArray(before) && Array.isArray(after)) {
                            const beforeNames = before.map(p => p.name).filter(Boolean);
                            const afterNames = after.map(p => p.name).filter(Boolean);
                            const added = afterNames.filter(n => !beforeNames.includes(n));
                            const removed = beforeNames.filter(n => !afterNames.includes(n));
                            const parts = [];
                            if (added.length) parts.push(`新增: ${added.join(', ')}`);
                            if (removed.length) parts.push(`删除: ${removed.join(', ')}`);
                            detail = parts.join(' | ') || `更新了 ${after.length} 个项目`;
                        }
                    } catch (e) { /* ignore */ }
                } else if (r.after_json) {
                    try {
                        const after = JSON.parse(r.after_json);
                        detail = Array.isArray(after) ? `${after.length} 个项目` : (after.name || '');
                    } catch (e) { /* ignore */ }
                } else if (r.before_json) {
                    try {
                        const before = JSON.parse(r.before_json);
                        detail = Array.isArray(before) ? `${before.length} 个项目` : (before.name || '');
                    } catch (e) { /* ignore */ }
                }
            }

            return `<tr>
                <td style="white-space:nowrap;font-family:monospace;font-size:12px;">${ts}</td>
                <td class="${actionClass}" style="white-space:nowrap;">${actionLabel}</td>
                <td style="white-space:nowrap;">${r.date || ''}</td>
                <td class="history-diff" style="font-size:13px;">${escapeHtml(detail)}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">加载失败</td></tr>';
        showToast('加载操作记录失败', 'error');
    }
}

// ── 单日一键排序 ──
async function sortDayProjects(dateStr) {
    const projects = scheduleData[dateStr];
    if (!projects || projects.length === 0) {
        showToast('当日暂无项目', 'info');
        return;
    }

    // compute previous day key
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const prevDateStr = d.toISOString().slice(0, 10);
    const prevNames = new Set((scheduleData[prevDateStr] || []).map(p => p.name));

    const toMinutes = (t) => {
        if (!t) return Infinity;
        const m = t.match(/^(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : Infinity;
    };

    const sorted = [...projects].sort((a, b) => {
        const ta = toMinutes(a.startTime);
        const tb = toMinutes(b.startTime);
        if (ta !== tb) return ta - tb;
        // same time: projects that appeared in previous day come first
        const inPrevA = prevNames.has(a.name) ? 0 : 1;
        const inPrevB = prevNames.has(b.name) ? 0 : 1;
        return inPrevA - inPrevB;
    });

    const beforeState = cloneScheduleState();
    scheduleData[dateStr] = sorted;
    try {
        await persistScheduleDate(dateStr);
        pushUndoSnapshot('一键排序', beforeState);
        renderSchedule();
        showToast('排序完成', 'success');
    } catch (err) {
        console.error('排序保存失败:', err);
        showToast('排序保存失败', 'error');
    }
}

// ── 通告单 Modal ──
function showNoticeModal(dateStr) {
    const modal = document.getElementById('notice-modal');
    if (!modal) return;

    const date = new Date(dateStr + 'T00:00:00');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;

    document.getElementById('notice-header-info').innerHTML = `<strong>${dateLabel}</strong> 共 ${(scheduleData[dateStr] || []).length} 个项目`;

    const projects = scheduleData[dateStr] || [];
    const body = document.getElementById('notice-body');

    if (projects.length === 0) {
        body.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px 0">当日暂无项目</p>';
    } else {
        body.innerHTML = projects.map((p, i) => {
            const meta = [
                p.startTime ? `⏰ ${escapeHtml(p.startTime)}` : '',
                p.location ? `📍 ${escapeHtml(p.location)}` : ''
            ];
            const cats = (roleCategories || []).filter(c => c.key !== 'location');
            cats.forEach(cat => {
                const val = p[cat.key] || (p.customFields && p.customFields[cat.key]);
                if (val) meta.push(`${escapeHtml(cat.label)}: ${escapeHtml(val)}`);
            });
            if (p.type) meta.push(`类型: ${escapeHtml(p.type)}`);
            if (p.isAdvertiser && p.advertiserNo) meta.push(`商单 #${escapeHtml(p.advertiserNo)}`);
            const metaFiltered = meta.filter(Boolean);
            return `<div class="notice-project-row">
                <div class="notice-index">${i + 1}</div>
                <div class="notice-project-info">
                    <div class="notice-project-name">${escapeHtml(p.name)}</div>
                    <div class="notice-project-meta">${metaFiltered.map(m => `<span>${m}</span>`).join('')}</div>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('close-notice-modal').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('close-notice-action-btn').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('print-notice-btn').onclick = () => { window.print(); };

    // Build an emoji-free off-screen element for reliable image capture
    const buildNoticeImageElement = () => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = [
            'background:#f8f8f0', 'padding:48px 56px', 'width:660px',
            'font-family:Nunito,\'Noto Sans SC\',sans-serif',
            'position:fixed', 'top:-9999px', 'left:0', 'box-sizing:border-box'
        ].join(';');

        const rows = projects.length === 0
            ? '<p style="color:#9f927d;text-align:center;padding:24px 0">当日暂无项目</p>'
            : projects.map((p, i) => {
                const metaParts = [
                    p.startTime    ? `时间: ${p.startTime}`    : '',
                    p.location     ? `地点: ${p.location}`     : ''
                ];
                const cats = (roleCategories || []).filter(c => c.key !== 'location');
                cats.forEach(cat => {
                    const val = p[cat.key] || (p.customFields && p.customFields[cat.key]);
                    if (val) metaParts.push(`${cat.label}: ${val}`);
                });
                if (p.type) metaParts.push(`类型: ${p.type}`);
                if (p.isAdvertiser && p.advertiserNo) metaParts.push(`商单 #${p.advertiserNo}`);
                const meta = metaParts.filter(Boolean).join('　');
                const advStyle = (p.isAdvertiser && p.advertiserNo) ? `<div style="font-size:11px;font-style:italic;color:#5856d6;margin-top:3px;">商单 #${p.advertiserNo}</div>` : '';
                const border = i < projects.length - 1 ? 'border-bottom:1px solid #c4b89e;' : '';
                return `<div style="display:flex;gap:18px;padding:18px 0;${border}align-items:flex-start">
                    <div style="font-size:13px;font-weight:600;color:#9f927d;min-width:18px;padding-top:3px">${i + 1}</div>
                    <div style="flex:1">
                        <div style="font-size:18px;font-weight:700;color:#794f27;margin-bottom:6px;line-height:1.3">${p.name}</div>
                        <div style="font-size:13px;color:#725d42;line-height:1.7">${meta || '—'}</div>
                        ${advStyle}
                    </div>
                </div>`;
            }).join('');

        wrapper.innerHTML = `
            <div style="font-size:28px;font-weight:800;color:#794f27;margin-bottom:22px;letter-spacing:-0.5px">通告单</div>
            <div style="font-size:15px;color:#725d42;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #c4b89e">
                <strong style="color:#794f27;font-size:16px">${dateLabel}</strong>&nbsp;&nbsp;共 ${projects.length} 个项目
            </div>
            ${rows}
        `;
        document.body.appendChild(wrapper);
        return wrapper;
    };

    const captureNotice = () => {
        const el = buildNoticeImageElement();
        return html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f8f8f0' })
            .then(canvas => { document.body.removeChild(el); return canvas; })
            .catch(err => { document.body.removeChild(el); throw err; });
    };

    document.getElementById('notice-save-image-btn').onclick = async () => {
        const btn = document.getElementById('notice-save-image-btn');
        btn.disabled = true;
        btn.textContent = '生成中…';
        try {
            const canvas = await captureNotice();
            const link = document.createElement('a');
            link.download = `通告单_${dateLabel}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            showToast('图片生成失败', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '保存为图片';
        }
    };

    document.getElementById('notice-open-image-btn').onclick = async () => {
        const btn = document.getElementById('notice-open-image-btn');
        btn.disabled = true;
        btn.textContent = '生成中…';
        try {
            const canvas = await captureNotice();
            const dataUrl = canvas.toDataURL('image/png');
            const win = window.open('', '_blank');
            win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>通告单 ${dateLabel}</title><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet"><style>body{margin:0;display:flex;justify-content:center;background:#f8f8f0;font-family:Nunito,'Noto Sans SC',sans-serif;}img{max-width:100%;border-radius:16px;box-shadow:0 8px 24px rgba(61,52,40,0.14);margin:24px auto;}</style></head><body><img src="${dataUrl}"></body></html>`);
            win.document.close();
        } catch (err) {
            showToast('图片生成失败', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '在新窗口打开';
        }
    };

    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    modal.style.display = 'block';
}

// 动森 HUD 时钟（东八区上海时间）
(function initAcClock() {
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    function updateClock() {
        const now = new Date();
        const shanghaiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
        const h = String(shanghaiTime.getHours()).padStart(2, '0');
        const m = String(shanghaiTime.getMinutes()).padStart(2, '0');
        const s = String(shanghaiTime.getSeconds()).padStart(2, '0');
        const weekday = weekdays[shanghaiTime.getDay()];
        const day = shanghaiTime.getDate();

        const hEl = document.getElementById('ac-clock-h');
        const mEl = document.getElementById('ac-clock-m');
        const sEl = document.getElementById('ac-clock-s');
        const wdEl = document.getElementById('ac-clock-weekday');
        const dyEl = document.getElementById('ac-clock-day');

        if (hEl) hEl.textContent = h;
        if (mEl) mEl.textContent = m;
        if (sEl) sEl.textContent = s;
        if (wdEl) wdEl.textContent = weekday;
        if (dyEl) dyEl.textContent = shanghaiTime.getDate();
    }
    updateClock();
    setInterval(updateClock, 1000);
})();

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
