export function createDefaultFilters() {
    return {
        search: '',
        type: '',
        person: ''
    };
}

function includesIgnoreCase(source, search) {
    return String(source || '').toLowerCase().includes(String(search || '').toLowerCase());
}

export function matchesProjectFilters(project, filters) {
    if (!filters) {
        return true;
    }

    if (filters.search) {
        const parts = [project.name, project.location];
        const roleKeys = ['director', 'photographer', 'production', 'rd', 'operational', 'audio', 'business'];
        roleKeys.forEach(k => { if (project[k]) parts.push(project[k]); });
        if (project.customFields) {
            for (const v of Object.values(project.customFields)) { if (v) parts.push(v); }
        }
        if (!includesIgnoreCase(parts.join(' '), filters.search)) {
            return false;
        }
    }

    if (filters.type && project.type !== filters.type) {
        return false;
    }

    if (filters.person) {
        const parts = [];
        const roleKeys = ['director', 'photographer', 'production', 'rd', 'operational', 'audio', 'business'];
        roleKeys.forEach(k => { if (project[k]) parts.push(project[k]); });
        if (project.customFields) {
            for (const v of Object.values(project.customFields)) { if (v) parts.push(v); }
        }
        if (!includesIgnoreCase(parts.join(' '), filters.person)) {
            return false;
        }
    }

    return true;
}
