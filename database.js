const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'academic.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  seedData();
  saveDatabase();

  return db;
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      head_of_department TEXT,
      building TEXT,
      floor INTEGER,
      phone TEXT,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      venue TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      budget REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS organizers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department_id INTEGER,
      role TEXT DEFAULT 'coordinator',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      registration_date TEXT DEFAULT (datetime('now')),
      attendance_status TEXT DEFAULT 'registered',
      feedback TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_organizers (
      event_id INTEGER,
      organizer_id INTEGER,
      PRIMARY KEY (event_id, organizer_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (organizer_id) REFERENCES organizers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_text TEXT NOT NULL,
      user_id INTEGER,
      executed_at TEXT DEFAULT (datetime('now')),
      row_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      event_type TEXT NOT NULL,
      user_id TEXT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      ip_address TEXT
    )
  `);
}

function seedData() {
  // Check if already seeded
  const result = db.exec("SELECT COUNT(*) as count FROM departments");
  if (result.length > 0 && result[0].values[0][0] > 0) return;

  // --- Users ---
  const users = [
    ['admin', 'admin123', 'Dr. Priya Sharma', 'administrator', 'priya.sharma@academic.edu'],
    ['faculty', 'faculty123', 'Prof. Arjun Mehta', 'editor', 'arjun.mehta@academic.edu'],
    ['viewer', 'viewer123', 'Sneha Iyer', 'viewer', 'sneha.iyer@academic.edu'],
  ];
  users.forEach(u => {
    db.run("INSERT INTO users (username, password, display_name, role, email) VALUES (?,?,?,?,?)", u);
  });

  // --- Departments ---
  const departments = [
    ['Computer Science', 'CS', 'Dr. Priya Sharma', 'Engineering Block', 3, '+91-98201-10101', 'cs@academic.edu'],
    ['Electrical Engineering', 'EE', 'Prof. Rajesh Nair', 'Engineering Block', 2, '+91-98201-10102', 'ee@academic.edu'],
    ['Mathematics', 'MATH', 'Dr. Kavitha Menon', 'Science Building', 4, '+91-98201-10103', 'math@academic.edu'],
    ['Physics', 'PHY', 'Prof. Suresh Babu', 'Science Building', 1, '+91-98201-10104', 'physics@academic.edu'],
    ['Management Studies', 'MGMT', 'Dr. Anita Desai', 'Business Tower', 5, '+91-98201-10105', 'mgmt@academic.edu'],
  ];
  departments.forEach(d => {
    db.run("INSERT INTO departments (name, code, head_of_department, building, floor, phone, email) VALUES (?,?,?,?,?,?,?)", d);
  });

  // --- Organizers ---
  const organizers = [
    ['Dr. Priya Sharma', 'priya.sharma@academic.edu', '+91-98201-11001', 1, 'lead'],
    ['Prof. Arjun Mehta', 'arjun.mehta@academic.edu', '+91-98201-11002', 1, 'coordinator'],
    ['Deepa Krishnan', 'deepa.krishnan@academic.edu', '+91-98201-11003', 2, 'coordinator'],
    ['Vikram Rao', 'vikram.rao@academic.edu', '+91-98201-11004', 2, 'assistant'],
    ['Dr. Kavitha Menon', 'kavitha.menon@academic.edu', '+91-98201-11005', 3, 'lead'],
    ['Rohit Agarwal', 'rohit.agarwal@academic.edu', '+91-98201-11006', 3, 'coordinator'],
    ['Prof. Suresh Babu', 'suresh.babu@academic.edu', '+91-98201-11007', 4, 'lead'],
    ['Meena Pillai', 'meena.pillai@academic.edu', '+91-98201-11008', 4, 'assistant'],
    ['Dr. Anita Desai', 'anita.desai@academic.edu', '+91-98201-11009', 5, 'lead'],
    ['Sanjay Joshi', 'sanjay.joshi@academic.edu', '+91-98201-11010', 5, 'coordinator'],
    ['Pooja Nambiar', 'pooja.nambiar@academic.edu', '+91-98201-11011', 1, 'volunteer'],
    ['Karthik Subramaniam', 'karthik.subramaniam@academic.edu', '+91-98201-11012', 2, 'volunteer'],
    ['Divya Rajan', 'divya.rajan@academic.edu', '+91-98201-11013', 3, 'assistant'],
    ['Amit Tiwari', 'amit.tiwari@academic.edu', '+91-98201-11014', 4, 'coordinator'],
    ['Nisha Gupta', 'nisha.gupta@academic.edu', '+91-98201-11015', 5, 'assistant'],
  ];
  organizers.forEach(o => {
    db.run("INSERT INTO organizers (name, email, phone, department_id, role) VALUES (?,?,?,?,?)", o);
  });

  // --- Events ---
  const events = [
    [1, 'Annual Hackathon 2024', 'A 48-hour coding marathon for innovative solutions in AI and ML', 'competition', '2024-03-15', '09:00', '18:00', 'Main Auditorium', 'completed', 15000],
    [1, 'Workshop: Cloud Computing with AWS', 'Hands-on cloud infrastructure workshop', 'workshop', '2024-04-02', '10:00', '16:00', 'CS Lab 301', 'completed', 3000],
    [1, 'Guest Lecture: Future of Quantum Computing', 'Industry expert keynote on quantum advances', 'seminar', '2024-04-18', '14:00', '16:00', 'Lecture Hall A', 'completed', 1500],
    [2, 'Robotics Exhibition', 'Showcase of student-built autonomous robots', 'exhibition', '2024-03-22', '10:00', '17:00', 'EE Workshop Hall', 'completed', 8000],
    [2, 'IoT Innovation Challenge', 'Inter-department IoT project competition', 'competition', '2024-05-10', '09:00', '17:00', 'Innovation Center', 'completed', 12000],
    [3, 'Math Olympiad Regional Qualifier', 'Competitive mathematics assessment for regional teams', 'competition', '2024-04-05', '08:00', '13:00', 'Exam Hall B', 'completed', 2500],
    [3, 'Seminar: Applied Statistics in Research', 'Faculty seminar on modern statistical methods', 'seminar', '2024-05-20', '15:00', '17:00', 'Math Dept Seminar Room', 'completed', 500],
    [4, 'Physics Lab Open Day', 'Public demonstration of physics experiments', 'exhibition', '2024-03-28', '10:00', '15:00', 'Physics Lab Complex', 'completed', 4000],
    [4, 'Astrophysics Night: Telescope Viewing', 'Night sky observation event with expert commentary', 'cultural', '2024-04-12', '20:00', '23:00', 'Observatory Terrace', 'completed', 2000],
    [5, 'Business Plan Competition', 'Student entrepreneurship pitch competition', 'competition', '2024-04-25', '09:00', '17:00', 'Business Tower Auditorium', 'completed', 10000],
    [5, 'Leadership Summit 2024', 'Annual leadership and management conference', 'conference', '2024-05-15', '09:00', '18:00', 'Grand Conference Hall', 'completed', 25000],
    [1, 'AI Research Symposium', 'Faculty and graduate student research presentations', 'conference', '2024-06-01', '09:00', '17:00', 'CS Auditorium', 'upcoming', 7000],
    [2, 'PCB Design Workshop', 'Practical PCB design and fabrication training', 'workshop', '2024-06-08', '10:00', '16:00', 'EE Lab 205', 'upcoming', 3500],
    [3, 'Cryptography Bootcamp', 'Intensive weekend workshop on modern cryptography', 'workshop', '2024-06-15', '09:00', '17:00', 'Math Lab 102', 'upcoming', 4000],
    [4, 'Physics Department Annual Fest', 'Annual cultural and academic festival', 'cultural', '2024-06-22', '10:00', '22:00', 'Physics Block Grounds', 'upcoming', 18000],
    [5, 'Industry Connect: CEO Roundtable', 'Networking event with industry leaders', 'seminar', '2024-06-28', '14:00', '18:00', 'Executive Boardroom', 'upcoming', 6000],
    [1, 'Open Source Contribution Drive', 'Week-long open source contribution event', 'workshop', '2024-07-01', '09:00', '17:00', 'CS Lab 401', 'planned', 2000],
    [2, 'Smart Grid Technology Seminar', 'Seminar on smart grid modernization', 'seminar', '2024-07-08', '14:00', '17:00', 'EE Seminar Hall', 'planned', 1000],
    [3, 'Data Science Career Fair', 'Career fair focused on data science roles', 'conference', '2024-07-15', '10:00', '16:00', 'Main Hall', 'planned', 5000],
    [4, 'Nanotechnology Workshop', 'Hands-on nanofabrication techniques', 'workshop', '2024-07-20', '10:00', '15:00', 'Nano Lab', 'planned', 6500],
    [5, 'Startup Incubator Demo Day', 'Final presentations from incubator cohort', 'exhibition', '2024-07-25', '13:00', '18:00', 'Innovation Hub', 'planned', 3000],
    [1, 'Cybersecurity CTF Challenge', 'Capture-the-flag security competition', 'competition', '2024-08-02', '09:00', '21:00', 'CS Lab 301', 'planned', 8000],
    [2, 'Renewable Energy Conference', 'Annual conference on renewable energy systems', 'conference', '2024-08-10', '09:00', '17:00', 'Grand Conference Hall', 'planned', 20000],
    [3, 'Statistics with Python Workshop', 'Applied statistics using Python libraries', 'workshop', '2024-08-15', '10:00', '16:00', 'Computer Lab 201', 'planned', 2500],
    [4, 'Space Week Celebrations', 'Week-long events celebrating space exploration', 'cultural', '2024-08-20', '09:00', '20:00', 'Various Venues', 'planned', 15000],
    [5, 'HR Analytics Masterclass', 'Advanced workshop on HR data analytics', 'workshop', '2024-08-25', '10:00', '17:00', 'Business Tower Room 301', 'planned', 4000],
    [1, 'Web Development Bootcamp', 'Full-stack web development intensive', 'workshop', '2024-09-01', '09:00', '17:00', 'CS Lab 201', 'planned', 5000],
    [2, 'Drone Technology Showcase', 'Student drone projects demonstration', 'exhibition', '2024-09-08', '10:00', '15:00', 'Open Ground', 'planned', 7000],
    [3, 'Mathematical Modeling Competition', 'Applied math modeling challenge', 'competition', '2024-09-15', '08:00', '17:00', 'Exam Hall A', 'planned', 3500],
    [5, 'Annual Convocation Ceremony', 'Graduation ceremony and awards', 'cultural', '2024-09-30', '10:00', '14:00', 'Main Auditorium', 'planned', 50000],
  ];
  events.forEach(e => {
    db.run("INSERT INTO events (department_id, title, description, event_type, event_date, start_time, end_time, venue, status, budget) VALUES (?,?,?,?,?,?,?,?,?,?)", e);
  });

  // --- Event Organizers (junction) ---
  const eventOrganizers = [
    [1,1],[1,2],[1,11],[2,2],[2,11],[3,1],[4,3],[4,4],[4,12],[5,3],[5,4],
    [6,5],[6,6],[6,13],[7,5],[7,6],[8,7],[8,8],[8,14],[9,7],[9,8],
    [10,9],[10,10],[10,15],[11,9],[11,10],[12,1],[12,2],[13,3],[13,4],
    [14,5],[14,6],[15,7],[15,8],[16,9],[16,10],[17,1],[18,3],[19,5],[20,7],
    [21,9],[22,1],[22,2],[23,3],[24,5],[25,7],[26,9],[27,1],[28,3],[29,5],[30,9],
  ];
  eventOrganizers.forEach(eo => {
    db.run("INSERT OR IGNORE INTO event_organizers (event_id, organizer_id) VALUES (?,?)", eo);
  });

  // --- Participants ---
  const firstNames = ['Aarav','Aditi','Akash','Ananya','Aryan','Bhavna','Chirag','Deepika','Farhan','Gayatri','Harsh','Isha','Jai','Kavya','Lakshmi','Manish','Neha','Om','Pallavi','Rahul','Riya','Sachin','Tanvi','Uday','Vandana','Yash'];
  const lastNames = ['Sharma','Patel','Iyer','Mehta','Nair','Reddy','Joshi','Gupta','Agarwal','Singh','Kulkarni','Pillai','Rao','Tiwari','Desai','Menon','Bose','Chandra','Rajan','Kumar','Shah','Verma','Mishra','Das','Malhotra','Bhat'];
  const deptNames = ['Computer Science','Electrical Engineering','Mathematics','Physics','Management Studies','External'];
  const attendStatuses = ['registered','attended','absent','cancelled'];
  const feedbacks = [
    'Excellent event, learned a lot!',
    'Good organization, would attend again.',
    'Very informative session.',
    'Could have been more hands-on.',
    'Great networking opportunity.',
    'The venue was perfect.',
    'Would recommend to colleagues.',
    'Looking forward to the next one!',
    null, null, null
  ];

  for (let i = 0; i < 80; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 7 + 3) % lastNames.length];
    const eventId = (i % 30) + 1;
    const dept = deptNames[i % deptNames.length];
    const status = attendStatuses[i % attendStatuses.length];
    const feedback = feedbacks[i % feedbacks.length];
    const regDate = `2024-0${Math.floor(i/20) + 2}-${String((i % 28) + 1).padStart(2, '0')}`;
    db.run(
      "INSERT INTO participants (event_id, name, email, department, registration_date, attendance_status, feedback) VALUES (?,?,?,?,?,?,?)",
      [eventId, `${fn} ${ln}`, `${fn.toLowerCase()}.${ln.toLowerCase()}@academic.edu`, dept, regDate, status, feedback]
    );
  }

  // --- Event Logs (system activity) ---
  const logEntries = [
    ['2024-03-15 09:12:33', 'SCHEMA_UPDATE', 'admin', 'Modified curriculum constraints for CS-101 module prerequisites table', 'success', '192.168.1.44'],
    ['2024-03-15 09:15:01', 'USER_AUTH', 'admin', 'Authorized session initiated from IP 192.168.1.44', 'success', '192.168.1.44'],
    ['2024-03-15 09:30:00', 'BACKUP', 'system', 'Full database backup to remote S3 bucket initialized', 'processing', '10.0.0.1'],
    ['2024-03-15 09:45:22', 'DATA_ERROR', 'faculty', 'Duplicate entry \'A-901\' for key \'PRIMARY\' in table enrollments', 'failed', '192.168.1.52'],
    ['2024-03-15 10:00:00', 'DATA_EXPORT', 'admin', 'Student demographic report exported for Office of Registrar', 'success', '192.168.1.44'],
    ['2024-03-15 10:15:00', 'SCHEMA_UPDATE', 'admin', 'Added new column "advisor_id" to students table', 'success', '192.168.1.44'],
    ['2024-03-15 10:30:00', 'USER_AUTH', 'viewer', 'Login attempt from unrecognized device', 'warning', '203.45.67.89'],
    ['2024-03-15 10:45:00', 'DATA_EXPORT', 'faculty', 'Course enrollment summary for Spring 2024 exported', 'success', '192.168.1.52'],
    ['2024-03-15 11:00:00', 'BACKUP', 'system', 'Incremental backup completed successfully', 'success', '10.0.0.1'],
    ['2024-03-15 11:15:00', 'SCHEMA_UPDATE', 'admin', 'Updated foreign key constraints on event_organizers junction table', 'success', '192.168.1.44'],
    ['2024-03-15 11:30:00', 'USER_AUTH', 'faculty', 'Password changed successfully', 'success', '192.168.1.52'],
    ['2024-03-15 11:45:00', 'DATA_EXPORT', 'admin', 'Department budget allocation report generated', 'success', '192.168.1.44'],
    ['2024-03-15 12:00:00', 'QUERY', 'viewer', 'SELECT query executed on participants view (142 rows)', 'success', '192.168.2.10'],
    ['2024-03-15 12:15:00', 'SCHEMA_UPDATE', 'admin', 'Created index idx_events_date on events(event_date)', 'success', '192.168.1.44'],
    ['2024-03-15 12:30:00', 'USER_AUTH', 'admin', 'Two-factor authentication verification passed', 'success', '192.168.1.44'],
    ['2024-03-15 12:45:00', 'DATA_ERROR', 'system', 'Constraint violation: NOT NULL on events.title during bulk import', 'failed', '10.0.0.1'],
    ['2024-03-15 13:00:00', 'BACKUP', 'system', 'Log archive rotation completed - 2.3 GB freed', 'success', '10.0.0.1'],
    ['2024-03-15 13:15:00', 'QUERY', 'faculty', 'Complex JOIN query on departments + events (response time: 45ms)', 'success', '192.168.1.52'],
    ['2024-03-15 13:30:00', 'DATA_EXPORT', 'admin', 'Full event calendar exported to iCal format', 'success', '192.168.1.44'],
    ['2024-03-15 13:45:00', 'USER_AUTH', 'viewer', 'Session timeout after 30 minutes of inactivity', 'warning', '192.168.2.10'],
    ['2024-03-15 14:00:00', 'SCHEMA_UPDATE', 'admin', 'Altered participants table - added feedback TEXT column', 'success', '192.168.1.44'],
    ['2024-03-15 14:15:00', 'QUERY', 'admin', 'Analytics dashboard query refreshed (avg response: 12ms)', 'success', '192.168.1.44'],
    ['2024-03-15 14:30:00', 'BACKUP', 'system', 'Scheduled cold storage migration initiated', 'processing', '10.0.0.1'],
    ['2024-03-15 14:45:00', 'DATA_EXPORT', 'faculty', 'Organizer contact directory exported to CSV', 'success', '192.168.1.52'],
    ['2024-03-15 15:00:00', 'USER_AUTH', 'admin', 'New API key generated for external integration', 'success', '192.168.1.44'],
  ];
  logEntries.forEach(l => {
    db.run("INSERT INTO event_logs (timestamp, event_type, user_id, description, status, ip_address) VALUES (?,?,?,?,?,?)", l);
  });

  // --- Settings ---
  const settings = [
    ['db_host', 'localhost'],
    ['db_port', '5432'],
    ['db_name', 'academic_main_v2'],
    ['db_timeout', '30'],
    ['db_ssl_mode', 'require'],
    ['audit_logging', 'true'],
    ['log_level', 'INFO'],
    ['log_retention', '90'],
    ['log_utilization_gb', '12.4'],
    ['log_total_gb', '20.0'],
  ];
  settings.forEach(s => {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?,?)", s);
  });
}

module.exports = { initDatabase, getDb, saveDatabase };
