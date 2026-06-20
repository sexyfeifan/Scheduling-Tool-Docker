/**
 * modal-export.js — 导出模态框
 * 包含：showExportModal
 */

import { getWeekDates } from './date.js';

export function createModalExportModule(ctx) {
    const {
        getCurrentMonday,
        showToast,
        drawScheduleToCanvas,
    } = ctx;

    // ── DOM 引用 ──
    const exportModal = document.getElementById('export-modal');
    const downloadImageBtn = document.getElementById('download-image');
    const openInNewTabBtn = document.getElementById('open-in-new-tab');
    const exportCrossWeekCheckbox = document.getElementById('export-cross-week');
    const exportDateRangeDiv = document.getElementById('export-date-range');
    const exportStartDateInput = document.getElementById('export-start-date');
    const exportEndDateInput = document.getElementById('export-end-date');
    const regenerateExportBtn = document.getElementById('regenerate-export');

    // ─────────────────────────────────────────────────────────
    // showExportModal
    // ─────────────────────────────────────────────────────────
    function showExportModal() {
        // 初始化日期范围
        const weekDates = getWeekDates(getCurrentMonday());
        if (exportStartDateInput) exportStartDateInput.value = weekDates[0].toISOString().split('T')[0];
        if (exportEndDateInput) exportEndDateInput.value = weekDates[6].toISOString().split('T')[0];

        // 重置跨周复选框
        if (exportCrossWeekCheckbox) exportCrossWeekCheckbox.checked = false;
        if (exportDateRangeDiv) exportDateRangeDiv.style.display = 'none';

        // 显示模态框
        exportModal.style.display = 'block';

        // 绘制排期表到canvas
        drawScheduleToCanvas();

        // 下载图片
        downloadImageBtn.onclick = function () {
            const canvas = document.querySelector('#export-canvas-container canvas');
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = `排期表_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        // 在新标签页打开
        openInNewTabBtn.onclick = function () {
            const canvas = document.querySelector('#export-canvas-container canvas');
            if (!canvas) return;

            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head><title>排期表导出</title></head>
                        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                            <img src="${canvas.toDataURL('image/png')}" style="max-width:100%;height:auto;">
                        </body>
                    </html>
                `);
            }
        };
    }

    return { showExportModal };
}
