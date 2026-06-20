/**
 * clipboard.js — 粘贴识别模块
 * 从 main.js 提取的剪贴板相关函数：
 * handlePasteRecognition, extractProjectNames, createMultipleProjects
 *
 * 使用工厂函数模式，通过 ctx 注入共享状态和依赖。
 */

import { formatDate } from './date.js';

export function createClipboardModule(ctx) {
    const {
        showToast,
        showMultiProjectDateSelectionModal,
        scheduleAPI,
        getScheduleData, setScheduleData,
        renderSchedule,
        persistScheduleDate, cloneScheduleState, pushUndoSnapshot,
    } = ctx;

    // ─────────────────────────────────────────────────────────
    // 1. handlePasteRecognition
    // ─────────────────────────────────────────────────────────
    async function handlePasteRecognition() {
        try {
            // 从剪贴板读取文本
            const clipboardText = await navigator.clipboard.readText();

            if (!clipboardText) {
                showToast('剪贴板中没有文本内容', 'warning');
                return;
            }

            // 解析文本内容，提取项目名称
            const projectNames = extractProjectNames(clipboardText);

            if (!projectNames || projectNames.length === 0) {
                showToast('未能从剪贴板内容中识别出有效的项目名称', 'warning');
                return;
            }

            // 显示确认页面，让用户选择日期
            showMultiProjectDateSelectionModal(projectNames);
        } catch (err) {
            console.error('读取剪贴板失败:', err);
            showToast('读取剪贴板失败，请确保已复制文本内容', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────
    // 2. extractProjectNames
    // ─────────────────────────────────────────────────────────
    /**
     * 从文本中提取项目名称
     * 按行分割文本，清理特殊字符，返回有效项目名称数组
     */
    function extractProjectNames(text) {
        // 升级后的多项目识别逻辑
        // 按行分割文本
        const lines = text.split('\n');
        const projectNames = [];

        // 遍历每一行，提取项目名称
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && trimmedLine.length > 0) {
                // 移除可能的标点符号和特殊字符
                const projectName = trimmedLine.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\(\)\-\_]/g, '').trim();
                if (projectName) {
                    projectNames.push(projectName);
                }
            }
        }

        return projectNames;
    }

    // ─────────────────────────────────────────────────────────
    // 3. createMultipleProjects
    // ─────────────────────────────────────────────────────────
    /**
     * 批量创建项目到指定日期
     */
    async function createMultipleProjects(projectNames, date) {
        const beforeState = cloneScheduleState();
        try {
            const dateStr = formatDate(date);
            let scheduleData = getScheduleData();

            // 如果该日期还没有项目数组，则创建一个
            if (!scheduleData[dateStr]) {
                scheduleData[dateStr] = [];
            }

            // 为每个项目名称创建项目
            const newProjects = projectNames.map(name => ({
                name: name,
                location: '',
                director: '',
                photographer: '',
                startTime: '',
                type: '平面'
            }));

            // 将新项目添加到日期的项目数组中
            scheduleData[dateStr].push(...newProjects);

            setScheduleData(scheduleData);

            // 保存到API
            await scheduleAPI.saveSchedule({
                date: dateStr,
                projects: scheduleData[dateStr]
            });

            // 重新渲染
            pushUndoSnapshot('粘贴识别创建项目', beforeState, getScheduleData());
            renderSchedule();

            showToast(`成功创建 ${projectNames.length} 个项目`, 'success');
        } catch (error) {
            console.error('创建项目时出错:', error);
            setScheduleData(beforeState);
            showToast('创建项目时出错，请重试', 'error');
        }
    }

    // ── 返回所有公开函数 ──
    return {
        handlePasteRecognition,
        extractProjectNames,
        createMultipleProjects,
    };
}
