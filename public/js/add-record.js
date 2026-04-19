// ═══════════════════════════════════════════════════════════
// Academic Architect — Add Record Page
// ═══════════════════════════════════════════════════════════

const AddRecordPage = {
  tables: [],       // full schema from server
  selectedTable: null,
  fkCache: {},      // cache FK options to avoid re-fetching

  async render(container) {
    container.innerHTML = `
      <p class="page-subtitle fade-in">
        Select a table, fill in the fields below, and insert a new record directly into the database.
      </p>

      <!-- Step 1 – Table Selector -->
      <div class="ar-step-card fade-in" id="ar-step-table">
        <div class="ar-step-header">
          <div class="ar-step-number">1</div>
          <div>
            <div class="ar-step-title">Select Table</div>
            <div class="ar-step-sub">Choose which table you want to add a record to</div>
          </div>
        </div>
        <div id="ar-table-grid" class="ar-table-grid">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Step 2 – Record Form (hidden until table chosen) -->
      <div class="ar-step-card fade-in" id="ar-step-form" style="display:none">
        <div class="ar-step-header">
          <div class="ar-step-number">2</div>
          <div>
            <div class="ar-step-title">Fill in Fields</div>
            <div class="ar-step-sub" id="ar-form-sub">Enter values for each column</div>
          </div>
          <button class="btn btn-sm btn-secondary" id="ar-change-table" style="margin-left:auto">
            <span class="material-icons-outlined" style="font-size:0.875rem">swap_horiz</span>
            Change Table
          </button>
        </div>
        <div id="ar-form-fields" class="ar-form-fields"></div>
        <div class="ar-form-actions">
          <button class="btn btn-secondary" id="ar-btn-reset">
            <span class="material-icons-outlined" style="font-size:1rem">restart_alt</span>
            Reset
          </button>
          <button class="btn btn-primary" id="ar-btn-submit">
            <span class="material-icons-outlined" style="font-size:1rem">add_circle</span>
            Insert Record
          </button>
        </div>
      </div>

      <!-- Step 3 – Success Banner (hidden until after insert) -->
      <div id="ar-success-banner" class="ar-success-banner" style="display:none"></div>
    `;

    document.getElementById('ar-change-table').addEventListener('click', () => this.resetToStep1());
    document.getElementById('ar-btn-reset').addEventListener('click', () => this.resetForm());
    document.getElementById('ar-btn-submit').addEventListener('click', () => this.submitRecord());

    await this.loadSchema();
  },

  async loadSchema() {
    const grid = document.getElementById('ar-table-grid');
    try {
      const res = await fetch('/api/records/schema');
      if (!res.ok) throw new Error('Failed to fetch schema');
      const data = await res.json();
      this.tables = data.tables;
      this.renderTableGrid();
    } catch (err) {
      grid.innerHTML = `<p style="color:var(--error)">Failed to load schema: ${err.message}</p>`;
    }
  },

  TABLE_ICONS: {
    departments:     { icon: 'business',       color: 'var(--primary)' },
    events:          { icon: 'event',           color: 'var(--secondary)' },
    organizers:      { icon: 'manage_accounts', color: 'var(--tertiary)' },
    participants:    { icon: 'group',           color: '#10b981' },
    event_organizers:{ icon: 'link',            color: '#f59e0b' },
    event_logs:      { icon: 'receipt_long',    color: '#8b5cf6' },
  },

  TABLE_DESCRIPTIONS: {
    departments:      'Academic departments (CS, EE, Math…)',
    events:           'Workshops, seminars, competitions…',
    organizers:       'Faculty and staff coordinators',
    participants:     'Student registrations & attendance',
    event_organizers: 'Links events with their organizers',
    event_logs:       'System activity & audit trail',
  },

  renderTableGrid() {
    const grid = document.getElementById('ar-table-grid');
    grid.innerHTML = this.tables.map(t => {
      const meta = this.TABLE_ICONS[t.table] || { icon: 'table_chart', color: 'var(--primary)' };
      const desc = this.TABLE_DESCRIPTIONS[t.table] || '';
      return `
        <button class="ar-table-btn" data-table="${t.table}" onclick="AddRecordPage.selectTable('${t.table}')">
          <span class="material-icons-outlined" style="font-size:1.75rem;color:${meta.color}">${meta.icon}</span>
          <div class="ar-table-btn-name">${t.table}</div>
          <div class="ar-table-btn-desc">${desc}</div>
          <div class="ar-table-btn-cols">${t.columns.length} columns</div>
        </button>
      `;
    }).join('');
  },

  async selectTable(tableName) {
    this.selectedTable = this.tables.find(t => t.table === tableName);
    if (!this.selectedTable) return;

    // Highlight selected
    document.querySelectorAll('.ar-table-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.table === tableName);
    });

    document.getElementById('ar-form-sub').textContent =
      `Inserting into: ${tableName}`;
    document.getElementById('ar-step-form').style.display = 'block';
    document.getElementById('ar-step-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('ar-success-banner').style.display = 'none';

    await this.buildForm();
  },

  async buildForm() {
    const container = document.getElementById('ar-form-fields');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    const cols = this.selectedTable.columns;

    // Pre-fetch all FK options needed
    const fkFetches = cols.filter(c => c.fkRef).map(async c => {
      const table = c.fkRef.table;
      if (!this.fkCache[table]) {
        const res = await fetch(`/api/records/fk-options/${table}`);
        const data = await res.json();
        this.fkCache[table] = data.options;
      }
    });
    await Promise.all(fkFetches);

    container.innerHTML = cols.map(col => this.renderField(col)).join('');
  },

  renderField(col) {
    const label = col.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    const required = col.notnull ? '<span style="color:var(--error)">*</span>' : '';
    const hint = col.notnull ? 'Required' : 'Optional';

    // FK dropdown
    if (col.fkRef) {
      const options = this.fkCache[col.fkRef.table] || [];
      return `
        <div class="form-group">
          <label for="ar_${col.name}">${label} ${required}
            <span class="ar-field-hint">→ ${col.fkRef.table}</span>
          </label>
          <select class="form-select" id="ar_${col.name}" name="${col.name}" ${col.notnull ? 'required' : ''}>
            <option value="">— Select ${col.fkRef.table} —</option>
            ${options.map(o => `<option value="${o.id}">${o.label} (id: ${o.id})</option>`).join('')}
          </select>
        </div>
      `;
    }

    // Enum dropdown
    if (col.enumOptions) {
      return `
        <div class="form-group">
          <label for="ar_${col.name}">${label} ${required}
            <span class="ar-field-hint">${hint}</span>
          </label>
          <select class="form-select" id="ar_${col.name}" name="${col.name}" ${col.notnull ? 'required' : ''}>
            ${!col.notnull ? '<option value="">— Choose —</option>' : ''}
            ${col.enumOptions.map((o, i) =>
              `<option value="${o}" ${i === 0 && col.notnull ? 'selected' : ''}>${o.charAt(0).toUpperCase() + o.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      `;
    }

    // Textarea
    if (col.inputType === 'textarea') {
      return `
        <div class="form-group">
          <label for="ar_${col.name}">${label} ${required}
            <span class="ar-field-hint">${hint}</span>
          </label>
          <textarea class="form-textarea" id="ar_${col.name}" name="${col.name}"
            rows="3" placeholder="Enter ${label.toLowerCase()}…"
            ${col.notnull ? 'required' : ''}></textarea>
        </div>
      `;
    }

    // Default input (text, number, date, time, email, tel, password)
    const placeholders = {
      date: 'YYYY-MM-DD',
      time: 'HH:MM',
      tel:  '+91-XXXXX-XXXXX',
      email:'name@academic.edu',
      number: '0',
    };
    const placeholder = placeholders[col.inputType] || `Enter ${label.toLowerCase()}…`;

    return `
      <div class="form-group">
        <label for="ar_${col.name}">${label} ${required}
          <span class="ar-field-hint">${hint}</span>
        </label>
        <input class="form-input" type="${col.inputType}" id="ar_${col.name}"
          name="${col.name}" placeholder="${placeholder}"
          ${col.inputType === 'number' ? 'step="any"' : ''}
          ${col.notnull ? 'required' : ''}>
      </div>
    `;
  },

  collectFormData() {
    const cols = this.selectedTable.columns;
    const data = {};
    let valid = true;
    let firstError = null;

    cols.forEach(col => {
      const el = document.getElementById(`ar_${col.name}`);
      if (!el) return;
      const val = el.value.trim();

      // Validate required
      if (col.notnull && val === '') {
        el.classList.add('input-error');
        if (!firstError) firstError = el;
        valid = false;
      } else {
        el.classList.remove('input-error');
        if (val !== '') data[col.name] = val;
      }
    });

    if (!valid && firstError) {
      firstError.focus();
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid ? data : null;
  },

  resetForm() {
    const cols = this.selectedTable?.columns || [];
    cols.forEach(col => {
      const el = document.getElementById(`ar_${col.name}`);
      if (el) { el.value = ''; el.classList.remove('input-error'); }
    });
  },

  resetToStep1() {
    this.selectedTable = null;
    document.getElementById('ar-step-form').style.display = 'none';
    document.getElementById('ar-success-banner').style.display = 'none';
    document.querySelectorAll('.ar-table-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('ar-step-table').scrollIntoView({ behavior: 'smooth' });
  },

  async submitRecord() {
    if (!this.selectedTable) return;

    const data = this.collectFormData();
    if (!data) {
      App.toast('Please fill in all required fields', 'warning');
      return;
    }

    const btn = document.getElementById('ar-btn-submit');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-icons-outlined" style="font-size:1rem;animation:spin 0.8s linear infinite">sync</span> Inserting…`;

    try {
      const res = await fetch(`/api/records/${this.selectedTable.table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok) {
        this.showSuccess(result.id, data);
        this.resetForm();
        App.toast(`Record inserted into ${this.selectedTable.table} (id: ${result.id})`, 'success');
      } else {
        App.toast(result.error || 'Insert failed', 'error');
      }
    } catch {
      App.toast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:1rem">add_circle</span> Insert Record`;
    }
  },

  showSuccess(id, data) {
    const banner = document.getElementById('ar-success-banner');
    const summary = Object.entries(data).slice(0, 4)
      .map(([k, v]) => `<span class="ar-success-field"><strong>${k}:</strong> ${v}</span>`)
      .join('');

    banner.style.display = 'flex';
    banner.innerHTML = `
      <div class="ar-success-icon">
        <span class="material-icons-outlined">check_circle</span>
      </div>
      <div class="ar-success-content">
        <div class="ar-success-title">Record inserted successfully</div>
        <div class="ar-success-sub">New row in <strong>${this.selectedTable.table}</strong> with ID <strong>#${id}</strong></div>
        <div class="ar-success-summary">${summary}</div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="AddRecordPage.showSuccess.banner=null;document.getElementById('ar-success-banner').style.display='none'">
        <span class="material-icons-outlined" style="font-size:1rem">close</span>
      </button>
    `;
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};
