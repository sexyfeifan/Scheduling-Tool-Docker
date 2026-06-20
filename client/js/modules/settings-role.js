/**
 * settings-role.js — 职能管理
 * 包含：renderCheckboxGroup, renderRadioGroup, getCheckedValues, setCheckedValues,
 *       getRoleOptionsKey, getRoleOptions, renderRoleSettings, renderProjectRoleFields,
 *       getProjectRoleValues, setProjectRoleValues, updateProjectFormOptions, initStartTimeOptions, toggleInput
 */
export function createSettingsRoleModule(ctx) {
    const {
        getRoleCategories, setRoleCategories, showToast,
    } = ctx;

    const roleSettingsContainer = document.getElementById('role-settings-container');
    const locationOptionsDiv = document.getElementById('project-location-options');
    const projectRoleFieldsDiv = document.getElementById('project-role-fields');
    const projectStartTimeSelect = document.getElementById('project-start-time');

    function toggleInput(selectElement, inputElement) {
        if (selectElement && inputElement) {
            inputElement.style.display = selectElement.value === 'other' ? 'block' : 'none';
        }
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

    function getCheckedValues(container) {
        if (!container) return '';
        return Array.from(container.querySelectorAll('.tag-btn.active')).map(btn => btn.dataset.value).join(', ');
    }

    function setCheckedValues(container, valueStr) {
        if (!container) return;
        const values = valueStr ? valueStr.split(', ').map(s => s.trim()).filter(Boolean) : [];
        container.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.toggle('active', values.includes(btn.dataset.value));
        });
    }

    function renderRoleSettings(settings) {
        if (!roleSettingsContainer) return;
        roleSettingsContainer.innerHTML = '';
        const cats = settings.roleCategories || [];

        cats.forEach((cat, index) => {
            const options = getRoleOptions(settings, cat);
            const item = document.createElement('div');
            item.className = 'role-setting-item';
            item.style.cssText = `display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;padding:10px;background:var(--glass-bg);border-radius:var(--radius-sm);border:1px solid var(--glass-border);`;

            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.className = 'role-label-input';
            labelInput.value = cat.label || '';
            labelInput.placeholder = '职能名称';
            labelInput.style.cssText = `flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:14px;`;

            const typeSelect = document.createElement('select');
            typeSelect.className = 'role-type-select';
            typeSelect.style.cssText = `padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:14px;`;
            typeSelect.innerHTML = `<option value="checkbox" ${cat.type === 'checkbox' ? 'selected' : ''}>多选</option><option value="radio" ${cat.type === 'radio' ? 'selected' : ''}>单选</option>`;

            const textarea = document.createElement('textarea');
            textarea.className = 'role-options-textarea';
            textarea.value = options.join('\n');
            textarea.placeholder = '每行一个选项';
            textarea.rows = 3;
            textarea.style.cssText = `flex:2;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:14px;resize:vertical;`;

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn delete-role-btn';
            deleteBtn.textContent = '🗑';
            deleteBtn.style.cssText = `padding:6px 10px;background:none;border:1px solid #e74c3c;color:#e74c3c;border-radius:4px;cursor:pointer;font-size:14px;`;
            deleteBtn.addEventListener('click', () => {
                const existingCats = getRoleCategories();
                existingCats.splice(index, 1);
                setRoleCategories(existingCats);
                settings.roleCategories = existingCats;
                renderRoleSettings(settings);
            });

            item.appendChild(labelInput);
            item.appendChild(typeSelect);
            item.appendChild(textarea);
            item.appendChild(deleteBtn);
            roleSettingsContainer.appendChild(item);
        });
    }

    function renderProjectRoleFields(settings, projectData) {
        if (!projectRoleFieldsDiv) return;
        projectRoleFieldsDiv.innerHTML = '';
        const cats = (settings.roleCategories || []).filter(c => c.key !== 'location');

        cats.forEach(cat => {
            const options = getRoleOptions(settings, cat);
            if (options.length === 0) return;

            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${escapeHtml(cat.label)}</label>`;

            const container = document.createElement('div');
            container.className = 'checkbox-group';
            container.dataset.roleKey = cat.key;

            if (cat.type === 'radio') {
                renderRadioGroup(container, options);
            } else {
                renderCheckboxGroup(container, options);
            }

            group.appendChild(container);
            projectRoleFieldsDiv.appendChild(group);
        });
    }

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

    function updateProjectFormOptions() {
        const settings = window.__currentSettings || {};
        const locations = (settings.commonLocations || []);
        renderRadioGroup(locationOptionsDiv, locations);
        renderProjectRoleFields(settings);
    }

    function initStartTimeOptions() {
        if (!projectStartTimeSelect) return;
        projectStartTimeSelect.innerHTML = '<option value="">请选择开始时间</option>';
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

    // escapeHtml 从 ctx 获取，但 renderProjectRoleFields 内部也用到了
    function escapeHtml(str) {
        const s = String(str == null ? '' : str);
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return s.replace(/[&<>"']/g, (ch) => map[ch]);
    }

    return {
        toggleInput,
        getRoleOptionsKey,
        getRoleOptions,
        renderCheckboxGroup,
        renderRadioGroup,
        getCheckedValues,
        setCheckedValues,
        renderRoleSettings,
        renderProjectRoleFields,
        getProjectRoleValues,
        setProjectRoleValues,
        updateProjectFormOptions,
        initStartTimeOptions
    };
}
