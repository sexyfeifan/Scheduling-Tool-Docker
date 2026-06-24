/**
 * 视图切换器模块
 * 管理周视图（主视图）与辅助视图（月/人员/看板）之间的切换
 */

const VIEW_CONFIG = {
  week: { panelId: 'week-view', btnSelector: '[data-view="week"]' },
  month: { panelId: 'month-view', btnSelector: '[data-view="month"]' },
  personnel: { panelId: 'personnel-view', btnSelector: '[data-view="personnel"]' },
  dashboard: { panelId: 'dashboard-view', btnSelector: '[data-view="dashboard"]' }
};

let currentView = 'week';
let viewInitialized = { month: false, personnel: false, dashboard: false };

/**
 * 初始化视图切换器
 */
function initViewSwitcher() {
  const switcher = document.getElementById('view-switcher');
  if (!switcher) return;

  const buttons = switcher.querySelectorAll('.view-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      if (targetView && targetView !== currentView) {
        switchView(targetView);
      }
    });
  });
}

/**
 * 切换到指定视图
 * @param {string} viewName - 'week' | 'month' | 'personnel' | 'dashboard'
 */
function switchView(viewName) {
  if (!VIEW_CONFIG[viewName]) return;

  // 隐藏当前视图
  const currentPanel = document.getElementById(VIEW_CONFIG[currentView].panelId);
  if (currentPanel) {
    currentPanel.style.display = 'none';
    currentPanel.classList.remove('active');
  }

  // 移除当前按钮激活状态
  const currentBtn = document.querySelector(VIEW_CONFIG[currentView].btnSelector);
  if (currentBtn) currentBtn.classList.remove('active');

  // 显示目标视图
  const targetPanel = document.getElementById(VIEW_CONFIG[viewName].panelId);
  if (targetPanel) {
    targetPanel.style.display = 'block';
    targetPanel.classList.add('active');
  }

  // 激活目标按钮
  const targetBtn = document.querySelector(VIEW_CONFIG[viewName].btnSelector);
  if (targetBtn) targetBtn.classList.add('active');

  const previousView = currentView;
  currentView = viewName;

  // 触发视图切换事件，供各视图模块监听
  const event = new CustomEvent('viewChanged', {
    detail: { from: previousView, to: viewName }
  });
  document.dispatchEvent(event);

  // 标记视图是否已初始化
  if (!viewInitialized[viewName] && viewName !== 'week') {
    viewInitialized[viewName] = true;
    // 触发首次初始化事件
    const initEvent = new CustomEvent('viewInit', {
      detail: { view: viewName }
    });
    document.dispatchEvent(initEvent);
  }
}

/**
 * 获取当前激活的视图名称
 */
function getCurrentView() {
  return currentView;
}

/**
 * 检查某个视图是否已初始化
 */
function isViewInitialized(viewName) {
  return viewInitialized[viewName] || false;
}

export {
  initViewSwitcher,
  switchView,
  getCurrentView,
  isViewInitialized
};
