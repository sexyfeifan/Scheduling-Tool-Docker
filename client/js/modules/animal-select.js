/**
 * Animal Island UI — 自定义下拉选择器
 * 将原生 <select> 替换为动森风格下拉
 */

const CHEVRON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

function createCustomSelect(nativeSelect) {
  if (nativeSelect.dataset.animalSelect) return;
  nativeSelect.dataset.animalSelect = '1';
  nativeSelect.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.className = 'animal-select-custom';

  const trigger = document.createElement('div');
  trigger.className = 'animal-select-trigger';

  const valueSpan = document.createElement('span');
  valueSpan.className = 'animal-select-value';

  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'animal-select-arrow';
  arrowSpan.innerHTML = CHEVRON_SVG;

  trigger.appendChild(valueSpan);
  trigger.appendChild(arrowSpan);

  const dropdown = document.createElement('div');
  dropdown.className = 'animal-select-dropdown';

  function getOptions() {
    return Array.from(nativeSelect.options).map(opt => ({
      value: opt.value,
      label: opt.textContent,
      disabled: opt.disabled
    }));
  }

  function getSelectedLabel() {
    const opt = nativeSelect.options[nativeSelect.selectedIndex];
    return opt ? opt.textContent : '';
  }

  function renderDropdown() {
    dropdown.innerHTML = '';
    const options = getOptions();
    options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'animal-select-option';
      if (opt.value === nativeSelect.value) item.classList.add('active');
      if (opt.disabled) item.style.opacity = '0.4';

      const pillBar = document.createElement('span');
      pillBar.className = 'pill-bar';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'animal-select-option-label';
      labelSpan.textContent = opt.label;

      item.appendChild(pillBar);
      item.appendChild(labelSpan);

      if (!opt.disabled) {
        item.addEventListener('click', () => {
          nativeSelect.value = opt.value;
          nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          updateTrigger();
          closeDropdown();
        });
      }
      dropdown.appendChild(item);
    });
  }

  function updateTrigger() {
    const label = getSelectedLabel();
    if (label) {
      valueSpan.textContent = label;
      valueSpan.className = 'animal-select-value';
    } else {
      valueSpan.textContent = nativeSelect.dataset.placeholder || '请选择';
      valueSpan.className = 'placeholder';
    }
  }

  function openDropdown() {
    renderDropdown();
    dropdown.classList.add('open');
    trigger.classList.add('open');

    const activeItem = dropdown.querySelector('.animal-select-option.active');
    if (activeItem) {
      requestAnimationFrame(() => {
        activeItem.scrollIntoView({ block: 'nearest' });
      });
    }
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    trigger.classList.remove('open');
  }

  function toggleDropdown() {
    if (dropdown.classList.contains('open')) {
      closeDropdown();
    } else {
      document.querySelectorAll('.animal-select-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.previousElementSibling?.classList.remove('open');
      });
      openDropdown();
    }
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown();
    }
  });

  const observer = new MutationObserver(() => {
    updateTrigger();
  });
  observer.observe(nativeSelect, { childList: true, subtree: true, attributes: true });

  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);
  nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);

  updateTrigger();

  return {
    update: () => { updateTrigger(); renderDropdown(); },
    destroy: () => {
      observer.disconnect();
      wrapper.remove();
      nativeSelect.style.display = '';
      delete nativeSelect.dataset.animalSelect;
    }
  };
}

function initAnimalSelects(root = document) {
  const selects = root.querySelectorAll('select:not([data-animal-select]):not([data-no-animal-select])');
  selects.forEach(sel => {
    try {
      createCustomSelect(sel);
    } catch (e) {
      // skip selects that can't be replaced
    }
  });
}

function updateAnimalSelect(selectEl) {
  const wrapper = selectEl.previousElementSibling;
  if (wrapper && wrapper.classList.contains('animal-select-custom')) {
    const valueSpan = wrapper.querySelector('.animal-select-value, .placeholder');
    const label = selectEl.options[selectEl.selectedIndex]?.textContent || '';
    if (valueSpan) {
      valueSpan.textContent = label || selectEl.dataset.placeholder || '请选择';
      valueSpan.className = label ? 'animal-select-value' : 'placeholder';
    }
  }
}

export { createCustomSelect, initAnimalSelects, updateAnimalSelect };
