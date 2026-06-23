function buildDropdownOptions(nativeSelect, dropdown, trigger) {
    dropdown.innerHTML = '';
    Array.from(nativeSelect.options).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'animal-select-option' + (opt.value === nativeSelect.value ? ' active' : '');
        div.dataset.value = opt.value;
        div.innerHTML = `<span class="pill-bar"></span>${opt.textContent}`;
        div.addEventListener('click', () => {
            nativeSelect.value = opt.value;
            updateTriggerText(nativeSelect, trigger);
            dropdown.classList.remove('open');
            trigger.classList.remove('open');
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
        dropdown.appendChild(div);
    });
}

function updateTriggerText(nativeSelect, trigger) {
    const selected = nativeSelect.options[nativeSelect.selectedIndex];
    let valueSpan = trigger.querySelector('.value');
    if (selected && selected.value) {
        if (!valueSpan) {
            valueSpan = document.createElement('span');
            valueSpan.className = 'value';
            trigger.insertBefore(valueSpan, trigger.firstChild);
        }
        valueSpan.textContent = selected.textContent;
        valueSpan.style.display = '';
    } else if (valueSpan) {
        valueSpan.textContent = selected ? selected.textContent : '';
    }
}

function initSingleCustomSelect(wrapper) {
    const nativeSelect = wrapper.querySelector('select');
    const trigger = wrapper.querySelector('.animal-select-trigger');
    const dropdown = wrapper.querySelector('.animal-select-dropdown');
    if (!nativeSelect || !trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.animal-select-dropdown.open').forEach(d => {
            d.classList.remove('open');
            d.parentElement.querySelector('.animal-select-trigger')?.classList.remove('open');
        });
        if (!isOpen) {
            buildDropdownOptions(nativeSelect, dropdown, trigger);
            dropdown.classList.add('open');
            trigger.classList.add('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
            trigger.classList.remove('open');
        }
    });

    buildDropdownOptions(nativeSelect, dropdown, trigger);
    updateTriggerText(nativeSelect, trigger);
}

export function initCustomSelects() {
    document.querySelectorAll('select.animal-select').forEach(select => {
        let wrapper = select.closest('.animal-select-wrapper');

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'animal-select-wrapper animal-select-custom';
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
        } else if (!wrapper.classList.contains('animal-select-custom')) {
            wrapper.classList.add('animal-select-custom');
        }

        if (wrapper._customSelectInit) return;
        wrapper._customSelectInit = true;

        select.style.display = 'none';

        if (!wrapper.querySelector('.animal-select-trigger')) {
            const trigger = document.createElement('div');
            trigger.className = 'animal-select-trigger';
            trigger.innerHTML = '<span class="value"></span><span class="arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
            wrapper.appendChild(trigger);
        }

        if (!wrapper.querySelector('.animal-select-dropdown')) {
            const dropdown = document.createElement('div');
            dropdown.className = 'animal-select-dropdown';
            wrapper.appendChild(dropdown);
        }

        initSingleCustomSelect(wrapper);
    });
}

export function initSwitches() {
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
}
