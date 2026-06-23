/**
 * schedule-card.js — 项目卡片
 * 包含：createProjectCard
 */
export function createScheduleCardModule(ctx) {
    function createProjectCard(project, dateStr, projectIndex) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.draggable = true;
        card.dataset.date = dateStr;
        card.dataset.index = projectIndex;

        const typeClass = (project.type || '').toLowerCase().replace(/\s+/g, '-');
        if (typeClass) card.classList.add(`type-${typeClass}`);

        const roleCategories = ctx.getRoleCategories();
        const otherCats = roleCategories.filter(c => c.key !== 'location');

        let metaHtml = '';
        if (project.startTime) {
            metaHtml += `<span class="project-meta">⏰ ${ctx.escapeHtml(project.startTime)}</span>`;
        }
        if (project.location) {
            metaHtml += `<span class="project-meta">📍 ${ctx.escapeHtml(project.location)}</span>`;
        }
        otherCats.forEach(cat => {
            const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
            if (val) {
                metaHtml += `<span class="project-meta">${ctx.escapeHtml(cat.label)}: ${ctx.escapeHtml(val)}</span>`;
            }
        });
        if (project.isAdvertiser && project.advertiserNo) {
            metaHtml += `<span class="project-advertiser-no">商单 #${ctx.escapeHtml(project.advertiserNo)}</span>`;
        }

        card.innerHTML = `
            <div class="project-card-header">
                <span class="project-name">${ctx.escapeHtml(project.name || '')}</span>
                <span class="project-type-badge ${typeClass}">${ctx.escapeHtml(project.type || '')}</span>
            </div>
            <div class="project-card-meta">${metaHtml}</div>
            <div class="project-card-actions">
                <button class="edit-btn" data-date="${dateStr}" data-index="${projectIndex}" title="编辑">✏️</button>
                <button class="copy-btn" data-date="${dateStr}" data-index="${projectIndex}" title="复制">📋</button>
                <button class="delete-btn" data-date="${dateStr}" data-index="${projectIndex}" title="删除">🗑</button>
            </div>
            ${project.laodao ? '<span class="laodao-badge">老刀出镜</span>' : ''}
        `;

        card.addEventListener('dragstart', (e) => ctx.handleDragStart && ctx.handleDragStart(e));
        card.addEventListener('dragend', (e) => ctx.handleDragEnd && ctx.handleDragEnd(e));

        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            ctx.editProject && ctx.editProject(dateStr, projectIndex);
        });

        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            ctx.showCopyModal && ctx.showCopyModal(dateStr, projectIndex);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            ctx.deleteProject && ctx.deleteProject(dateStr, projectIndex);
        });

        return card;
    }

    return { createProjectCard };
}
