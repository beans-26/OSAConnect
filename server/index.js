const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'osa-secret-key-2024';

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Auth Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

// Real-time notifications
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-osa', () => {
        socket.join('osa-staff');
        console.log('Staff joined room');
    });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Missing request body' });
        }

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log('Login attempt for:', username);

        let user;
        // Search in users table (Staff/Guard)
        const [staffRows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (staffRows.length > 0) {
            user = staffRows[0];
        } else {
            // Search in students table
            const [studentRows] = await db.query('SELECT * FROM students WHERE student_id = ?', [username]);
            if (studentRows.length > 0) {
                user = studentRows[0];
                user.username = user.student_id;
                user.role = 'Student';
            }
        }

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Account not found or password not set.' });
        }

        // Support both hashed and legacy plain text
        let isValid = false;
        try {
            if (user.password_hash.startsWith('$2')) {
                isValid = await bcrypt.compare(password, user.password_hash);
            } else {
                isValid = (password === user.password_hash);
            }
        } catch (bcryptErr) {
            console.error('Bcrypt error:', bcryptErr);
            return res.status(500).json({ error: 'Error validating password security.' });
        }

        if (!isValid) return res.status(401).json({ error: 'Incorrect password. Please try again.' });

        // Ensure we have a valid ID for the token
        const userId = user.id || user.student_id;
        const token = jwt.sign(
            { id: userId, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            id: userId,
            token,
            role: user.role,
            name: (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`).trim() || user.username,
            student_id: user.student_id || null
        });
    } catch (err) {
        console.error('--- LOGIN ERROR ---');
        console.error('Context:', { username: req.body?.username });
        console.error('Error Object:', err);

        // Detailed error for debugging (will show up in Railway logs)
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorCode = err.code || 'NO_CODE';

        res.status(500).json({
            error: `Server Error: ${errorMessage || 'Unknown Error'}`,
            code: errorCode,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { student_id, password, first_name, last_name, email, course, year_level, department_id } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'This Student ID is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO students (student_id, password_hash, first_name, last_name, email, course, year_level, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [student_id, hashedPassword, first_name, last_name, email, course, year_level, department_id]
        );

        res.json({ message: 'Registration successful! You can now log in.' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please check your details.' });
    }
});

app.get('/api/auth/departments', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM departments');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guard API: Auto-fetch student
app.get('/api/students/id/:student_id', authenticate, authorize(['Staff', 'Admin', 'Guard']), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, d.name as department_name 
            FROM students s 
            LEFT JOIN departments d ON s.department_id = d.id 
            WHERE s.student_id = ?`, [req.params.student_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dashboard Stats
app.get('/api/stats', authenticate, authorize(['Staff', 'Admin']), async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM violations');
        const [active] = await db.query('SELECT COUNT(*) as count FROM violations WHERE status IN ("Pending Review", "Ongoing")');
        const [completed] = await db.query('SELECT COUNT(*) as count FROM violations WHERE status = "Completed"');
        const [deptStats] = await db.query(`
            SELECT d.code, COUNT(v.id) as count 
            FROM departments d 
            LEFT JOIN students s ON s.department_id = d.id 
            LEFT JOIN violations v ON v.student_record_id = s.id 
            GROUP BY d.id
        `);

        res.json({
            total: total[0].count,
            active: active[0].count,
            completed: completed[0].count,
            departments: deptStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Violations Management
app.get('/api/violations', authenticate, async (req, res) => {
    const { status, student_id } = req.query;

    // Security: Students can only see their own violations
    if (req.user.role === 'Student' && req.user.username !== student_id) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    let query = `
        SELECT v.*, s.first_name, s.last_name, s.student_id, d.name as department_name,
        (SELECT SUM(hours_rendered) FROM service_logs WHERE violation_id = v.id) as rendered_hours
        FROM violations v 
        JOIN students s ON v.student_record_id = s.id 
        LEFT JOIN departments d ON s.department_id = d.id
    `;
    const params = [];
    if (status) {
        query += ' WHERE v.status = ?';
        params.push(status);
    } else if (student_id) {
        query += ' WHERE s.student_id = ?';
        params.push(student_id);
    }
    query += ' ORDER BY v.date_committed DESC';

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/violations', authenticate, authorize(['Staff', 'Admin', 'Guard']), upload.single('evidence'), async (req, res) => {
    const { student_id, type, severity, description } = req.body;
    const recorded_by = req.user.id;
    const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        // Find existing student or create a "Temporary" one for testing
        let [studentRows] = await db.query('SELECT id FROM students WHERE student_id = ?', [student_id]);

        let student_record_id;
        if (studentRows.length === 0) {
            console.log(`ID ${student_id} not found. Auto-creating temporary student record for testing.`);
            const [newStudent] = await db.query(
                'INSERT INTO students (student_id, password_hash, first_name, last_name, department_id, course, year_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [student_id, 'StuPass', 'Temporary', 'Student', 1, 'GENERIC', 1]
            );
            student_record_id = newStudent.insertId;
        } else {
            student_record_id = studentRows[0].id;
        }

        console.log(`Saving violation for ${student_id} (Internal ID: ${student_record_id})`);

        const [result] = await db.query(
            'INSERT INTO violations (student_record_id, type, severity, description, recorded_by, evidence_url, status) VALUES (?, ?, ?, ?, ?, ?, "Pending Review")',
            [student_record_id, type, severity, description, recorded_by, evidence_url]
        );

        io.to('osa-staff').emit('new-violation', {
            id: result.insertId,
            type,
            student_id: student_id
        });

        res.json({ id: result.insertId, message: 'Violation recorded successfully (Test ID accepted).' });
    } catch (err) {
        console.error('Error saving violation:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/violations/:id/approve', authenticate, authorize(['Staff', 'Admin']), async (req, res) => {
    const { hours } = req.body;
    try {
        await db.query('UPDATE violations SET status = "Ongoing", total_hours_required = ? WHERE id = ?', [hours, req.params.id]);
        res.json({ message: 'Violation approved and hours assigned.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Service Logs
app.post('/api/service-logs', authenticate, authorize(['Staff', 'Admin']), async (req, res) => {
    const { violation_id, hours_rendered, date_rendered, supervisor, remarks } = req.body;
    try {
        await db.query(
            'INSERT INTO service_logs (violation_id, hours_rendered, date_rendered, supervisor, remarks) VALUES (?, ?, ?, ?, ?)',
            [violation_id, hours_rendered, date_rendered, supervisor, remarks]
        );

        // Check if completed
        const [violation] = await db.query('SELECT total_hours_required FROM violations WHERE id = ?', [violation_id]);
        const [rendered] = await db.query('SELECT SUM(hours_rendered) as total FROM service_logs WHERE violation_id = ?', [violation_id]);

        if (rendered[0].total >= violation[0].total_hours_required) {
            await db.query('UPDATE violations SET status = "Completed" WHERE id = ?', [violation_id]);
        }

        res.json({ message: 'Hours logged successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Service Sessions (Timer)
app.post('/api/service/start', authenticate, async (req, res) => {
    const { violation_id, student_id } = req.body;
    try {
        // Check if there's already an active session
        const [existing] = await db.query('SELECT id FROM service_sessions WHERE student_id = ? AND is_active = TRUE', [student_id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'You already have an active session running.' });
        }

        await db.query(
            'INSERT INTO service_sessions (violation_id, student_id, start_time, is_active) VALUES (?, ?, NOW(), TRUE)',
            [violation_id, student_id]
        );
        res.json({ message: 'Service session started! Timer is now running.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/service/end', authenticate, async (req, res) => {
    const { student_id, session_id } = req.body;
    try {
        const [sessions] = await db.query('SELECT * FROM service_sessions WHERE id = ? AND student_id = ? AND is_active = TRUE', [session_id, student_id]);
        if (sessions.length === 0) return res.status(404).json({ error: 'No active session found.' });

        const session = sessions[0];
        const endTime = new Date();
        const startTime = new Date(session.start_time);
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = (diffMins / 60).toFixed(2);

        await db.query(
            'UPDATE service_sessions SET end_time = NOW(), is_active = FALSE, total_minutes = ? WHERE id = ?',
            [diffMins, session_id]
        );

        // Also log it to service_logs
        await db.query(
            'INSERT INTO service_logs (violation_id, hours_rendered, date_rendered, supervisor, remarks) VALUES (?, ?, CURDATE(), "Auto-Timer", ?)',
            [session.violation_id, Math.round(hours), `Session lasted ${diffMins} minutes.`]
        );

        // Check if violation is completed
        const [vStatus] = await db.query('SELECT total_hours_required FROM violations WHERE id = ?', [session.violation_id]);
        const [rendered] = await db.query('SELECT SUM(hours_rendered) as total FROM service_logs WHERE violation_id = ?', [session.violation_id]);

        if (rendered[0].total >= vStatus[0].total_hours_required) {
            await db.query('UPDATE violations SET status = "Completed" WHERE id = ?', [session.violation_id]);
        }

        res.json({
            message: 'Session ended.',
            minutes: diffMins,
            hours: hours
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/service/active/:student_id', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM service_sessions WHERE student_id = ? AND is_active = TRUE', [req.params.student_id]);
        res.json(rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Archive
app.put('/api/violations/:id/archive', authenticate, authorize(['Staff', 'Admin']), async (req, res) => {
    try {
        await db.query('UPDATE violations SET status = "Archived", archived_at = NOW() WHERE id = ?', [req.params.id]);
        res.json({ message: 'Record moved to archive' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Student Data Management

app.get('/api/students', authenticate, authorize(['Staff', 'Admin']), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, d.name as department_name 
            FROM students s 
            LEFT JOIN departments d ON s.department_id = d.id 
            ORDER BY s.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/students', authenticate, authorize(['Staff', 'Admin']), async (req, res) => {
    const { student_id, password_hash, first_name, last_name, email, course, year_level, department_id } = req.body;
    try {
        await db.query(
            'INSERT INTO students (student_id, password_hash, first_name, last_name, email, course, year_level, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [student_id, password_hash, first_name, last_name, email, course, year_level, department_id]
        );
        res.json({ message: 'Student registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departments', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM departments');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const [tables] = await db.query('SHOW TABLES');
        const [deptCount] = await db.query('SELECT COUNT(*) as count FROM departments');
        res.json({
            status: 'OK',
            database: 'Connected',
            tables_found: tables.length,
            departments: deptCount[0].count,
            time: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
});

server.listen(PORT, '0.0.0.0', async () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
                break;
            }
        }
    }

    console.log(`
🚀 OSA Connect Server is running!
🏠 Local:            http://localhost:${PORT}
📱 Mobile (Network): http://${localIp}:${PORT}

Use the Mobile URL to access the app from your phone on the same Wi-Fi.
    `);

    try {
        await db.query('SELECT 1');
        console.log('✅ Database connected successfully!');

        // --- AUTO-SEED DEPARTMENTS ---
        const [rows] = await db.query('SELECT COUNT(*) as count FROM departments');
        if (rows[0].count === 0) {
            console.log('🌱 Seeding default departments...');
            await db.query(`
                INSERT INTO departments (name, code) VALUES 
                ('College of Engineering', 'COE'),
                ('College of Arts and Sciences', 'CAS'),
                ('College of Business', 'COB'),
                ('College of Information Technology', 'CIT')
            `);
            console.log('✅ Seeding complete!');
        }
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
});
