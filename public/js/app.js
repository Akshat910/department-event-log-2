// ═══════════════════════════════════════════════════════════
// Academic Architect — App Router & Shared Logic
// ═══════════════════════════════════════════════════════════

const App = {
  currentPage: null,
  user: null,

  async init() {
    // Check auth first
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.user = data.user;
        this.setupApp();
      } else {
        this.showLogin();
      }
    } catch {
      this.showLogin();
    }
  },

  setupApp() {
    document.getElementById('app').style.display = 'grid';
    this.updateUserUI();
    this.setupNavigation();
    this.setupModal();
    this.setupUserMenu();
    this.applyRoleRestrictions();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  showLogin() {
    document.getElementById('app').style.display = 'none';
    LoginPage.render();
  },

  // Hide restricted nav items based on role
  applyRoleRestrictions() {
    if (this.user && this.user.role !== 'administrator') {
      const sqlNavItem = document.getElementById('nav-sql-editor');
      if (sqlNavItem) sqlNavItem.style.display = 'none';
    }
    if (this.user && this.user.role === 'viewer') {
      const settingsNavItem = document.getElementById('nav-settings');
      if (settingsNavItem) settingsNavItem.style.display = 'none';
      const addRecordNavItem = document.getElementById('nav-add-record');
      if (addRecordNavItem) addRecordNavItem.style.display = 'none';
    }
  },

  updateUserUI() {
    const nameEl = document.getElementById('user-display-name');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownRole = document.getElementById('dropdown-role');
    if (this.user) {
      nameEl.textContent = this.user.display_name.split(' ')[0];
      dropdownName.textContent = this.user.display_name;
      dropdownRole.textContent = this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1);
    }
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        // Let the hash change handle navigation
      });
    });
  },

  setupModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const submitBtn = document.getElementById('modal-submit');
    const newEntryBtn = document.getElementById('btn-new-entry');

    newEntryBtn.addEventListener('click', () => overlay.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    cancelBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    submitBtn.addEventListener('click', async () => {
      const type = document.getElementById('entry-type').value;
      const description = document.getElementById('entry-description').value;
      const status = document.getElementById('entry-status').value;

      if (!description.trim()) {
        App.toast('Please enter a description', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: type, description, status })
        });
        if (res.ok) {
          overlay.classList.add('hidden');
          document.getElementById('entry-description').value = '';
          App.toast('Event log entry created successfully', 'success');
          if (this.currentPage === 'events') EventsPage.loadEvents();
        } else {
          App.toast('Failed to create entry', 'error');
        }
      } catch {
        App.toast('Network error', 'error');
      }
    });
  },

  setupUserMenu() {
    const logoutBtn = document.getElementById('btn-logout');
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.user = null;
      this.showLogin();
    });
  },

  handleRoute() {
    const hash = window.location.hash || '#/events';
    const page = hash.replace('#/', '') || 'events';

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update title
    const titles = {
      'events':     'Event Logs',
      'sql-editor': 'SQL Editor',
      'settings':   'Settings & Configuration',
      'add-record': 'Add Record'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Event Logs';

    this.currentPage = page;
    this.loadPage(page);
  },

  async loadPage(page) {
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    // Guard: SQL Editor is admin-only
    if (page === 'sql-editor' && this.user && this.user.role !== 'administrator') {
      container.innerHTML = this._accessDeniedHTML(
        'SQL Editor is only available to users with <strong>Administrator</strong> privileges.'
      );
      return;
    }

    // Guard: Settings requires Faculty Editor or Administrator
    if (page === 'settings' && this.user && this.user.role === 'viewer') {
      container.innerHTML = this._accessDeniedHTML(
        'Settings is only available to users with <strong>Faculty Editor</strong> or <strong>Administrator</strong> privileges.'
      );
      return;
    }

    // Guard: Add Record requires Faculty Editor or Administrator
    if (page === 'add-record' && this.user && this.user.role === 'viewer') {
      container.innerHTML = this._accessDeniedHTML(
        'Add Record is only available to users with <strong>Faculty Editor</strong> or <strong>Administrator</strong> privileges.'
      );
      return;
    }

    switch (page) {
      case 'events':
        EventsPage.render(container);
        break;
      case 'sql-editor':
        SQLEditorPage.render(container);
        break;
      case 'settings':
        SettingsPage.render(container);
        break;
      case 'add-record':
        AddRecordPage.render(container);
        break;
      default:
        EventsPage.render(container);
    }
  },

  // Reusable access-denied card
  _accessDeniedHTML(message) {
    return `
      <div style="display:flex;align-items:center;justify-content:center;height:60vh">
        <div class="card" style="text-align:center;max-width:420px;padding:var(--space-10)">
          <span class="material-icons-outlined" style="font-size:3rem;color:var(--error);margin-bottom:var(--space-4)">lock</span>
          <h2 style="font-family:var(--font-headline);font-size:1.25rem;font-weight:700;margin-bottom:var(--space-3)">Access Restricted</h2>
          <p style="color:var(--on-surface-variant);font-size:0.875rem;line-height:1.6;margin-bottom:var(--space-6)">
            ${message} Please contact your system administrator to request access.
          </p>
          <a href="#/events" class="btn btn-primary" style="display:inline-flex">
            <span class="material-icons-outlined" style="font-size:1rem">arrow_back</span>
            Back to Event Logs
          </a>
        </div>
      </div>
    `;
  },

  // Toast notification system
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    toast.innerHTML = `
      <span class="material-icons-outlined" style="font-size: 1.125rem; color: var(--${type === 'info' ? 'primary' : type})">${icons[type]}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Utility: format date
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
