/**
 * settings-template.js — 模板管理
 * 包含：renderTemplateList, populateTemplateSelect, findTemplate,
 *       applyTemplateToForm, applySelectedTemplate, saveTemplateFromCurrentForm, loadTemplateData
 */
export function createSettingsTemplateModule(ctx) {
    const {
        settingAPI,
        showToast, escapeHtml,
    } = ctx;

    let projectTemplates = [];

    const templateList = document.getElementById('template-list');
    const projectTemplateSelect = document.getElementById('project-template-select');
    const projectNameInput = document.getElementById('project-name');
    const projectTypeSelect = document.getElementById('project-type');
    const projectStartTimeSelect = document.getElementById('project-start-time');
    const projectLaodaoCheckbox = document.getElementById('project-laodao');
    const locationOptionsDiv = document.getElementById('project-location-options');
    const projectAdvertiserCheckbox = document.getElementById('project-advertiser');
    const projectAdvertiserNoInput = document.getElementById('project-advertiser-no');
    const advertiserNoWrap = document.getElementById('advertiser-no-wrap');

    function renderTemplateList() {
        if (!templateList) return;

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
                if (projectTemplateSelect) projectTemplateSelect.value = button.dataset.templateId;
                applySelectedTemplate();
            });
        });

        templateList.querySelectorAll('.delete-template-btn').forEach((button) => {
            button.addEventListener('click', async () => {
                try {
                    await settingAPI.deleteTemplate(button.dataset.templateId);
                    projectTemplates = projectTemplates.filter((t) => t.id !== button.dataset.templateId);
                    renderTemplateList();
                    populateTemplateSelect();
                    showToast('模板已删除', 'success');
                } catch (error) {
                    showToast(error.message || '删除模板失败', 'error');
                }
            });
        });
    }

    function populateTemplateSelect() {
        if (!projectTemplateSelect) return;
        projectTemplateSelect.innerHTML = '<option value="">选择模板...</option>';
        projectTemplates.forEach((template) => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            projectTemplateSelect.appendChild(option);
        });
    }

    function findTemplate(templateId) {
        return projectTemplates.find((t) => t.id === templateId);
    }

    function applyTemplateToForm(template) {
        if (!template || !template.defaults) return;
        const d = template.defaults;

        if (projectNameInput && d.name) projectNameInput.value = d.name;
        if (projectTypeSelect && d.type) projectTypeSelect.value = d.type;
        if (projectStartTimeSelect && d.startTime) projectStartTimeSelect.value = d.startTime;
        if (projectLaodaoCheckbox) projectLaodaoCheckbox.checked = d.laodao || false;
        if (locationOptionsDiv && d.location) {
            ctx.setCheckedValues(locationOptionsDiv, d.location);
        }

        if (d.isAdvertiser && projectAdvertiserCheckbox) {
            projectAdvertiserCheckbox.checked = true;
            if (advertiserNoWrap) advertiserNoWrap.style.display = 'block';
            if (projectAdvertiserNoInput) projectAdvertiserNoInput.value = d.advertiserNo || '';
        } else if (projectAdvertiserCheckbox) {
            projectAdvertiserCheckbox.checked = false;
            if (advertiserNoWrap) advertiserNoWrap.style.display = 'none';
        }

        if (d.roleValues) {
            ctx.setProjectRoleValues(d.roleValues);
        }
    }

    function applySelectedTemplate() {
        if (!projectTemplateSelect) return;
        const templateId = projectTemplateSelect.value;
        if (!templateId) return;

        const template = findTemplate(templateId);
        if (template) {
            applyTemplateToForm(template);
            showToast(`已应用模板：${template.name}`, 'success');
        }
    }

    async function saveTemplateFromCurrentForm() {
        const name = prompt('请输入模板名称：');
        if (!name || !name.trim()) return;

        const defaults = {
            name: projectNameInput ? projectNameInput.value.trim() : '',
            type: projectTypeSelect ? projectTypeSelect.value : '',
            location: locationOptionsDiv ? ctx.getCheckedValues(locationOptionsDiv) : '',
            startTime: projectStartTimeSelect ? projectStartTimeSelect.value : '',
            laodao: projectLaodaoCheckbox ? projectLaodaoCheckbox.checked : false,
            isAdvertiser: projectAdvertiserCheckbox ? projectAdvertiserCheckbox.checked : false,
            advertiserNo: projectAdvertiserNoInput ? projectAdvertiserNoInput.value.trim() : '',
            roleValues: ctx.getProjectRoleValues(),
        };

        try {
            const result = await settingAPI.saveTemplate({ name: name.trim(), defaults });
            projectTemplates = result.templates || [];
            renderTemplateList();
            populateTemplateSelect();
            showToast('模板已保存', 'success');
        } catch (error) {
            showToast(error.message || '保存模板失败', 'error');
        }
    }

    async function loadTemplateData() {
        try {
            const result = await settingAPI.getTemplates();
            projectTemplates = result.templates || [];
            renderTemplateList();
            populateTemplateSelect();
        } catch (error) {
            console.error('加载模板失败:', error);
        }
    }

    return {
        renderTemplateList,
        populateTemplateSelect,
        findTemplate,
        applyTemplateToForm,
        applySelectedTemplate,
        saveTemplateFromCurrentForm,
        loadTemplateData,
        getProjectTemplates: () => projectTemplates,
        setProjectTemplates: (t) => { projectTemplates = t; }
    };
}
