/**
 * settings.js — 设置管理核心（精简版）
 * 包含：saveSettings, loadSettings, updateShareLinkDisplay, loadAccessSettings,
 *       loadHealthStatus, updateFilterState
 */
export function createSettingsModule(ctx) {
    const {
        getScheduleData, settingAPI,
        showToast, loadScheduleData,
        getRoleCategories, setRoleCategories, getAdminPassword,
        renderRoleSettings, updateProjectFormOptions,
    } = ctx;

    // Lazy access to versionAPI (initialized after module creation)
    function getVersionAPI() {
        return ctx.versionAPI;
    }

    let accessSettings = {};

    const settingsModal = document.getElementById('settings-modal');
    const healthBadge = document.getElementById('health-badge');
    const shareLinkDisplay = document.getElementById('share-link-display');
    const shareEnabledSetting = document.getElementById('share-enabled-setting');
    const shareTokenSetting = document.getElementById('share-token-setting');
    const editPasswordSetting = document.getElementById('edit-password-setting');
    const searchProjectsInput = document.getElementById('search-projects');
    const filterTypeSelect = document.getElementById('filter-type');

    function updateShareLinkDisplay() {
        if (!shareLinkDisplay) return;
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
            if (shareEnabledSetting) shareEnabledSetting.checked = accessSettings.shareEnabled;
            if (shareTokenSetting) shareTokenSetting.value = accessSettings.shareToken || '';
            if (editPasswordSetting) editPasswordSetting.value = '';
            updateShareLinkDisplay();
        } catch (error) {
            console.error('加载访问设置失败:', error);
            showToast('访问设置加载失败', 'warning');
        }
    }

    async function loadHealthStatus() {
        try {
            const versionAPI = getVersionAPI();
            if (!versionAPI) return;
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

    async function saveSettings() {
        const cats = [];
        const customRoleOptions = {};
        const items = document.querySelectorAll('.role-setting-item');

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
            if (settingsModal) settingsModal.style.display = 'none';
        } catch (error) {
            console.error('保存设置时出错:', error);
            showToast('保存设置时出错，请重试', 'error');
        }
    }

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

    function updateFilterState() {
        const search = searchProjectsInput ? searchProjectsInput.value.trim() : '';
        const type = filterTypeSelect ? filterTypeSelect.value : '';
        ctx.setFilterState({ search, type });
        if (typeof ctx.renderSchedule === 'function') {
            ctx.renderSchedule();
        }
    }

    return {
        saveSettings,
        loadSettings,
        updateShareLinkDisplay,
        loadAccessSettings,
        loadHealthStatus,
        updateFilterState,
        getAccessSettings: () => accessSettings
    };
}
