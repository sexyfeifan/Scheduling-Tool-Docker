import { getWeekDates, formatDate } from './date.js';

/**
 * Webhook 推送模块
 * @param {object} ctx
 * @param {Function} ctx.getCurrentMonday - getter 返回当前周的 Monday Date
 * @param {object} ctx.apiClient - API 客户端实例
 * @param {object} ctx.settingAPI - 设置 API
 * @param {Function} ctx.showToast
 * @param {Function} ctx.showLoading
 * @param {Function} ctx.hideLoading
 * @param {Function} ctx.escapeHtml
 */
export function createWebhookModule(ctx) {
    const {
        getCurrentMonday,
        apiClient,
        settingAPI,
        showToast,
        showLoading,
        hideLoading,
        escapeHtml
    } = ctx;

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

    async function loadWebhookPresets() {
        try {
            const tpl = await apiClient.getWebhookTemplates();
            if (tpl.presets) {
                webhookTemplatePresets = tpl.presets;
                populateWebhookPresetSelects(tpl.presets);
                showToast('预设模板已加载', 'success');
            } else {
                showToast('未找到预设模板', 'warning');
            }
        } catch (err) {
            showToast('加载预设失败: ' + (err.message || '未知错误'), 'error');
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
            btn.dataset.value = startStr + '_' + endStr;
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

    return {
        loadWebhookSettings,
        saveWebhookSettings,
        testWebhook,
        loadDefaultWebhookTemplates,
        loadWebhookPresets,
        populateWebhookPresetSelects,
        showWebhookPushModal,
        setupWebhookEvents
    };
}
