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
        const combined = [
            project.name,
            project.location,
            project.director,
            project.photographer,
            project.production,
            project.rd,
            project.operational,
            project.audio
        ].join(' ');

        if (!includesIgnoreCase(combined, filters.search)) {
            return false;
        }
    }

    if (filters.type && project.type !== filters.type) {
        return false;
    }

    if (filters.person) {
        const personText = [
            project.director,
            project.photographer,
            project.production,
            project.rd,
            project.operational,
            project.audio
        ].join(' ');

        if (!includesIgnoreCase(personText, filters.person)) {
            return false;
        }
    }

    return true;
}
