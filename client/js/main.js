import { createApiClient } from './modules/api.js';
import { getMonday, formatDate, formatMonthDay, getWeekDates, getWeekNumber } from './modules/date.js';
import { createDefaultFilters, matchesProjectFilters } from './modules/filters.js';
import { createUndoManager } from './modules/undo.js';

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
const currentWeekBtn = document.getElementById('current-week');
const addProjectBtn = document.getElementById('add-project');
const exportImageBtn = document.getElementById('export-image');
const settingsBtn = document.getElementById('settings');
const undoActionBtn = document.getElementById('undo-action');
const searchProjectsInput = document.getElementById('search-projects');
const filterTypeSelect = document.getElementById('filter-type');
const filterPersonInput = document.getElementById('filter-person');
const clearFiltersBtn = document.getElementById('clear-filters');
const healthBadge = document.getElementById('health-badge');
const adminBtn = document.getElementById('admin-btn');
const heatmapBtn = document.getElementById('heatmap-btn');

// 模态框元素
const projectModal = document.getElementById('project-modal');
const settingsModal = document.getElementById('settings-modal');
const closeModalButtons = document.querySelectorAll('.close');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveSettingsBtn = document.getElementById('save-settings');

// 表单元素
const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectDateInput = document.getElementById('project-date');
const selectDateBtn = document.getElementById('select-date-btn');
const projectLocationSelect = document.getElementById('project-location');
const projectLocationInput = document.getElementById('project-location-input');
const projectDirectorSelect = document.getElementById('project-director');
const projectDirectorInput = document.getElementById('project-director-input');
const projectPhotographerSelect = document.getElementById('project-photographer');
const projectPhotographerInput = document.getElementById('project-photographer-input');
const projectProductionSelect = document.getElementById('project-production');
const projectProductionInput = document.getElementById('project-production-input');
const projectRdSelect = document.getElementById('project-rd');
const projectRdInput = document.getElementById('project-rd-input');
const projectOperationalSelect = document.getElementById('project-operational');
const projectOperationalInput = document.getElementById('project-operational-input');
const projectAudioSelect = document.getElementById('project-audio');
const projectAudioInput = document.getElementById('project-audio-input');
const projectTypeSelect = document.getElementById('project-type');
const projectStartTimeSelect = document.getElementById('project-start-time');
const projectLaodaoCheckbox = document.getElementById('project-laodao');
const addLocationBtn = document.getElementById('add-location');
const addDirectorBtn = document.getElementById('add-director');
const addPhotographerBtn = document.getElementById('add-photographer');
const addProductionBtn = document.getElementById('add-production');
const addRdBtn = document.getElementById('add-rd');
const addOperationalBtn = document.getElementById('add-operational');
const addAudioBtn = document.getElementById('add-audio');
const projectTemplateSelect = document.getElementById('project-template-select');
const applyTemplateBtn = document.getElementById('apply-template');
const saveTemplateFromFormBtn = document.getElementById('save-template-from-form');

// 设置元素
const commonLocationsTextarea = document.getElementById('common-locations');
const commonDirectorsTextarea = document.getElementById('common-directors');
const commonPhotographersTextarea = document.getElementById('common-photographers');
const commonProductionFacilitiesTextarea = document.getElementById('common-production-facilities');
const commonRdFacilitiesTextarea = document.getElementById('common-rd-facilities');
const commonOperationalFacilitiesTextarea = document.getElementById('common-operational-facilities');
const commonAudioFacilitiesTextarea = document.getElementById('common-audio-facilities');
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
    for (const date of uniqueDates) {
        await persistScheduleDate(date);
    }
}

function pushUndoSnapshot(label, beforeState, afterState) {
    undoManager.push({
        label,
        before: beforeState,
        after: afterState
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
        healthBadge.textContent = `系统正常 · ${health.schedulesCount}天排期`;
        healthBadge.dataset.state = 'ok';
    } catch (error) {
        healthBadge.textContent = '系统状态异常';
        healthBadge.dataset.state = 'error';
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
                <strong>${template.name}</strong>
                <span>${template.defaults.type || '未设置类型'} · ${template.defaults.location || '未设置场地'}</span>
            </div>
            <div class="template-item-actions">
                <button class="btn use-template-btn" data-template-id="${template.id}">应用</button>
                <button class="btn delete-template-btn" data-template-id="${template.id}">删除</button>
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

    const setMultiField = (selectElement, inputElement, value) => {
        Array.from(selectElement.options).forEach((option) => {
            option.selected = false;
        });

        if (!value) {
            selectElement.style.display = 'block';
            inputElement.style.display = 'none';
            inputElement.value = '';
            return;
        }

        const parts = String(value).split(',').map((item) => item.trim()).filter(Boolean);
        const matched = Array.from(selectElement.options).filter((option) => parts.includes(option.value));
        if (matched.length === parts.length) {
            matched.forEach((option) => {
                option.selected = true;
            });
            selectElement.style.display = 'block';
            inputElement.style.display = 'none';
            inputElement.value = '';
        } else {
            selectElement.style.display = 'none';
            inputElement.style.display = 'block';
            inputElement.value = value;
        }
    };

    if (defaults.location) {
        const hasLocationOption = Array.from(projectLocationSelect.options).some((option) => option.value === defaults.location);
        if (hasLocationOption) {
            projectLocationSelect.style.display = 'block';
            projectLocationInput.style.display = 'none';
            projectLocationSelect.value = defaults.location;
        } else {
            projectLocationSelect.style.display = 'none';
            projectLocationInput.style.display = 'block';
            projectLocationInput.value = defaults.location;
        }
    }

    setMultiField(projectDirectorSelect, projectDirectorInput, defaults.director);
    setMultiField(projectPhotographerSelect, projectPhotographerInput, defaults.photographer);
    setMultiField(projectProductionSelect, projectProductionInput, defaults.production);
    setMultiField(projectRdSelect, projectRdInput, defaults.rd);
    setMultiField(projectOperationalSelect, projectOperationalInput, defaults.operational);
    setMultiField(projectAudioSelect, projectAudioInput, defaults.audio);
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

    const payload = {
        name: templateName,
        defaults: {
            name: projectNameInput.value,
            location: projectLocationSelect.style.display !== 'none' ? projectLocationSelect.value : projectLocationInput.value,
            director: Array.from(projectDirectorSelect.selectedOptions).map((option) => option.value).join(', ') || projectDirectorInput.value,
            photographer: Array.from(projectPhotographerSelect.selectedOptions).map((option) => option.value).join(', ') || projectPhotographerInput.value,
            production: Array.from(projectProductionSelect.selectedOptions).map((option) => option.value).join(', ') || projectProductionInput.value,
            rd: Array.from(projectRdSelect.selectedOptions).map((option) => option.value).join(', ') || projectRdInput.value,
            operational: Array.from(projectOperationalSelect.selectedOptions).map((option) => option.value).join(', ') || projectOperationalInput.value,
            audio: Array.from(projectAudioSelect.selectedOptions).map((option) => option.value).join(', ') || projectAudioInput.value,
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
        search: searchProjectsInput.value.trim(),
        type: filterTypeSelect.value,
        person: filterPersonInput.value.trim()
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
    await loadScheduleData();
    await loadSettings();
    await loadTemplateData();
    
    // 移动端默认显示今日日期
    if (isMobile) {
        showTodayOnMobile();
    }
    
    // 更新项目表单选项
    updateProjectFormOptions();
    
    // 初始化开始时间选项
    initStartTimeOptions();
    
    // 连接SSE实现实时同步
    connectSSE();
    setInterval(loadHealthStatus, 30000);
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
                versionDate.textContent = `${versionData.createDate} · build ${versionData.buildDate}`;
            }
        }
    } catch (error) {
        console.error('加载版本信息失败:', error);
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
                // 更新本地设置
                commonLocationsTextarea.value = (data.settings.commonLocations || []).join('\n');
                commonDirectorsTextarea.value = (data.settings.commonDirectors || []).join('\n');
                commonPhotographersTextarea.value = (data.settings.commonPhotographers || []).join('\n');
                commonProductionFacilitiesTextarea.value = (data.settings.commonProductionFacilities || []).join('\n');
                commonRdFacilitiesTextarea.value = (data.settings.commonRdFacilities || []).join('\n');
                commonOperationalFacilitiesTextarea.value = (data.settings.commonOperationalFacilities || []).join('\n');
                commonAudioFacilitiesTextarea.value = (data.settings.commonAudioFacilities || []).join('\n');
                // 更新项目表单选项
                updateProjectFormOptions();
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
    };
}

// 更新周显示
function updateWeekDisplay() {
    const weekDates = getWeekDates(currentMonday);
    const startDate = formatMonthDay(weekDates[0]);
    const endDate = formatMonthDay(weekDates[6]);
    weekDisplay.textContent = `${startDate} - ${endDate}`;
}

// 渲染排期表
function renderSchedule() {
    const weekDates = getWeekDates(currentMonday);
    const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
    
    // 获取今天的日期用于高亮
    const today = new Date();
    const todayStr = formatDate(today);
    
    // 更新星期标题，显示准确日期
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    dayHeaders.forEach((headerId, index) => {
        const header = document.getElementById(headerId);
        const date = weekDates[index];
        const dateStr = formatDate(date);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        header.innerHTML = `${weekdays[index]} (${month}/${day}) <button class="notice-day-btn" data-date="${dateStr}">通告单</button><button class="sort-day-btn" data-date="${dateStr}" title="按开始时间一键排序">⇅ 排序</button>`;

        // 今日高亮
        if (dateStr === todayStr) {
            header.classList.add('today-highlight');
        } else {
            header.classList.remove('today-highlight');
        }
    });
    
    dayColumns.forEach((columnId, index) => {
        const column = document.getElementById(columnId);
        const dateStr = formatDate(weekDates[index]);
        
        // 今日高亮列
        if (dateStr === todayStr) {
            column.classList.add('today-highlight');
        } else {
            column.classList.remove('today-highlight');
        }
        
        // 清空现有内容
        column.innerHTML = '';
        
        // 添加快速添加按钮
        const addBtn = document.createElement('button');
        addBtn.className = 'add-btn';
        addBtn.innerHTML = '+';
        addBtn.title = '点击添加项目';
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showProjectModal(dateStr);
        });
        column.appendChild(addBtn);
        
        // 添加拖拽事件监听器
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
        
        const dayProjects = (scheduleData[dateStr] || []).filter((project) => matchesProjectFilters(project, filterState));

        // 如果有该项目日期的数据，则渲染项目卡片
        if (dayProjects.length > 0) {
            dayProjects.forEach((project) => {
                const originalIndex = (scheduleData[dateStr] || []).indexOf(project);
                const projectCard = createProjectCard(project, dateStr, originalIndex);
                column.appendChild(projectCard);
            });
        } else {
            // 显示空状态
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
    // 添加拖拽功能
    card.draggable = true;
    card.dataset.date = dateStr;
    card.dataset.index = projectIndex;
    
    const typeClassMap = {
        '平面': 'plane',
        '视频': 'video',
        '直播': 'live',
        '试做': 'test'
    };
    
    const typeClass = typeClassMap[project.type] || 'plane';
    
    // 构建工作人员信息
    let staffInfo = '';
    if (project.director || project.photographer || project.production || project.rd || project.operational || project.audio || project.startTime) {
        staffInfo = '<div class="staff-info">';
        if (project.startTime) {
            staffInfo += `<span class="staff-role start-time">⏰ ${project.startTime}</span>`;
        }
        if (project.director) {
            staffInfo += `<span class="staff-role director">导演：${project.director}</span>`;
        }
        if (project.photographer) {
            staffInfo += `<span class="staff-role photographer">摄影：${project.photographer}</span>`;
        }
        if (project.production) {
            staffInfo += `<span class="staff-role production">制片：${project.production}</span>`;
        }
        if (project.rd) {
            staffInfo += `<span class="staff-role rd">研发：${project.rd}</span>`;
        }
        if (project.operational) {
            staffInfo += `<span class="staff-role operational">运营：${project.operational}</span>`;
        }
        if (project.audio) {
            staffInfo += `<span class="staff-role audio">录音：${project.audio}</span>`;
        }
        staffInfo += '</div>';
    }
    
    // 添加老刀出镜标记
    const laodaoMark = project.laodao ? '<div class="laodao-mark">老刀出镜</div>' : '';

    // 状态标签
    const statusClassMap = { '待确认': 'pending', '已确认': 'confirmed', '已完成': 'done', '取消': 'cancelled' };
    const statusClass = statusClassMap[project.status] || 'pending';
    const statusBadge = `<span class="status-badge status-${statusClass}">${project.status || '待确认'}</span>`;
    
    card.innerHTML = `
        <div class="project-title">
            <span>${project.name}</span>
            <button class="delete-btn" data-date="${dateStr}" data-index="${projectIndex}">×</button>
        </div>
        ${laodaoMark}
        ${statusBadge}
        ${staffInfo}
        <div class="project-location">📍 ${project.location}</div>
        <div>
            <span class="project-type ${typeClass}">${project.type}</span>
        </div>
        <div class="card-actions">
            <button class="copy-btn" data-date="${dateStr}" data-index="${projectIndex}">📋 复制</button>
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
    prevWeekBtn.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        updateWeekDisplay();
        renderSchedule();
    });
    
    nextWeekBtn.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        updateWeekDisplay();
        renderSchedule();
    });
    
    currentWeekBtn.addEventListener('click', () => {
        currentMonday = getMonday(new Date());
        updateWeekDisplay();
        renderSchedule();
    });
    
    // 添加项目按钮
    addProjectBtn.addEventListener('click', () => {
        showProjectModal();
    });
    
    // 导出图片按钮
    exportImageBtn.addEventListener('click', showExportModal);
    
    // 粘贴识别按钮
    pasteRecognitionBtn.addEventListener('click', handlePasteRecognition);
    
    // 设置按钮
    settingsBtn.addEventListener('click', () => {
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

    undoActionBtn.addEventListener('click', async () => {
        try {
            await undoLastChange();
        } catch (error) {
            console.error('撤销失败:', error);
            showToast(error.message || '撤销失败', 'error');
        }
    });

    searchProjectsInput.addEventListener('input', updateFilterState);
    filterTypeSelect.addEventListener('change', updateFilterState);
    filterPersonInput.addEventListener('input', updateFilterState);
    clearFiltersBtn.addEventListener('click', () => {
        searchProjectsInput.value = '';
        filterTypeSelect.value = '';
        filterPersonInput.value = '';
        updateFilterState();
    });

    applyTemplateBtn.addEventListener('click', applySelectedTemplate);
    saveTemplateFromFormBtn.addEventListener('click', async () => {
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
    cancelEditBtn.addEventListener('click', () => {
        projectModal.style.display = 'none';
    });
    
    // 保存设置按钮
    saveSettingsBtn.addEventListener('click', saveSettings);

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
    exportDataBtn.addEventListener('click', exportAllData);
    
    // 数据导入按钮
    importDataBtn.addEventListener('click', () => {
        importFileInput.click();
    });
    
    // 文件选择事件
    importFileInput.addEventListener('change', handleImportFile);

    closeBackupPreviewBtn.addEventListener('click', closeBackupPreviewModal);
    cancelBackupRestoreBtn.addEventListener('click', closeBackupPreviewModal);
    confirmBackupRestoreBtn.addEventListener('click', async () => {
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
    addLocationBtn.addEventListener('click', () => {
        toggleInput(projectLocationSelect, projectLocationInput);
    });
    
    addDirectorBtn.addEventListener('click', () => {
        toggleInput(projectDirectorSelect, projectDirectorInput);
    });
    
    addPhotographerBtn.addEventListener('click', () => {
        toggleInput(projectPhotographerSelect, projectPhotographerInput);
    });
    
    addProductionBtn.addEventListener('click', () => {
        toggleInput(projectProductionSelect, projectProductionInput);
    });
    
    addRdBtn.addEventListener('click', () => {
        toggleInput(projectRdSelect, projectRdInput);
    });
    
    addOperationalBtn.addEventListener('click', () => {
        toggleInput(projectOperationalSelect, projectOperationalInput);
    });
    
    addAudioBtn.addEventListener('click', () => {
        toggleInput(projectAudioSelect, projectAudioInput);
    });
    
    // 日期选择功能
    selectDateBtn.addEventListener('click', showDatePicker);
    projectDateInput.addEventListener('click', showDatePicker);
    
    // 日期选择器事件
    closeDatePickerBtn.addEventListener('click', () => {
        datePickerModal.style.display = 'none';
    });
    
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    confirmDateBtn.addEventListener('click', confirmDateSelection);
    
    cancelDateBtn.addEventListener('click', () => {
        datePickerModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭日期选择器
    datePickerModal.addEventListener('click', (e) => {
        if (e.target === datePickerModal) {
            datePickerModal.style.display = 'none';
        }
    });
    
    // 表单提交
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject();
    });
    
    // 图片导出模态框事件
    closeExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    downloadImageBtn.addEventListener('click', downloadImage);
    
    // 添加在新标签页打开图片事件
    openInNewTabBtn.addEventListener('click', openImageInNewTab);
    
    cancelExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭图片导出模态框
    exportModal.addEventListener('click', (e) => {
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
}

// 显示项目编辑模态框
function showProjectModal(dayColumn = null) {
    // 重置表单
    projectForm.reset();
    currentEditingProject = null;
    currentEditingDay = dayColumn;
    
    // 更新选项
    updateProjectFormOptions();
    
    // 重置输入框显示状态
    projectLocationSelect.style.display = 'block';
    projectLocationInput.style.display = 'none';
    projectDirectorSelect.style.display = 'block';
    projectDirectorInput.style.display = 'none';
    projectPhotographerSelect.style.display = 'block';
    projectPhotographerInput.style.display = 'none';
    projectProductionSelect.style.display = 'block';
    projectProductionInput.style.display = 'none';
    projectRdSelect.style.display = 'block';
    projectRdInput.style.display = 'none';
    projectOperationalSelect.style.display = 'block';
    projectOperationalInput.style.display = 'none';
    projectAudioSelect.style.display = 'block';
    projectAudioInput.style.display = 'none';
    
    // 重置多选框
    projectLaodaoCheckbox.checked = false;
    projectTemplateSelect.value = '';
    
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
    
    // 获取第一天是星期几 (0=周日, 6=周六)
    const firstDayOfWeek = firstDay.getDay();
    
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
    
    // 设置拍摄地
    if (Array.from(projectLocationSelect.options).some(option => option.value === project.location)) {
        projectLocationSelect.value = project.location || '';
        projectLocationSelect.style.display = 'block';
        projectLocationInput.style.display = 'none';
    } else {
        projectLocationInput.value = project.location || '';
        projectLocationSelect.style.display = 'none';
        projectLocationInput.style.display = 'block';
    }
    
    // 设置导演
    if (Array.from(projectDirectorSelect.options).some(option => option.value === project.director)) {
        projectDirectorSelect.value = project.director || '';
        projectDirectorSelect.style.display = 'block';
        projectDirectorInput.style.display = 'none';
    } else {
        projectDirectorInput.value = project.director || '';
        projectDirectorSelect.style.display = 'none';
        projectDirectorInput.style.display = 'block';
    }
    
    // 设置导演（多选）
    const directors = project.director ? project.director.split(', ').map(d => d.trim()) : [];
    Array.from(projectDirectorSelect.options).forEach(option => {
        option.selected = directors.includes(option.value);
    });
    
    // 设置摄影师（多选）
    const photographers = project.photographer ? project.photographer.split(', ').map(p => p.trim()) : [];
    Array.from(projectPhotographerSelect.options).forEach(option => {
        option.selected = photographers.includes(option.value);
    });
    
    // 设置制片（多选）
    const productions = project.production ? project.production.split(', ').map(p => p.trim()) : [];
    Array.from(projectProductionSelect.options).forEach(option => {
        option.selected = productions.includes(option.value);
    });
    
    // 设置研发（多选）
    const rds = project.rd ? project.rd.split(', ').map(r => r.trim()) : [];
    Array.from(projectRdSelect.options).forEach(option => {
        option.selected = rds.includes(option.value);
    });
    
    // 设置运营（多选）
    const operationals = project.operational ? project.operational.split(', ').map(o => o.trim()) : [];
    Array.from(projectOperationalSelect.options).forEach(option => {
        option.selected = operationals.includes(option.value);
    });
    
    // 设置录音（多选）
    const audios = project.audio ? project.audio.split(', ').map(a => a.trim()) : [];
    Array.from(projectAudioSelect.options).forEach(option => {
        option.selected = audios.includes(option.value);
    });
    
    // 设置老刀出镜选项
    projectLaodaoCheckbox.checked = project.laodao || false;

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
    // 获取摄影师值（多选）
    let photographerValue = '';
    const selectedPhotographerOptions = Array.from(projectPhotographerSelect.selectedOptions);
    if (selectedPhotographerOptions.length > 0) {
        photographerValue = selectedPhotographerOptions.map(option => option.value).join(', ');
    } else if (projectPhotographerInput.style.display !== 'none') {
        photographerValue = projectPhotographerInput.value;
    }
    
    // 获取导演值（多选）
    let directorValue = '';
    const selectedDirectorOptions = Array.from(projectDirectorSelect.selectedOptions);
    if (selectedDirectorOptions.length > 0) {
        directorValue = selectedDirectorOptions.map(option => option.value).join(', ');
    } else if (projectDirectorInput.style.display !== 'none') {
        directorValue = projectDirectorInput.value;
    }
    
    // 获取制片值（多选）
    let productionValue = '';
    const selectedProductionOptions = Array.from(projectProductionSelect.selectedOptions);
    if (selectedProductionOptions.length > 0) {
        productionValue = selectedProductionOptions.map(option => option.value).join(', ');
    } else if (projectProductionInput.style.display !== 'none') {
        productionValue = projectProductionInput.value;
    }
    
    // 获取研发值（多选）
    let rdValue = '';
    const selectedRdOptions = Array.from(projectRdSelect.selectedOptions);
    if (selectedRdOptions.length > 0) {
        rdValue = selectedRdOptions.map(option => option.value).join(', ');
    } else if (projectRdInput.style.display !== 'none') {
        rdValue = projectRdInput.value;
    }
    
    // 获取运营值（多选）
    let operationalValue = '';
    const selectedOperationalOptions = Array.from(projectOperationalSelect.selectedOptions);
    if (selectedOperationalOptions.length > 0) {
        operationalValue = selectedOperationalOptions.map(option => option.value).join(', ');
    } else if (projectOperationalInput.style.display !== 'none') {
        operationalValue = projectOperationalInput.value;
    }
    
    // 获取录音值（多选）
    let audioValue = '';
    const selectedAudioOptions = Array.from(projectAudioSelect.selectedOptions);
    if (selectedAudioOptions.length > 0) {
        audioValue = selectedAudioOptions.map(option => option.value).join(', ');
    } else if (projectAudioInput.style.display !== 'none') {
        audioValue = projectAudioInput.value;
    }
    
    const project = {
        name: projectNameInput.value,
        location: projectLocationSelect.style.display !== 'none' ? projectLocationSelect.value : projectLocationInput.value,
        director: directorValue,
        photographer: photographerValue,
        production: productionValue,
        rd: rdValue,
        operational: operationalValue,
        audio: audioValue,
        laodao: projectLaodaoCheckbox.checked,
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
        pushUndoSnapshot(currentEditingProject ? '编辑项目' : '新增项目', beforeState, scheduleData);
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
    settingsModal.style.display = 'block';
    renderTemplateList();
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
            const item = document.createElement('div');
            item.className = 'backup-item';
            item.innerHTML = `
                <div class="backup-item-info">
                    <span class="backup-item-date">${backup.date}</span>
                    <span class="backup-item-time">${new Date(backup.time).toLocaleTimeString()} · ${backup.projectsCount || 0}个项目</span>
                </div>
                <div class="backup-item-actions">
                    <button class="btn restore-backup-btn" data-path="${backup.path}">预览并恢复</button>
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
                loadBackupList();
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
        unlockedContent.style.display = 'flex';
        setupBackupEvents();
        loadBackupList();
        loadAccessSettings();
        loadHistoryRecords();
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

    // Tab 切换
    modal.querySelectorAll('.heatmap-tab-btn').forEach(btn => {
        btn.onclick = () => {
            modal.querySelectorAll('.heatmap-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderHeatmap(btn.dataset.range);
        };
    });

    // 默认渲染"本周"
    const defaultTab = modal.querySelector('.heatmap-tab-btn[data-range="week"]');
    if (defaultTab) {
        modal.querySelectorAll('.heatmap-tab-btn').forEach(b => b.classList.remove('active'));
        defaultTab.classList.add('active');
    }
    renderHeatmap('week');
    modal.style.display = 'block';
}

function renderHeatmap(range) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate, endDate;
    if (range === 'today') {
        startDate = endDate = today;
    } else if (range === 'week') {
        startDate = getMonday(today);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
    } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    const roles = ['director', 'photographer', 'production', 'operational', 'rd', 'audio'];
    const personCount = {};
    const dayCount = {};

    Object.entries(scheduleData).forEach(([dateStr, projects]) => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
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

    function renderBars(container, dataObj, emptyMsg) {
        if (!container) return;
        const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            container.innerHTML = `<div class="heatmap-empty">${emptyMsg}</div>`;
            return;
        }
        const maxVal = entries[0][1];
        container.innerHTML = entries.map(([label, count]) => `
            <div class="heatmap-bar-row">
                <div class="heatmap-bar-label">${label}</div>
                <div class="heatmap-bar-track">
                    <div class="heatmap-bar-fill" style="width:${Math.round(count / maxVal * 100)}%"></div>
                </div>
                <div class="heatmap-bar-count">${count}</div>
            </div>
        `).join('');
    }

    renderBars(personList, personCount, '该时间段暂无人员排期');
    renderBars(dayList, dayCount, '该时间段暂无项目');
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
    const locations = commonLocationsTextarea.value.split('\n').filter(item => item.trim() !== '');
    const directors = commonDirectorsTextarea.value.split('\n').filter(item => item.trim() !== '');
    const photographers = commonPhotographersTextarea.value.split('\n').filter(item => item.trim() !== '');
    const productionFacilities = commonProductionFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    const rdFacilities = commonRdFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    const operationalFacilities = commonOperationalFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    const audioFacilities = commonAudioFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    
    try {
        // 保存到API
        await settingAPI.saveSettings({
            commonLocations: locations,
            commonDirectors: directors,
            commonPhotographers: photographers,
            commonProductionFacilities: productionFacilities,
            commonRdFacilities: rdFacilities,
            commonOperationalFacilities: operationalFacilities,
            commonAudioFacilities: audioFacilities
        });
        
        // 更新项目表单中的选项
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
        
        commonLocationsTextarea.value = settings.commonLocations.join('\n');
        commonDirectorsTextarea.value = settings.commonDirectors.join('\n');
        commonPhotographersTextarea.value = settings.commonPhotographers.join('\n');
        commonProductionFacilitiesTextarea.value = settings.commonProductionFacilities ? settings.commonProductionFacilities.join('\n') : '';
        commonRdFacilitiesTextarea.value = settings.commonRdFacilities ? settings.commonRdFacilities.join('\n') : '';
        commonOperationalFacilitiesTextarea.value = settings.commonOperationalFacilities ? settings.commonOperationalFacilities.join('\n') : '';
        commonAudioFacilitiesTextarea.value = settings.commonAudioFacilities ? settings.commonAudioFacilities.join('\n') : '';
        
        // 更新项目表单选项
        updateProjectFormOptions();
    } catch (error) {
        console.error('加载设置时出错:', error);
        // 使用空数组作为默认值
        commonLocationsTextarea.value = '';
        commonDirectorsTextarea.value = '';
        commonPhotographersTextarea.value = '';
        commonProductionFacilitiesTextarea.value = '';
        commonRdFacilitiesTextarea.value = '';
        commonOperationalFacilitiesTextarea.value = '';
        commonAudioFacilitiesTextarea.value = '';
    }
}

// 更新项目表单选项
function updateProjectFormOptions() {
    // 从文本区域获取选项
    const locations = commonLocationsTextarea.value.split('\n').filter(item => item.trim() !== '');
    const directors = commonDirectorsTextarea.value.split('\n').filter(item => item.trim() !== '');
    const photographers = commonPhotographersTextarea.value.split('\n').filter(item => item.trim() !== '');
    const productions = commonProductionFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    const rds = commonRdFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    const operationals = commonOperationalFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    const audios = commonAudioFacilitiesTextarea.value.split('\n').filter(item => item.trim() !== '');
    
    // 清空现有选项
    projectLocationSelect.innerHTML = '<option value="">请选择拍摄地</option>';
    projectDirectorSelect.innerHTML = '<option value="">请选择导演</option>';
    projectPhotographerSelect.innerHTML = '<option value="">请选择摄影师</option>';
    projectProductionSelect.innerHTML = '<option value="">请选择制片</option>';
    projectRdSelect.innerHTML = '<option value="">请选择研发</option>';
    projectOperationalSelect.innerHTML = '<option value="">请选择运营</option>';
    projectAudioSelect.innerHTML = '<option value="">请选择录音</option>';
    
    // 添加新选项
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        projectLocationSelect.appendChild(option);
    });
    
    directors.forEach(director => {
        const option = document.createElement('option');
        option.value = director;
        option.textContent = director;
        projectDirectorSelect.appendChild(option);
    });
    
    photographers.forEach(photographer => {
        const option = document.createElement('option');
        option.value = photographer;
        option.textContent = photographer;
        projectPhotographerSelect.appendChild(option);
    });
    
    productions.forEach(production => {
        const option = document.createElement('option');
        option.value = production;
        option.textContent = production;
        projectProductionSelect.appendChild(option);
    });
    
    rds.forEach(rd => {
        const option = document.createElement('option');
        option.value = rd;
        option.textContent = rd;
        projectRdSelect.appendChild(option);
    });
    
    operationals.forEach(operational => {
        const option = document.createElement('option');
        option.value = operational;
        option.textContent = operational;
        projectOperationalSelect.appendChild(option);
    });
    
    audios.forEach(audio => {
        const option = document.createElement('option');
        option.value = audio;
        option.textContent = audio;
        projectAudioSelect.appendChild(option);
    });
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
        // 从API获取所有数据（不传递日期范围参数）
        scheduleData = await scheduleAPI.getSchedules();
            
        renderSchedule();
    } catch (error) {
        console.error('加载排期数据时出错:', error);
        // 使用空对象作为默认值
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
        <p style="color: #666; margin: 20px 0;">确定要删除项目 "<strong>${projectName}</strong>" 吗？</p>
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
            
            pushUndoSnapshot('删除项目', beforeState, scheduleData);
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

// 复制项目
async function copyProject(dateStr, projectIndex) {
    const beforeState = cloneScheduleState();
    try {
        const project = scheduleData[dateStr][projectIndex];
        
        // 创建项目副本（在同一日期）
        if (!scheduleData[dateStr]) {
            scheduleData[dateStr] = [];
        }
        
        // 创建副本项目（不添加后缀）
        const copiedProject = {
            ...project,
            name: project.name
        };
        
        // 添加到同一日期的项目列表末尾
        scheduleData[dateStr].push(copiedProject);
        
        // 保存数据到API
        await scheduleAPI.saveSchedule({
            date: dateStr,
            projects: scheduleData[dateStr]
        });
        
        // 重新渲染
        pushUndoSnapshot('复制项目', beforeState, scheduleData);
        renderSchedule();
        showToast('项目复制成功', 'success');
    } catch (error) {
        console.error('复制项目时出错:', error);
        scheduleData = beforeState;
        showToast(error.message || '复制项目时出错，请重试', 'error');
    }
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
        renderSchedule();
        
        showToast(`成功创建 ${projectNames.length} 个项目`, 'success');
        console.log('项目创建成功');
    } catch (error) {
        console.error('创建项目时出错:', error);
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
        const srcIndex = parseInt(dragSrcElement.dataset.index);
        
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
                pushUndoSnapshot('拖拽移动项目', beforeState, scheduleData);
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
    exportModal.style.display = 'block';
    drawScheduleToCanvas();
}

// 在canvas上绘制排期表（所见即所得版本 - Apple 风格）
function drawScheduleToCanvas() {
    // 创建临时的DOM元素用于渲染
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '1680px';
    // 与编辑页面底色一致 - 浅灰色背景
    tempContainer.style.background = '#f5f5f7';
    tempContainer.style.padding = '24px';
    tempContainer.style.minHeight = '800px';
    
    // 创建头部 - 毛玻璃效果
    const header = document.createElement('div');
    header.style.background = 'rgba(255, 255, 255, 0.85)';
    header.style.backdropFilter = 'blur(20px)';
    header.style.webkitBackdropFilter = 'blur(20px)';
    header.style.borderRadius = '24px';
    header.style.padding = '28px 32px';
    header.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.15)';
    header.style.marginBottom = '24px';
    header.style.textAlign = 'center';
    header.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    
    // 创建标题 - 白色毛玻璃效果
    const title = document.createElement('div');
    title.textContent = '罐头场通告排期';
    title.style.fontSize = '28px';
    title.style.fontWeight = '600';
    title.style.color = '#1d1d1f';
    title.style.marginBottom = '12px';
    title.style.letterSpacing = '-0.5px';
    
    // 创建周信息
    const weekDates = getWeekDates(currentMonday);
    const weekNumber = getWeekNumber(weekDates[0]);
    const year = weekDates[0].getFullYear();
    const startDate = formatMonthDay(weekDates[0]);
    const endDate = formatMonthDay(weekDates[6]);
    
    const weekInfo = document.createElement('div');
    weekInfo.textContent = `${year}年第${weekNumber}周 周通告 (${startDate} - ${endDate})`;
    weekInfo.style.fontWeight = '500';
    weekInfo.style.fontSize = '16px';
    weekInfo.style.color = '#6e6e73';
    
    header.appendChild(title);
    header.appendChild(weekInfo);
    
    // 创建主要内容区域 - 毛玻璃效果
    const mainContent = document.createElement('div');
    mainContent.style.background = 'rgba(255, 255, 255, 0.85)';
    mainContent.style.backdropFilter = 'blur(20px)';
    mainContent.style.webkitBackdropFilter = 'blur(20px)';
    mainContent.style.borderRadius = '24px';
    mainContent.style.overflow = 'hidden';
    mainContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
    mainContent.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    
    // 创建星期标题 - Apple 渐变风格
    const weekHeader = document.createElement('div');
    weekHeader.style.display = 'grid';
    weekHeader.style.gridTemplateColumns = 'repeat(7, 1fr)';
    weekHeader.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    weekHeader.style.color = 'white';
    
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (let i = 0; i < 7; i++) {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.style.padding = '18px 12px';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.fontWeight = '600';
        dayHeader.style.fontSize = '14px';
        dayHeader.style.letterSpacing = '0.5px';
        
        const date = weekDates[i];
        const month = date.getMonth() + 1;
        const day = date.getDate();
        dayHeader.textContent = `${weekdays[i]} (${month}/${day})`;
        
        // 今日高亮 - 在导出时保持原样
        const today = new Date();
        const todayStr = formatDate(today);
        const dateStr = formatDate(date);
        // 不再在导出时应用今日高亮
        // if (dateStr === todayStr) {
        //     dayHeader.style.background = 'linear-gradient(135deg, #34c759, #30d158)';
        // }
        
        weekHeader.appendChild(dayHeader);
    }
    
    // 创建排期容器
    const scheduleContainer = document.createElement('div');
    scheduleContainer.style.display = 'grid';
    scheduleContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
    scheduleContainer.style.minHeight = '600px';
    scheduleContainer.style.background = 'rgba(255, 255, 255, 0.5)';
    
    // 创建每天的列
    for (let i = 0; i < 7; i++) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.style.borderRight = '1px solid rgba(0, 0, 0, 0.06)';
        dayColumn.style.padding = '16px';
        dayColumn.style.minHeight = '600px';
        dayColumn.style.background = 'rgba(255, 255, 255, 0.3)';
        
        // 今日高亮列 - 在导出时保持原样
        const today = new Date();
        const todayStr = formatDate(today);
        const dateStr = formatDate(weekDates[i]);
        // 不再在导出时应用今日高亮
        // if (dateStr === todayStr) {
        //     dayColumn.style.background = 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(48, 209, 88, 0.05))';
        //     dayColumn.style.border = '2px solid rgba(52, 199, 89, 0.3)';
        //     dayColumn.style.borderRadius = '12px';
        // }
        
        if (i === 6) {
            dayColumn.style.borderRight = 'none';
        }
        
        const dateStr2 = formatDate(weekDates[i]);
        const projects = scheduleData[dateStr2] || [];
        
        if (projects.length > 0) {
            projects.forEach((project, projectIndex) => {
                // 创建项目卡片 - Apple 风格
                const projectCard = createProjectCard(project, dateStr2, projectIndex);
                
                // 移除事件监听器以避免干扰
                projectCard.onclick = null;
                projectCard.onmousedown = null;
                projectCard.ondragstart = null;
                projectCard.ondragend = null;
                
                // 移除删除按钮
                const deleteBtn = projectCard.querySelector('.delete-btn');
                if (deleteBtn) {
                    deleteBtn.remove();
                }
                
                // 移除复制按钮
                const copyBtn = projectCard.querySelector('.copy-btn');
                if (copyBtn) {
                    copyBtn.remove();
                }
                
                dayColumn.appendChild(projectCard);
            });
        } else {
            // 显示空状态
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.style.color = '#6e6e73';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '40px 20px';
            emptyState.style.fontSize = '36px';
            emptyState.style.opacity = '0.6';
            emptyState.textContent = '🈚️';
            dayColumn.appendChild(emptyState);
        }
        
        scheduleContainer.appendChild(dayColumn);
    }
    
    mainContent.appendChild(weekHeader);
    mainContent.appendChild(scheduleContainer);
    
    tempContainer.appendChild(header);
    tempContainer.appendChild(mainContent);
    
    // 添加到文档中
    document.body.appendChild(tempContainer);
    
    // 使用html2canvas库将DOM元素渲染到canvas
    html2canvas(tempContainer, {
        scale: 2, // 提高分辨率
        useCORS: true,
        backgroundColor: null // 使用透明背景
    }).then(canvas => {
        // 将生成的canvas替换到导出canvas中
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        exportCtx.drawImage(canvas, 0, 0);
        
        // 移除临时元素
        document.body.removeChild(tempContainer);
    }).catch(error => {
        console.error('导出图片时出错:', error);
        // 移除临时元素
        document.body.removeChild(tempContainer);
        
        // 出错时显示提示
        showToast('导出图片时出错，请重试', 'error');
    });
}

// 下载图片
function downloadImage() {
    const canvas = exportCanvas;
    const link = document.createElement('a');
    link.download = '罐头场通告排期.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// 移动端保存图片到相册
// 已移除此功能

// 在新标签页打开图片
function openImageInNewTab() {
    const canvas = exportCanvas;
    try {
        // 将canvas转换为数据URL并在新标签页打开
        const dataURL = canvas.toDataURL('image/png');
        const newWindow = window.open();
        newWindow.document.write(`<img src="${dataURL}" alt="罐头场通告排期" style="width:100%;height:auto;" />`);
        newWindow.document.close();
    } catch (error) {
        console.error('在新标签页打开图片时出错:', error);
        showToast('无法在新标签页打开图片，请尝试下载图片', 'warning');
    }
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
            version: '2.18'
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
                pushUndoSnapshot('导入备份文件', beforeState, scheduleData);
                
                showToast('数据导入成功！', 'success');
                
                // 清空文件输入
                importFileInput.value = '';
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
            
            pushUndoSnapshot('跨周复制项目', beforeState, scheduleData);
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

        const actionLabels = { add: '新增', edit: '编辑', delete: '删除' };
        const actionClasses = { add: 'history-action-add', edit: 'history-action-edit', delete: 'history-action-delete' };

        tbody.innerHTML = records.map(r => {
            const ts = new Date(r.ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const actionLabel = actionLabels[r.action] || r.action;
            const actionClass = actionClasses[r.action] || '';
            let detail = '';
            if (r.action === 'edit' && r.before_json && r.after_json) {
                try {
                    const before = JSON.parse(r.before_json);
                    const after = JSON.parse(r.after_json);
                    const diffs = [];
                    Object.keys(after).forEach(k => {
                        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
                            diffs.push(`${k}: <em>${after[k]}</em>`);
                        }
                    });
                    detail = diffs.slice(0, 3).join(' · ');
                } catch (e) { /* ignore */ }
            } else if (r.action === 'add' && r.after_json) {
                try {
                    const after = JSON.parse(r.after_json);
                    detail = after.name || '';
                } catch (e) { /* ignore */ }
            } else if (r.action === 'delete' && r.before_json) {
                try {
                    const before = JSON.parse(r.before_json);
                    detail = before.name || '';
                } catch (e) { /* ignore */ }
            }
            return `<tr>
                <td>${ts}</td>
                <td class="${actionClass}">${actionLabel}</td>
                <td>${r.date || ''}</td>
                <td class="history-diff">${detail}</td>
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

    scheduleData[dateStr] = sorted;
    try {
        await persistScheduleDate(dateStr);
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
                p.startTime ? `⏰ ${p.startTime}` : '',
                p.location ? `📍 ${p.location}` : '',
                p.director ? `导演: ${p.director}` : '',
                p.photographer ? `摄影: ${p.photographer}` : '',
                p.production ? `制片: ${p.production}` : '',
                p.type ? `类型: ${p.type}` : ''
            ].filter(Boolean);
            return `<div class="notice-project-row">
                <div class="notice-index">${i + 1}</div>
                <div class="notice-project-info">
                    <div class="notice-project-name">${p.name}</div>
                    <div class="notice-project-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>
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
            'background:#fff', 'padding:48px 56px', 'width:660px',
            'font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
            'position:fixed', 'top:-9999px', 'left:0', 'box-sizing:border-box'
        ].join(';');

        const rows = projects.length === 0
            ? '<p style="color:#999;text-align:center;padding:24px 0">当日暂无项目</p>'
            : projects.map((p, i) => {
                const meta = [
                    p.startTime    ? `时间: ${p.startTime}`    : '',
                    p.location     ? `地点: ${p.location}`     : '',
                    p.director     ? `导演: ${p.director}`     : '',
                    p.photographer ? `摄影: ${p.photographer}` : '',
                    p.production   ? `制片: ${p.production}`   : '',
                    p.type         ? `类型: ${p.type}`         : ''
                ].filter(Boolean).join('　');
                const border = i < projects.length - 1 ? 'border-bottom:1px solid #ececec;' : '';
                return `<div style="display:flex;gap:18px;padding:18px 0;${border}align-items:flex-start">
                    <div style="font-size:13px;font-weight:600;color:#bbb;min-width:18px;padding-top:3px">${i + 1}</div>
                    <div style="flex:1">
                        <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;line-height:1.3">${p.name}</div>
                        <div style="font-size:13px;color:#666;line-height:1.7">${meta || '—'}</div>
                    </div>
                </div>`;
            }).join('');

        wrapper.innerHTML = `
            <div style="font-size:28px;font-weight:800;color:#111;margin-bottom:22px;letter-spacing:-0.5px">通告单</div>
            <div style="font-size:15px;color:#555;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #111">
                <strong style="color:#111;font-size:16px">${dateLabel}</strong>&nbsp;&nbsp;共 ${projects.length} 个项目
            </div>
            ${rows}
        `;
        document.body.appendChild(wrapper);
        return wrapper;
    };

    const captureNotice = () => {
        const el = buildNoticeImageElement();
        return html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
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
            win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>通告单 ${dateLabel}</title><style>body{margin:0;display:flex;justify-content:center;background:#f0f0f0;}img{max-width:100%;}</style></head><body><img src="${dataUrl}"></body></html>`);
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

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
