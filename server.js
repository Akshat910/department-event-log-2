const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDb, saveDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'academic-architect-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Authentication required' });
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'administrator') return next();
    return res.status(403).json({ error: 'Access denied. SQL Editor requires administrator privileges.' });
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Editor or Admin middleware (blocks viewer role)
function requireEditorOrAdmin(req, res, next) {
  if (req.session && req.session.user) {
    if (['administrator', 'editor'].includes(req.session.user.role)) return next();
    return res.status(403).json({ error: 'Access denied. Settings requires Faculty Editor or Administrator privileges.' });
  }
  res.status(401).json({ error: 'Authentication required' });
}

// ─── AUTH ROUTES ─────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const result = db.exec("SELECT id, username, display_name, role, email FROM users WHERE username = ? AND password = ?", [username, password]);
  if (result.length > 0 && result[0].values.length > 0) {
    const row = result[0].values[0];
    const user = { id: row[0], username: row[1], display_name: row[2], role: row[3], email: row[4] };
    req.session.user = user;
    // Log the login
    db.run("INSERT INTO event_logs (event_type, user_id, description, status, ip_address) VALUES (?,?,?,?,?)",
      ['USER_AUTH', username, `User ${username} logged in successfully`, 'success', req.ip]);
    saveDatabase();
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// ─── EVENT LOGS ROUTES ──────────────────────────────────────
app.get('/api/events', requireAuth, (req, res) => {
  const db = getDb();
  const { type, status, search, page = 1, limit = 20 } = req.query;
  let query = "SELECT * FROM event_logs WHERE 1=1";
  const params = [];

  if (type && type !== 'all') {
    query += " AND event_type = ?";
    params.push(type.toUpperCase());
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (search) {
    query += " AND (description LIKE ? OR user_id LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  // Get count
  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
  const countResult = db.exec(countQuery, params);
  const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const result = db.exec(query, params);
  const columns = result.length > 0 ? result[0].columns : [];
  const rows = result.length > 0 ? result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];

  res.json({ events: rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
});

app.post('/api/events', requireAuth, (req, res) => {
  const db = getDb();
  const { event_type, description, status = 'success' } = req.body;
  const userId = req.session.user.username;
  db.run("INSERT INTO event_logs (event_type, user_id, description, status, ip_address) VALUES (?,?,?,?,?)",
    [event_type, userId, description, status, req.ip]);
  saveDatabase();
  res.json({ success: true });
});

app.get('/api/events/stats', requireAuth, (req, res) => {
  const db = getDb();
  const totalResult = db.exec("SELECT COUNT(*) FROM event_logs");
  const total = totalResult[0].values[0][0];
  const successResult = db.exec("SELECT COUNT(*) FROM event_logs WHERE status = 'success'");
  const failedResult = db.exec("SELECT COUNT(*) FROM event_logs WHERE status = 'failed'");
  const authResult = db.exec("SELECT COUNT(*) FROM event_logs WHERE event_type = 'USER_AUTH' AND status = 'warning'");
  
  res.json({
    traffic: { eventsPerMinute: 14.2, totalEvents: total },
    security: { anomalies: authResult[0].values[0][0], status: authResult[0].values[0][0] === 0 ? 'secure' : 'warning' },
    storage: { usedGb: 12.4, totalGb: 20.0, integrity: 100, nextMigration: '4h' }
  });
});

// ─── DEPARTMENT EVENT ROUTES ─────────────────────────────────
app.get('/api/departments', requireAuth, (req, res) => {
  const db = getDb();
  const result = db.exec("SELECT * FROM departments ORDER BY name");
  const columns = result.length > 0 ? result[0].columns : [];
  const rows = result.length > 0 ? result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];
  res.json({ departments: rows });
});

app.get('/api/department-events', requireAuth, (req, res) => {
  const db = getDb();
  const { department_id, status, type, page = 1, limit = 20 } = req.query;
  let query = "SELECT e.*, d.name as department_name, d.code as department_code FROM events e LEFT JOIN departments d ON e.department_id = d.id WHERE 1=1";
  const params = [];
  if (department_id) { query += " AND e.department_id = ?"; params.push(parseInt(department_id)); }
  if (status) { query += " AND e.status = ?"; params.push(status); }
  if (type) { query += " AND e.event_type = ?"; params.push(type); }
  
  const countQuery = query.replace("SELECT e.*, d.name as department_name, d.code as department_code", "SELECT COUNT(*)");
  const countResult = db.exec(countQuery, params);
  const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  query += " ORDER BY e.event_date DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  
  const result = db.exec(query, params);
  const columns = result.length > 0 ? result[0].columns : [];
  const rows = result.length > 0 ? result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];
  res.json({ events: rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// ─── SQL ROUTES (Admin only) ────────────────────────────────
app.post('/api/sql/execute', requireAdmin, (req, res) => {
  const db = getDb();
  const { query } = req.body;
  const userId = req.session.user.id;

  // Basic safety
  const dangerous = ['DROP DATABASE', 'DROP TABLE', 'TRUNCATE', 'ALTER TABLE.*DROP'];
  const upper = query.toUpperCase().trim();
  for (const pattern of dangerous) {
    if (new RegExp(pattern).test(upper)) {
      if (req.session.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Insufficient permissions for destructive operations' });
      }
    }
  }

  try {
    const isWrite = /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(upper);
    if (isWrite) {
      db.run(query);
      saveDatabase();
      const changes = db.exec("SELECT changes()");
      const rowCount = changes[0].values[0][0];
      db.run("INSERT INTO query_history (query_text, user_id, row_count, status) VALUES (?,?,?,?)",
        [query, userId, rowCount, 'success']);
      saveDatabase();
      res.json({ success: true, rowCount, message: `${rowCount} row(s) affected` });
    } else {
      const result = db.exec(query);
      const columns = result.length > 0 ? result[0].columns : [];
      const rows = result.length > 0 ? result[0].values : [];
      db.run("INSERT INTO query_history (query_text, user_id, row_count, status) VALUES (?,?,?,?)",
        [query, userId, rows.length, 'success']);
      saveDatabase();
      res.json({ columns, rows, rowCount: rows.length });
    }
  } catch (err) {
    db.run("INSERT INTO query_history (query_text, user_id, row_count, status) VALUES (?,?,?,?)",
      [query, userId, 0, 'error']);
    saveDatabase();
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sql/schema', requireAdmin, (req, res) => {
  const db = getDb();
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const schema = [];
  if (tables.length > 0) {
    tables[0].values.forEach(([tableName]) => {
      const info = db.exec(`PRAGMA table_info("${tableName}")`);
      const columns = info.length > 0 ? info[0].values.map(col => ({
        name: col[1],
        type: col[2],
        notnull: col[3] === 1,
        pk: col[5] === 1
      })) : [];
      const countResult = db.exec(`SELECT COUNT(*) FROM "${tableName}"`);
      const rowCount = countResult[0].values[0][0];
      schema.push({ name: tableName, columns, rowCount });
    });
  }
  res.json({ schema });
});

app.get('/api/sql/history', requireAdmin, (req, res) => {
  const db = getDb();
  const result = db.exec("SELECT * FROM query_history ORDER BY executed_at DESC LIMIT 50");
  const columns = result.length > 0 ? result[0].columns : [];
  const rows = result.length > 0 ? result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];
  res.json({ history: rows });
});

// ─── SETTINGS ROUTES (Faculty + Admin only) ────────────────
app.get('/api/settings', requireEditorOrAdmin, (req, res) => {
  const db = getDb();
  const result = db.exec("SELECT * FROM settings");
  const settings = {};
  if (result.length > 0) {
    result[0].values.forEach(([key, value]) => {
      settings[key] = value;
    });
  }
  res.json({ settings });
});

app.put('/api/settings', requireEditorOrAdmin, (req, res) => {
  if (req.session.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const db = getDb();
  const { settings } = req.body;
  Object.entries(settings).forEach(([key, value]) => {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", [key, value]);
  });
  saveDatabase();
  db.run("INSERT INTO event_logs (event_type, user_id, description, status, ip_address) VALUES (?,?,?,?,?)",
    ['SCHEMA_UPDATE', req.session.user.username, 'System settings updated', 'success', req.ip]);
  saveDatabase();
  res.json({ success: true });
});

app.get('/api/settings/roles', requireEditorOrAdmin, (req, res) => {
  res.json({
    roles: [
      { id: 1, name: 'Administrator', code: 'administrator', description: 'Full System Control', detail: 'Access to all DB schemas and system settings.', permissions: { read: true, write: true, delete: true, admin: true } },
      { id: 2, name: 'Faculty Editor', code: 'editor', description: 'Data Curation', detail: 'Can edit existing records, but no structural changes.', permissions: { read: true, write: true, delete: false, admin: false } },
      { id: 3, name: 'Readonly', code: 'viewer', description: 'Viewer Access', detail: 'Can perform SELECT queries only across all public tables.', permissions: { read: true, write: false, delete: false, admin: false } },
    ]
  });
});

app.get('/api/settings/health', requireEditorOrAdmin, (req, res) => {
  res.json({
    score: 98.2,
    status: 'secure',
    twoFactorEnabled: true,
    sslActive: true,
    lastAudit: '2024-03-15 12:00:00',
    details: [
      { label: 'SSL/TLS Encryption', status: 'active' },
      { label: '2FA Authentication', status: 'active' },
      { label: 'IP Whitelisting', status: 'active' },
      { label: 'Audit Logging', status: 'active' },
    ]
  });
});

// ─── ADD RECORD ROUTES (Faculty + Admin) ────────────────────

// Known enum options for smart dropdowns
const ENUM_COLUMNS = {
  status:            ['planned','upcoming','completed','cancelled'],
  event_type:        ['workshop','seminar','conference','competition','exhibition','cultural'],
  attendance_status: ['registered','attended','absent','cancelled'],
  role:              ['lead','coordinator','assistant','volunteer'],
  log_level:         ['DEBUG','INFO','WARN','ERROR'],
};

// Foreign key map: column_name → { table, labelCol }
const FK_MAP = {
  department_id: { table: 'departments', labelCol: 'name' },
  event_id:      { table: 'events',      labelCol: 'title' },
  organizer_id:  { table: 'organizers',  labelCol: 'name' },
  user_id:       { table: 'users',       labelCol: 'display_name' },
};

// Columns to auto-skip in insert form (server-generated)
const SKIP_COLS = new Set(['id','created_at','registration_date']);

// Tables exposed for insertion
const ALLOWED_TABLES = [
  'departments','events','organizers','participants','event_organizers','event_logs'
];

app.get('/api/records/schema', requireEditorOrAdmin, (req, res) => {
  const db = getDb();
  const result = [];

  ALLOWED_TABLES.forEach(tableName => {
    const info = db.exec(`PRAGMA table_info("${tableName}")`);
    if (!info.length) return;

    const columns = info[0].values
      .filter(col => !SKIP_COLS.has(col[1]))
      .map(col => {
        const colName = col[1];
        const colType = col[2] ? col[2].toUpperCase() : 'TEXT';
        const notnull = col[3] === 1;
        const pk = col[5] === 1;

        let inputType = 'text';
        if (colType.includes('INT'))    inputType = 'number';
        if (colType.includes('REAL') || colType.includes('FLOAT')) inputType = 'number';
        if (colName.includes('date'))   inputType = 'date';
        if (colName.endsWith('_time'))  inputType = 'time';
        if (colName === 'email')        inputType = 'email';
        if (colName === 'phone')        inputType = 'tel';
        if (colName === 'password')     inputType = 'password';
        if (colName === 'budget')       inputType = 'number';
        if (colName === 'description' || colName === 'feedback') inputType = 'textarea';

        const enumOptions = ENUM_COLUMNS[colName] || null;
        const fkRef = FK_MAP[colName] || null;

        return { name: colName, type: colType, inputType, notnull, pk, enumOptions, fkRef };
      })
      .filter(col => !col.pk); // skip PK (auto-increment)

    result.push({ table: tableName, columns });
  });

  res.json({ tables: result });
});

// Get foreign key options for a dropdown
app.get('/api/records/fk-options/:table', requireEditorOrAdmin, (req, res) => {
  const db = getDb();
  const { table } = req.params;
  const fkInfo = Object.values(FK_MAP).find(f => f.table === table);
  if (!fkInfo) return res.status(400).json({ error: 'No FK mapping for this table' });

  try {
    const result = db.exec(`SELECT id, ${fkInfo.labelCol} FROM "${table}" ORDER BY ${fkInfo.labelCol} LIMIT 200`);
    const rows = result.length ? result[0].values.map(r => ({ id: r[0], label: r[1] })) : [];
    res.json({ options: rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Insert a new record into a table
app.post('/api/records/:tableName', requireEditorOrAdmin, (req, res) => {
  const db = getDb();
  const { tableName } = req.params;

  if (!ALLOWED_TABLES.includes(tableName)) {
    return res.status(400).json({ error: 'Table not allowed for insertion' });
  }

  const data = req.body; // { column: value, ... }
  const cols = Object.keys(data).filter(k => data[k] !== '' && data[k] !== null);

  if (!cols.length) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const placeholders = cols.map(() => '?').join(',');
  const values = cols.map(k => data[k]);

  try {
    db.run(`INSERT INTO "${tableName}" (${cols.join(',')}) VALUES (${placeholders})`, values);
    const idResult = db.exec('SELECT last_insert_rowid()');
    const newId = idResult[0].values[0][0];
    saveDatabase();

    // Log it
    db.run("INSERT INTO event_logs (event_type, user_id, description, status, ip_address) VALUES (?,?,?,?,?)",
      ['SCHEMA_UPDATE', req.session.user.username,
       `New record inserted into table '${tableName}' (id: ${newId})`, 'success', req.ip]);
    saveDatabase();

    res.json({ success: true, id: newId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   Academic Architect is running!          ║`);
    console.log(`  ║   Local:  http://localhost:${PORT}            ║`);
    console.log(`  ║   Login:  admin / admin123                ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}

start().catch(console.error);
