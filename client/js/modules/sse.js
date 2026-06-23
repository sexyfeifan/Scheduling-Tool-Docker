/**
 * SSE 实时同步模块
 * 通过 Server-Sent Events 监听后端推送，实时更新排期、设置、模板等数据
 */
export function createSseModule(ctx) {
    const {
        getScheduleData, setScheduleData,
        renderSchedule, loadSettings, loadTemplateData,
        updateProjectFormOptions, showToast
    } = ctx;

    let eventSource = null;
    let heartbeatTimer = null;
    let reconnectTimer = null;
    let reconnectDelay = 1000;
    const MAX_RECONNECT_DELAY = 30000;
    const HEARTBEAT_TIMEOUT = 60000;

    function connectSSE() {
        if (eventSource) {
            eventSource.close();
        }

        eventSource = new EventSource('/events');

        eventSource.onopen = function () {
            reconnectDelay = 1000;
            resetHeartbeat();
        };

        eventSource.onmessage = function (event) {
            resetHeartbeat();
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                return;
            }

            const scheduleData = getScheduleData();

            switch (data.type) {
                case 'scheduleUpdate':
                    scheduleData[data.date] = data.projects;
                    renderSchedule();
                    break;
                case 'scheduleDelete':
                    delete scheduleData[data.date];
                    renderSchedule();
                    break;
                case 'settingsUpdate':
                    window.__currentSettings = data.settings;
                    if (typeof updateProjectFormOptions === 'function') updateProjectFormOptions();
                    break;
                case 'templateUpdate':
                    if (typeof loadTemplateData === 'function') loadTemplateData();
                    break;
                case 'restoreComplete':
                    if (typeof loadSettings === 'function') loadSettings();
                    if (typeof loadTemplateData === 'function') loadTemplateData();
                    break;
            }
        };

        eventSource.onerror = function () {
            eventSource.close();
            eventSource = null;
            clearHeartbeat();
            scheduleReconnect();
        };
    }

    function resetHeartbeat() {
        clearHeartbeat();
        heartbeatTimer = setTimeout(() => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            scheduleReconnect();
        }, HEARTBEAT_TIMEOUT);
    }

    function clearHeartbeat() {
        if (heartbeatTimer) {
            clearTimeout(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (typeof showToast === 'function') {
                showToast('实时同步断开，正在重新连接…', 'warning', 3000);
            }
            connectSSE();
        }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }

    function disconnect() {
        clearHeartbeat();
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }

    return { connectSSE, disconnect };
}
