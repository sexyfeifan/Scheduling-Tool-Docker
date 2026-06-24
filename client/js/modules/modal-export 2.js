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
        if (typeof drawScheduleToCanvas === 'function') {
            drawScheduleToCanvas();
        }
    }

    return { showExportModal };
}
