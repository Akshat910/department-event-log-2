// ═══════════════════════════════════════════════════════════
// Academic Architect — SQL Editor Page
// ═══════════════════════════════════════════════════════════

const SQLEditorPage = {
  schema: [],

  async render(container) {
    container.innerHTML = `
      <div class="sql-layout fade-in">
        <!-- Editor Panel -->
        <div class="sql-editor-panel">
          <div class="editor-toolbar">
            <div class="editor-toolbar-left">
              <span class="editor-schema-label">Active schema: academic_main_v2</span>
            </div>
            <div class="editor-toolbar-right">
              <button class="btn btn-sm btn-secondary" id="btn-format-sql" title="Format SQL">
                <span class="material-icons-outlined" style="font-size: 0.875rem">auto_fix_high</span>
                Format
              </button>
              <button class="btn btn-sm btn-secondary" id="btn-save-query" title="Save Query">
                <span class="material-icons-outlined" style="font-size: 0.875rem">bookmark_add</span>
                Save Query
              </button>
              <button class="btn btn-sm btn-primary" id="btn-run-query" title="Run Query (Ctrl+Enter)">
                <span class="material-icons-outlined" style="font-size: 0.875rem">play_arrow</span>
                Run Query
              </button>
            </div>
          </div>
          <div class="sql-textarea-wrapper">
            <textarea class="sql-textarea" id="sql-input" placeholder="-- Write your SQL query here...&#10;SELECT * FROM departments LIMIT 10;" spellcheck="false">SELECT
  d.name AS department,
  e.title AS event_title,
  e.event_type,
  e.event_date,
  e.status,
  e.budget
FROM events e
JOIN departments d ON e.department_id = d.id
WHERE e.status = 'completed'
ORDER BY e.event_date DESC
LIMIT 20;</textarea>
          </div>
        </div>

        <!-- Schema Browser -->
        <div class="sql-schema-panel">
          <div class="schema-card">
            <div class="schema-card-header">
              <span class="schema-card-title">Schema Browser</span>
              <button class="btn-icon" id="btn-refresh-schema" title="Refresh">
                <span class="material-icons-outlined" style="font-size: 1rem">refresh</span>
              </button>
            </div>
            <div id="schema-list">
              <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

        <!-- Results Panel -->
        <div class="sql-results-panel">
          <div class="results-header">
            <span class="results-count" id="results-count">No query executed</span>
            <div style="display: flex; gap: var(--space-2);">
              <button class="btn btn-sm btn-secondary" id="btn-export-csv" disabled>
                <span class="material-icons-outlined" style="font-size: 0.875rem">download</span>
                Export CSV
              </button>
            </div>
          </div>
          <div class="results-table-wrapper" id="results-wrapper">
            <div class="empty-state">
              <span class="material-icons-outlined">table_chart</span>
              <p>Execute a query to see results here</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEditor();
    await this.loadSchema();
  },

  setupEditor() {
    const runBtn = document.getElementById('btn-run-query');
    const formatBtn = document.getElementById('btn-format-sql');
    const saveBtn = document.getElementById('btn-save-query');
    const exportBtn = document.getElementById('btn-export-csv');
    const textarea = document.getElementById('sql-input');
    const refreshBtn = document.getElementById('btn-refresh-schema');

    runBtn.addEventListener('click', () => this.executeQuery());
    formatBtn.addEventListener('click', () => this.formatSQL());
    saveBtn.addEventListener('click', () => App.toast('Query saved to history', 'success'));
    exportBtn.addEventListener('click', () => this.exportCSV());
    refreshBtn.addEventListener('click', () => this.loadSchema());

    // Ctrl+Enter to run
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.executeQuery();
      }
      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    });
  },

  async executeQuery() {
    const textarea = document.getElementById('sql-input');
    const query = textarea.value.trim();
    if (!query) {
      App.toast('Please enter a SQL query', 'warning');
      return;
    }

    const resultsWrapper = document.getElementById('results-wrapper');
    const resultsCount = document.getElementById('results-count');
    resultsWrapper.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    resultsCount.textContent = 'Executing...';

    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();

      if (!res.ok) {
        resultsCount.textContent = 'Error';
        resultsWrapper.innerHTML = `
          <div class="empty-state">
            <span class="material-icons-outlined" style="color: var(--error)">error</span>
            <p style="color: var(--error)">${data.error}</p>
          </div>`;
        App.toast('Query execution failed', 'error');
        return;
      }

      if (data.message) {
        // Write operation
        resultsCount.textContent = data.message;
        resultsWrapper.innerHTML = `
          <div class="empty-state">
            <span class="material-icons-outlined" style="color: var(--success)">check_circle</span>
            <p>${data.message}</p>
          </div>`;
        App.toast(data.message, 'success');
        return;
      }

      // SELECT results
      resultsCount.textContent = `${data.rowCount} Rows Found`;
      document.getElementById('btn-export-csv').disabled = false;
      this._lastResult = data;

      if (data.rows.length === 0) {
        resultsWrapper.innerHTML = `
          <div class="empty-state">
            <span class="material-icons-outlined">search_off</span>
            <p>Query returned no results</p>
          </div>`;
        return;
      }

      resultsWrapper.innerHTML = `
        <table class="data-table" id="results-table">
          <thead>
            <tr>${data.columns.map(col => `<th>${col}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.rows.map((row, i) => `
              <tr style="animation: fade-in 0.2s ${i * 0.02}s both">
                ${row.map(cell => `<td>${cell !== null ? cell : '<span style="color:var(--outline)">NULL</span>'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      App.toast(`Query executed — ${data.rowCount} rows returned`, 'success');
    } catch (err) {
      resultsCount.textContent = 'Error';
      resultsWrapper.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-outlined" style="color: var(--error)">wifi_off</span>
          <p>Network error — could not reach the server</p>
        </div>`;
    }
  },

  async loadSchema() {
    const schemaList = document.getElementById('schema-list');
    if (!schemaList) return;

    try {
      const res = await fetch('/api/sql/schema');
      const data = await res.json();
      this.schema = data.schema;

      schemaList.innerHTML = data.schema.map(table => `
        <div class="schema-table">
          <div class="schema-table-header" onclick="SQLEditorPage.toggleTable(this)">
            <span class="schema-table-name">
              <span class="material-icons-outlined">table_view</span>
              ${table.name}
            </span>
            <span class="schema-table-count">${table.rowCount} rows</span>
          </div>
          <div class="schema-columns">
            ${table.columns.map(col => `
              <div class="schema-column">
                <span class="schema-column-name">${col.pk ? '🔑 ' : ''}${col.name}</span>
                <span class="schema-column-type">${col.type || 'TEXT'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } catch {
      schemaList.innerHTML = '<p style="padding: var(--space-4); color: var(--error); font-size: 0.75rem;">Failed to load schema</p>';
    }
  },

  toggleTable(header) {
    const columns = header.nextElementSibling;
    columns.classList.toggle('open');
  },

  formatSQL() {
    const textarea = document.getElementById('sql-input');
    let sql = textarea.value;
    // Simple formatting: uppercase keywords, add line breaks
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'ON', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
      'ALTER TABLE', 'DROP TABLE', 'AS', 'DISTINCT', 'UNION', 'EXCEPT', 'INTERSECT'];

    keywords.forEach(kw => {
      const re = new RegExp(`\\b${kw}\\b`, 'gi');
      sql = sql.replace(re, '\n' + kw);
    });
    sql = sql.replace(/^\n/, '').replace(/\n\n+/g, '\n');
    textarea.value = sql;
    App.toast('SQL formatted', 'info');
  },

  exportCSV() {
    if (!this._lastResult || !this._lastResult.rows.length) {
      App.toast('No data to export', 'warning');
      return;
    }
    const { columns, rows } = this._lastResult;
    let csv = columns.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => {
        if (cell === null) return '';
        const str = String(cell);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);
    App.toast('CSV exported successfully', 'success');
  }
};
