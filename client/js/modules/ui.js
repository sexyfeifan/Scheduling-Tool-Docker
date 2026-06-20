/**
 * UI 工具函数模块
 * 包含：XSS 转义、Toast 提示、Loading 遮罩、认证错误检测、编辑密码提示、撤销按钮、输入框切换
 */
export function createUiModule(ctx) {
    const { getAdminPassword, setAdminPassword, getEditPassword, undoManager } = ctx;

    // XSS 安全：转义 HTML 特殊字符
    function escapeHtml(str) {
        const s = String(str == null ? '' : str);
        const map = { '&': '\u0026amp;', '<': '\u0026lt;', '>': '\u0026gt;', '"': '\u0026quot;', "'": '\u0026#39;' };
        return s.replace(/[&<>"']/g, (ch) => map[ch]);
    }

    // Toast 提示函数
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // 自动消失
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // Loading 显示/隐藏
    function showLoading(text = '加载中...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = overlay.querySelector('.loading-text');
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }

    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }

    function isAuthError(error, keyword = '编辑密码') {
        return error && (error.status === 401 || String(error.message || '').includes(keyword));
    }

    async function promptForEditPassword() {
        const password = window.prompt('该操作已启用编辑密码，请输入后继续：', '');
        if (!password) {
            return false;
        }

        setAdminPassword(password);
        showToast('已临时解锁编辑操作', 'success');
        return true;
    }

    async function withEditAccess(task) {
        try {
            return await task();
        } catch (error) {
            if (isAuthError(error) && await promptForEditPassword()) {
                return task();
            }
            throw error;
        }
    }

    function updateUndoButton() {
        const undoActionBtn = document.getElementById('undo-action');
        undoActionBtn.disabled = !undoManager.canUndo();
    }

    // 切换输入框显示
    function toggleInput(selectElement, inputElement) {
        if (selectElement.style.display !== 'none') {
            selectElement.style.display = 'none';
            inputElement.style.display = 'block';
            inputElement.focus();
        } else {
            selectElement.style.display = 'block';
            inputElement.style.display = 'none';
        }
    }

    return { escapeHtml, showToast, showLoading, hideLoading, isAuthError, promptForEditPassword, withEditAccess, updateUndoButton, toggleInput };
}
