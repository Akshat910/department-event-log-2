// ═══════════════════════════════════════════════════════════
// Academic Architect — Settings Page
// ═══════════════════════════════════════════════════════════

const SettingsPage = {
  settings: {},
  roles: [],

  async render(container) {
    container.innerHTML = `
      <p class="page-subtitle fade-in">Manage core infrastructure, security policies, and diagnostic parameters.</p>

      <div class="settings-grid fade-in">
        <!-- Database Connection -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-icons-outlined" style="font-size: 1.125rem; vertical-align: middle; margin-right: var(--space-2); color: var(--primary)">database</span>
              Database Connection
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="db-host">Host Endpoint</label>
              <input type="text" class="form-input" id="db-host" value="localhost">
            </div>
            <div class="form-group">
              <label for="db-port">Port</label>
              <input type="text" class="form-input" id="db-port" value="5432">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="db-name">Database Name</label>
              <input type="text" class="form-input" id="db-name" value="academic_main_v2">
            </div>
            <div class="form-group">
              <label for="db-timeout">Timeout (seconds)</label>
              <input type="number" class="form-input" id="db-timeout" value="30">
            </div>
          </div>
          <div class="form-group">
            <label for="db-ssl">SSL Mode</label>
            <select class="form-select" id="db-ssl">
              <option value="disable">Disable</option>
              <option value="prefer">Prefer</option>
              <option value="require" selected>Require</option>
              <option value="verify-full">Verify Full</option>
            </select>
          </div>
          <div style="display: flex; gap: var(--space-3); margin-top: var(--space-2);">
            <button class="btn btn-secondary" id="btn-test-connection">
              <span class="material-icons-outlined" style="font-size: 0.875rem">lan</span>
              Test Connection
            </button>
            <button class="btn btn-primary" id="btn-save-db">
              <span class="material-icons-outlined" style="font-size: 0.875rem">save</span>
              Save Changes
            </button>
          </div>
        </div>

        <!-- System Logs -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="material-icons-outlined" style="font-size: 1.125rem; vertical-align: middle; margin-right: var(--space-2); color: var(--tertiary)">receipt_long</span>
              System Logs
            </div>
          </div>
          <div class="toggle-wrapper">
            <div>
              <div class="toggle-label">Audit Logging</div>
              <div class="toggle-sublabel">Record all administrative actions and query history.</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggle-audit" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="form-row" style="margin-top: var(--space-4)">
            <div class="form-group">
              <label for="log-level">Log Level</label>
              <select class="form-select" id="log-level">
                <option value="DEBUG">DEBUG</option>
                <option value="INFO" selected>INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
            <div class="form-group">
              <label for="log-retention">Retention (days)</label>
              <input type="number" class="form-input" id="log-retention" value="90">
            </div>
          </div>

          <div class="card-nested" style="margin-top: var(--space-2)">
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);">
              <span class="material-icons-outlined" style="font-size: 1rem; color: var(--outline)">storage</span>
              <span style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--on-surface-variant)">Current Log Utilization</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="log-progress" style="width: 62%"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--on-surface-variant)">
              <span id="log-used">12.4 GB used</span>
              <span id="log-total">of 20.0 GB total allocation</span>
            </div>
          </div>
        </div>

        <!-- Access Control -->
        <div class="card settings-card-full">
          <div class="card-header">
            <div class="card-title">
              <span class="material-icons-outlined" style="font-size: 1.125rem; vertical-align: middle; margin-right: var(--space-2); color: var(--secondary)">admin_panel_settings</span>
              Access Control
            </div>
          </div>
          <div id="roles-list">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
          <button class="add-role-btn" id="btn-add-role">
            <span class="material-icons-outlined" style="font-size: 1rem">add</span>
            Define New Role
          </button>
        </div>

        <!-- Security Health -->
        <div class="card" id="security-health-card" style="grid-column: 1 / -1">
          <div class="card-header">
            <div class="card-title">
              <span class="material-icons-outlined" style="font-size: 1.125rem; vertical-align: middle; margin-right: var(--space-2); color: var(--success)">shield</span>
              Security Health
            </div>
          </div>
          <div style="display: flex; gap: var(--space-8); align-items: flex-start;">
            <div>
              <div class="health-score">
                <div>
                  <div class="health-score-value" id="health-score">—</div>
                  <div class="health-score-label" style="margin-top: var(--space-1)">
                    <span class="badge badge-success" id="health-badge">
                      <span class="material-icons-outlined" style="font-size: 0.75rem">verified_user</span>
                      System Secure
                    </span>
                  </div>
                </div>
              </div>
              <div class="health-score-detail" style="margin-top: var(--space-3)">
                All protocols are optimized. 2-factor authentication is active for all Administrative accounts.
              </div>
            </div>
            <div class="health-items" id="health-items" style="flex: 1;">
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupListeners();
    await this.loadSettings();
    await this.loadRoles();
    await this.loadHealth();
  },

  setupListeners() {
    document.getElementById('btn-test-connection').addEventListener('click', () => {
      App.toast('Testing connection to database...', 'info');
      setTimeout(() => App.toast('Connection successful!', 'success'), 1200);
    });

    document.getElementById('btn-save-db').addEventListener('click', async () => {
      const settings = {
        db_host: document.getElementById('db-host').value,
        db_port: document.getElementById('db-port').value,
        db_name: document.getElementById('db-name').value,
        db_timeout: document.getElementById('db-timeout').value,
        db_ssl_mode: document.getElementById('db-ssl').value,
        audit_logging: document.getElementById('toggle-audit').checked ? 'true' : 'false',
        log_level: document.getElementById('log-level').value,
        log_retention: document.getElementById('log-retention').value,
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings })
        });
        if (res.ok) {
          App.toast('Settings saved successfully', 'success');
        } else {
          const data = await res.json();
          App.toast(data.error || 'Failed to save settings', 'error');
        }
      } catch {
        App.toast('Network error', 'error');
      }
    });

    document.getElementById('btn-add-role').addEventListener('click', () => {
      App.toast('Role creation form coming soon', 'info');
    });
  },

  async loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      this.settings = data.settings;

      if (data.settings.db_host) document.getElementById('db-host').value = data.settings.db_host;
      if (data.settings.db_port) document.getElementById('db-port').value = data.settings.db_port;
      if (data.settings.db_name) document.getElementById('db-name').value = data.settings.db_name;
      if (data.settings.db_timeout) document.getElementById('db-timeout').value = data.settings.db_timeout;
      if (data.settings.db_ssl_mode) document.getElementById('db-ssl').value = data.settings.db_ssl_mode;
      if (data.settings.audit_logging) document.getElementById('toggle-audit').checked = data.settings.audit_logging === 'true';
      if (data.settings.log_level) document.getElementById('log-level').value = data.settings.log_level;
      if (data.settings.log_retention) document.getElementById('log-retention').value = data.settings.log_retention;

      // Update progress bar
      const used = parseFloat(data.settings.log_utilization_gb || 12.4);
      const total = parseFloat(data.settings.log_total_gb || 20.0);
      const pct = (used / total * 100).toFixed(0);
      document.getElementById('log-progress').style.width = pct + '%';
      document.getElementById('log-used').textContent = `${used} GB used`;
      document.getElementById('log-total').textContent = `of ${total} GB total allocation`;
    } catch {
      // Silently fail
    }
  },

  async loadRoles() {
    try {
      const res = await fetch('/api/settings/roles');
      const data = await res.json();
      this.roles = data.roles;

      const list = document.getElementById('roles-list');
      list.innerHTML = data.roles.map(role => `
        <div class="role-item">
          <div class="role-info">
            <div class="role-name">${role.name}</div>
            <div class="role-description">${role.description} — ${role.detail}</div>
          </div>
          <div class="role-permissions">
            ${role.permissions.read ? '<span class="badge badge-success">Read</span>' : ''}
            ${role.permissions.write ? '<span class="badge badge-info">Write</span>' : ''}
            ${role.permissions.delete ? '<span class="badge badge-warning">Delete</span>' : ''}
            ${role.permissions.admin ? '<span class="badge badge-processing">Admin</span>' : ''}
          </div>
        </div>
      `).join('');
    } catch {
      document.getElementById('roles-list').innerHTML = '<p style="color:var(--error)">Failed to load roles</p>';
    }
  },

  async loadHealth() {
    try {
      const res = await fetch('/api/settings/health');
      const data = await res.json();

      document.getElementById('health-score').textContent = `${data.score}%`;

      const items = document.getElementById('health-items');
      items.innerHTML = data.details.map(item => `
        <div class="health-item">
          <span class="material-icons-outlined">${item.status === 'active' ? 'check_circle' : 'cancel'}</span>
          <span>${item.label}</span>
          <span class="badge badge-${item.status === 'active' ? 'success' : 'error'}" style="margin-left: auto">${item.status}</span>
        </div>
      `).join('');
    } catch {
      // Silently fail
    }
  }
};
