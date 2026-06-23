/**
 * schedule-notice.js — 通告弹窗
 * 包含：showNoticeModal, sortDayProjects
 */
export function createScheduleNoticeModule(ctx) {
    const {
        getScheduleData, setScheduleData, getRoleCategories,
        showToast, escapeHtml,
        cloneScheduleState, persistScheduleDate, pushUndoSnapshot,
        renderSchedule,
    } = ctx;

    async function sortDayProjects(dateStr) {
        const scheduleData = getScheduleData();
        const projects = scheduleData[dateStr] || [];
        if (projects.length <= 1) return;

        function toMinutes(timeStr) {
            if (!timeStr) return 24 * 60;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        }

        const prevDate = new Date(dateStr + 'T00:00:00');
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().slice(0, 10);
        const prevProjects = scheduleData[prevDateStr] || [];
        const prevNames = new Set(prevProjects.map(p => p.name));

        const sorted = [...projects].sort((a, b) => {
            const ta = toMinutes(a.startTime);
            const tb = toMinutes(b.startTime);
            if (ta !== tb) return ta - tb;
            const inPrevA = prevNames.has(a.name) ? 0 : 1;
            const inPrevB = prevNames.has(b.name) ? 0 : 1;
            return inPrevA - inPrevB;
        });

        const beforeState = cloneScheduleState();
        setScheduleData({ ...scheduleData, [dateStr]: sorted });
        try {
            await persistScheduleDate(dateStr);
            pushUndoSnapshot('一键排序', beforeState, getScheduleData());
            renderSchedule();
            showToast('排序完成', 'success');
        } catch (err) {
            console.error('排序保存失败:', err);
            setScheduleData(beforeState);
            showToast('排序保存失败', 'error');
        }
    }

    function showNoticeModal(dateStr) {
        const modal = document.getElementById('notice-modal');
        if (!modal) return;
        const roleCategories = getRoleCategories();
        const scheduleData = getScheduleData();

        const date = new Date(dateStr + 'T00:00:00');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;

        document.getElementById('notice-header-info').innerHTML = `<strong>${dateLabel}</strong> 共 ${(scheduleData[dateStr] || []).length} 个项目`;

        const projects = scheduleData[dateStr] || [];
        const body = document.getElementById('notice-body');

        if (projects.length === 0) {
            body.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px 0">当日暂无项目</p>';
        } else {
            body.innerHTML = projects.map((p, i) => {
                const meta = [
                    p.startTime ? `⏰ ${escapeHtml(p.startTime)}` : '',
                    p.location ? `📍 ${escapeHtml(p.location)}` : ''
                ];
                const cats = (roleCategories || []).filter(c => c.key !== 'location');
                cats.forEach(cat => {
                    const val = p[cat.key] || (p.customFields && p.customFields[cat.key]);
                    if (val) meta.push(`${escapeHtml(cat.label)}: ${escapeHtml(val)}`);
                });
                if (p.type) meta.push(`类型: ${escapeHtml(p.type)}`);
                if (p.isAdvertiser && p.advertiserNo) meta.push(`商单 #${escapeHtml(p.advertiserNo)}`);
                const metaFiltered = meta.filter(Boolean);
                return `<div class="notice-project-row">
                    <div class="notice-index">${i + 1}</div>
                    <div class="notice-project-info">
                        <div class="notice-project-name">${escapeHtml(p.name)}</div>
                        <div class="notice-project-meta">${metaFiltered.map(m => `<span>${m}</span>`).join('')}</div>
                    </div>
                </div>`;
            }).join('');
        }

        const copyBtn = document.getElementById('notice-copy-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const text = body.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    showToast('已复制到剪贴板', 'success');
                }).catch(() => {
                    showToast('复制失败', 'error');
                });
            };
        }

        modal.style.display = 'block';
    }

    return { showNoticeModal, sortDayProjects };
}
