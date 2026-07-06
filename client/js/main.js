import { createApiClient } from './modules/api.js';
import { getMonday, formatDate, formatMonthDay, getWeekDates, getWeekNumber } from './modules/date.js';
import { createDefaultFilters, matchesProjectFilters } from './modules/filters.js';
import { createUndoManager } from './modules/undo.js';
import { initViewSwitcher, switchView } from './modules/viewSwitcher.js';
import { icons } from './modules/animal-icons.js';
import { createMonthViewModule } from './modules/monthView.js';
import { createPersonnelViewModule } from './modules/personnelView.js';
import { initAnimalSelects } from './modules/animal-select.js';

// XSS 安全：转义 HTML 特殊字符
function escapeHtml(str) {
    const s = String(str == null ? '' : str);
    const map = { '&': '\u0026amp;', '<': '\u0026lt;', '>': '\u0026gt;', '"': '\u0026quot;', "'": '\u0026#39;' };
    return s.replace(/[&<>"']/g, c => map[c]);
}
function escapeAttr(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 当前周的周一
let currentMonday = getMonday(new Date());

// 项目数据存储
// ── 只读模式检测 ──
const IS_READONLY = window.location.pathname === '/canbox' || new URLSearchParams(window.location.search).has('readonly');
if (IS_READONLY) document.body.classList.add('readonly');

let scheduleData = {};

// ── 项目类型颜色集中管理 ──
const DEFAULT_TYPE_COLORS = {
    '平面': '#10B981',
    '视频': '#EC4899',
    '直播': '#3B82F6',
    '试做': '#8B5CF6',
    '特殊': '#FF8C00'
};
const TYPE_COLOR_PALETTE = [
    '#10B981','#EC4899','#F59E0B','#8B5CF6','#FF8C00',
    '#06B6D4','#EF4444','#84CC16','#6366F1','#F97316',
    '#14B8A6','#E11D48','#A855F7','#0EA5E9','#D946EF'
];
let typeColors = { ...DEFAULT_TYPE_COLORS };

function getTypeColor(typeName) {
    if (!typeName) return '#9f927d';
    if (typeColors[typeName]) return typeColors[typeName];
    const used = new Set(Object.values(typeColors));
    const avail = TYPE_COLOR_PALETTE.find(c => !used.has(c)) || '#9f927d';
    typeColors[typeName] = avail;
    return avail;
}

function getTypeCardColors(typeName) {
    const hex = getTypeColor(typeName);
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return {
        bg: `rgba(${r},${g},${b},0.12)`,
        border: `rgba(${r},${g},${b},0.4)`,
        text: `rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)})`
    };
}

// 向非模块脚本暴露实时引用
Object.defineProperty(window, '__scheduleData', { get: () => scheduleData, configurable: true });
Object.defineProperty(window, '__currentMonday', { get: () => currentMonday, configurable: true });
window.typeColors = typeColors;
window.getTypeColor = getTypeColor;

// DOM元素
const weekDisplay = document.getElementById('week-display');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const currentWeekBtn = document.getElementById('this-week');
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
const settingsModal = document.getElementById('settings-modal');
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
const templateList = document.getElementById('template-list');

// 数据导出导入元素
const exportDataBtn = document.getElementById('export-data');
const importDataBtn = document.getElementById('import-data');
const importFileInput = document.getElementById('import-file');
const saveAccessSettingsBtn = document.getElementById('save-access-settings');
const copyShareLinkBtn = document.getElementById('copy-share-link');
const shareEnabledSetting = document.getElementById('share-enabled-setting');
const sharePathSetting = document.getElementById('share-path-setting');
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
let lastExportDataUrl = null;
let lastExportFileName = '通告排期.png';
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
const undoManager = createUndoManager();

const apiClient = createApiClient({
    baseUrl: '/api',
    getAdminPassword: () => adminPassword,
    getEditPassword: () => editPassword
});

// Toast 提示函数
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
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
    if (!shareLinkDisplay) return;
    if (accessSettings.shareEnabled && accessSettings.sharePath) {
        shareLinkDisplay.textContent = `${window.location.origin}/${accessSettings.sharePath}`;
    } else {
        shareLinkDisplay.textContent = '分享链接尚未启用';
    }
}

async function loadAccessSettings() {
    if (!adminPassword) {
        accessSettings = { editPasswordEnabled: false, shareEnabled: false, sharePath: 'canbox' };
        updateShareLinkDisplay();
        return;
    }

    try {
        accessSettings = await settingAPI.getAccessSettings();
        shareEnabledSetting.checked = accessSettings.shareEnabled;
        if (sharePathSetting) sharePathSetting.value = accessSettings.sharePath || 'canbox';
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
        search: searchProjectsInput.value.trim(),
        type: filterTypeSelect.value,
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
    
    // 初始化月视图模块
    const monthViewModule = createMonthViewModule({
        api: apiClient,
        onJumpToWeek: (dateStr) => {
            const date = new Date(dateStr);
            currentMonday = getMonday(date);
            updateWeekDisplay();
            renderSchedule();
            switchView('week');
        }
    });
    monthViewModule.init();
    
    // 初始化人员视图模块
    const personnelViewModule = createPersonnelViewModule({
        api: apiClient,
        onJumpToWeek: (dateStr) => {
            const date = new Date(dateStr);
            currentMonday = getMonday(date);
            updateWeekDisplay();
            renderSchedule();
            switchView('week');
        }
    });
    personnelViewModule.init();
    
    // 初始化视图切换器（传入渲染回调）
    initViewSwitcher({
        week: () => {
            if (IS_MOBILE) {
                document.body.classList.remove('view-day', 'view-month', 'view-personnel');
                document.body.classList.add('view-week');
                renderMobileDayPicker();
            }
        },
        month: () => {
            if (IS_MOBILE) {
                document.body.classList.remove('view-day', 'view-week', 'view-personnel');
                document.body.classList.add('view-month');
            }
            monthViewModule.render();
        },
        personnel: () => {
            if (IS_MOBILE) {
                document.body.classList.remove('view-day', 'view-week', 'view-month');
                document.body.classList.add('view-personnel');
            }
            personnelViewModule.render();
        },
        day: () => {
            if (IS_MOBILE) {
                document.body.classList.remove('view-week', 'view-month', 'view-personnel');
                document.body.classList.add('view-day');
                renderMobileDayPicker();
            }
            renderDayView(new Date());
        }
    });
    
    // 单日视图导航按钮
    let dayViewDate = new Date();
    const dayPrevBtn = document.getElementById('day-prev');
    const dayNextBtn = document.getElementById('day-next');
    const dayTodayBtn = document.getElementById('day-today');
    if (dayPrevBtn) dayPrevBtn.addEventListener('click', () => { dayViewDate.setDate(dayViewDate.getDate() - 1); renderDayView(dayViewDate); });
    if (dayNextBtn) dayNextBtn.addEventListener('click', () => { dayViewDate.setDate(dayViewDate.getDate() + 1); renderDayView(dayViewDate); });
    if (dayTodayBtn) dayTodayBtn.addEventListener('click', () => { dayViewDate = new Date(); renderDayView(dayViewDate); });

    // ── 移动端：所有触屏设备统一显示，横竖屏一致 ──
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod/.test(navigator.userAgent)
                         || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0)
                         || ('ontouchstart' in window && navigator.maxTouchPoints > 1);
    const IS_MOBILE = window.innerWidth <= 1023 || isMobileDevice;
    const mobileBottomBar = document.getElementById('mobile-bottom-bar');

    if (IS_MOBILE) {
        document.body.classList.add('mobile-device');
        document.body.classList.add('view-week');
        renderSchedule();
    }

    // ── 触屏设备：日期选择器 + 详情区 ──
    const touchDetail = document.getElementById('touch-day-detail');
    const touchDetailDate = document.getElementById('touch-detail-date');
    const touchDetailContent = document.getElementById('touch-detail-content');
    const touchDetailClose = document.getElementById('touch-detail-close');
    const mobileDayPicker = document.getElementById('mobile-day-picker');

    function renderMobileDayPicker() {
        if (!mobileDayPicker) return;
        if (!document.body.classList.contains('mobile-device')) return;
        const weekDates = getWeekDates(currentMonday);
        const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const todayStr = formatDate(new Date());
        const selectedStr = mobileDayPicker.dataset.selected || '';

        mobileDayPicker.innerHTML = '';
        weekDates.forEach((d, i) => {
            const dateStr = formatDate(d);
            const count = (scheduleData[dateStr] || []).length;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedStr;

            const btn = document.createElement('div');
            btn.className = 'picker-day' + (isToday ? ' picker-today' : '') + (isSelected ? ' picker-selected' : '');
            btn.innerHTML = `<span class="picker-day-name">${dayNames[i]}</span><span class="picker-day-num">${d.getDate()}</span>${count > 0 ? `<span class="picker-count">${count}项</span>` : ''}`;
            btn.addEventListener('click', () => {
                mobileDayPicker.dataset.selected = dateStr;
                showTouchDayDetail(dateStr);
                renderMobileDayPicker();
            });
            mobileDayPicker.appendChild(btn);
        });
    }
    window.renderMobileDayPicker = renderMobileDayPicker;

    // 切换周后自动选中今天（如果在本周）或第一天，并重绘picker
    function autoSelectDayForMobile() {
        if (!IS_MOBILE || !mobileDayPicker) return;
        const weekDates = getWeekDates(currentMonday);
        const todayStr = formatDate(new Date());
        let targetDate = weekDates.find(d => formatDate(d) === todayStr);
        if (!targetDate) targetDate = weekDates[0];
        const dateStr = formatDate(targetDate);
        mobileDayPicker.dataset.selected = dateStr;
        renderMobileDayPicker();
        showTouchDayDetail(dateStr);
    }

    function showTouchDayDetail(dateStr) {
        if (!touchDetail || !touchDetailContent) return;
        const projects = scheduleData[dateStr] || [];
        const d = new Date(dateStr + 'T00:00:00');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        if (touchDetailDate) touchDetailDate.textContent = `${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]} · ${projects.length} 个项目`;

        touchDetailContent.innerHTML = '';
        if (projects.length === 0) {
            touchDetailContent.innerHTML = '<div class="touch-detail-empty">🈚️ 当日无排期</div>';
        } else {
            projects.forEach((project, index) => {
                const card = createProjectCard(project, dateStr, index);
                touchDetailContent.appendChild(card);
            });
        }
        touchDetail.style.display = 'block';

        // 高亮选中日期
        document.querySelectorAll('.day-header').forEach(h => h.classList.remove('touch-selected'));
        const headers = document.querySelectorAll('.day-header');
        const weekDates = getWeekDates(currentMonday);
        weekDates.forEach((d, i) => {
            if (formatDate(d) === dateStr && headers[i]) headers[i].classList.add('touch-selected');
        });
    }

    if (touchDetailClose) {
        touchDetailClose.addEventListener('click', () => {
            if (touchDetail) touchDetail.style.display = 'none';
            document.querySelectorAll('.day-header').forEach(h => h.classList.remove('touch-selected'));
        });
    }

    // 详情区新增按钮
    const touchDetailAdd = document.getElementById('touch-detail-add');
    if (touchDetailAdd) {
        touchDetailAdd.addEventListener('click', () => {
            const selectedDate = mobileDayPicker ? mobileDayPicker.dataset.selected : '';
            if (selectedDate) showProjectModal(selectedDate);
        });
    }

    // 代理：触屏设备点击日期标题展开详情（保留备用）
    document.addEventListener('click', (e) => {
        if (!document.body.classList.contains('mobile-device')) return;
        const header = e.target.closest('.day-header');
        if (!header) return;
        const headerId = header.id;
        const dayMap = { 'monday-header': 0, 'tuesday-header': 1, 'wednesday-header': 2, 'thursday-header': 3, 'friday-header': 4, 'saturday-header': 5, 'sunday-header': 6 };
        const idx = dayMap[headerId];
        if (idx === undefined) return;
        const weekDates = getWeekDates(currentMonday);
        const dateStr = formatDate(weekDates[idx]);
        mobileDayPicker.dataset.selected = dateStr;
        showTouchDayDetail(dateStr);
        renderMobileDayPicker();
    });

    // 初始渲染日期选择器 + 自动选中今天
    if (IS_MOBILE) {
        renderMobileDayPicker();
        const todayStr = formatDate(new Date());
        const weekDates = getWeekDates(currentMonday);
        if (weekDates.some(d => formatDate(d) === todayStr)) {
            showTouchDayDetail(todayStr);
            if (mobileDayPicker) mobileDayPicker.dataset.selected = todayStr;
            renderMobileDayPicker();
        }
    }

    if (IS_MOBILE && mobileBottomBar) {
        mobileBottomBar.style.display = 'flex';

        mobileBottomBar.querySelectorAll('.mobile-bar-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                // 视图切换时同步 picker+detail 显隐
                document.getElementById(`view-${view}`)?.click();
                mobileBottomBar.querySelectorAll('.mobile-bar-btn[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        const mobileExportBtn = document.getElementById('mobile-bar-export');
        if (mobileExportBtn) {
            mobileExportBtn.addEventListener('click', () => {
                document.getElementById('export-image')?.click();
            });
        }

        // 同步顶部视图切换到底部按钮
        document.querySelectorAll('.toolbar .view-btn').forEach(topBtn => {
            topBtn.addEventListener('click', () => {
                const view = topBtn.id.replace('view-', '');
                if (view === 'day') {
                    document.body.classList.add('mobile-day-mode');
                } else {
                    document.body.classList.remove('mobile-day-mode');
                }
                mobileBottomBar.querySelectorAll('.mobile-bar-btn[data-view]').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === view);
                });
            });
        });
    }

    // 月视图导出按钮
    const monthExportBtn = document.getElementById('month-export');
    if (monthExportBtn) monthExportBtn.addEventListener('click', () => exportViewAsImage('month-view-grid', '月视图排期'));
    const personnelExportBtn = document.getElementById('personnel-export');
    if (personnelExportBtn) personnelExportBtn.addEventListener('click', () => exportViewAsImage('personnel-view-table', '人员排期'));

    // 月视图项目/人员切换
    const monthShowProjectBtn = document.getElementById('month-show-project');
    const monthShowPersonBtn = document.getElementById('month-show-person');
    if (monthShowProjectBtn) monthShowProjectBtn.addEventListener('click', () => {
        monthShowProjectBtn.classList.add('active');
        if (monthShowPersonBtn) monthShowPersonBtn.classList.remove('active');
        monthViewModule.setDisplayMode('project');
    });
    if (monthShowPersonBtn) monthShowPersonBtn.addEventListener('click', () => {
        monthShowPersonBtn.classList.add('active');
        if (monthShowProjectBtn) monthShowProjectBtn.classList.remove('active');
        monthViewModule.setDisplayMode('personnel');
    });
    
    // 初始化时钟显示
    initClock();
    
    // 初始化 SVG 图标系统
    initSVGIcons();

    // 初始化动森风格下拉选择器（仅对可见的主页面 select 生效，不触碰隐藏的 modal）
    initAnimalSelects(document.querySelector('.main-content'));
    
    // 加载版本信息
    loadVersionInfo();
    loadHealthStatus();
    
    // 从API加载数据
    await loadScheduleData();
    await loadSettings();
    await loadTemplateData();
    
    // 设置加载后重新渲染，确保 roleCategories 已填充
    renderSchedule();
    
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
    setupWebhookEvents();
    setInterval(loadHealthStatus, 30000);
}

// 初始化时钟显示
function initClock() {
    const weekdayElement = document.getElementById('ac-clock-weekday');
    const dayElement = document.getElementById('ac-clock-day');
    const hourElement = document.getElementById('ac-clock-h');
    const minuteElement = document.getElementById('ac-clock-m');
    const secondElement = document.getElementById('ac-clock-s');
    
    if (!weekdayElement || !dayElement || !hourElement || !minuteElement || !secondElement) {
        return;
    }
    
    function updateClock() {
        const now = new Date();
        const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const weekday = weekdays[now.getDay()];
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        weekdayElement.textContent = weekday;
        dayElement.textContent = `${month}月${day}日`;
        hourElement.textContent = hours;
        minuteElement.textContent = minutes;
        secondElement.textContent = seconds;
    }
    
    // 立即更新一次
    updateClock();
    
    // 每秒更新一次
    setInterval(updateClock, 1000);
}

// 初始化 SVG 图标系统
function initSVGIcons() {
    const iconMap = {
        'prev-week': { icon: 'prev', text: '' },
        'next-week': { icon: 'next', text: '' },
        'this-week': { icon: 'today', text: '本周' },
        'add-project': { icon: 'add', text: ' 新增' },
        'undo-action': { icon: 'undo', text: '' },
        'export-image': { icon: 'export', text: ' 导出' },
        'export-week-text': { icon: 'notice', text: ' 通告' },
        'paste-recognition': { icon: 'paste', text: ' 粘贴' },
        'heatmap-btn': { icon: 'heatmap', text: ' 热力图' },
        'webhook-btn': { icon: 'webhook', text: ' 推送' },
        'admin-btn': { icon: 'admin', text: ' 管理' },
        'conflict-btn': { icon: 'conflict', text: ' 预警' }
    };
    
    for (const [btnId, { icon, text }] of Object.entries(iconMap)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'icon';
            iconSpan.innerHTML = icons[icon] || '';
            btn.textContent = text;
            btn.insertBefore(iconSpan, btn.firstChild);
        }
    }
}

// 加载版本信息
async function loadVersionInfo() {
    try {
        const [versionData, healthData] = await Promise.all([
            versionAPI.getVersion(),
            versionAPI.getHealth()
        ]);
        const versionInfo = document.getElementById('version-info');
        if (versionInfo) {
            const versionNumber = versionInfo.querySelector('.version-number');
            const versionDate = versionInfo.querySelector('.version-date');
            if (versionNumber) {
                versionNumber.textContent = 'v' + versionData.version;
            }
            if (versionDate) {
                const buildTime = versionData.buildDate || '';
                const startDate = healthData.startedAt ? new Date(healthData.startedAt).toLocaleString('zh-CN', { hour12: false }) : '';
                versionDate.textContent = `build ${buildTime} · 启动 ${startDate}`;
            }
        }
    } catch (error) {
        console.error('加载版本信息失败:', error);
    }
}

// 强制刷新：清除 SW 缓存 + 重新加载
document.addEventListener('DOMContentLoaded', () => {
    const forceRefreshBtn = document.getElementById('force-refresh');
    if (forceRefreshBtn) {
        forceRefreshBtn.addEventListener('click', async () => {
            forceRefreshBtn.textContent = '⏳';
            try {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) await reg.unregister();
                }
                if ('caches' in window) {
                    const keys = await caches.keys();
                    for (const key of keys) await caches.delete(key);
                }
            } catch (e) { console.warn('清除缓存失败:', e); }
            location.reload(true);
        });
    }
});

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
let sseReconnectAttempts = 0;
const SSE_MAX_RECONNECT_ATTEMPTS = 5;
const SSE_BASE_DELAY = 5000;

function connectSSE() {
    const eventSource = new EventSource('/events');

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);

        // 连接成功，重置重连计数
        sseReconnectAttempts = 0;

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
                window.__currentSettings = data.settings;
                roleCategories = data.settings.roleCategories || [];
                renderRoleSettings(data.settings);
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
        eventSource.close();

        // 检查重连次数限制
        if (sseReconnectAttempts >= SSE_MAX_RECONNECT_ATTEMPTS) {
            showToast('实时同步连接失败次数过多，请刷新页面', 'error', 10000);
            return;
        }

        // 指数退避策略：延迟时间随重连次数增加而增加
        const delay = Math.min(SSE_BASE_DELAY * Math.pow(2, sseReconnectAttempts), 60000);
        sseReconnectAttempts++;

        setTimeout(() => {
            showToast(`正在重新连接实时同步（第${sseReconnectAttempts}次）...`, 'warning', 5000);
            connectSSE();
        }, delay);
    };
}

// 更新周显示
function updateWeekDisplay() {
    const weekDates = getWeekDates(currentMonday);
    const startDate = formatMonthDay(weekDates[0]);
    const endDate = formatMonthDay(weekDates[6]);
    const text = `${startDate} - ${endDate}`;
    weekDisplay.textContent = text;
    const mobileNavDisplay = document.getElementById('week-nav-display');
    if (mobileNavDisplay) mobileNavDisplay.textContent = text;
}

// 渲染单日视图
function renderDayView(date) {
    const dateStr = formatDate(date);
    const titleEl = document.getElementById('day-view-date');
    const contentEl = document.getElementById('day-view-content');
    if (!contentEl) return;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (titleEl) titleEl.textContent = `${month}月${day}日 ${weekdays[date.getDay()]}`;

    contentEl.innerHTML = '';
    const dayProjects = scheduleData[dateStr] || [];
    if (dayProjects.length === 0) {
        contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:#c4b89e;font-size:18px;">🈚️ 当日无排期</div>';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    dayProjects.forEach((project, index) => {
        const card = createProjectCard(project, dateStr, index);
        wrapper.appendChild(card);
    });
    contentEl.appendChild(wrapper);
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
        if (!header) return;
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
        if (!column) return;
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
        
        // 添加拖拽事件监听器（只添加一次，避免重复）
        if (!IS_READONLY && !column.dataset.dragBound) {
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('dragenter', handleDragEnter);
            column.addEventListener('dragleave', handleDragLeave);
            column.addEventListener('drop', handleDrop);
            column.dataset.dragBound = '1';
        }
        
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
    // 触屏设备：更新日期选择器
    if (typeof window.renderMobileDayPicker === 'function') window.renderMobileDayPicker();
}

// 创建项目卡片
function createProjectCard(project, dateStr, projectIndex) {
    const card = document.createElement('div');
    card.className = `project-card`;
    card.draggable = !IS_READONLY;
    card.dataset.date = dateStr;
    card.dataset.index = projectIndex;
    card.dataset.status = project.status || '待确认';
    if (project.type) card.dataset.type = project.type;
    
    const typeColor = project.type ? getTypeColor(project.type) : null;
    const typeCardColors = project.type ? getTypeCardColors(project.type) : null;
    
    // 无类型时卡片为默认白色
    if (typeCardColors) {
        card.style.background = typeCardColors.bg;
        card.style.borderColor = typeCardColors.border;
        card.style.color = typeCardColors.text;
    } else {
        card.style.background = '#ffffff';
        card.style.borderColor = '#e0e0e0';
        card.style.color = '#725d42';
    }
    
    // 构建工作人员信息（动态）
    const cats = (roleCategories || []).filter(c => c.key !== 'location');
    const ROLE_STAFF_COLORS = {
        director: '#3B82F6', photographer: '#10B981', production: '#F59E0B',
        rd: '#8B5CF6', operational: '#EC4899', audio: '#06B6D4', business: '#F97316'
    };

    let staffInfo = '';
    const hasStartTime = project.startTime;
    const hasAnyRole = hasStartTime || cats.some(cat => {
        const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
        return val;
    });

    if (hasAnyRole) {
        staffInfo = '<div class="staff-info">';
        if (hasStartTime) {
            staffInfo += `<div class="staff-row"><span class="staff-label">时间：</span><span class="staff-names-grid"><span class="staff-pair"><span class="staff-dot" style="display:inline-block;width:7px;height:7px;min-width:7px;border-radius:50%;background:#FFD700">&nbsp;</span><span class="staff-name" style="font-family:system-ui,-apple-system,sans-serif">${escapeHtml(project.startTime)}</span></span></span></div>`;
        }
        cats.forEach(cat => {
            const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
            if (val) {
                const c = ROLE_STAFF_COLORS[cat.key] || '#999';
                const names = String(val).split(/、|，|,|\//).map(n => n.trim()).filter(Boolean);
                const makeDot = () => `<span class="staff-dot" style="display:inline-block;width:7px;height:7px;min-width:7px;border-radius:50%;background:${c}">&nbsp;</span>`;
                const makePair = (n) => `<span class="staff-pair">${makeDot()}<span class="staff-name">${escapeHtml(n)}</span></span>`;
                if (names.length <= 2) {
                    const pairs = names.map(n => makePair(n));
                    staffInfo += `<div class="staff-row"><span class="staff-label">${escapeHtml(cat.label)}：</span><span class="staff-names-grid">${pairs.join('')}</span></div>`;
                } else {
                    const chunks = [];
                    for (let i = 0; i < names.length; i += 2) {
                        chunks.push(names.slice(i, i + 2));
                    }
                    chunks.forEach((chunk, ci) => {
                        const pairs = chunk.map(n => makePair(n)).join('');
                        if (ci === 0) {
                            staffInfo += `<div class="staff-row"><span class="staff-label">${escapeHtml(cat.label)}：</span><span class="staff-names-grid">${pairs}</span></div>`;
                        } else {
                            staffInfo += `<div class="staff-row staff-row-continuation"><span class="staff-label" aria-hidden="true">${escapeHtml(cat.label)}：</span><span class="staff-names-grid">${pairs}</span></div>`;
                        }
                    });
                }
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
            ${project.type ? `<span class="project-type" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700;color:#fff;background:${typeColor};font-family:'Nunito','Noto Sans SC',sans-serif;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.6);flex-shrink:0;">&nbsp;</span>${escapeHtml(project.type)}</span>` : ''}
        </div>
        <div class="card-actions">
            <button class="copy-btn" data-date="${escapeHtml(dateStr)}" data-index="${projectIndex}">📋 复制</button>
        </div>
    `;
    
    // 添加点击事件
    if (!IS_READONLY) {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn') || e.target.classList.contains('copy-btn')) return;
            editProject(dateStr, projectIndex);
        });
    }
    
    // 拖拽事件
    if (!IS_READONLY) {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        // 移动端触摸长按拖拽
        let touchTimer = null;
        let touchMoved = false;
        card.addEventListener('touchstart', (e) => {
            touchMoved = false;
            touchTimer = setTimeout(() => {
                if (!touchMoved) showMobileMoveSheet(dateStr, projectIndex, card);
            }, 500);
        }, { passive: true });
        card.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });
        card.addEventListener('touchend', () => { clearTimeout(touchTimer); }, { passive: true });
    }
    
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
    // 视图切换按钮 — 由 initViewSwitcher 统一绑定
    
    // 冲突预警按钮
    const conflictBtn = document.getElementById('conflict-btn');
    if (conflictBtn) {
        conflictBtn.addEventListener('click', () => showConflictModal());
    }
    
    // Webhook 推送按钮
    const webhookBtn = document.getElementById('webhook-btn');
    if (webhookBtn) {
        webhookBtn.addEventListener('click', () => showWebhookPushModal());
    }
    
    // 键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        // ESC 关闭模态框
        if (e.key === 'Escape') {
            if (projectModal) projectModal.style.display = 'none';
            if (settingsModal) settingsModal.style.display = 'none';
            if (exportModal) exportModal.style.display = 'none';
            if (datePickerModal) datePickerModal.style.display = 'none';
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) adminModal.style.display = 'none';
            const heatmapModal = document.getElementById('heatmap-modal');
            if (heatmapModal) heatmapModal.style.display = 'none';
            const conflictModal = document.getElementById('conflict-modal');
            if (conflictModal) conflictModal.style.display = 'none';
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
            exportWeekViewAsImage();
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

    // 移动端周导航按钮（直接调用函数，不通过 .click() 代理）
    const weekNavPrev = document.getElementById('week-nav-prev');
    const weekNavNext = document.getElementById('week-nav-next');
    const weekNavToday = document.getElementById('week-nav-today');
    if (weekNavPrev) weekNavPrev.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        updateWeekDisplay();
        renderSchedule();
        autoSelectDayForMobile();
    });
    if (weekNavNext) weekNavNext.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        updateWeekDisplay();
        renderSchedule();
        autoSelectDayForMobile();
    });
    if (weekNavToday) weekNavToday.addEventListener('click', () => {
        currentMonday = getMonday(new Date());
        updateWeekDisplay();
        renderSchedule();
        autoSelectDayForMobile();
    });
    
    // 添加项目按钮
    addProjectBtn.addEventListener('click', () => {
        showProjectModal();
    });
    
    // 导出图片按钮
    if (exportImageBtn) {
        exportImageBtn.addEventListener('click', exportWeekViewAsImage);
    }

    // 粘贴识别按钮
    if (pasteRecognitionBtn) {
        pasteRecognitionBtn.addEventListener('click', handlePasteRecognition);
    }

    // 设置按钮
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showSettingsModal();
        });
    }

    // 管理员设置按钮
    if (adminBtn) {
        adminBtn.addEventListener('click', showAdminModal);
    }

    // 热力图按钮
    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', showHeatmapModal);
    }

    // 通告单按钮（事件委托，因为按钮在 renderSchedule 每次重建）
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('notice-day-btn')) {
            showNoticeModal(e.target.dataset.date);
        }
        if (e.target.classList.contains('sort-day-btn')) {
            sortDayProjects(e.target.dataset.date);
        }
    });

    if (undoActionBtn) {
        undoActionBtn.addEventListener('click', async () => {
            try {
                await undoLastChange();
            } catch (error) {
                console.error('撤销失败:', error);
                showToast(error.message || '撤销失败', 'error');
            }
        });
    }

    // 搜索输入防抖优化：避免每次按键都触发渲染
    if (searchProjectsInput && filterTypeSelect && clearFiltersBtn) {
        let searchDebounceTimer;
        searchProjectsInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(updateFilterState, 300); // 300ms 防抖延迟
        });

        filterTypeSelect.addEventListener('change', updateFilterState);
        clearFiltersBtn.addEventListener('click', () => {
            searchProjectsInput.value = '';
            filterTypeSelect.value = '';
            updateFilterState();
        });
    }

    if (applyTemplateBtn) {
        applyTemplateBtn.addEventListener('click', applySelectedTemplate);
    }

    if (saveTemplateFromFormBtn) {
        saveTemplateFromFormBtn.addEventListener('click', async () => {
            try {
                await saveTemplateFromCurrentForm();
            } catch (error) {
                console.error('保存模板失败:', error);
                showToast(error.message || '保存模板失败', 'error');
            }
        });
    }

    // 模态框关闭按钮
    if (closeModalButtons && closeModalButtons.length > 0) {
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (projectModal) projectModal.style.display = 'none';
                if (settingsModal) settingsModal.style.display = 'none';
                if (exportModal) exportModal.style.display = 'none';
            });
        });
    }

    // 取消编辑按钮
    if (cancelEditBtn && projectModal) {
        cancelEditBtn.addEventListener('click', () => {
            projectModal.style.display = 'none';
        });
    }
    
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
            initAnimalSelects(document.getElementById('admin-modal'));
        });
    }

    if (addProjectTypeBtn) {
        addProjectTypeBtn.addEventListener('click', () => {
            const types = getProjectTypes();
            const newType = `新类型${types.length + 1}`;
            getTypeColor(newType);
            types.push(newType);
            updateProjectTypeSelect(types);
            renderProjectTypes();
        });
    }

    const resetTypeColorsBtn = document.getElementById('reset-type-colors');
    if (resetTypeColorsBtn) {
        resetTypeColorsBtn.addEventListener('click', () => {
            typeColors = { ...DEFAULT_TYPE_COLORS };
            renderProjectTypes();
            renderSchedule();
            showToast('已还原默认颜色', 'success');
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

            const sharePathInput = document.getElementById('share-path-setting');
            const sharePath = (sharePathInput ? sharePathInput.value.trim() : 'canbox') || 'canbox';

            try {
                const response = await settingAPI.saveAccessSettings({
                    editPassword: editPasswordSetting.value,
                    shareEnabled: shareEnabledSetting.checked,
                    sharePath: sharePath
                });
                accessSettings = response.access;
                editPassword = editPasswordSetting.value ? editPasswordSetting.value : editPassword;
                const pathPreview = document.getElementById('share-path-preview');
                if (pathPreview) pathPreview.textContent = sharePath;
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
            if (!accessSettings.shareEnabled || !accessSettings.sharePath) {
                showToast('请先启用分享链接', 'warning');
                return;
            }
            const url = `${window.location.origin}/${accessSettings.sharePath}`;
            try {
                await navigator.clipboard.writeText(url);
                showToast('分享链接已复制', 'success');
            } catch (error) {
                showToast('复制失败，请手动复制', 'warning');
            }
        });
    }
    
    // 数据导出按钮
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);
    
    // 数据导入按钮
    if (importDataBtn) importDataBtn.addEventListener('click', () => {
        importFileInput.click();
    });
    
    // 文件选择事件
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
    
    // 点击模态框外部关闭日期选择器
    if (datePickerModal) datePickerModal.addEventListener('click', (e) => {
        if (e.target === datePickerModal) {
            datePickerModal.style.display = 'none';
        }
    });
    
    // 表单提交
    if (projectForm) projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject();
    });
    
    // 图片导出模态框事件
    if (closeExportBtn) closeExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    if (downloadImageBtn) downloadImageBtn.addEventListener('click', downloadImage);
    if (openInNewTabBtn) openInNewTabBtn.addEventListener('click', openImageInNewTab);
    if (cancelExportBtn) cancelExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });

    const refreshExportBtn = document.getElementById('refresh-export');
    if (refreshExportBtn) refreshExportBtn.addEventListener('click', () => {
        const dateInput = document.getElementById('export-date');
        if (dateInput && dateInput.value) drawScheduleToCanvas(dateInput.value);
    });

    if (cancelExportBtn) cancelExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭图片导出模态框
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
        if (settingsModal && e.target === settingsModal) {
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
        const conflictModal = document.getElementById('conflict-modal');
        if (conflictModal && e.target === conflictModal) {
            conflictModal.style.display = 'none';
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
    
    // 重置 tag 按钮
    document.querySelectorAll('#project-modal .tag-btn').forEach(btn => btn.classList.remove('active'));
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

    // 验证项目名称长度，避免过长导致UI问题
    if (project.name.length > 120) {
        showToast('项目名称过长（最多120字符）', 'warning');
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
    if (settingsModal) settingsModal.style.display = 'block';
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
async function showAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;

    modal.style.display = 'block';

    const passwordSection = document.getElementById('admin-password-section');
    const unlockedContent = document.getElementById('admin-unlocked-content');
    const passwordInput = document.getElementById('admin-password-input');
    const confirmBtn = document.getElementById('confirm-admin-password');
    const closeBtn = document.getElementById('close-admin-modal');

    // 重置为密码输入状态（每次打开都要求重新验证以防会话变更）
    if (adminPassword) {
        passwordSection.style.display = 'none';
        unlockedContent.style.display = 'flex';
        const settings = window.__currentSettings || await settingAPI.getSettings();
        renderRoleSettings(settings);
        updateProjectFormOptions();
        setupBackupEvents();
        loadBackupList();
        loadAccessSettings();
        loadHistoryRecords();
        loadWebhookSettings();
        await loadDataManagement();
        initAnimalSelects(document.getElementById('admin-modal'));
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
                    const settings = await settingAPI.getSettings();
                    window.__currentSettings = settings;
                    roleCategories = settings.roleCategories || [];
                    renderRoleSettings(settings);
                    renderProjectTypes();
                    updateProjectFormOptions();
                    setupBackupEvents();
                    loadBackupList();
                    loadAccessSettings();
                    loadHistoryRecords();
                    loadWebhookSettings();
                    showToast('解锁成功', 'success');
                    await loadDataManagement();
                    initAnimalSelects(document.getElementById('admin-modal'));
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

// ── 冲突预警 Modal ──
async function showConflictModal() {
    const modal = document.getElementById('conflict-modal');
    const content = document.getElementById('conflict-content');
    if (!modal || !content) return;

    // 绑定关闭按钮
    const closeBtn = document.getElementById('close-conflict');
    if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.dataset.bound = '1';
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    }

    const weekDates = getWeekDates(currentMonday);
    const start = formatDate(weekDates[0]);
    const end = formatDate(weekDates[6]);

    content.innerHTML = '<p style="text-align:center;color:#999;">正在检测冲突...</p>';
    modal.style.display = 'block';

    try {
        const result = await apiClient.getConflicts(start, end);
        const conflicts = result.conflicts || [];

        if (conflicts.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:24px;"><span style="font-size:48px;">✅</span><p style="margin-top:12px;color:#6fba2c;font-weight:700;">本周无人员冲突</p></div>';
            return;
        }

        let html = `<p style="margin-bottom:12px;color:#e05a5a;font-weight:700;">发现 ${conflicts.length} 个冲突：</p>`;
        conflicts.forEach((c, ci) => {
            const severityColor = c.severity === 'high' ? '#e05a5a' : '#dba90e';
            html += `<div class="conflict-item-card" data-date="${c.date}" style="border:1.5px solid ${severityColor}40;border-radius:14px;padding:12px;margin-bottom:10px;background:${severityColor}08;cursor:pointer;transition:all 0.2s;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="flex:1;" class="conflict-jump" data-date="${c.date}">
                        <div style="font-weight:700;color:${severityColor};">${escapeHtml(c.person)}（${escapeHtml(c.role)}）— ${c.date}</div>
                        <div style="font-size:12px;color:#666;margin-top:4px;">同时参与 ${c.count} 个项目</div>
                    </div>
                </div>
                <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">`;
            c.projects.forEach((projName, pi) => {
                html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:8px;font-size:12px;">
                    <span class="conflict-jump" data-date="${c.date}" style="cursor:pointer;flex:1;color:#794f27;font-weight:600;">${escapeHtml(projName)}</span>
                    <button class="conflict-delete-btn" data-date="${c.date}" data-project="${escapeAttr(projName)}" style="background:none;border:none;color:#e05a5a;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:6px;" title="删除此项目">×</button>
                </div>`;
            });
            html += '</div></div>';
        });
        content.innerHTML = html;

        content.querySelectorAll('.conflict-jump').forEach(el => {
            el.addEventListener('click', () => {
                const date = el.dataset.date;
                if (date) {
                    const d = new Date(date);
                    currentMonday = getMonday(d);
                    updateWeekDisplay();
                    renderSchedule();
                    switchView('week');
                    modal.style.display = 'none';
                    setTimeout(() => {
                        const dayId = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][d.getDay() === 0 ? 6 : d.getDay() - 1];
                        const col = document.getElementById(dayId);
                        if (col) col.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            });
        });

        content.querySelectorAll('.conflict-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const date = btn.dataset.date;
                const projName = btn.dataset.project;
                if (!date || !projName) return;
                if (!confirm(`确定删除 ${date} 的项目「${projName}」？`)) return;
                try {
                    const schedules = scheduleData[date] || [];
                    const idx = schedules.findIndex(p => p.name === projName);
                    if (idx !== -1) {
                        schedules.splice(idx, 1);
                        if (schedules.length === 0) {
                            await scheduleAPI.deleteSchedule(date);
                            delete scheduleData[date];
                        } else {
                            await scheduleAPI.saveSchedule({ date, projects: schedules });
                            scheduleData[date] = schedules;
                        }
                        renderSchedule();
                        showToast(`已删除「${projName}」`, 'success');
                        showConflictModal();
                    }
                } catch (err) {
                    showToast('删除失败: ' + err.message, 'error');
                }
            });
        });
    } catch (error) {
        content.innerHTML = `<p style="color:#e05a5a;">检测失败: ${error.message}</p>`;
    }
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
    const roles = roleCategories.filter(c => c.key !== 'location').map(c => c.key);
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

// ── 数据管理 ──
let _dataMgmtBound = false;
async function loadDataManagement() {
    const ROLE_COLORS = { director: '#3B82F6', photographer: '#10B981', production: '#F59E0B', rd: '#8B5CF6', operational: '#EC4899', audio: '#06B6D4', business: '#F97316', location: '#794f27' };

    let settings;
    try {
        settings = await settingAPI.getSettings();
        window.__currentSettings = settings;
        roleCategories = settings.roleCategories || [];
    } catch (e) {
        settings = window.__currentSettings || {};
    }
    const cats = settings.roleCategories || [];

    function getAllPersons() {
        const persons = [];
        const seen = new Set();
        cats.forEach(cat => {
            if (cat.key === 'location') return;
            const optsKey = cat.optionsKey || `common${cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}s`;
            const customOpts = (settings.customRoleOptions || {})[cat.key] || [];
            const names = customOpts.length ? customOpts : (settings[optsKey] || []);
            names.forEach(name => {
                const k = `${name}|${cat.key}`;
                if (!seen.has(k)) {
                    seen.add(k);
                    persons.push({ name, roleKey: cat.key, roleLabel: cat.label, color: ROLE_COLORS[cat.key] || '#999' });
                }
            });
        });
        return persons;
    }

    function renderPersonCards(containerId, selectId) {
        const container = document.getElementById(containerId);
        const select = document.getElementById(selectId);
        if (!container || !select) return;
        const persons = getAllPersons();
        container.innerHTML = '';
        const opts = ['<option value="">-- 选择人员 --</option>'];
        persons.forEach(p => {
            const card = document.createElement('span');
            card.className = 'person-card-item';
            card.dataset.value = `${p.name}|${p.roleKey}`;
            card.innerHTML = `<span class="person-card-dot" style="background:${p.color}"></span>${p.name}<span style="font-size:10px;color:#9f927d;">${p.roleLabel}</span>`;
            card.addEventListener('click', () => {
                container.querySelectorAll('.person-card-item').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                select.value = card.dataset.value;
            });
            container.appendChild(card);
            opts.push(`<option value="${p.name}|${p.roleKey}">${p.name} (${p.roleLabel})</option>`);
        });
        select.innerHTML = opts.join('');
    }

    renderPersonCards('rename-source-list', 'rename-source-select');
    renderPersonCards('transfer-source-list', 'transfer-source-select');
    renderPersonCards('transfer-target-list', 'transfer-target-select');

    if (!_dataMgmtBound) {
        _dataMgmtBound = true;

        document.querySelectorAll('.data-mgmt-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.data-mgmt-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.data-sub-panel').forEach(p => p.style.display = 'none');
                tab.classList.add('active');
                const panel = document.getElementById(`data-sub-${tab.dataset.sub}`);
                if (panel) panel.style.display = 'block';
            });
        });

        document.getElementById('rename-execute-btn')?.addEventListener('click', async () => {
            const sourceVal = document.getElementById('rename-source-select').value;
            const sourceCustom = document.getElementById('rename-source-custom')?.value.trim() || '';
            const newName = document.getElementById('rename-target-input').value.trim();

            let oldName, roleKey, roleLabel;
            if (sourceCustom) {
                oldName = sourceCustom;
                roleKey = '';
                roleLabel = '全部角色';
            } else if (sourceVal) {
                [oldName, roleKey] = sourceVal.split('|');
                roleLabel = cats.find(c => c.key === roleKey)?.label || roleKey;
            } else {
                showToast('请选择或输入要替换的人员', 'warning');
                return;
            }
            if (!newName) { showToast('请输入新姓名', 'warning'); return; }
            if (oldName === newName) { showToast('新旧姓名相同', 'warning'); return; }

            const targetRoles = roleKey ? [roleKey] : cats.filter(c => c.key !== 'location').map(c => c.key);

            if (!confirm(`确认将「${oldName}」${roleKey ? '（' + roleLabel + '）' : '（全部角色）'}替换为「${newName}」？\n\n此操作将修改所有历史排期数据和常用项设置，支持并列人名自动拆分。`)) return;

            try {
                const allSchedules = await scheduleAPI.getSchedules();
                let changeCount = 0;
                const SEPARATORS = ['、', '/', '，', ',', '；', ';'];

                function replaceInField(value, old, replacement) {
                    if (!value || typeof value !== 'string') return { changed: false, result: value };
                    const trimmed = value.trim();
                    if (trimmed === old) return { changed: true, result: replacement };
                    for (const sep of SEPARATORS) {
                        if (trimmed.includes(sep)) {
                            const parts = trimmed.split(sep).map(s => s.trim());
                            const idx = parts.indexOf(old);
                            if (idx !== -1) {
                                parts[idx] = replacement;
                                return { changed: true, result: parts.join(sep) };
                            }
                        }
                    }
                    return { changed: false, result: value };
                }

                for (const [date, projects] of Object.entries(allSchedules)) {
                    let changed = false;
                    projects.forEach(proj => {
                        targetRoles.forEach(rk => {
                            const res = replaceInField(proj[rk], oldName, newName);
                            if (res.changed) {
                                proj[rk] = res.result;
                                changed = true;
                                changeCount++;
                            }
                        });
                    });
                    if (changed) {
                        await scheduleAPI.saveSchedule({ date, projects });
                    }
                }

                const freshSettings = await settingAPI.getSettings();
                for (const rk of targetRoles) {
                    const cat = cats.find(c => c.key === rk);
                    if (!cat) continue;
                    const optsKey = cat.optionsKey || `common${rk.charAt(0).toUpperCase() + rk.slice(1)}s`;
                    const customOpts = (freshSettings.customRoleOptions || {})[rk] || [];
                    const arr = customOpts.length ? customOpts : (freshSettings[optsKey] || []);
                    const idx = arr.indexOf(oldName);
                    if (idx !== -1) {
                        arr[idx] = newName;
                        if (customOpts.length) {
                            await settingAPI.saveSettings({ customRoleOptions: { ...freshSettings.customRoleOptions, [rk]: arr } });
                        } else {
                            await settingAPI.saveSettings({ [optsKey]: arr });
                        }
                    }
                }

                showToast(`完成！共替换 ${changeCount} 条记录`, 'success');
                scheduleData = await scheduleAPI.getSchedules();
                renderSchedule();
                loadDataManagement();
                const preview = document.getElementById('rename-preview');
                if (preview) {
                    preview.className = 'data-preview show';
                    preview.innerHTML = `<span style="color:#6fba2c;font-weight:700;">✓ 已将「${oldName}」（${roleLabel}）替换为「${newName}」，共 ${changeCount} 条记录（含并列人名自动拆分）</span>`;
                }
            } catch (err) {
                showToast('操作失败: ' + err.message, 'error');
            }
        });

        document.getElementById('transfer-execute-btn')?.addEventListener('click', async () => {
            const sourceVal = document.getElementById('transfer-source-select').value;
            const targetVal = document.getElementById('transfer-target-select').value;
            if (!sourceVal) { showToast('请选择离职人员', 'warning'); return; }
            if (!targetVal) { showToast('请选择交接人员', 'warning'); return; }
            if (sourceVal === targetVal) { showToast('不能交接给自己', 'warning'); return; }

            const [srcName, srcRole] = sourceVal.split('|');
            const [tgtName, tgtRole] = targetVal.split('|');
            const srcLabel = cats.find(c => c.key === srcRole)?.label || srcRole;
            const tgtLabel = cats.find(c => c.key === tgtRole)?.label || tgtRole;

            if (!confirm(`确认将「${srcName}」（${srcLabel}）的所有任务交接给「${tgtName}」（${tgtLabel}）？\n\n此操作将修改所有历史排期数据。`)) return;

            try {
                const allSchedules = await scheduleAPI.getSchedules();
                let changeCount = 0;
                for (const [date, projects] of Object.entries(allSchedules)) {
                    let changed = false;
                    projects.forEach(proj => {
                        if (proj[srcRole] === srcName) {
                            proj[srcRole] = tgtName;
                            changed = true;
                            changeCount++;
                        }
                    });
                    if (changed) {
                        await scheduleAPI.saveSchedule({ date, projects });
                    }
                }
                showToast(`完成！共交接 ${changeCount} 条记录`, 'success');
                scheduleData = await scheduleAPI.getSchedules();
                renderSchedule();
                const preview = document.getElementById('transfer-preview');
                if (preview) {
                    preview.className = 'data-preview show';
                    preview.innerHTML = `<span style="color:#6fba2c;font-weight:700;">✓ 已将「${srcName}」（${srcLabel}）的 ${changeCount} 条任务交接给「${tgtName}」（${tgtLabel}）</span>`;
                }
            } catch (err) {
                showToast('操作失败: ' + err.message, 'error');
            }
        });
    }
}

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
            const typeSelect = item.querySelector('.role-type-select');
            const textarea = item.querySelector('.role-options-textarea');
            const label = (labelInput ? labelInput.value : '').trim();
            const type = typeSelect ? typeSelect.value : 'checkbox';
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

    roleCategories = cats;

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
        roleCategories = settings.roleCategories || [];

        renderRoleSettings(settings);
        updateProjectFormOptions();

        showToast('设置已保存', 'success');
        if (settingsModal) settingsModal.style.display = 'none';
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
        roleCategories = settings.roleCategories || [];

        renderRoleSettings(settings);
        updateProjectFormOptions();
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
function getProjectTypes() {
    const select = document.getElementById('project-type');
    if (!select) return [];
    const types = [];
    select.querySelectorAll('option').forEach(opt => {
        if (opt.value) types.push(opt.value);
    });
    return types;
}

function renderProjectTypes() {
    if (!projectTypesContainer) return;
    const types = getProjectTypes();
    projectTypesContainer.innerHTML = '';
    types.forEach((type, index) => {
        const color = getTypeColor(type);
        const item = document.createElement('div');
        item.className = 'role-category-item';
        item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:6px;';
        item.innerHTML = `
            <input type="color" class="type-color-picker" data-index="${index}" value="${color}" style="width:32px;height:32px;border:none;border-radius:8px;cursor:pointer;padding:0;background:none;" title="选择颜色">
            <input type="text" class="role-label-input" data-index="${index}" value="${escapeHtml(type)}" style="flex:1;padding:6px 10px;border:2px solid rgba(170,166,157,0.3);border-radius:16px;font-size:14px;font-weight:600;font-family:'Nunito','Noto Sans SC',sans-serif;color:#794f27;">
            <button type="button" class="role-category-remove" data-index="${index}" title="删除" style="background:none;border:none;color:#e05a5a;font-size:18px;cursor:pointer;padding:4px 8px;">×</button>
        `;
        projectTypesContainer.appendChild(item);
    });

    projectTypesContainer.querySelectorAll('.type-color-picker').forEach(picker => {
        picker.addEventListener('input', () => {
            const idx = parseInt(picker.dataset.index, 10);
            const types = getProjectTypes();
            typeColors[types[idx]] = picker.value;
            renderSchedule();
        });
    });

    projectTypesContainer.querySelectorAll('.role-label-input').forEach(input => {
        input.addEventListener('change', () => {
            const idx = parseInt(input.dataset.index, 10);
            const oldTypes = getProjectTypes();
            const oldName = oldTypes[idx];
            const newTypes = [...oldTypes];
            newTypes[idx] = input.value;
            if (oldName && oldName !== input.value && typeColors[oldName]) {
                typeColors[input.value] = typeColors[oldName];
                delete typeColors[oldName];
            }
            updateProjectTypeSelect(newTypes);
        });
    });

    projectTypesContainer.querySelectorAll('.role-category-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            const oldTypes = getProjectTypes();
            const removed = oldTypes[idx];
            if (removed) delete typeColors[removed];
            const newTypes = oldTypes.filter((_, i) => i !== idx);
            updateProjectTypeSelect(newTypes);
            renderProjectTypes();
            showToast('已删除项目类型', 'success');
        });
    });
}

function updateProjectTypeSelect(types) {
    const select = document.getElementById('project-type');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">请选择</option>';
    types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });
    if (types.includes(current)) select.value = current;
}

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
        pushUndoSnapshot('粘贴识别创建项目', beforeState, scheduleData);
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

// 移动端长按拖拽 — 底部日期选择面板
function showMobileMoveSheet(srcDate, srcIndex, cardEl) {
    if (navigator.vibrate) navigator.vibrate(50);
    cardEl.classList.add('dragging');

    const existing = document.getElementById('mobile-move-sheet');
    if (existing) existing.remove();

    const weekDates = getWeekDates(currentMonday);
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const today = formatDate(new Date());

    const sheet = document.createElement('div');
    sheet.id = 'mobile-move-sheet';
    sheet.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10001;background:#fff;border-radius:16px 16px 0 0;padding:16px;padding-bottom:max(24px,env(safe-area-inset-bottom));box-shadow:0 -4px 20px rgba(0,0,0,0.15);';

    const handle = document.createElement('div');
    handle.style.cssText = 'width:36px;height:4px;background:#ccc;border-radius:2px;margin:0 auto 12px;';
    sheet.appendChild(handle);

    const title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:700;color:#794f27;text-align:center;margin-bottom:12px;';
    title.textContent = '移动到...';
    sheet.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:8px;';

    weekDates.forEach((d, i) => {
        const btn = document.createElement('button');
        const dateStr = formatDate(d);
        const isSrc = dateStr === srcDate;
        const isToday = dateStr === today;
        btn.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;min-height:56px;background:${isSrc ? '#f0ebe3' : isToday ? '#e8f7f5' : '#f8f8f0'};color:${isSrc ? '#b5a58a' : isToday ? '#19c8b9' : '#794f27'};${isSrc ? 'opacity:0.5;' : ''}`;
        btn.disabled = isSrc;
        btn.innerHTML = `<span style="font-size:11px;">${dayNames[i]}</span><span style="font-size:16px;">${d.getDate()}</span>`;
        if (!isSrc) {
            btn.addEventListener('click', () => moveProjectToDate(srcDate, srcIndex, dateStr, sheet, cardEl));
        }
        grid.appendChild(btn);
    });
    sheet.appendChild(grid);

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'width:100%;margin-top:12px;padding:14px;border:none;border-radius:10px;font-size:15px;font-weight:600;background:#f0ebe3;color:#794f27;cursor:pointer;min-height:48px;';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
        cardEl.classList.remove('dragging');
        sheet.remove();
    });
    sheet.appendChild(cancelBtn);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:10000;';
    overlay.addEventListener('click', () => {
        cardEl.classList.remove('dragging');
        overlay.remove();
        sheet.remove();
    });
    sheet._overlay = overlay;

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
}

async function moveProjectToDate(srcDate, srcIndex, targetDate, sheetEl, cardEl) {
    if (srcDate === targetDate) return;
    const beforeState = cloneScheduleState();
    try {
        const project = scheduleData[srcDate][srcIndex];
        scheduleData[srcDate].splice(srcIndex, 1);
        if (scheduleData[srcDate].length === 0) delete scheduleData[srcDate];
        if (!scheduleData[targetDate]) scheduleData[targetDate] = [];
        scheduleData[targetDate].push(project);
        await persistScheduleDate(srcDate);
        await persistScheduleDate(targetDate);
        pushUndoSnapshot('触摸移动项目', beforeState, scheduleData);
        renderSchedule();
        showToast('项目已移动', 'success');
    } catch (error) {
        console.error('移动项目时出错:', error);
        scheduleData = beforeState;
        showToast(error.message || '移动项目时出错', 'error');
    }
    cardEl.classList.remove('dragging');
    if (sheetEl._overlay) sheetEl._overlay.remove();
    sheetEl.remove();
}

function exportViewAsImage(elementId, title) {
    const el = document.getElementById(elementId);
    if (!el) return;
    showToast('正在生成图片...', 'info');

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;top:-9999px;left:0;background:#f8f8f0;padding:24px 40px;';
    const clone = el.cloneNode(true);
    clone.style.width = 'max-content';
    clone.style.minWidth = '100%';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const w = Math.max(wrapper.scrollWidth + 80, 1200);
    html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#f8f8f0', logging: false, allowTaint: true, windowWidth: w + 100, width: w }).then(canvas => {
        lastExportDataUrl = canvas.toDataURL('image/png');
        lastExportFileName = `${title}_${formatDate(new Date())}.png`;

        const previewEl = document.getElementById('export-canvas');
        if (previewEl) {
            previewEl.style.display = 'block';
            const maxW = 600;
            const ratio = maxW / canvas.width;
            previewEl.width = Math.round(canvas.width * ratio);
            previewEl.height = Math.round(canvas.height * ratio);
            const ctx = previewEl.getContext('2d');
            ctx.drawImage(canvas, 0, 0, previewEl.width, previewEl.height);
        }

        const downloadBtn = document.getElementById('download-image');
        const openBtn = document.getElementById('open-in-new-tab');
        if (downloadBtn) { downloadBtn.disabled = false; downloadBtn.textContent = '下载图片'; }
        if (openBtn) { openBtn.disabled = false; openBtn.textContent = '在新标签页打开'; }

        const exportModal = document.getElementById('export-modal');
        if (exportModal) exportModal.style.display = 'block';
        showToast('预览已生成', 'success');
    }).catch(() => {
        showToast('图片生成失败', 'error');
    }).finally(() => {
        if (wrapper.parentNode) document.body.removeChild(wrapper);
    });
}

function exportWeekViewAsImage() {
    showExportModal();
}

// 显示导出模态框
function showExportModal() {
    // 设置默认日期
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

// 在canvas上绘制排期表（支持跨周导出）
function drawScheduleToCanvas() {
    // 确定日期范围
    let startDate, endDate;
    const isCrossWeek = exportCrossWeekCheckbox && exportCrossWeekCheckbox.checked;

    if (isCrossWeek && exportStartDateInput && exportEndDateInput && exportStartDateInput.value && exportEndDateInput.value) {
        startDate = new Date(exportStartDateInput.value + 'T00:00:00');
        endDate = new Date(exportEndDateInput.value + 'T00:00:00');
    } else {
        const weekDates = getWeekDates(currentMonday);
        startDate = weekDates[0];
        endDate = weekDates[6];
    }

    // 生成所有日期
    const allDates = [];
    const d = new Date(startDate);
    while (d <= endDate) {
        allDates.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    const totalDays = allDates.length;

    // 构建标题文本
    function formatDateChinese(dt) {
        return `${dt.getMonth() + 1}月${dt.getDate()}日`;
    }
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    let headerText;
    if (totalDays <= 7) {
        const weekNumber = getWeekNumber(startDate);
        headerText = `第${weekNumber}周通告 ${formatDateChinese(startDate)} - ${formatDateChinese(endDate)}`;
    } else {
        headerText = `通告排期 ${formatDateChinese(startDate)} - ${formatDateChinese(endDate)}`;
    }

    // 创建临时DOM
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.background = '#f5f5f7';
    tempContainer.style.fontFamily = '"Noto Sans SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif';
    tempContainer.style.padding = '24px';
    tempContainer.style.minHeight = '800px';

    // 根据列数计算宽度
    const cols = totalDays;
    const colWidth = Math.max(180, Math.min(240, 1680 / cols));
    const containerWidth = colWidth * cols + 48;
    tempContainer.style.width = containerWidth + 'px';

    // 头部
    const header = document.createElement('div');
    header.style.background = '#ffffff';  // 改为不透明白色
    header.style.borderRadius = '24px';
    header.style.padding = '28px 32px';
    header.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.15)';
    header.style.marginBottom = '24px';
    header.style.textAlign = 'center';
    header.style.border = '1px solid #e0e0e0';  // 改为不透明边框

    const title = document.createElement('div');
    title.textContent = '罐头场通告排期';
    title.style.fontSize = '28px';
    title.style.fontWeight = '600';
    title.style.color = '#1d1d1f';
    title.style.marginBottom = '12px';

    const weekInfoLine = document.createElement('div');
    weekInfoLine.textContent = headerText;
    weekInfoLine.style.fontWeight = '500';
    weekInfoLine.style.fontSize = '16px';
    weekInfoLine.style.color = '#6e6e73';

    header.appendChild(title);
    header.appendChild(weekInfoLine);

    // 主内容区域
    const mainContent = document.createElement('div');
    mainContent.style.background = '#ffffff';  // 改为不透明白色
    mainContent.style.borderRadius = '24px';
    mainContent.style.overflow = 'hidden';
    mainContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
    mainContent.style.border = '1px solid #e0e0e0';  // 改为不透明边框

    // 星期标题行
    const weekHeader = document.createElement('div');
    weekHeader.style.display = 'grid';
    weekHeader.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    weekHeader.style.background = '#19c8b9';
    weekHeader.style.color = 'white';

    for (let i = 0; i < totalDays; i++) {
        const dayHeader = document.createElement('div');
        dayHeader.style.padding = '18px 12px';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.fontWeight = '600';
        dayHeader.style.fontSize = cols > 10 ? '12px' : '14px';
        const dt = allDates[i];
        const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
        dayHeader.textContent = `${weekdays[dow]} (${dt.getMonth() + 1}/${dt.getDate()})`;
        weekHeader.appendChild(dayHeader);
    }

    // 排期容器
    const scheduleContainer = document.createElement('div');
    scheduleContainer.style.display = 'grid';
    scheduleContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    scheduleContainer.style.minHeight = '600px';
    scheduleContainer.style.background = '#fafafa';  // 改为不透明浅灰色

    for (let i = 0; i < totalDays; i++) {
        const dayColumn = document.createElement('div');
        dayColumn.style.borderRight = (i === totalDays - 1) ? 'none' : '1px solid rgba(0, 0, 0, 0.06)';
        dayColumn.style.padding = cols > 10 ? '8px' : '16px';
        dayColumn.style.minHeight = '600px';
        dayColumn.style.background = '#ffffff';  // 改为不透明白色

        const dateStr = formatDate(allDates[i]);
        const projects = scheduleData[dateStr] || [];

        if (projects.length > 0) {
            projects.forEach((project, projectIndex) => {
                const projectCard = createProjectCard(project, dateStr, projectIndex);
                const cleanCard = projectCard.cloneNode(true);

                cleanCard.querySelectorAll('.delete-btn, .copy-btn, .card-actions').forEach(el => el.remove());
                projectCard.querySelectorAll('.delete-btn, .copy-btn, .card-actions').forEach(el => el.remove());

                // 确保 clone 的 inline style 完整（移动端 cloneNode 可能丢失子元素 inline style）
                const origAll = projectCard.querySelectorAll('*');
                const cloneAll = cleanCard.querySelectorAll('*');
                cloneAll.forEach((cloneEl, ci) => {
                    const origEl = origAll[ci];
                    if (origEl && origEl.getAttribute('style') && !cloneEl.getAttribute('style')) {
                        cloneEl.setAttribute('style', origEl.getAttribute('style'));
                    }
                });

                // 不再用 getComputedStyle 覆盖（detach 元素返回默认值导致颜色丢失）
                cleanCard.style.width = '100%';
                cleanCard.style.marginBottom = '8px';
                cleanCard.style.removeProperty('animation');
                cleanCard.style.removeProperty('transition');

                if (cols > 10) {
                    cleanCard.style.fontSize = '11px';
                    cleanCard.style.padding = '6px';
                }
                dayColumn.appendChild(cleanCard);
            });
        } else {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.style.color = '#6e6e73';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '40px 20px';
            emptyState.style.fontSize = cols > 10 ? '24px' : '36px';
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
    document.body.appendChild(tempContainer);

    // 烘焙颜色到 inline style（必须在 appendChild 之后，否则 detach 元素 getComputedStyle 返回默认值）
    tempContainer.querySelectorAll('.project-card *').forEach(el => {
        try {
            const s = el.getAttribute('style') || '';
            if (s.includes('border-radius:50%') || s.includes('inline-flex')) return;
            const cs = window.getComputedStyle(el);
            if (!s.includes('background-color') && cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)')
                el.style.backgroundColor = cs.backgroundColor;
            if (!s.includes('color') && cs.color)
                el.style.color = cs.color;
            if (!s.includes('border-color') && cs.borderColor)
                el.style.borderColor = cs.borderColor;
        } catch(e) {}
    });

    const isMobileExport = window.innerWidth <= 1023 || /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
    html2canvas(tempContainer, {
        scale: isMobileExport ? 1.5 : 2,
        useCORS: true,
        backgroundColor: '#f5f5f7',
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false,
        removeContainer: false
    }).then(canvas => {
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;

        // 先填充背景色，确保没有透明区域
        exportCtx.fillStyle = '#f5f5f7';
        exportCtx.fillRect(0, 0, canvas.width, canvas.height);

        // 再绘制canvas内容
        exportCtx.drawImage(canvas, 0, 0);

        // 存储高清dataUrl供下载和新标签页使用
        lastExportDataUrl = canvas.toDataURL('image/png');
        const s = formatDate(startDate);
        const e = formatDate(endDate);
        lastExportFileName = `通告排期_${s}_${e}.png`;

        // 更新预览canvas
        const previewEl = document.getElementById('export-canvas');
        if (previewEl) {
            const maxW = 600;
            const ratio = maxW / canvas.width;
            previewEl.width = Math.round(canvas.width * ratio);
            previewEl.height = Math.round(canvas.height * ratio);
            const ctx = previewEl.getContext('2d');
            ctx.drawImage(canvas, 0, 0, previewEl.width, previewEl.height);
        }

        document.body.removeChild(tempContainer);
        downloadImageBtn.disabled = false;
        openInNewTabBtn.disabled = false;
        downloadImageBtn.textContent = '下载图片';
        openInNewTabBtn.textContent = '在新标签页打开';
    }).catch(error => {
        console.error('导出图片时出错:', error);
        if (tempContainer.parentNode) document.body.removeChild(tempContainer);
        downloadImageBtn.disabled = false;
        openInNewTabBtn.disabled = false;
        downloadImageBtn.textContent = '下载图片';
        openInNewTabBtn.textContent = '在新标签页打开';
        showToast('导出图片时出错，请重试', 'error');
    });
}

// 下载图片（兼容 iOS Safari）
function downloadImage() {
    if (!lastExportDataUrl) { showToast('请先生成预览', 'warning'); return; }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
        const w = window.open('');
        if (w) {
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${lastExportFileName}</title><style>*{margin:0;padding:0}body{background:#f5f5f5;display:flex;flex-direction:column;align-items:center;padding:20px}img{max-width:100%;height:auto}p{margin-top:16px;font-size:14px;color:#666;text-align:center}</style></head><body><img src="${lastExportDataUrl}"><p>长按图片 → 保存到照片</p></body></html>`);
            w.document.close();
        } else {
            showToast('请允许弹窗以查看图片，然后长按保存', 'warning');
        }
    } else {
        const link = document.createElement('a');
        link.download = lastExportFileName;
        link.href = lastExportDataUrl;
        link.click();
        showToast('图片已下载', 'success');
    }
}

// 在新标签页打开图片
function openImageInNewTab() {
    if (!lastExportDataUrl) { showToast('请先生成预览', 'warning'); return; }
    try {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${lastExportFileName}</title><style>*{margin:0;padding:0}body{background:#f5f5f5;display:flex;justify-content:center}img{max-width:100%;height:auto}</style></head><body><img src="${lastExportDataUrl}"></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank');
        if (!opened) {
            location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        try {
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${lastExportFileName}</title><style>*{margin:0;padding:0}body{background:#f5f5f5;display:flex;justify-content:center}img{max-width:100%;height:auto}</style></head><body><img src="${lastExportDataUrl}"></body></html>`;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            location.href = url;
        } catch (e2) {
            showToast('无法打开新标签页', 'error');
        }
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
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">加载中...</td></tr>';

    const dateFilterEl = document.getElementById('history-date-filter');
    const dateFilter = dateFilterEl ? dateFilterEl.value : '';
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
        pushUndoSnapshot('一键排序', beforeState, scheduleData);
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
            'background:#fff', 'padding:48px 56px', 'width:660px',
            'font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
            'position:fixed', 'top:-9999px', 'left:0', 'box-sizing:border-box'
        ].join(';');

        const rows = projects.length === 0
            ? '<p style="color:#999;text-align:center;padding:24px 0">当日暂无项目</p>'
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
                const border = i < projects.length - 1 ? 'border-bottom:1px solid #ececec;' : '';
                return `<div style="display:flex;gap:18px;padding:18px 0;${border}align-items:flex-start">
                    <div style="font-size:13px;font-weight:600;color:#bbb;min-width:18px;padding-top:3px">${i + 1}</div>
                    <div style="flex:1">
                        <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;line-height:1.3">${p.name}</div>
                        <div style="font-size:13px;color:#666;line-height:1.7">${meta || '—'}</div>
                        ${advStyle}
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
            if (!win) {
                showToast('浏览器拦截了弹出窗口，请允许弹窗后重试', 'warning');
                return;
            }
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
