/**
 * main.js — 应用入口
 * 职责：初始化状态、组装模块、绑定事件、启动应用
 */

import { createApiClient } from './modules/api.js';
import { getMonday, getWeekDates } from './modules/date.js';
import { createDefaultFilters } from './modules/filters.js';
import { createUndoManager } from './modules/undo.js';
import { createUiModule } from './modules/ui.js';
import { createScheduleModule } from './modules/schedule.js';
import { createScheduleCardModule } from './modules/schedule-card.js';
import { createScheduleNoticeModule } from './modules/schedule-notice.js';
import { createScheduleCopyModule } from './modules/schedule-copy.js';
import { createModalProjectModule } from './modules/modal-project.js';
import { createModalExportModule } from './modules/modal-export.js';
import { createModalBackupModule } from './modules/modal-backup.js';
import { createModalModule } from './modules/modal.js';
import { createExportModule } from './modules/export.js';
import { createWebhookModule } from './modules/webhook.js';
import { createSettingsModule } from './modules/settings.js';
import { createSettingsTemplateModule } from './modules/settings-template.js';
import { createSettingsRoleModule } from './modules/settings-role.js';
import { createClipboardModule } from './modules/clipboard.js';
import { createDragdropModule } from './modules/dragdrop.js';
import { createMobileModule } from './modules/mobile.js';
import { createSseModule } from './modules/sse.js';
import { createHeatmapModule } from './modules/heatmap.js';
import { initViewSwitcher } from './modules/viewSwitcher.js';

// ── 共享状态 ──
let currentMonday = getMonday(new Date());
let scheduleData = {};
let adminPassword = '';
let editPassword = '';
let roleCategories = [];
let filterState = createDefaultFilters();
const undoManager = createUndoManager();

Object.defineProperty(window, '__scheduleData', { get: () => scheduleData, configurable: true });
Object.defineProperty(window, '__currentMonday', { get: () => currentMonday, configurable: true });

// ── API 客户端 ──
const apiClient = createApiClient({
    baseUrl: '/api',
    getAdminPassword: () => adminPassword,
    getEditPassword: () => editPassword
});

// ── 共享上下文 ──
const ctx = {
    getScheduleData: () => scheduleData,
    setScheduleData: (d) => { scheduleData = d; },
    getCurrentMonday: () => currentMonday,
    setCurrentMonday: (d) => { currentMonday = d; },
    getAdminPassword: () => adminPassword,
    setAdminPassword: (p) => { adminPassword = p; },
    getEditPassword: () => editPassword,
    setEditPassword: (p) => { editPassword = p; },
    getRoleCategories: () => roleCategories,
    setRoleCategories: (c) => { roleCategories = c; },
    getFilterState: () => filterState,
    setFilterState: (s) => { filterState = s; },
    apiClient, undoManager,
};

// ── API 包装器（需要 withEditAccess，模块初始化后赋值） ──
let scheduleAPI, settingAPI, versionAPI, backupAPI;

// ── 初始化模块 ──
const ui = createUiModule(ctx);
const settingsRole = createSettingsRoleModule({ ...ctx, ...ui });
const settingsTemplate = createSettingsTemplateModule({ ...ctx, ...ui, ...settingsRole });
const settings = createSettingsModule({ ...ctx, ...ui, ...settingsRole, ...settingsTemplate });
const scheduleCard = createScheduleCardModule({ ...ctx, ...ui });
const scheduleNotice = createScheduleNoticeModule({ ...ctx, ...ui });
const scheduleCopy = createScheduleCopyModule({ ...ctx, ...ui });
const schedule = createScheduleModule({ ...ctx, ...ui, ...scheduleCard, ...scheduleNotice, ...scheduleCopy });
const modalProject = createModalProjectModule({ ...ctx, ...schedule, ...ui, ...settingsRole, ...settingsTemplate, ...settings });
const modalExport = createModalExportModule({ ...ctx, ...schedule, ...ui });
const modalBackup = createModalBackupModule({ ...ctx, ...schedule, ...ui });
const modal = createModalModule({ ...ctx, ...schedule, ...ui, ...modalProject, ...settings, ...settingsTemplate });
const exp = createExportModule({ ...ctx, ...schedule, ...ui });
const webhook = createWebhookModule({ ...ctx, ...ui });
const clipboard = createClipboardModule({ ...ctx, ...schedule, ...ui, ...modalProject });
const dragdrop = createDragdropModule({ ...ctx, ...schedule, ...ui });
const mobile = createMobileModule({ ...ctx });
const sse = createSseModule({ ...ctx, ...schedule, ...settings, ...ui });
const heatmap = createHeatmapModule({ ...ctx, ...ui });

// 合并所有模态框函数到统一接口
const allModals = { ...modal, ...modalProject, ...modalExport, ...modalBackup };

// 构建 API 包装器
scheduleAPI = {
    getSchedules: (p = {}) => apiClient.getSchedules(p),
    saveSchedule: (p) => ui.withEditAccess(() => apiClient.saveSchedule(p)),
    deleteSchedule: (d) => ui.withEditAccess(() => apiClient.deleteSchedule(d))
};
settingAPI = {
    getSettings: () => apiClient.getSettings(),
    saveSettings: (p) => ui.withEditAccess(() => apiClient.saveSettings(p)),
    getTemplates: () => apiClient.getTemplates(),
    saveTemplate: (p) => ui.withEditAccess(() => apiClient.saveTemplate(p)),
    deleteTemplate: (id) => ui.withEditAccess(() => apiClient.deleteTemplate(id)),
    getAccessSettings: () => apiClient.getAccessSettings(),
    saveAccessSettings: (p) => apiClient.saveAccessSettings(p)
};
versionAPI = { getVersion: () => apiClient.version(), getHealth: () => apiClient.health() };
backupAPI = {
    createBackup: () => ui.withEditAccess(() => apiClient.createBackup()),
    getBackups: () => apiClient.getBackups(),
    deleteBackup: (p) => ui.withEditAccess(() => apiClient.deleteBackup(p)),
    restoreBackup: (p) => ui.withEditAccess(() => apiClient.restoreBackup(p)),
    fetchBackupPayload: (p) => apiClient.fetchBackupPayload(p),
    verifyPassword: (p) => apiClient.verifyAdminPassword(p)
};

// 将 API 包装器注入到 ctx（供后续模块使用）
Object.assign(ctx, { scheduleAPI, settingAPI, versionAPI, backupAPI });

// ── DOM 元素 ──
const $ = (id) => document.getElementById(id);
const weekDisplay = $('week-display');
const prevWeekBtn = $('prev-week');
const nextWeekBtn = $('next-week');
const currentWeekBtn = $('current-week');
const addProjectBtn = $('add-project');
const exportImageBtn = $('export-image');
const settingsBtn = $('settings');
const undoActionBtn = $('undo-action');
const searchProjectsInput = $('search-projects');
const filterTypeSelect = $('filter-type');
const clearFiltersBtn = $('clear-filters');
const adminBtn = $('admin-btn');
const heatmapBtn = $('heatmap-btn');
const pasteRecognitionBtn = $('paste-recognition');
const projectModal = $('project-modal');
const settingsModal = $('settings-modal');
const exportModal = $('export-modal');
const datePickerModal = $('date-picker-modal');
const backupPreviewModal = $('backup-preview-modal');
const closeModalButtons = document.querySelectorAll('.close');
const cancelEditBtn = $('cancel-edit');
const saveSettingsBtn = $('save-settings');
const projectForm = $('project-form');
const selectDateBtn = $('select-date-btn');
const applyTemplateBtn = $('apply-template');
const saveTemplateFromFormBtn = $('save-template-from-form');
const exportCrossWeekCheckbox = $('export-cross-week');
const exportDateRangeDiv = $('export-date-range');
const regenerateExportBtn = $('regenerate-export');
const closeExportBtn = $('close-export');
const downloadImageBtn = $('download-image');
const openInNewTabBtn = $('open-in-new-tab');
const cancelExportBtn = $('cancel-export');
const addRoleCategoryBtn = $('add-role-category');
const projectAdvertiserCheckbox = $('project-advertiser');
const advertiserNoWrap = $('advertiser-no-wrap');

// ── 更新周显示 ──
function updateWeekDisplay() {
    const weekDates = getWeekDates(currentMonday);
    const s = weekDates[0], e = weekDates[6];
    const year = s.getFullYear();
    const weekNum = Math.ceil((((s - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    const sm = s.getMonth() + 1, sd = s.getDate(), em = e.getMonth() + 1, ed = e.getDate();
    weekDisplay.textContent = sm === em
        ? `${year}年${sm}月${sd}日 - ${ed}日 (第${weekNum}周)`
        : `${year}年${sm}月${sd}日 - ${em}月${ed}日 (第${weekNum}周)`;
}

// ── 设置事件监听器 ──
function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            [projectModal, settingsModal, exportModal, datePickerModal].forEach(m => m.style.display = 'none');
            ['admin-modal', 'heatmap-modal'].forEach(id => { const m = $(id); if (m) m.style.display = 'none'; });
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (projectModal.style.display === 'block') projectForm.dispatchEvent(new Event('submit'));
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); allModals.showProjectModal(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); allModals.showExportModal(); }
        if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea, select')) {
            currentMonday.setDate(currentMonday.getDate() - 7); updateWeekDisplay(); schedule.renderSchedule();
        }
        if (e.key === 'ArrowRight' && !e.target.matches('input, textarea, select')) {
            currentMonday.setDate(currentMonday.getDate() - (-7)); updateWeekDisplay(); schedule.renderSchedule();
        }
        if (e.key === 'Home' && !e.target.matches('input, textarea, select')) {
            currentMonday = getMonday(new Date()); updateWeekDisplay(); schedule.renderSchedule();
        }
    });

    prevWeekBtn.addEventListener('click', () => { currentMonday.setDate(currentMonday.getDate() - 7); updateWeekDisplay(); schedule.renderSchedule(); });
    nextWeekBtn.addEventListener('click', () => { currentMonday.setDate(currentMonday.getDate() + 7); updateWeekDisplay(); schedule.renderSchedule(); });
    currentWeekBtn.addEventListener('click', () => { currentMonday = getMonday(new Date()); updateWeekDisplay(); schedule.renderSchedule(); });

    addProjectBtn.addEventListener('click', () => allModals.showProjectModal());
    exportImageBtn.addEventListener('click', allModals.showExportModal);
    pasteRecognitionBtn.addEventListener('click', clipboard.handlePasteRecognition);
    settingsBtn.addEventListener('click', allModals.showSettingsModal);
    if (adminBtn) adminBtn.addEventListener('click', allModals.showAdminModal);
    if (heatmapBtn) heatmapBtn.addEventListener('click', heatmap.showHeatmapModal);

    document.addEventListener('click', (e) => {
        const t = e.target;
        if (t.classList.contains('delete-btn')) schedule.deleteProject(t.dataset.date, parseInt(t.dataset.index));
        if (t.classList.contains('copy-btn')) scheduleCopy.showCopyModal(t.dataset.date, parseInt(t.dataset.index));
        if (t.classList.contains('notice-day-btn')) scheduleNotice.showNoticeModal(t.dataset.date);
        if (t.classList.contains('sort-day-btn')) scheduleNotice.sortDayProjects(t.dataset.date);
    });

    undoActionBtn.addEventListener('click', async () => {
        try { await schedule.undoLastChange(); } catch (err) { console.error('撤销失败:', err); ui.showToast(err.message || '撤销失败', 'error'); }
    });

    searchProjectsInput.addEventListener('input', settings.updateFilterState);
    filterTypeSelect.addEventListener('change', settings.updateFilterState);
    clearFiltersBtn.addEventListener('click', () => { searchProjectsInput.value = ''; filterTypeSelect.value = ''; settings.updateFilterState(); });

    applyTemplateBtn.addEventListener('click', settingsTemplate.applySelectedTemplate);
    saveTemplateFromFormBtn.addEventListener('click', async () => {
        try { await settingsTemplate.saveTemplateFromCurrentForm(); } catch (err) { ui.showToast(err.message || '保存模板失败', 'error'); }
    });

    closeModalButtons.forEach(b => b.addEventListener('click', () => { projectModal.style.display = 'none'; settingsModal.style.display = 'none'; exportModal.style.display = 'none'; }));
    cancelEditBtn.addEventListener('click', () => { projectModal.style.display = 'none'; });
    saveSettingsBtn.addEventListener('click', settings.saveSettings);

    if (addRoleCategoryBtn) {
        addRoleCategoryBtn.addEventListener('click', () => {
            const s = window.__currentSettings || {};
            const cats = s.roleCategories || [];
            cats.push({ key: `custom_${Date.now()}`, label: '新职能', type: 'checkbox', optionsKey: `commonCustom_${Date.now()}` });
            s.roleCategories = cats; window.__currentSettings = s; roleCategories = cats;
            settingsRole.renderRoleSettings(s);
        });
    }
    if (projectAdvertiserCheckbox && advertiserNoWrap) {
        projectAdvertiserCheckbox.addEventListener('change', () => { advertiserNoWrap.style.display = projectAdvertiserCheckbox.checked ? 'block' : 'none'; });
    }
    if (exportCrossWeekCheckbox && exportDateRangeDiv) {
        exportCrossWeekCheckbox.addEventListener('change', () => { exportDateRangeDiv.style.display = exportCrossWeekCheckbox.checked ? 'block' : 'none'; });
    }
    if (regenerateExportBtn) regenerateExportBtn.addEventListener('click', exp.drawScheduleToCanvas);
    if (selectDateBtn) selectDateBtn.addEventListener('click', allModals.showDatePicker);

    const confirmDateBtn = $('confirm-date');
    const cancelDateBtn = $('cancel-date');
    if (confirmDateBtn) confirmDateBtn.addEventListener('click', allModals.confirmDateSelection);
    if (cancelDateBtn) cancelDateBtn.addEventListener('click', () => { datePickerModal.style.display = 'none'; });
    if (datePickerModal) datePickerModal.addEventListener('click', (e) => { if (e.target === datePickerModal) datePickerModal.style.display = 'none'; });

    projectForm.addEventListener('submit', (e) => { e.preventDefault(); allModals.saveProject(); });

    if (closeExportBtn) closeExportBtn.addEventListener('click', () => { exportModal.style.display = 'none'; });
    if (downloadImageBtn) downloadImageBtn.addEventListener('click', exp.downloadImage);
    if (openInNewTabBtn) openInNewTabBtn.addEventListener('click', exp.openImageInNewTab);
    if (cancelExportBtn) cancelExportBtn.addEventListener('click', () => { exportModal.style.display = 'none'; });
    if (exportModal) exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.style.display = 'none'; });

    window.addEventListener('click', (e) => {
        if (e.target === projectModal) projectModal.style.display = 'none';
        if (e.target === settingsModal) settingsModal.style.display = 'none';
        if (e.target === exportModal) exportModal.style.display = 'none';
        if (e.target === backupPreviewModal) modalBackup.closeBackupPreviewModal();
        ['admin-modal', 'heatmap-modal'].forEach(id => { const m = $(id); if (m && e.target === m) m.style.display = 'none'; });
    });

    const importFileInput = $('import-file');
    if (importFileInput) importFileInput.addEventListener('change', exp.handleImportFile);
}

// ── 初始化应用 ──
async function initApp() {
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
    if (isMobile) currentMonday = getMonday(new Date());

    updateWeekDisplay();
    setupEventListeners();
    mobile.setupMobileDateSwitch();
    mobile.setupSwipeGesture();
    ui.updateUndoButton();
    settings.loadVersionInfo && settings.loadVersionInfo();
    settings.loadHealthStatus();

    await schedule.loadScheduleData();
    await settings.loadSettings();
    await settingsTemplate.loadTemplateData();

    if (isMobile) mobile.showTodayOnMobile();
    settingsRole.updateProjectFormOptions();
    settingsRole.initStartTimeOptions();
    sse.connectSSE();
    webhook.setupWebhookEvents();
    setInterval(settings.loadHealthStatus, 30000);

    // 初始化视图切换器
    initViewSwitcher();

    // 快捷键
    ui.setupKeyboardShortcuts({
        undo: () => undoManager.undo().catch(err => { ui.showToast(err.message || '撤销失败', 'error'); }),
        addProject: () => allModals.showProjectModal(),
        prevWeek: () => { currentMonday.setDate(currentMonday.getDate() - 7); updateWeekDisplay(); schedule.renderSchedule(); },
        nextWeek: () => { currentMonday.setDate(currentMonday.getDate() + 7); updateWeekDisplay(); schedule.renderSchedule(); },
        today: () => { currentMonday = getMonday(new Date()); updateWeekDisplay(); schedule.renderSchedule(); },
        exportImage: () => exp.showExportModal(),
        closeModal: () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); },
        showHelp: () => { ui.showToast('快捷键: N=新增 T=今天 ←→=切周 E=导出 Ctrl+Z=撤销 ?=帮助', 'info', 5000); }
    });

    // CSV 导出按钮
    const exportCsvBtn = document.getElementById('export-csv');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exp.exportCSV);
}

initApp();
