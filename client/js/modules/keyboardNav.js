/**
 * 键盘导航模块
 * 全局快捷键 + 项目卡片键盘导航
 */

export function createKeyboardNavModule({ onNavigate, onAction }) {
  let focusIndex = -1;
  let focusableItems = [];

  function init() {
    document.addEventListener('keydown', handleGlobalKey);
  }

  function handleGlobalKey(e) {
    // 忽略输入框内的按键
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.target.isContentEditable) return;

    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+K: 聚焦搜索
    if (ctrl && key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
      return;
    }

    // Ctrl+N: 新增项目
    if (ctrl && key === 'n') {
      e.preventDefault();
      const addBtn = document.getElementById('add-project');
      if (addBtn) addBtn.click();
      return;
    }

    // Ctrl+Z: 撤销
    if (ctrl && !shift && key === 'z') {
      e.preventDefault();
      if (onAction) onAction('undo');
      return;
    }

    // Ctrl+Shift+Z: 重做
    if (ctrl && shift && key === 'z') {
      e.preventDefault();
      if (onAction) onAction('redo');
      return;
    }

    // 左右箭头: 切换周
    if (key === 'ArrowLeft' && ctrl) {
      e.preventDefault();
      if (onNavigate) onNavigate('prev-week');
      return;
    }
    if (key === 'ArrowRight' && ctrl) {
      e.preventDefault();
      if (onNavigate) onNavigate('next-week');
      return;
    }

    // T: 跳转今天
    if (key === 't' && !ctrl) {
      e.preventDefault();
      if (onNavigate) onNavigate('today');
      return;
    }

    // 数字 1-4: 切换视图
    if (['1', '2', '3', '4'].includes(key) && !ctrl) {
      e.preventDefault();
      const views = ['week', 'month', 'personnel', 'dashboard'];
      const viewIndex = parseInt(key, 10) - 1;
      if (views[viewIndex] && onNavigate) {
        onNavigate('switch-view', views[viewIndex]);
      }
      return;
    }

    // Tab / Shift+Tab: 在项目卡片间导航
    if (key === 'Tab') {
      const cards = getProjectCards();
      if (cards.length === 0) return;

      e.preventDefault();
      if (shift) {
        focusIndex = Math.max(0, focusIndex - 1);
      } else {
        focusIndex = Math.min(cards.length - 1, focusIndex + 1);
      }

      highlightCard(cards[focusIndex]);
      return;
    }

    // Enter: 激活当前聚焦的卡片
    if (key === 'Enter' && focusIndex >= 0) {
      const cards = getProjectCards();
      if (cards[focusIndex]) {
        cards[focusIndex].click();
      }
      return;
    }

    // Escape: 清除焦点
    if (key === 'Escape') {
      clearFocus();
      return;
    }
  }

  function getProjectCards() {
    focusableItems = Array.from(document.querySelectorAll('.project-card'));
    return focusableItems;
  }

  function highlightCard(card) {
    // 清除之前的高亮
    focusableItems.forEach(c => c.classList.remove('keyboard-focus'));
    if (card) {
      card.classList.add('keyboard-focus');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function clearFocus() {
    focusableItems.forEach(c => c.classList.remove('keyboard-focus'));
    focusIndex = -1;
  }

  return { init, clearFocus };
}
