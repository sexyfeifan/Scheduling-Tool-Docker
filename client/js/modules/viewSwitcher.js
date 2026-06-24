/**
 * 视图切换器模块
 * 管理周视图（主视图）与辅助视图（单日/月/人员）之间的切换
 */

const VIEW_CONFIG = {
  week: { panelSelector: '.schedule-container', btnId: 'view-week' },
  month: { panelId: 'month-view', btnId: 'view-month' },
  personnel: { panelId: 'personnel-view', btnId: 'view-personnel' },
  day: { panelId: 'day-view', btnId: 'view-day' }
};

let currentView = 'week';
const renderCallbacks = {};
const weekHeaderEl = document.querySelector('.week-header');

function getPanel(name, config) {
  if (config.panelId) return document.getElementById(config.panelId);
  if (config.panelSelector) return document.querySelector(config.panelSelector);
  return null;
}

/**
 * 初始化视图切换器
 * @param {Object} callbacks - { month: fn, personnel: fn, day: fn }
 */
function initViewSwitcher(callbacks = {}) {
  Object.assign(renderCallbacks, callbacks);

  Object.entries(VIEW_CONFIG).forEach(([viewName, config]) => {
    const btn = document.getElementById(config.btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        switchView(viewName);
      });
    }
  });
}

/**
 * 切换到指定视图
 * @param {string} viewName - 'week' | 'month' | 'personnel' | 'day'
 */
function switchView(viewName) {
  if (!VIEW_CONFIG[viewName] || viewName === currentView) return;

  currentView = viewName;

  Object.entries(VIEW_CONFIG).forEach(([name, config]) => {
    const panel = getPanel(name, config);
    const btn = document.getElementById(config.btnId);
    if (panel) {
      panel.style.display = name === viewName ? '' : 'none';
      panel.classList.toggle('active', name === viewName);
    }
    if (btn) {
      btn.classList.toggle('active', name === viewName);
    }
  });

  if (weekHeaderEl) {
    weekHeaderEl.style.display = viewName === 'week' ? '' : 'none';
  }

  if (renderCallbacks[viewName]) {
    renderCallbacks[viewName]();
  }
}

function getCurrentView() {
  return currentView;
}

export { initViewSwitcher, switchView, getCurrentView };
