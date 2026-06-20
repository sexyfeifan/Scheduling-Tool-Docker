// export.js - 导出/导入功能模块
// 包含：排期图片导出（drawScheduleToCanvas）、图片下载、新标签页预览、
// 全量数据导出/导入、排期数据标准化。
// 工厂函数 createExportModule(ctx) 接收外部依赖注入，返回所有导出函数。

import { getWeekDates, formatDate, formatMonthDay, getWeekNumber } from './date.js';

export function createExportModule(ctx) {
    const {
        getScheduleData,
        getCurrentMonday,
        scheduleAPI,
        settingAPI,
        showToast,
        showLoading,
        hideLoading,
        escapeHtml,
        loadScheduleData,
        loadSettings,
        loadTemplateData,
        updateProjectFormOptions,
        persistScheduleDate,
        pushUndoSnapshot,
        cloneScheduleState,
        renderSchedule,
        createProjectCard,
    } = ctx;

    // ── DOM 引用（模块内部自行查询） ──
    const exportCrossWeekCheckbox = document.getElementById('export-cross-week');
    const exportStartDateInput = document.getElementById('export-start-date');
    const exportEndDateInput = document.getElementById('export-end-date');
    const exportCanvas = document.getElementById('export-canvas');
    const downloadImageBtn = document.getElementById('download-image');
    const openInNewTabBtn = document.getElementById('open-in-new-tab');
    const importFileInput = document.getElementById('import-file');

    // ────────────────────────────────────────────────────────────
    // drawScheduleToCanvas - 将排期绘制到画布（使用 html2canvas）
    // ────────────────────────────────────────────────────────────
    function drawScheduleToCanvas() {
        // 确定日期范围
        let startDate, endDate;
        const isCrossWeek = exportCrossWeekCheckbox && exportCrossWeekCheckbox.checked;

        if (isCrossWeek && exportStartDateInput && exportEndDateInput && exportStartDateInput.value && exportEndDateInput.value) {
            startDate = new Date(exportStartDateInput.value + 'T00:00:00');
            endDate = new Date(exportEndDateInput.value + 'T00:00:00');
        } else {
            const weekDates = getWeekDates(getCurrentMonday());
            startDate = weekDates[0];
            endDate = weekDates[6];
        }

        // 生成所有日期
        const allDates = [];
        const d = new Date(startDate);
        while (d <= endDate) {
            allDates.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        const totalDays = allDates.length;

        // 构建标题文本
        function formatDateChinese(dt) {
            return `${dt.getMonth() + 1}月${dt.getDate()}日`;
        }
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

        let headerText;
        if (totalDays <= 7) {
            const weekNumber = getWeekNumber(startDate);
            headerText = `第${weekNumber}周通告 ${formatDateChinese(startDate)} - ${formatDateChinese(endDate)}`;
        } else {
            headerText = `通告排期 ${formatDateChinese(startDate)} - ${formatDateChinese(endDate)}`;
        }

        // 创建临时DOM
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.background = '#f5f5f7';
        tempContainer.style.fontFamily = '"Noto Sans SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif';
        tempContainer.style.padding = '24px';
        tempContainer.style.minHeight = '800px';
        tempContainer.style.fontKerning = 'none';
        tempContainer.style.textRendering = 'optimizeSpeed';
        tempContainer.style.letterSpacing = '0';
        tempContainer.style.wordSpacing = '0';

        // 根据列数计算宽度
        const cols = totalDays;
        const colWidth = Math.max(180, Math.min(240, 1680 / cols));
        const containerWidth = colWidth * cols + 48;
        tempContainer.style.width = containerWidth + 'px';

        // 头部
        const header = document.createElement('div');
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.borderRadius = '24px';
        header.style.padding = '28px 32px';
        header.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.15)';
        header.style.marginBottom = '24px';
        header.style.textAlign = 'center';
        header.style.border = '1px solid rgba(255, 255, 255, 0.3)';

        const title = document.createElement('div');
        title.textContent = '罐头场通告排期';
        title.style.fontSize = '28px';
        title.style.fontWeight = '600';
        title.style.color = '#1d1d1f';
        title.style.marginBottom = '12px';

        const weekInfoLine = document.createElement('div');
        weekInfoLine.textContent = headerText;
        weekInfoLine.style.fontWeight = '500';
        weekInfoLine.style.fontSize = '16px';
        weekInfoLine.style.color = '#6e6e73';

        header.appendChild(title);
        header.appendChild(weekInfoLine);

        // 主内容区域
        const mainContent = document.createElement('div');
        mainContent.style.background = 'rgba(255, 255, 255, 0.95)';
        mainContent.style.borderRadius = '24px';
        mainContent.style.overflow = 'hidden';
        mainContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
        mainContent.style.border = '1px solid rgba(255, 255, 255, 0.3)';

        // 星期标题行
        const weekHeader = document.createElement('div');
        weekHeader.style.display = 'grid';
        weekHeader.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        weekHeader.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        weekHeader.style.color = 'white';

        for (let i = 0; i < totalDays; i++) {
            const dayHeader = document.createElement('div');
            dayHeader.style.padding = '18px 12px';
            dayHeader.style.textAlign = 'center';
            dayHeader.style.fontWeight = '600';
            dayHeader.style.fontSize = cols > 10 ? '12px' : '14px';
            const dt = allDates[i];
            const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
            dayHeader.textContent = `${weekdays[dow]} (${dt.getMonth() + 1}/${dt.getDate()})`;
            weekHeader.appendChild(dayHeader);
        }

        // 排期容器
        const scheduleContainer = document.createElement('div');
        scheduleContainer.style.display = 'grid';
        scheduleContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        scheduleContainer.style.minHeight = '600px';
        scheduleContainer.style.background = 'rgba(255, 255, 255, 0.5)';

        for (let i = 0; i < totalDays; i++) {
            const dayColumn = document.createElement('div');
            dayColumn.style.borderRight = (i === totalDays - 1) ? 'none' : '1px solid rgba(0, 0, 0, 0.06)';
            dayColumn.style.padding = cols > 10 ? '8px' : '16px';
            dayColumn.style.minHeight = '600px';
            dayColumn.style.background = 'rgba(255, 255, 255, 0.3)';

            const dateStr = formatDate(allDates[i]);
            const scheduleData = getScheduleData();
            const projects = scheduleData[dateStr] || [];

            if (projects.length > 0) {
                projects.forEach((project, projectIndex) => {
                    const projectCard = createProjectCard(project, dateStr, projectIndex);
                    const cleanCard = projectCard.cloneNode(true);
                    const deleteBtn = cleanCard.querySelector('.delete-btn');
                    if (deleteBtn) deleteBtn.remove();
                    const copyBtn = cleanCard.querySelector('.copy-btn');
                    if (copyBtn) copyBtn.remove();
                    if (cols > 10) {
                        cleanCard.style.fontSize = '11px';
                        cleanCard.style.padding = '6px';
                    }
                    dayColumn.appendChild(cleanCard);
                });
            } else {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.style.color = '#6e6e73';
                emptyState.style.textAlign = 'center';
                emptyState.style.padding = '40px 20px';
                emptyState.style.fontSize = cols > 10 ? '24px' : '36px';
                emptyState.style.opacity = '0.6';
                emptyState.textContent = '🈚️';
                dayColumn.appendChild(emptyState);
            }

            scheduleContainer.appendChild(dayColumn);
        }

        mainContent.appendChild(weekHeader);
        mainContent.appendChild(scheduleContainer);
        tempContainer.appendChild(header);
        tempContainer.appendChild(mainContent);
        document.body.appendChild(tempContainer);

        html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#f5f5f7',
            logging: false,
            allowTaint: true
        }).then(canvas => {
            const exportCtx = exportCanvas.getContext('2d');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            exportCtx.drawImage(canvas, 0, 0);
            document.body.removeChild(tempContainer);
            downloadImageBtn.disabled = false;
            openInNewTabBtn.disabled = false;
            downloadImageBtn.textContent = '下载图片';
            openInNewTabBtn.textContent = '在新标签页打开';
        }).catch(error => {
            console.error('导出图片时出错:', error);
            if (tempContainer.parentNode) document.body.removeChild(tempContainer);
            downloadImageBtn.disabled = false;
            openInNewTabBtn.disabled = false;
            downloadImageBtn.textContent = '下载图片';
            openInNewTabBtn.textContent = '在新标签页打开';
            showToast('导出图片时出错，请重试', 'error');
        });
    }

    // ────────────────────────────────────────────────────────────
    // downloadImage - 下载画布为 PNG 图片
    // ────────────────────────────────────────────────────────────
    function downloadImage() {
        const canvas = exportCanvas;
        const link = document.createElement('a');
        link.download = '罐头场通告排期.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // ────────────────────────────────────────────────────────────
    // openImageInNewTab - 在新标签页打开画布图片
    // ────────────────────────────────────────────────────────────
    function openImageInNewTab() {
        const canvas = exportCanvas;
        try {
            // 将canvas转换为数据URL并在新标签页打开
            const dataURL = canvas.toDataURL('image/png');
            const newWindow = window.open();
            if (!newWindow) {
                showToast('浏览器拦截了弹出窗口，请允许弹窗后重试，或使用下载功能', 'warning');
                return;
            }
            newWindow.document.write(`<img src="${dataURL}" alt="罐头场通告排期" style="width:100%;height:auto;" />`);
            newWindow.document.close();
        } catch (error) {
            console.error('在新标签页打开图片时出错:', error);
            showToast('无法在新标签页打开图片，请尝试下载图片', 'warning');
        }
    }

    // ────────────────────────────────────────────────────────────
    // exportAllData - 导出所有设置和排期数据为 JSON 文件
    // ────────────────────────────────────────────────────────────
    async function exportAllData() {
        try {
            // 获取当前设置
            const settings = await settingAPI.getSettings();

            // 获取所有排期数据
            const schedules = await scheduleAPI.getSchedules();

            // 构造导出数据对象
            const exportData = {
                settings: settings,
                schedules: schedules,
                exportDate: new Date().toISOString(),
                version: '2.54'
            };

            // 创建Blob对象
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `罐头场通告排期_数据备份_${formatDate(new Date())}.json`;

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 释放URL对象
            URL.revokeObjectURL(url);

            showToast('数据导出成功！', 'success');
        } catch (error) {
            console.error('导出数据时出错:', error);
            showToast('导出数据失败：' + error.message, 'error');
        }
    }

    // ────────────────────────────────────────────────────────────
    // normalizeImportedSchedules - 标准化导入的排期数据
    // 支持数组格式 [{date, projects}] 和对象格式 {date: projects}
    // ────────────────────────────────────────────────────────────
    function normalizeImportedSchedules(rawSchedules) {
        if (Array.isArray(rawSchedules)) {
            return rawSchedules.reduce((result, schedule) => {
                if (
                    schedule &&
                    typeof schedule.date === 'string' &&
                    /^\d{4}-\d{2}-\d{2}$/.test(schedule.date) &&
                    Array.isArray(schedule.projects)
                ) {
                    result[schedule.date] = schedule.projects;
                }
                return result;
            }, {});
        }

        if (rawSchedules && typeof rawSchedules === 'object') {
            return Object.entries(rawSchedules).reduce((result, [date, projects]) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(projects)) {
                    result[date] = projects;
                }
                return result;
            }, {});
        }

        return {};
    }

    // ────────────────────────────────────────────────────────────
    // handleImportFile - 处理导入的 JSON 备份文件
    // ────────────────────────────────────────────────────────────
    async function handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件类型
        if (file.type && file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
            showToast('请选择JSON格式的备份文件', 'warning');
            return;
        }

        try {
            // 读取文件内容
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    // 解析JSON数据
                    const importData = JSON.parse(e.target.result);

                    // 确认是否导入
                    const confirmImport = confirm(`确定要导入以下数据吗？

备份日期: ${importData.exportDate || '未知'}
版本: ${importData.version || '未知'}

注意：这将覆盖当前的所有设置和排期数据！`);
                    if (!confirmImport) return;

                    const beforeState = cloneScheduleState();
                    const importedSchedules = normalizeImportedSchedules(importData.schedules);

                    // 保存设置
                    await settingAPI.saveSettings(importData.settings || {});

                    // 先清理当前排期，再写入备份，确保导入结果是完整恢复而不是叠加
                    const existingSchedules = await scheduleAPI.getSchedules();
                    for (const date of Object.keys(existingSchedules)) {
                        try {
                            await scheduleAPI.deleteSchedule(date);
                        } catch (error) {
                            if (!/404|未找到/.test(error.message || '')) {
                                throw error;
                            }
                        }
                    }

                    // 保存排期数据
                    for (const [date, projects] of Object.entries(importedSchedules)) {
                        await scheduleAPI.saveSchedule({
                            date,
                            projects
                        });
                    }

                    // 重新加载数据
                    await loadScheduleData();
                    await loadSettings();
                    await loadTemplateData();

                    // 更新项目表单选项
                    updateProjectFormOptions();
                    pushUndoSnapshot('导入备份文件', beforeState, getScheduleData());

                    showToast('数据导入成功！', 'success');

                    // 清空文件输入
                    importFileInput.value = '';
                } catch (error) {
                    console.error('解析导入数据时出错:', error);
                    showToast('导入数据失败：' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('读取文件时出错:', error);
            showToast('读取文件失败：' + error.message, 'error');
        }
    }

    // ── CSV 导出 ──
    function exportCSV() {
        const data = getScheduleData();
        const rows = [['日期', '项目名称', '类型', '场地', '导演', '摄影师', '制片', '开始时间', '状态']];

        Object.keys(data).sort().forEach(date => {
            (data[date] || []).forEach(p => {
                rows.push([
                    date,
                    p.name || '',
                    p.type || '',
                    p.location || '',
                    (Array.isArray(p.director) ? p.director.join('/') : p.director || ''),
                    (Array.isArray(p.photographer) ? p.photographer.join('/') : p.photographer || ''),
                    (Array.isArray(p.production) ? p.production.join('/') : p.production || ''),
                    p.startTime || '',
                    p.status || ''
                ]);
            });
        });

        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `排期数据_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV 导出成功', 'success');
    }

    return {
        drawScheduleToCanvas,
        downloadImage,
        openImageInNewTab,
        exportAllData,
        normalizeImportedSchedules,
        handleImportFile,
        exportCSV,
    };
}
