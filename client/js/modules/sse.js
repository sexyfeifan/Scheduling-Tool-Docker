/**
 * SSE 实时同步模块
 * 通过 Server-Sent Events 监听后端推送，实时更新排期、设置、模板等数据
 */
export function createSseModule(ctx) {
    const { setScheduleData, renderSchedule, loadSettings, loadTemplateData, updateProjectFormOptions } = ctx;

    // 连接SSE实现实时同步
    function connectSSE() {
        const eventSource = new EventSource('/events');

        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'scheduleUpdate':
                    // 更新本地数据
                    scheduleData[data.date] = data.projects;
                    // 重新渲染当前周的视图
                    renderSchedule();
                    break;
                case 'scheduleDelete':
                    // 从本地数据中删除
                    delete scheduleData[data.date];
                    // 重新渲染当前周的视图
                    renderSchedule();
                    break;
                case 'settingsUpdate':
                    // 更新本地设置
                    window.__currentSettings = data.settings;
                    roleCategories = data.settings.roleCategories || [];
                    renderRoleSettings(data.settings);
                    updateProjectFormOptions();
                    break;
                case 'templateUpdate':
                    projectTemplates = data.templates || [];
                    populateTemplateSelect();
                    renderTemplateList();
                    break;
                case 'restoreComplete':
                    // 备份恢复后重新拉取完整数据，避免本地状态残留
                    loadScheduleData();
                    loadSettings();
                    loadTemplateData();
                    break;
            }
        };

        eventSource.onerror = function(err) {
            console.error('SSE连接错误:', err);
            eventSource.close();
            // 自动重连，延迟 5 秒
            setTimeout(() => {
                showToast('实时同步断开，正在重新连接…', 'warning', 5000);
                connectSSE();
            }, 5000);
        };
    }

    return { connectSSE };
}
