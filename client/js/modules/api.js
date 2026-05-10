function buildHeaders(baseHeaders, extraHeaders) {
    return {
        ...baseHeaders,
        ...extraHeaders
    };
}

export function createApiClient({
    baseUrl = '/api',
    getAdminPassword,
    getEditPassword
}) {
    async function request(path, options = {}) {
        const method = options.method || 'GET';
        const headers = buildHeaders({
            'Content-Type': 'application/json'
        }, options.headers || {});

        const isAdminRequest = Boolean(options.admin);
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

        if (isAdminRequest && getAdminPassword && getAdminPassword()) {
            headers['x-admin-password'] = getAdminPassword();
        }

        if (isMutation && getEditPassword && getEditPassword()) {
            headers['x-edit-password'] = getEditPassword();
        }

        const response = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            let errorPayload = {};
            try {
                errorPayload = await response.json();
            } catch (error) {
                errorPayload = { message: response.statusText || '请求失败' };
            }

            const apiError = new Error(errorPayload.message || '请求失败');
            apiError.status = response.status;
            throw apiError;
        }

        const responseType = response.headers.get('content-type') || '';
        if (responseType.includes('application/json')) {
            return response.json();
        }

        return response.text();
    }

    return {
        health: () => request('/health'),
        version: () => request('/version'),
        getSchedules: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/schedules${query ? `?${query}` : ''}`);
        },
        saveSchedule: (payload) => request('/schedules', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        deleteSchedule: (date) => request(`/schedules/${date}`, {
            method: 'DELETE'
        }),
        getSettings: () => request('/settings'),
        saveSettings: (payload) => request('/settings', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        getTemplates: () => request('/settings/templates'),
        saveTemplate: (payload) => request('/settings/templates', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        deleteTemplate: (templateId) => request(`/settings/templates/${templateId}`, {
            method: 'DELETE'
        }),
        verifyAdminPassword: (password) => request('/verify-password', {
            method: 'POST',
            body: JSON.stringify({ password })
        }),
        createBackup: () => request('/backup', {
            method: 'POST'
        }),
        getBackups: () => request('/backups', {
            admin: true
        }),
        deleteBackup: (backupPath) => request('/backups', {
            method: 'DELETE',
            admin: true,
            body: JSON.stringify({ backupPath })
        }),
        restoreBackup: (backupPath) => request('/restore', {
            method: 'POST',
            body: JSON.stringify({ backupPath })
        }),
        getAccessSettings: () => request('/settings/access', {
            admin: true
        }),
        saveAccessSettings: (payload) => request('/settings/access', {
            method: 'POST',
            admin: true,
            body: JSON.stringify(payload)
        }),
        getHistory: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/history${query ? `?${query}` : ''}`, { admin: true });
        },
        clearHistory: () => request('/history', { method: 'DELETE', admin: true }),
        // Webhook
        testWebhook: () => request('/webhook/test', { method: 'POST', admin: true }),
        pushDailyNotice: (date) => request('/webhook/push/daily', { method: 'POST', admin: true, body: JSON.stringify({ date }) }),
        pushWeeklyNotice: (startDate, endDate) => request('/webhook/push/weekly', { method: 'POST', admin: true, body: JSON.stringify({ startDate, endDate }) }),
        getWebhookTemplates: () => request('/webhook/templates', { admin: true }),
        fetchBackupPayload: async (backupPath) => {
            const adminPassword = getAdminPassword ? getAdminPassword() : '';
            const response = await fetch(backupPath, {
                headers: adminPassword ? { 'x-admin-password': adminPassword } : {}
            });
            if (!response.ok) {
                throw new Error('读取备份预览失败');
            }
            return response.json();
        }
    };
}
