/**
 * 前端导出模块
 * JSON / CSV / iCal 导出
 */

/**
 * 创建前端导出模块
 */
export function createClientExportModule({ apiClient }) {
  function init() {
    // 绑定导出按钮事件
    document.addEventListener('click', (e) => {
      if (e.target.closest('#export-json-btn')) exportJSON();
      if (e.target.closest('#export-csv-btn')) exportCSV();
      if (e.target.closest('#export-ical-btn')) exportICal();
    });
  }

  async function exportJSON() {
    try {
      const data = await apiClient.get('/export/json');
      downloadFile(
        JSON.stringify(data, null, 2),
        `排期备份_${formatDate(new Date())}.json`,
        'application/json'
      );
    } catch (e) {
      console.error('[export] JSON 导出失败:', e);
      alert('JSON 导出失败');
    }
  }

  async function exportCSV() {
    try {
      const blob = await apiClient.getBlob('/export/excel');
      downloadBlob(blob, `排期报表_${formatDate(new Date())}.csv`);
    } catch (e) {
      console.error('[export] CSV 导出失败:', e);
      alert('CSV 导出失败');
    }
  }

  function exportICal() {
    const weeks = prompt('导出未来几周的日历？', '4');
    if (!weeks) return;
    const url = `/api/calendar?weeks=${parseInt(weeks, 10) || 4}`;
    window.open(url, '_blank');
  }

  return { init, exportJSON, exportCSV, exportICal };
}

// ── 工具函数 ──

function formatDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
