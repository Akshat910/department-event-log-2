// ═══════════════════════════════════════════════════════════
// Academic Architect — Event Logs Page
// ═══════════════════════════════════════════════════════════

const EventsPage = {
  currentFilter: 'all',
  currentPage: 1,
  totalPages: 1,

  async render(container) {
    container.innerHTML = `
      <p class="page-subtitle fade-in">Monitor real-time system activities, database transactions, and department-wide administrative changes.</p>

      <!-- Filter Bar -->
      <div class="filter-bar fade-in">
        <div class="filter-group">
          <button class="filter-btn active" data-filter="all">All Events</button>
          <button class="filter-btn" data-filter="SCHEMA_UPDATE">Schema Updates</button>
          <button class="filter-btn" data-filter="USER_AUTH">User Auth</button>
          <button class="filter-btn" data-filter="DATA_EXPORT">Data Export</button>
          <button class="filter-btn" data-filter="BACKUP">Backup</button>
          <button class="filter-btn" data-filter="QUERY">Queries</button>
        </div>
        <div class="filter-date">
          <span class="material-icons-outlined">calendar_today</span>
          <input type="date" id="filter-date-start" value="2024-03-15">
          <span>—</span>
          <input type="date" id="filter-date-end" value="2024-03-22">
        </div>
      </div>

      <!-- Activity Table -->
      <div class="data-table-container fade-in" id="events-table-container">
        <table class="data-table" id="events-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>User ID</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="events-tbody">
            <tr><td colspan="6"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>
          </tbody>
        </table>
        <div class="pagination" id="events-pagination"></div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid fade-in" id="stats-grid">
        <div class="stat-card">
          <div class="stat-card-icon traffic"><span class="material-icons-outlined">insights</span></div>
          <div class="stat-card-title">Traffic Insight</div>
          <div class="stat-card-value" id="stat-epm">—</div>
          <div class="stat-card-detail" id="stat-traffic-detail">Loading...</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon security"><span class="material-icons-outlined">verified_user</span></div>
          <div class="stat-card-title">Security Audit</div>
          <div class="stat-card-value" id="stat-security">—</div>
          <div class="stat-card-detail" id="stat-security-detail">Loading...</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon storage"><span class="material-icons-outlined">storage</span></div>
          <div class="stat-card-title">Storage Status</div>
          <div class="stat-card-value" id="stat-storage">—</div>
          <div class="stat-card-detail" id="stat-storage-detail">Loading...</div>
        </div>
      </div>
    `;

    this.setupFilters();
    await this.loadEvents();
    await this.loadStats();
  },

  setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.currentPage = 1;
        this.loadEvents();
      });
    });
  },

  async loadEvents() {
    const tbody = document.getElementById('events-tbody');
    if (!tbody) return;

    const params = new URLSearchParams({
      page: this.currentPage,
      limit: 15
    });
    if (this.currentFilter !== 'all') params.set('type', this.currentFilter);

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value) params.set('search', searchInput.value);

    try {
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      this.totalPages = data.totalPages;

      if (data.events.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="6">
            <div class="empty-state">
              <span class="material-icons-outlined">event_busy</span>
              <p>No events found matching your filters.</p>
            </div>
          </td></tr>`;
        return;
      }

      tbody.innerHTML = data.events.map((evt, i) => `
        <tr style="animation: fade-in 0.3s ${i * 0.03}s both">
          <td style="font-size: 0.75rem; white-space: nowrap; color: var(--on-surface-variant)">${App.formatDateTime(evt.timestamp)}</td>
          <td><span class="badge badge-info">${evt.event_type}</span></td>
          <td style="font-weight: 500">${evt.user_id || '—'}</td>
          <td style="max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" title="${this.escapeHtml(evt.description)}">${this.escapeHtml(evt.description)}</td>
          <td><span class="badge badge-${evt.status}">${evt.status}</span></td>
          <td class="table-actions">
            <button class="btn-icon" title="View Details"><span class="material-icons-outlined" style="font-size: 1rem">visibility</span></button>
            <button class="btn-icon" title="Copy"><span class="material-icons-outlined" style="font-size: 1rem">content_copy</span></button>
          </td>
        </tr>
      `).join('');

      this.renderPagination(data);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--error)">Failed to load events</td></tr>`;
    }
  },

  renderPagination(data) {
    const container = document.getElementById('events-pagination');
    if (!container) return;

    const start = (data.page - 1) * data.limit + 1;
    const end = Math.min(data.page * data.limit, data.total);

    container.innerHTML = `
      <span class="pagination-info">Showing ${start}-${end} of ${data.total} events</span>
      <div class="pagination-controls">
        <button class="pagination-btn" ${data.page <= 1 ? 'disabled' : ''} onclick="EventsPage.goToPage(${data.page - 1})">
          <span class="material-icons-outlined" style="font-size: 1rem">chevron_left</span>
        </button>
        ${this.renderPageButtons(data.page, data.totalPages)}
        <button class="pagination-btn" ${data.page >= data.totalPages ? 'disabled' : ''} onclick="EventsPage.goToPage(${data.page + 1})">
          <span class="material-icons-outlined" style="font-size: 1rem">chevron_right</span>
        </button>
      </div>
    `;
  },

  renderPageButtons(current, total) {
    let buttons = '';
    const pages = [];
    for (let i = 1; i <= Math.min(total, 5); i++) pages.push(i);
    pages.forEach(p => {
      buttons += `<button class="pagination-btn ${p === current ? 'active' : ''}" onclick="EventsPage.goToPage(${p})">${p}</button>`;
    });
    return buttons;
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadEvents();
  },

  async loadStats() {
    try {
      const res = await fetch('/api/events/stats');
      const data = await res.json();

      document.getElementById('stat-epm').textContent = `${data.traffic.eventsPerMinute}/min`;
      document.getElementById('stat-traffic-detail').textContent = `Average of ${data.traffic.eventsPerMinute} events per minute recorded in the last hour.`;

      const secEl = document.getElementById('stat-security');
      secEl.textContent = data.security.anomalies === 0 ? 'Secure' : `${data.security.anomalies} alerts`;
      secEl.style.color = data.security.anomalies === 0 ? 'var(--success)' : 'var(--warning)';
      document.getElementById('stat-security-detail').textContent = data.security.anomalies === 0
        ? 'No anomalous authentication patterns detected in the current window.'
        : `${data.security.anomalies} suspicious authentication attempt(s) detected.`;

      document.getElementById('stat-storage').textContent = `${data.storage.integrity}%`;
      document.getElementById('stat-storage-detail').textContent = `Archive integrity ${data.storage.integrity}%. Next scheduled cold storage migration in ${data.storage.nextMigration}.`;
    } catch {
      // Silently fail
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
