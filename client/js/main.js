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
import { createMonthViewModule } from './modules/monthView.js';
import { createPersonnelViewModule } from './modules/personnelView.js';
import { createDashboardViewModule } from './modules/dashboardView.js';
import { createQuickAddModule } from './modules/quickAdd.js';
import { createHistoryPanelModule } from './modules/historyPanel.js';
import { createSearchModule } from './modules/search.js';
import { createClientExportModule } from './modules/clientExport.js';
import { createConflictModule } from './modules/conflict.js';
import { createKeyboardNavModule } from './modules/keyboardNav.js';
import { createMobileGesturesModule } from './modules/mobileGestures.js';
import { createOfflineIndicatorModule } from './modules/offlineIndicator.js';

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

// ── 初始化模块 ──
const ui = createUiModule(ctx);

// ── API 包装器（需要 ui.withEditAccess） ──
const scheduleAPI = {
    getSchedules: (p = {}) => apiClient.getSchedules(p),
    saveSchedule: (p) => ui.withEditAccess(() => apiClient.saveSchedule(p)),
    deleteSchedule: (d) => ui.withEditAccess(() => apiClient.deleteSchedule(d))
};
const settingAPI = {
    getSettings: () => apiClient.getSettings(),
    saveSettings: (p) => ui.withEditAccess(() => apiClient.saveSettings(p)),
    getTemplates: () => apiClient.getTemplates(),
    saveTemplate: (p) => ui.withEditAccess(() => apiClient.saveTemplate(p)),
    deleteTemplate: (id) => ui.withEditAccess(() => apiClient.deleteTemplate(id)),
    getAccessSettings: () => apiClient.getAccessSettings(),
    saveAccessSettings: (p) => ui.withEditAccess(() => apiClient.saveAccessSettings(p))
};
const versionAPI = { getVersion: () => apiClient.version(), getHealth: () => apiClient.health() };
const backupAPI = {
    createBackup: () => ui.withEditAccess(() => apiClient.createBackup()),
    getBackups: () => apiClient.getBackups(),
    deleteBackup: (p) => ui.withEditAccess(() => apiClient.deleteBackup(p)),
    restoreBackup: (p) => ui.withEditAccess(() => apiClient.restoreBackup(p)),
    fetchBackupPayload: (p) => apiClient.fetchBackupPayload(p),
    verifyPassword: (p) => apiClient.verifyAdminPassword(p)
};

// 注入到 ctx（供后续模块使用）
Object.assign(ctx, { scheduleAPI, settingAPI, versionAPI, backupAPI });
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

// ── 辅助视图模块 ──
const monthView = createMonthViewModule({
    api: { fetchSchedules: (start, end) => apiClient.get(`/schedules?start=${start}&end=${end}`) },
    onJumpToWeek: (date) => {
        currentMonday = getMonday(date);
        updateWeekDisplay();
        schedule.loadScheduleData().then(() => schedule.renderSchedule());
        // 切换回周视图
        import('./modules/viewSwitcher.js').then(m => m.switchView('week'));
    }
});
const clientExport = createClientExportModule({ apiClient });
const conflictModule = createConflictModule({ apiClient });
const keyboardNav = createKeyboardNavModule({
    onNavigate: (action, param) => {
        if (action === 'prev-week') {
            document.getElementById('prev-week')?.click();
        } else if (action === 'next-week') {
            document.getElementById('next-week')?.click();
        } else if (action === 'today') {
            document.getElementById('today')?.click();
        } else if (action === 'switch-view') {
            import('./modules/viewSwitcher.js').then(m => m.switchView(param));
        }
    },
    onAction: (action) => {
        if (action === 'undo') undoManager.undo();
        if (action === 'redo') undoManager.redo();
    }
});
const mobileGestures = createMobileGesturesModule({
    onSwipeLeft: () => { document.getElementById('next-week')?.click(); },
    onSwipeRight: () => { document.getElementById('prev-week')?.click(); },
    onLongPress: (x, y) => {
        const addBtn = document.getElementById('add-project');
        if (addBtn) addBtn.click();
    }
});
const offlineIndicator = createOfflineIndicatorModule();
const personnelView = createPersonnelViewModule({
    api: { fetchSchedules: (start, end) => apiClient.get(`/schedules?start=${start}&end=${end}`) },
    onJumpToWeek: (date) => {
        currentMonday = getMonday(date);
        updateWeekDisplay();
        schedule.loadScheduleData().then(() => schedule.renderSchedule());
        import('./modules/viewSwitcher.js').then(m => m.switchView('week'));
    }
});
const dashboardView = createDashboardViewModule({
    api: { fetchSchedules: (start, end) => apiClient.get(`/schedules?start=${start}&end=${end}`) }
});
const quickAdd = createQuickAddModule({
    apiClient,
    onCreated: () => { schedule.loadScheduleData().then(() => schedule.renderSchedule()); }
});
const historyPanel = createHistoryPanelModule({
    apiClient,
    onUndone: () => undoManager.undo()
});
const searchModule = createSearchModule({
    apiClient,
    onResults: (results) => {
        if (!results) {
            schedule.loadScheduleData().then(() => schedule.renderSchedule());
        } else {
            console.log('[search] 找到', results.total, '条结果');
        }
    }
});

// 合并所有模态框函数到统一接口
const allModals = { ...modal, ...modalProject, ...modalExport, ...modalBackup };

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

    // ── 历史面板按钮 ──
    const historyBtn = $('history-btn');
    if (historyBtn) historyBtn.addEventListener('click', historyPanel.togglePanel);

    // ── 管理员密码验证 ──
    const confirmAdminPwdBtn = $('confirm-admin-password');
    const adminPasswordInput = $('admin-password-input');
    const adminPasswordSection = $('admin-password-section');
    const adminUnlockedContent = $('admin-unlocked-content');

    if (confirmAdminPwdBtn) {
        confirmAdminPwdBtn.addEventListener('click', async () => {
            const pwd = adminPasswordInput ? adminPasswordInput.value.trim() : '';
            if (!pwd) {
                ui.showToast('请输入管理员密码', 'error');
                return;
            }
            try {
                const result = await apiClient.verifyAdminPassword(pwd);
                if (result && result.valid) {
                    ctx.setAdminPassword(pwd);
                    if (adminPasswordSection) adminPasswordSection.style.display = 'none';
                    if (adminUnlockedContent) adminUnlockedContent.style.display = 'block';
                    ui.showToast('密码验证成功', 'success');
                    // 加载备份列表
                    if (typeof modalBackup.loadBackupList === 'function') modalBackup.loadBackupList();
                    // 加载 Webhook 设置
                    if (typeof webhook.loadWebhookSettings === 'function') webhook.loadWebhookSettings();
                    // 加载历史记录
                    loadAdminHistory();
                } else {
                    ui.showToast('密码错误', 'error');
                }
            } catch (err) {
                ui.showToast('验证失败: ' + (err.message || '未知错误'), 'error');
            }
        });
    }

    // 管理员密码输入框回车提交
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (confirmAdminPwdBtn) confirmAdminPwdBtn.click();
            }
        });
    }

    // ── 管理员标签页切换 ──
    const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
    const adminTabPanels = document.querySelectorAll('.admin-tab-panel');

    adminTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // 更新按钮状态
            adminTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新面板显示
            adminTabPanels.forEach(panel => {
                panel.style.display = panel.id === `admin-tab-${tabId}` ? 'block' : 'none';
            });
        });
    });

    // 初始化：显示第一个标签页，隐藏其他
    if (adminTabPanels.length > 0) {
        adminTabPanels.forEach((panel, index) => {
            panel.style.display = index === 0 ? 'block' : 'none';
        });
    }

    // ── 管理员标签页 - 历史记录功能 ──
    async function loadAdminHistory() {
        const historyTbody = document.getElementById('history-tbody');
        if (!historyTbody) return;

        try {
            const response = await apiClient.get('/history');
            const history = Array.isArray(response) ? response : (response.history || []);

            if (history.length === 0) {
                historyTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;padding:16px;">暂无操作记录</td></tr>';
                return;
            }

            historyTbody.innerHTML = '';
            history.slice(0, 50).forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.ts ? new Date(item.ts).toLocaleString() : '未知'}</td>
                    <td>${escapeHtml(item.action || '未知')}</td>
                    <td>${escapeHtml(item.date || '未知')}</td>
                    <td>${escapeHtml(item.details || '')}</td>
                `;
                historyTbody.appendChild(row);
            });
        } catch (error) {
            console.error('加载历史记录失败:', error);
            historyTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#e74c3c;padding:16px;">加载失败</td></tr>';
        }
    }

    // 历史记录刷新按钮
    const historyRefreshBtn = document.getElementById('history-refresh-btn');
    if (historyRefreshBtn) {
        historyRefreshBtn.addEventListener('click', loadAdminHistory);
    }

    // 历史记录清空按钮
    const historyClearBtn = document.getElementById('history-clear-btn');
    if (historyClearBtn) {
        historyClearBtn.addEventListener('click', async () => {
            if (!confirm('确定要清空所有操作记录吗？此操作不可恢复。')) return;
            try {
                await apiClient.post('/history/clear');
                ui.showToast('操作记录已清空', 'success');
                await loadAdminHistory();
            } catch (error) {
                ui.showToast('清空失败: ' + (error.message || '未知错误'), 'error');
            }
        });
    }

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
    // 将设置中的已知列表传给快速创建模块
    const currentSettings = ctx.getSettings ? ctx.getSettings() : null;
    if (currentSettings) quickAdd.updateKnownLists(currentSettings);
    sse.connectSSE();
    webhook.setupWebhookEvents();
    setInterval(settings.loadHealthStatus, 30000);

    // 初始化视图切换器
    initViewSwitcher();
    monthView.init();
    personnelView.init();
    dashboardView.init();
    quickAdd.init();
    historyPanel.init();
    searchModule.init();
    clientExport.init();
    conflictModule.init();
    keyboardNav.init();
    mobileGestures.init();
    offlineIndicator.init();

    // 监听视图切换事件，触发各视图渲染
    document.addEventListener('viewInit', (e) => {
        const view = e.detail.view;
        if (view === 'month') monthView.render();
        if (view === 'personnel') personnelView.render();
        if (view === 'dashboard') dashboardView.render();
    });
    document.addEventListener('viewChanged', (e) => {
        const view = e.detail.to;
        if (view === 'month') monthView.render();
        if (view === 'personnel') personnelView.render();
        if (view === 'dashboard') dashboardView.render();
    });

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

    // ── 管理员设置 - 备份功能 ──
    const backupToHostBtn = document.getElementById('backup-to-host');
    if (backupToHostBtn) {
        backupToHostBtn.addEventListener('click', async () => {
            try {
                ui.showLoading('正在备份...');
                await apiClient.createBackup();
                ui.hideLoading();
                ui.showToast('备份成功', 'success');
                // 刷新备份列表
                if (typeof modalBackup.loadBackupList === 'function') {
                    await modalBackup.loadBackupList();
                }
            } catch (error) {
                ui.hideLoading();
                ui.showToast('备份失败: ' + (error.message || '未知错误'), 'error');
            }
        });
    }

    // 从备份恢复按钮
    const restoreFromHostBtn = document.getElementById('restore-from-host');
    const restoreFileInput = document.getElementById('restore-file-input');
    if (restoreFromHostBtn && restoreFileInput) {
        restoreFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!data.schedules || !Array.isArray(data.schedules)) {
                    ui.showToast('无效的备份文件格式', 'error');
                    return;
                }
                
                if (!confirm(`确定从 ${file.name} 恢复数据？\n包含 ${data.schedules.length} 天排期数据，将覆盖当前数据。`)) {
                    return;
                }
                
                ui.showLoading();
                await apiClient.restoreBackup({ data });
                ui.hideLoading();
                ui.showToast('数据恢复成功！正在刷新...', 'success');
                
                // 刷新页面
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                ui.hideLoading();
                ui.showToast('恢复失败: ' + (err.message || '未知错误'), 'error');
            }
            
            // 清空input
            restoreFileInput.value = '';
        });
    }

    // ── 所有模态框关闭按钮 ──
    // 使用事件委托处理所有关闭按钮
    document.addEventListener('click', (e) => {
        // 处理所有 .close 按钮
        if (e.target.classList.contains('close')) {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        }
        
        // 处理所有取消按钮
        if (e.target.id && e.target.id.startsWith('cancel-')) {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        }
        
        // 点击模态框背景关闭
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // ── 管理员设置 - 周导出功能 ──
    const copyWeekExportBtn = document.getElementById('copy-week-export');
    if (copyWeekExportBtn) {
        copyWeekExportBtn.addEventListener('click', async () => {
            // 复制周导出内容
            const weekExportContent = document.getElementById('week-export-content');
            if (weekExportContent) {
                try {
                    await navigator.clipboard.writeText(weekExportContent.textContent);
                    ui.showToast('已复制到剪贴板', 'success');
                } catch (err) {
                    ui.showToast('复制失败', 'error');
                }
            }
        });
    }

    // ── 时钟功能 ──
    function updateClock() {
        const clockTime = document.getElementById('clock-time');
        const clockDate = document.getElementById('clock-date');
        if (!clockTime || !clockDate) return;
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        clockTime.textContent = `${hours}:${minutes}:${seconds}`;
        clockDate.textContent = `${year}/${month}/${day}`;
    }
    
    // 立即更新一次
    updateClock();
    // 每秒更新
    setInterval(updateClock, 1000);
}

initApp();
