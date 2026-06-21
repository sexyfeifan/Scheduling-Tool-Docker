/**
 * 搜索增强模块
 * 支持全局搜索 + 多条件过滤 + 保存过滤器
 */

/**
 * 创建搜索增强模块
 */
export function createSearchModule({ apiClient, onResults }) {
  const FILTER_KEY = 'savedFilters';
  let currentFilters = {};
  let searchTimeout = null;

  function init() {
    const input = document.getElementById('search-projects');
    if (!input) return;

    // 增强搜索框
    input.placeholder = '🔍 搜索项目（输入关键词，回车搜索）';

    // 创建过滤器面板
    const filterContainer = document.createElement('div');
    filterContainer.id = 'search-filters';
    filterContainer.className = 'search-filters';
    filterContainer.style.display = 'none';
    filterContainer.innerHTML = buildFilterHTML();
    input.parentNode.insertBefore(filterContainer, input.nextSibling);

    // 绑定事件
    input.addEventListener('input', debounceSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
      if (e.key === 'Escape') clearSearch();
    });

    // 过滤器按钮
    const filterBtn = document.createElement('button');
    filterBtn.className = 'btn icon-btn';
    filterBtn.textContent = '🔽 过滤';
    filterBtn.title = '高级过滤';
    filterBtn.addEventListener('click', toggleFilters);
    input.parentNode.insertBefore(filterBtn, input.nextSibling);

    // 绑定过滤器事件
    filterContainer.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('change', onFilterChange);
    });

    // 保存过滤器
    filterContainer.querySelector('#save-filter-btn')?.addEventListener('click', saveCurrentFilter);
    filterContainer.querySelector('#clear-filters-btn')?.addEventListener('click', clearAllFilters);
  }

  function toggleFilters() {
    const panel = document.getElementById('search-filters');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 300);
  }

  async function performSearch() {
    const input = document.getElementById('search-projects');
    if (!input) return;

    const query = input.value.trim();
    if (!query && Object.keys(currentFilters).length === 0) {
      if (onResults) onResults(null); // 清除搜索
      return;
    }

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      Object.entries(currentFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const results = await apiClient.get(`/schedules/search?${params.toString()}`);
      if (onResults) onResults(results);
    } catch (e) {
      console.error('[search] 搜索失败:', e);
    }
  }

  function onFilterChange(e) {
    const { name, value } = e.target;
    if (value) {
      currentFilters[name] = value;
    } else {
      delete currentFilters[name];
    }
    performSearch();
  }

  function clearSearch() {
    const input = document.getElementById('search-projects');
    if (input) input.value = '';
    currentFilters = {};
    clearFilterInputs();
    if (onResults) onResults(null);
  }

  function clearAllFilters() {
    currentFilters = {};
    clearFilterInputs();
    performSearch();
  }

  function clearFilterInputs() {
    const panel = document.getElementById('search-filters');
    if (!panel) return;
    panel.querySelectorAll('select').forEach(s => s.value = '');
    panel.querySelectorAll('input').forEach(i => i.value = '');
  }

  function saveCurrentFilter() {
    const name = prompt('请输入过滤器名称：');
    if (!name) return;

    const filters = JSON.parse(localStorage.getItem(FILTER_KEY) || '[]');
    filters.push({
      name,
      filters: { ...currentFilters },
      createdAt: Date.now()
    });
    localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    renderSavedFilters();
  }

  function renderSavedFilters() {
    const container = document.getElementById('saved-filters');
    if (!container) return;

    const filters = JSON.parse(localStorage.getItem(FILTER_KEY) || '[]');
    if (filters.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = filters.map((f, i) => `
      <button class="btn secondary saved-filter-btn" data-index="${i}" style="font-size:11px;padding:2px 8px;margin:2px">
        ⭐ ${escapeHtml(f.name)}
      </button>
    `).join('');

    container.querySelectorAll('.saved-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const f = filters[idx];
        if (f) {
          currentFilters = { ...f.filters };
          applyFiltersToUI();
          performSearch();
        }
      });

      // 右键删除
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(`删除过滤器 "${filters[parseInt(btn.dataset.index, 10)].name}"？`)) {
          filters.splice(parseInt(btn.dataset.index, 10), 1);
          localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
          renderSavedFilters();
        }
      });
    });
  }

  function applyFiltersToUI() {
    const panel = document.getElementById('search-filters');
    if (!panel) return;
    Object.entries(currentFilters).forEach(([k, v]) => {
      const el = panel.querySelector(`[name="${k}"]`);
      if (el) el.value = v;
    });
  }

  function buildFilterHTML() {
    const roles = ['导演', '摄影师', '制片', '录音', '研发', '运营', '商务'];
    const statuses = ['待确认', '已确认', '已完成', '取消'];

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;background:#f8f9fa;border-radius:8px;margin:8px 0">
        <div>
          <label style="font-size:11px;color:#666">场地</label>
          <select name="location" class="toolbar-input" style="width:100%"><option value="">全部</option></select>
        </div>
        <div>
          <label style="font-size:11px;color:#666">状态</label>
          <select name="status" class="toolbar-input" style="width:100%">
            <option value="">全部</option>
            ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:#666">角色</label>
          <select name="role" class="toolbar-input" style="width:100%">
            <option value="">全部</option>
            ${roles.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:#666">人员</label>
          <input name="person" class="toolbar-input" type="text" placeholder="输入姓名" style="width:100%">
        </div>
        <div>
          <label style="font-size:11px;color:#666">日期范围</label>
          <input name="dateFrom" class="toolbar-input" type="date" style="width:100%">
        </div>
        <div>
          <label style="font-size:11px;color:#666">至</label>
          <input name="dateTo" class="toolbar-input" type="date" style="width:100%">
        </div>
        <div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end">
          <button id="clear-filters-btn" class="btn secondary" style="font-size:12px">清空过滤</button>
          <button id="save-filter-btn" class="btn primary" style="font-size:12px">💾 保存过滤器</button>
        </div>
        <div id="saved-filters" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px"></div>
      </div>
    `;
  }

  return { init, performSearch, clearSearch };
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
