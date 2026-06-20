/**
 * 离线状态指示器模块
 * 监听网络状态，显示在线/离线提示
 */

export function createOfflineIndicatorModule() {
  function init() {
    // 创建指示器
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      padding: 6px 16px; text-align: center;
      font-size: 13px; font-weight: 500;
      z-index: 10000; transition: transform 0.3s;
      transform: translateY(-100%);
    `;
    document.body.appendChild(indicator);

    // 监听网络状态
    window.addEventListener('online', () => showStatus('online'));
    window.addEventListener('offline', () => showStatus('offline'));

    // 初始状态
    if (!navigator.onLine) showStatus('offline');
  }

  function showStatus(status) {
    const indicator = document.getElementById('offline-indicator');
    if (!indicator) return;

    if (status === 'offline') {
      indicator.style.background = '#FEF3C7';
      indicator.style.color = '#92400E';
      indicator.style.borderBottom = '1px solid #FCD34D';
      indicator.textContent = '📡 当前处于离线模式，数据将在恢复连接后同步';
      indicator.style.transform = 'translateY(0)';
    } else {
      indicator.style.background = '#D1FAE5';
      indicator.style.color = '#065F46';
      indicator.style.borderBottom = '1px solid #6EE7B7';
      indicator.textContent = '✅ 网络已恢复';
      indicator.style.transform = 'translateY(0)';
      setTimeout(() => {
        indicator.style.transform = 'translateY(-100%)';
      }, 2000);
    }
  }

  return { init };
}
