/**
 * 排期模块
 * 包含：持久化、克隆、同步、撤销、渲染、项目卡片、加载/删除、排序、通告单、复制、操作记录
 */
import { getWeekDates, formatDate, formatMonthDay, getWeekNumber } from './date.js';
import { createDefaultFilters, matchesProjectFilters } from './filters.js';

export function createScheduleModule(ctx) {
    const {
        getScheduleData, setScheduleData, getCurrentMonday, getRoleCategories,
        getFilterState, apiClient, scheduleAPI, undoManager,
        showToast, showLoading, hideLoading, escapeHtml,
        updateUndoButton, withEditAccess,
        editProject, handleDragOver, handleDragEnter, handleDragLeave,
        handleDrop, handleDragStart, handleDragEnd, showProjectModal
    } = ctx;

    // ── 本地可变引用 ──
    let scheduleData = getScheduleData();

    // ── 辅助函数（也被 ctx 引用） ──

    async function persistScheduleDate(dateStr) {
        const projects = scheduleData[dateStr] || [];
        if (projects.length === 0) {
            try {
                await withEditAccess(() => apiClient.deleteSchedule(dateStr));
            } catch (error) {
                // 如果后端该日期已不存在（404），视为成功
                if (!/404|未找到/.test(error.message || '')) {
                    await withEditAccess(() => apiClient.saveSchedule({
                        date: dateStr,
                        projects: []
                    }));
                }
            }
            return;
        }

        await withEditAccess(() => apiClient.saveSchedule({
            date: dateStr,
            projects
        }));
    }

    function cloneScheduleState() {
        return JSON.parse(JSON.stringify(scheduleData));
    }

    function collectDatesFromStates(...states) {
        return [...new Set(states.flatMap((state) => Object.keys(state || {})))];
    }

    async function syncScheduleDates(dateList) {
        const uniqueDates = [...new Set((dateList || []).filter(Boolean))];
        for (const date of uniqueDates) {
            await persistScheduleDate(date);
        }
    }

    function pushUndoSnapshot(label, beforeState, afterState) {
        undoManager.push({
            label,
            before: beforeState,
            after: afterState
        });
        updateUndoButton();
    }

    async function undoLastChange() {
        const snapshot = undoManager.pop();
        updateUndoButton();
        if (!snapshot) {
            return;
        }

        scheduleData = JSON.parse(JSON.stringify(snapshot.before));
        setScheduleData(scheduleData);
        await syncScheduleDates(collectDatesFromStates(snapshot.before, snapshot.after));
        renderSchedule();
        showToast(`已撤销：${snapshot.label}`, 'success');
    }

    // ── 渲染排期视图 ──

    function renderSchedule() {
        const weekDates = getWeekDates(getCurrentMonday());
        const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
        const filterState = getFilterState();
        const roleCategories = getRoleCategories();
    
        // 获取今天的日期用于高亮
        const today = new Date();
        const todayStr = formatDate(today);
    
        // 更新星期标题，显示准确日期
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        dayHeaders.forEach((headerId, index) => {
            const header = document.getElementById(headerId);
            const date = weekDates[index];
            const dateStr = formatDate(date);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            header.innerHTML = `${weekdays[index]} (${month}/${day}) <button class="notice-day-btn" data-date="${dateStr}">通告单</button><button class="sort-day-btn" data-date="${dateStr}" title="按开始时间一键排序">⇅ 排序</button>`;

            // 今日高亮
            if (dateStr === todayStr) {
                header.classList.add('today-highlight');
            } else {
                header.classList.remove('today-highlight');
            }
        });
    
        dayColumns.forEach((columnId, index) => {
            const column = document.getElementById(columnId);
            const dateStr = formatDate(weekDates[index]);
        
            // 今日高亮列
            if (dateStr === todayStr) {
                column.classList.add('today-highlight');
            } else {
                column.classList.remove('today-highlight');
            }
        
            // 清空现有内容
            column.innerHTML = '';
        
            // 添加快速添加按钮
            const addBtn = document.createElement('button');
            addBtn.className = 'add-btn';
            addBtn.innerHTML = '+';
            addBtn.title = '点击添加项目';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showProjectModal(dateStr);
            });
            column.appendChild(addBtn);
        
            // 添加拖拽事件监听器
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('dragenter', handleDragEnter);
            column.addEventListener('dragleave', handleDragLeave);
            column.addEventListener('drop', handleDrop);
        
            const dayProjects = (scheduleData[dateStr] || []).filter((project) => matchesProjectFilters(project, filterState));

            // 如果有该项目日期的数据，则渲染项目卡片
            if (dayProjects.length > 0) {
                dayProjects.forEach((project) => {
                    const originalIndex = (scheduleData[dateStr] || []).indexOf(project);
                    const projectCard = createProjectCard(project, dateStr, originalIndex);
                    column.appendChild(projectCard);
                });
            } else {
                // 显示空状态
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.textContent = (scheduleData[dateStr] && scheduleData[dateStr].length > 0) ? '未匹配筛选条件' : '🈚️';
                column.appendChild(emptyState);
            }
        });
    }

    // ── 创建项目卡片 ──

    function createProjectCard(project, dateStr, projectIndex) {
        const card = document.createElement('div');
        card.className = `project-card`;
        // 添加拖拽功能
        card.draggable = true;
        card.dataset.date = dateStr;
        card.dataset.index = projectIndex;
        const roleCategories = getRoleCategories();
    
        const typeClassMap = {
            '平面': 'plane',
            '视频': 'video',
            '直播': 'live',
            '试做': 'test'
        };
    
        const typeClass = typeClassMap[project.type] || 'plane';
    
        // 构建工作人员信息（动态）
        const cats = (roleCategories || []).filter(c => c.key !== 'location');
        let staffInfo = '';
        const hasStartTime = project.startTime;
        const hasAnyRole = hasStartTime || cats.some(cat => {
            const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
            return val;
        });

        if (hasAnyRole) {
            staffInfo = '<div class="staff-info">';
            if (hasStartTime) {
                staffInfo += `<span class="staff-role start-time">⏰ ${escapeHtml(project.startTime)}</span>`;
            }
            cats.forEach(cat => {
                const val = project[cat.key] || (project.customFields && project.customFields[cat.key]);
                if (val) {
                    staffInfo += `<span class="staff-role ${escapeHtml(cat.key)}">${escapeHtml(cat.label)}：${escapeHtml(val)}</span>`;
                }
            });
            staffInfo += '</div>';
        }
    
        // 添加老刀出镜标记
        const laodaoMark = project.laodao ? '<div class="laodao-mark">老刀出镜</div>' : '';

        // 广告商单项目号
        const advertiserMark = (project.isAdvertiser && project.advertiserNo)
            ? `<div class="advertiser-no">商单 #${escapeHtml(project.advertiserNo)}</div>` : '';

        // 状态标签
        const statusClassMap = { '待确认': 'pending', '已确认': 'confirmed', '已完成': 'done', '取消': 'cancelled' };
        const statusClass = statusClassMap[project.status] || 'pending';
        const statusBadge = `<span class="status-badge status-${statusClass}">${project.status || '待确认'}</span>`;
    
        card.innerHTML = `
            <div class="project-title">
                <span>${escapeHtml(project.name)}</span>
                <button class="delete-btn" data-date="${escapeHtml(dateStr)}" data-index="${projectIndex}">×</button>
            </div>
            ${laodaoMark}
            ${advertiserMark}
            ${statusBadge}
            ${staffInfo}
            <div class="project-location">📍 ${escapeHtml(project.location)}</div>
            <div>
                <span class="project-type ${typeClass}">${escapeHtml(project.type)}</span>
            </div>
            <div class="card-actions">
                <button class="copy-btn" data-date="${escapeHtml(dateStr)}" data-index="${projectIndex}">📋 复制</button>
            </div>
        `;
    
        // 添加点击事件
        card.addEventListener('click', (e) => {
            // 如果点击的是删除按钮或复制按钮，则不触发编辑
            if (e.target.classList.contains('delete-btn') || e.target.classList.contains('copy-btn')) {
                return;
            }
            editProject(dateStr, projectIndex);
        });
    
        // 添加拖拽事件
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    
        // 添加删除按钮事件
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(dateStr, projectIndex);
        });
    
        // 添加复制按钮事件 - 调用新的多日期复制模态框
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showCopyModal(dateStr, projectIndex);
        });
    
        return card;
    }

    // ── 加载排期数据 ──

    async function loadScheduleData() {
        try {
            // 从API获取所有数据（不传递日期范围参数）
            scheduleData = await scheduleAPI.getSchedules();
            setScheduleData(scheduleData);
                
            renderSchedule();
        } catch (error) {
            console.error('加载排期数据时出错:', error);
            // 使用空对象作为默认值
            scheduleData = {};
            setScheduleData(scheduleData);
            renderSchedule();
        }
    }

    // ── 删除项目（带确认对话框） ──

    async function deleteProject(dateStr, projectIndex) {
        const project = scheduleData[dateStr][projectIndex];
        const projectName = project ? project.name : '该项目';
    
        // 创建自定义确认对话框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            align-items: center;
            justify-content: center;
        `;
    
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background-color: white;
            padding: 25px;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        `;
    
        modalContent.innerHTML = `
            <h3 style="margin-top: 0; color: #e74c3c;">确认删除</h3>
            <p style="color: #666; margin: 20px 0;">确定要删除项目 "<strong>${escapeHtml(projectName)}</strong>" 吗？</p>
            <p style="color: #999; font-size: 12px;">此操作无法撤销</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button id="confirm-delete-btn" class="btn" style="background-color: #e74c3c; color: white;">确认删除</button>
                <button id="cancel-delete-btn" class="btn" style="background-color: #95a5a6; color: white;">取消</button>
            </div>
        `;
    
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    
        // 绑定事件
        modal.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
            document.body.removeChild(modal);
            const beforeState = cloneScheduleState();
            try {
                scheduleData[dateStr].splice(projectIndex, 1);
                if (scheduleData[dateStr].length === 0) {
                    delete scheduleData[dateStr];
                }
            
                await persistScheduleDate(dateStr);
            
                pushUndoSnapshot('删除项目', beforeState, scheduleData);
                renderSchedule();
                showToast('项目已删除', 'success');
            } catch (error) {
                console.error('删除项目时出错:', error);
                scheduleData = beforeState;
                showToast(error.message || '删除项目时出错，请重试', 'error');
            }
        });
    
        modal.querySelector('#cancel-delete-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    
        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // ── 单日排序 ──

    async function sortDayProjects(dateStr) {
        const projects = scheduleData[dateStr];
        if (!projects || projects.length === 0) {
            showToast('当日暂无项目', 'info');
            return;
        }

        // compute previous day key
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const prevDateStr = d.toISOString().slice(0, 10);
        const prevNames = new Set((scheduleData[prevDateStr] || []).map(p => p.name));

        const toMinutes = (t) => {
            if (!t) return Infinity;
            const m = t.match(/^(\d{1,2}):(\d{2})/);
            return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : Infinity;
        };

        const sorted = [...projects].sort((a, b) => {
            const ta = toMinutes(a.startTime);
            const tb = toMinutes(b.startTime);
            if (ta !== tb) return ta - tb;
            // same time: projects that appeared in previous day come first
            const inPrevA = prevNames.has(a.name) ? 0 : 1;
            const inPrevB = prevNames.has(b.name) ? 0 : 1;
            return inPrevA - inPrevB;
        });

        const beforeState = cloneScheduleState();
        scheduleData[dateStr] = sorted;
        try {
            await persistScheduleDate(dateStr);
            pushUndoSnapshot('一键排序', beforeState, scheduleData);
            renderSchedule();
            showToast('排序完成', 'success');
        } catch (err) {
            console.error('排序保存失败:', err);
            showToast('排序保存失败', 'error');
        }
    }

    // ── 通告单模态框 ──

    function showNoticeModal(dateStr) {
        const modal = document.getElementById('notice-modal');
        if (!modal) return;
        const roleCategories = getRoleCategories();

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

        document.getElementById('close-notice-modal').onclick = () => { modal.style.display = 'none'; };
        document.getElementById('close-notice-action-btn').onclick = () => { modal.style.display = 'none'; };
        document.getElementById('print-notice-btn').onclick = () => { window.print(); };

        // Build an emoji-free off-screen element for reliable image capture
        const buildNoticeImageElement = () => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = [
                'background:#fff', 'padding:48px 56px', 'width:660px',
                'font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
                'position:fixed', 'top:-9999px', 'left:0', 'box-sizing:border-box'
            ].join(';');

            const rows = projects.length === 0
                ? '<p style="color:#999;text-align:center;padding:24px 0">当日暂无项目</p>'
                : projects.map((p, i) => {
                    const metaParts = [
                        p.startTime    ? `时间: ${p.startTime}`    : '',
                        p.location     ? `地点: ${p.location}`     : ''
                    ];
                    const cats = (roleCategories || []).filter(c => c.key !== 'location');
                    cats.forEach(cat => {
                        const val = p[cat.key] || (p.customFields && p.customFields[cat.key]);
                        if (val) metaParts.push(`${cat.label}: ${val}`);
                    });
                    if (p.type) metaParts.push(`类型: ${p.type}`);
                    if (p.isAdvertiser && p.advertiserNo) metaParts.push(`商单 #${p.advertiserNo}`);
                    const meta = metaParts.filter(Boolean).join('　');
                    const advStyle = (p.isAdvertiser && p.advertiserNo) ? `<div style="font-size:11px;font-style:italic;color:#5856d6;margin-top:3px;">商单 #${p.advertiserNo}</div>` : '';
                    const border = i < projects.length - 1 ? 'border-bottom:1px solid #ececec;' : '';
                    return `<div style="display:flex;gap:18px;padding:18px 0;${border}align-items:flex-start">
                        <div style="font-size:13px;font-weight:600;color:#bbb;min-width:18px;padding-top:3px">${i + 1}</div>
                        <div style="flex:1">
                            <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;line-height:1.3">${p.name}</div>
                            <div style="font-size:13px;color:#666;line-height:1.7">${meta || '—'}</div>
                            ${advStyle}
                        </div>
                    </div>`;
                }).join('');

            wrapper.innerHTML = `
                <div style="font-size:28px;font-weight:800;color:#111;margin-bottom:22px;letter-spacing:-0.5px">通告单</div>
                <div style="font-size:15px;color:#555;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #111">
                    <strong style="color:#111;font-size:16px">${dateLabel}</strong>&nbsp;&nbsp;共 ${projects.length} 个项目
                </div>
                ${rows}
            `;
            document.body.appendChild(wrapper);
            return wrapper;
        };

        const captureNotice = () => {
            const el = buildNoticeImageElement();
            return html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
                .then(canvas => { document.body.removeChild(el); return canvas; })
                .catch(err => { document.body.removeChild(el); throw err; });
        };

        document.getElementById('notice-save-image-btn').onclick = async () => {
            const btn = document.getElementById('notice-save-image-btn');
            btn.disabled = true;
            btn.textContent = '生成中…';
            try {
                const canvas = await captureNotice();
                const link = document.createElement('a');
                link.download = `通告单_${dateLabel}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                showToast('图片生成失败', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '保存为图片';
            }
        };

        document.getElementById('notice-open-image-btn').onclick = async () => {
            const btn = document.getElementById('notice-open-image-btn');
            btn.disabled = true;
            btn.textContent = '生成中…';
            try {
                const canvas = await captureNotice();
                const dataUrl = canvas.toDataURL('image/png');
                const win = window.open('', '_blank');
                win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>通告单 ${dateLabel}</title><style>body{margin:0;display:flex;justify-content:center;background:#f0f0f0;}img{max-width:100%;}</style></head><body><img src="${dataUrl}"></body></html>`);
                win.document.close();
            } catch (err) {
                showToast('图片生成失败', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '在新窗口打开';
            }
        };

        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

        modal.style.display = 'block';
    }

    // ── 复制模态框 ──

    let copyProjectData = {};

    function showCopyModal(dateStr, projectIndex) {
        copyProjectData = { date: dateStr, index: projectIndex };
        const copyModal = document.getElementById('copy-modal');
        const dateOptionsContainer = document.getElementById('copy-date-options');
    
        // 获取前后各2周的日期（共5周可选）
        const allDates = [];
        for (let i = -2; i <= 2; i++) {
            const monday = new Date(getCurrentMonday());
            monday.setDate(monday.getDate() + (i * 7));
            const weekDates = getWeekDates(monday);
            allDates.push({ weekOffset: i, dates: weekDates, monday: monday });
        }
    
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
        // 清空并生成日期选项
        dateOptionsContainer.innerHTML = '';
    
        // 按周分组显示
        allDates.forEach((weekData, weekIndex) => {
            // 添加周标签
            const weekLabel = document.createElement('div');
            weekLabel.className = 'copy-week-label';
        
            const weekNumber = getWeekNumber(weekData.monday);
            const year = weekData.monday.getFullYear();
            const startDate = formatMonthDay(weekData.dates[0]);
            const endDate = formatMonthDay(weekData.dates[6]);
        
            let labelText = '';
            if (weekData.weekOffset === 0) {
                labelText = '本周';
            } else if (weekData.weekOffset === -1) {
                labelText = '上一周';
            } else if (weekData.weekOffset === 1) {
                labelText = '下一周';
            } else {
                labelText = `${year}年第${weekNumber}周`;
            }
        
            weekLabel.innerHTML = `<span>${labelText}</span><span style="font-size:11px;color:#999;">(${startDate}-${endDate})</span>`;
            weekLabel.style.cssText = 'grid-column: 1 / -1; padding: 8px 0; font-size: 12px; color: #667eea; font-weight: 600; text-align: center; border-bottom: 1px solid #eee; margin-bottom: 8px;';
            dateOptionsContainer.appendChild(weekLabel);
        
            // 添加该周的7天选项
            weekData.dates.forEach((date, dayIndex) => {
                const dateStr = formatDate(date);
                const option = document.createElement('div');
                option.className = 'copy-date-option';
                option.dataset.date = dateStr;
                option.innerHTML = `
                    <span class="date-label">${date.getDate()}日</span>
                    <span class="day-label">${weekdays[dayIndex]}</span>
                `;
                option.addEventListener('click', () => {
                    option.classList.toggle('selected');
                });
                dateOptionsContainer.appendChild(option);
            });
        });
    
        // 绑定确认和取消按钮
        document.getElementById('confirm-copy').onclick = async () => {
            const selectedOptions = document.querySelectorAll('.copy-date-option.selected');
            if (selectedOptions.length === 0) {
                showToast('请至少选择一个目标日期', 'warning');
                return;
            }
        
            try {
                const beforeState = cloneScheduleState();
                const project = scheduleData[copyProjectData.date][copyProjectData.index];
            
                for (const option of selectedOptions) {
                    const targetDate = option.dataset.date;
                
                    if (!scheduleData[targetDate]) {
                        scheduleData[targetDate] = [];
                    }
                
                    // 创建副本项目（不添加后缀）
                    const copiedProject = {
                        ...project,
                        name: project.name
                    };
                
                    scheduleData[targetDate].push(copiedProject);
                
                    // 保存到API
                    await scheduleAPI.saveSchedule({
                        date: targetDate,
                        projects: scheduleData[targetDate]
                    });
                }
            
                pushUndoSnapshot('跨周复制项目', beforeState, scheduleData);
                renderSchedule();
                showToast(`成功复制到 ${selectedOptions.length} 个日期`, 'success');
            } catch (error) {
                console.error('复制项目时出错:', error);
                showToast(error.message || '复制项目时出错，请重试', 'error');
            }
        
            copyModal.style.display = 'none';
        };
    
        document.getElementById('cancel-copy').onclick = () => {
            copyModal.style.display = 'none';
        };
    
        document.getElementById('close-copy-modal').onclick = () => {
            copyModal.style.display = 'none';
        };
    
        // 点击遮罩关闭
        copyModal.onclick = (e) => {
            if (e.target === copyModal) {
                copyModal.style.display = 'none';
            }
        };
    
        copyModal.style.display = 'block';
    }

    // ── 操作记录 ──

    async function loadHistoryRecords() {
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">加载中...</td></tr>';

        const dateFilter = document.getElementById('history-date-filter').value;
        const params = { limit: 200 };
        if (dateFilter) params.date = dateFilter;

        try {
            const records = await apiClient.getHistory(params);

            if (!records || records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">暂无记录</td></tr>';
                return;
            }

            const actionLabels = { saveSchedule: '保存排期', deleteSchedule: '删除排期', add: '新增', edit: '编辑', delete: '删除' };
            const actionClasses = { saveSchedule: 'history-action-add', deleteSchedule: 'history-action-delete', add: 'history-action-add', edit: 'history-action-edit', delete: 'history-action-delete' };

            tbody.innerHTML = records.map(r => {
                const ts = new Date(r.ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const actionLabel = actionLabels[r.action] || r.action;
                const actionClass = actionClasses[r.action] || '';

                // 优先使用后端生成的 detail 字段
                let detail = r.detail || '';

                // 如果没有 detail，尝试从 before/after 推导
                if (!detail) {
                    if (r.before_json && r.after_json) {
                        try {
                            const before = JSON.parse(r.before_json);
                            const after = JSON.parse(r.after_json);
                            if (Array.isArray(before) && Array.isArray(after)) {
                                const beforeNames = before.map(p => p.name).filter(Boolean);
                                const afterNames = after.map(p => p.name).filter(Boolean);
                                const added = afterNames.filter(n => !beforeNames.includes(n));
                                const removed = beforeNames.filter(n => !afterNames.includes(n));
                                const parts = [];
                                if (added.length) parts.push(`新增: ${added.join(', ')}`);
                                if (removed.length) parts.push(`删除: ${removed.join(', ')}`);
                                detail = parts.join(' | ') || `更新了 ${after.length} 个项目`;
                            }
                        } catch (e) { /* ignore */ }
                    } else if (r.after_json) {
                        try {
                            const after = JSON.parse(r.after_json);
                            detail = Array.isArray(after) ? `${after.length} 个项目` : (after.name || '');
                        } catch (e) { /* ignore */ }
                    } else if (r.before_json) {
                        try {
                            const before = JSON.parse(r.before_json);
                            detail = Array.isArray(before) ? `${before.length} 个项目` : (before.name || '');
                        } catch (e) { /* ignore */ }
                    }
                }

                return `<tr>
                    <td style="white-space:nowrap;font-family:monospace;font-size:12px;">${ts}</td>
                    <td class="${actionClass}" style="white-space:nowrap;">${actionLabel}</td>
                    <td style="white-space:nowrap;">${r.date || ''}</td>
                    <td class="history-diff" style="font-size:13px;">${escapeHtml(detail)}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">加载失败</td></tr>';
            showToast('加载操作记录失败', 'error');
        }
    }

    // ── 导出 ──

    return {
        persistScheduleDate, cloneScheduleState, collectDatesFromStates,
        syncScheduleDates, pushUndoSnapshot, undoLastChange,
        renderSchedule, createProjectCard, loadScheduleData,
        deleteProject, sortDayProjects, showNoticeModal,
        showCopyModal, loadHistoryRecords
    };
}
