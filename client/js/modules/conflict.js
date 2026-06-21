/**
 * 人员冲突检测模块
 * 在导航栏添加冲突检测按钮，弹出冲突报告
 */

import { escapeHtml, getMonday, formatDate } from './utils.js';

export function createConflictModule({ apiClient }) {
  function init() {
    const btn = document.getElementById('conflict-btn');
    if (btn) btn.addEventListener('click', checkConflicts);
  }

  async function checkConflicts() {
    // 默认检测当前周
    const now = new Date();
    const monday = getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const start = formatDate(monday);
    const end = formatDate(sunday);

    try {
      const data = await apiClient.get(`/schedules/conflicts?start=${start}&end=${end}`);
      showConflictReport(data);
    } catch (e) {
      console.error('[conflict] 检测失败:', e);
      alert('冲突检测失败');
    }
  }

  function showConflictReport(data) {
    let panel = document.getElementById('conflict-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'conflict-panel';
      panel.className = 'modal';
      document.body.appendChild(panel);
    }

    const { conflicts, total, period } = data;

    let html = `
      <div class="modal-content" style="max-width:600px">
        <span class="close" onclick="document.getElementById('conflict-panel').style.display='none'">&times;</span>
        <h2>⚠️ 人员冲突检测报告</h2>
        <p style="color:#666;font-size:13px;margin:8px 0">检测范围：${period.start} ~ ${period.end}</p>
    `;

    if (total === 0) {
      html += `
        <div style="text-align:center;padding:24px;color:#10B981">
          <div style="font-size:48px">✅</div>
          <p style="font-size:16px;font-weight:600;margin-top:8px">未发现人员冲突</p>
          <p style="color:#666;font-size:13px">当前排期中没有人员时间重叠</p>
        </div>
      `;
    } else {
      html += `<p style="color:#EF4444;font-weight:600;margin:8px 0">发现 ${total} 个冲突</p>`;
      html += '<div style="max-height:400px;overflow-y:auto">';

      conflicts.forEach(c => {
        const severityColor = c.severity === 'high' ? '#EF4444' : '#F59E0B';
        const severityLabel = c.severity === 'high' ? '高' : '中';

        html += `
          <div style="border:1px solid ${severityColor}40;border-left:4px solid ${severityColor};border-radius:6px;padding:12px;margin:8px 0;background:${severityColor}08">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <span style="font-weight:600">${escapeHtml(c.person)}</span>
                <span style="color:#666;font-size:12px;margin-left:4px">${c.role}</span>
              </div>
              <span style="background:${severityColor};color:#fff;font-size:10px;padding:2px 6px;border-radius:10px">${severityLabel}</span>
            </div>
            <div style="color:#666;font-size:12px;margin-top:4px">日期：${c.date} · ${c.count} 个项目</div>
            <div style="margin-top:6px">
              ${c.projects.map(p => `<span style="display:inline-block;background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:12px;margin:2px">${escapeHtml(p)}</span>`).join('')}
            </div>
            <div style="color:#999;font-size:11px;margin-top:4px">时间：${c.timeSlots.join(', ')}</div>
          </div>
        `;
      });

      html += '</div>';
    }

    html += '</div>';
    panel.innerHTML = html;
    panel.style.display = 'flex';
  }

  return { init, checkConflicts };
}
