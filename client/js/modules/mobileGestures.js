/**
 * 移动端手势增强模块
 * 左右滑动切换周，长按显示操作菜单
 */

export function createMobileGesturesModule({ onSwipeLeft, onSwipeRight, onLongPress }) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let longPressTimer = null;
  const SWIPE_THRESHOLD = 50;
  const SWIPE_MAX_Y = 80;
  const LONG_PRESS_MS = 500;

  function init() {
    const container = document.querySelector('.container');
    if (!container) return;

    // 检测是否为触屏设备
    if (!('ontouchstart' in window)) return;

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    // 添加滑动提示样式
    addSwipeIndicator();
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();

    // 长按检测
    longPressTimer = setTimeout(() => {
      if (onLongPress) {
        onLongPress(touch.clientX, touch.clientY);
      }
      // 震动反馈
      if (navigator.vibrate) navigator.vibrate(50);
    }, LONG_PRESS_MS);
  }

  function onTouchMove(e) {
    // 移动超过阈值则取消长按
    if (longPressTimer && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }

  function onTouchEnd(e) {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    if (e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;

    // 快速滑动判定（< 300ms，水平距离 > 阈值，垂直距离 < 阈值）
    if (elapsed < 300 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_MAX_Y) {
      if (dx < 0) {
        // 左滑 → 下一周
        showSwipeIndicator('left');
        if (onSwipeLeft) onSwipeLeft();
      } else {
        // 右滑 → 上一周
        showSwipeIndicator('right');
        if (onSwipeRight) onSwipeRight();
      }
      // 震动反馈
      if (navigator.vibrate) navigator.vibrate(30);
    }
  }

  function addSwipeIndicator() {
    if (document.getElementById('swipe-indicator')) return;
    const indicator = document.createElement('div');
    indicator.id = 'swipe-indicator';
    indicator.style.cssText = `
      position: fixed; top: 50%; transform: translateY(-50%);
      padding: 12px 20px; border-radius: 20px;
      background: rgba(0,0,0,0.7); color: #fff;
      font-size: 14px; z-index: 9999;
      opacity: 0; transition: opacity 0.2s;
      pointer-events: none;
    `;
    document.body.appendChild(indicator);
  }

  function showSwipeIndicator(direction) {
    const indicator = document.getElementById('swipe-indicator');
    if (!indicator) return;

    indicator.textContent = direction === 'left' ? '◀ 下一周' : '上一周 ▶';
    indicator.style.left = direction === 'left' ? '20px' : 'auto';
    indicator.style.right = direction === 'right' ? '20px' : 'auto';
    indicator.style.opacity = '1';

    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 500);
  }

  return { init };
}
