/**
 * modal-backup.js — 备份模态框
 * 包含：renderBackupListFromData, loadBackupList
 */

export function createModalBackupModule(ctx) {
    const {
        backupAPI,
        showToast, showLoading, hideLoading, escapeHtml,
        loadScheduleData,
        openBackupPreview,
    } = ctx;

    // ── DOM 引用 ──
    const backupPreviewModal = document.getElementById('backup-preview-modal');
    const backupPreviewBody = document.getElementById('backup-preview-body');

    // ─────────────────────────────────────────────────────────
    // renderBackupListFromData
    // ─────────────────────────────────────────────────────────
    function renderBackupListFromData(backups) {
        const backupList = document.getElementById('backup-list');
        if (!backupList) return;

        if (!backups || backups.length === 0) {
            backupList.innerHTML = '<p class="no-backup">暂无备份记录</p>';
            return;
        }

        backupList.innerHTML = '';
        backups.slice(0, 10).forEach(backup => {
            const nameMatch = (backup.name || '').match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
            const displayDate = nameMatch ? nameMatch[1] : backup.date;
            const displayTime = nameMatch ? nameMatch[2].replace(/-/g, ':') : new Date(backup.time).toLocaleTimeString();

            const item = document.createElement('div');
            item.className = 'backup-item';
            item.innerHTML = `
                <div class="backup-item-info">
                    <span class="backup-item-date">${escapeHtml(displayDate)}</span>
                    <span class="backup-item-time">${escapeHtml(displayTime)} · ${backup.projectsCount || 0}个项目</span>
                </div>
                <div class="backup-item-actions">
                    <button class="btn restore-backup-btn" data-path="${escapeHtml(backup.path)}">预览并恢复</button>
                    <button class="btn delete-backup-btn" data-path="${escapeHtml(backup.path)}" style="color:#e74c3c;">🗑 删除</button>
                </div>
            `;
            backupList.appendChild(item);
        });

        // 绑定恢复按钮事件
        backupList.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const backupPath = e.target.dataset.path;
                try {
                    await openBackupPreview(backupPath);
                } catch (error) {
                    console.error('预览备份失败:', error);
                    showToast(error.message || '预览备份失败', 'error');
                }
            });
        });

        // 绑定删除按钮事件
        backupList.querySelectorAll('.delete-backup-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const backupPath = e.target.dataset.path;
                const backupName = backupPath.split('/').pop() || backupPath;
                if (!confirm(`确定删除备份「${backupName}」吗？此操作不可恢复。`)) return;
                try {
                    await backupAPI.deleteBackup(backupPath);
                    showToast('备份已删除', 'success');
                    // 重新加载列表
                    await loadBackupList();
                } catch (error) {
                    console.error('删除备份失败:', error);
                    showToast(error.message || '删除备份失败', 'error');
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────
    // loadBackupList
    // ─────────────────────────────────────────────────────────
    async function loadBackupList() {
        try {
            const backups = await backupAPI.getBackups();
            renderBackupListFromData(backups);
        } catch (error) {
            console.error('加载备份列表失败:', error);
            showToast('备份列表加载失败', 'warning');
        }
    }

    return {
        renderBackupListFromData,
        loadBackupList,
    };
}
