/**
 * OSA Connect: System Core
 * Handles Auth, Routing, Real-time Notifs, QR Scanning, and Multi-role Modules
 * Mobile-responsive with bottom navigation
 */
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.origin + '/api';
    const socket = io();

    // Auth State
    let currentUser = {
        id: localStorage.getItem('osa_id'),
        token: localStorage.getItem('osa_token'),
        role: localStorage.getItem('osa_role'),
        name: localStorage.getItem('osa_name'),
        student_id: localStorage.getItem('osa_student_id')
    };

    let html5QrCode = null;

    // API Fetch Wrapper with Auth
    const apiFetch = async (url, options = {}) => {
        const headers = {
            'Authorization': `Bearer ${currentUser.token}`,
            ...(options.headers || {})
        };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        } else {
            delete headers['Content-Type'];
        }

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            logoutBtn.click();
            throw new Error('Session expired');
        }
        return response;
    };

    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const regDeptSelect = document.getElementById('reg-dept');

    const pageContent = document.getElementById('page-content');
    const mainNav = document.getElementById('main-nav');
    const logoutBtn = document.getElementById('logout-btn');
    const modalContainer = document.getElementById('modal-container');
    const closeModalBtn = document.querySelector('.close-modal');
    const notifToast = document.getElementById('notif-toast');
    const toastMsg = document.getElementById('toast-msg');

    // Mobile elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');
    const mobileNavItems = document.getElementById('mobile-nav-items');

    // -------------------------------------------------------------------------
    // MOBILE SIDEBAR TOGGLE
    // -------------------------------------------------------------------------
    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    };

    mobileMenuBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & INITIALIZATION
    // -------------------------------------------------------------------------
    const init = () => {
        if (currentUser.token) {
            showApp();
        } else {
            showLogin();
        }
        loadDepartments();
        setupLogout();
    };

    const loadDepartments = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/departments`);
            const depts = await res.json();
            regDeptSelect.innerHTML = '<option value="">Select Department</option>' +
                depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        } catch (err) {
            console.error('Failed to load departments');
        }
    };

    const showLogin = () => {
        loginScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        registerContainer.classList.add('hidden');
    };

    const showApp = () => {
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');

        document.getElementById('user-display-name').innerText = currentUser.name;
        document.getElementById('user-display-role').innerText = currentUser.role;
        document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.name}&background=6366f1&color=fff`;

        setupNavigation();
        setupMobileNav();
        setupLogout();

        if (currentUser.role === 'Staff' || currentUser.role === 'Admin') {
            loadModule('dashboard');
            socket.emit('join-osa');
        } else if (currentUser.role === 'Guard') {
            loadModule('guard-report');
        } else if (currentUser.role === 'Student') {
            loadModule('student-dashboard');
        }
    };

    // Toggle Forms
    showRegisterLink.onclick = (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
        document.getElementById('login-error').classList.add('hidden');
    };

    showLoginLink.onclick = (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        document.getElementById('login-error').classList.add('hidden');
    };

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const loginError = document.getElementById('login-error');
        loginError.classList.add('hidden');

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const data = await res.json();
            currentUser = {
                id: data.id,
                token: data.token,
                role: data.role,
                name: data.name,
                student_id: data.student_id
            };

            localStorage.setItem('osa_id', data.id);
            localStorage.setItem('osa_token', data.token);
            localStorage.setItem('osa_role', data.role);
            localStorage.setItem('osa_name', data.name);
            if (data.student_id) localStorage.setItem('osa_student_id', data.student_id);

            showApp();
        } catch (err) {
            loginError.innerText = err.message;
            loginError.classList.remove('hidden');
        }
    };

    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const student_id = document.getElementById('reg-id').value;
        const first_name = document.getElementById('reg-fname').value;
        const last_name = document.getElementById('reg-lname').value;
        const department_id = document.getElementById('reg-dept').value;
        const course = document.getElementById('reg-course').value;
        const year_level = document.getElementById('reg-year').value;
        const password = document.getElementById('reg-pass').value;

        const loginError = document.getElementById('login-error');
        loginError.classList.add('hidden');

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id, first_name, last_name, department_id, course, year_level, password })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Registration failed');
            }

            const data = await res.json();
            alert(data.message);
            showLogin();
        } catch (err) {
            loginError.innerText = err.message;
            loginError.classList.remove('hidden');
        }
    };

    const setupLogout = () => {
        const btn = document.getElementById('logout-btn');
        if (btn) {
            btn.onclick = () => {
                stopQrScanner();
                localStorage.clear();
                location.reload();
            };
        }
    };

    // -------------------------------------------------------------------------
    // 2. NAVIGATION & MODULE LOADING
    // -------------------------------------------------------------------------
    const setupNavigation = () => {
        const role = currentUser.role;
        let items = '';

        if (role === 'Staff' || role === 'Admin') {
            items = `
                <button class="nav-btn active" data-page="dashboard"><i class="fas fa-chart-line"></i> Dashboard</button>
                <button class="nav-btn" data-page="violations-manage"><i class="fas fa-list-check"></i> Manage Violations</button>
                <button class="nav-btn" data-page="archive"><i class="fas fa-archive"></i> Archive</button>
                <button class="nav-btn" data-page="students"><i class="fas fa-user-graduate"></i> Students</button>
                <button class="nav-btn" data-page="qr-scanner"><i class="fas fa-qrcode"></i> QR Scanner</button>
            `;
        } else if (role === 'Guard') {
            items = `
                <button class="nav-btn active" data-page="guard-report"><i class="fas fa-clipboard-check"></i> Violation Report</button>
                <button class="nav-btn" data-page="guard-history"><i class="fas fa-history"></i> Recent Logs</button>
                <button class="nav-btn" data-page="qr-scanner"><i class="fas fa-qrcode"></i> QR Scanner</button>
            `;
        } else if (role === 'Student') {
            items = `
                <button class="nav-btn active" data-page="student-dashboard"><i class="fas fa-home"></i> My Status</button>
                <button class="nav-btn" data-page="student-violations"><i class="fas fa-exclamation-circle"></i> My Violations</button>
                <button class="nav-btn" data-page="my-qr"><i class="fas fa-qrcode"></i> My QR Code</button>
            `;
        }

        mainNav.innerHTML = items;

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadModule(btn.dataset.page);
                closeSidebar();
                syncMobileNav(btn.dataset.page);
            };
        });
    };

    const setupMobileNav = () => {
        const role = currentUser.role;
        let items = '';

        if (role === 'Staff' || role === 'Admin') {
            items = `
                <button class="nav-item active" data-page="dashboard">
                    <i class="fas fa-chart-line"></i>
                    <span>Dashboard</span>
                </button>
                <button class="nav-item" data-page="violations-manage">
                    <i class="fas fa-list-check"></i>
                    <span>Manage</span>
                </button>
                <button class="nav-item" data-page="qr-scanner">
                    <i class="fas fa-qrcode"></i>
                    <span>Scan QR</span>
                </button>
                <button class="nav-item" data-page="students">
                    <i class="fas fa-user-graduate"></i>
                    <span>Students</span>
                </button>
            `;
        } else if (role === 'Guard') {
            items = `
                <button class="nav-item active" data-page="guard-report">
                    <i class="fas fa-clipboard-check"></i>
                    <span>Report</span>
                </button>
                <button class="nav-item" data-page="qr-scanner">
                    <i class="fas fa-qrcode"></i>
                    <span>Scan QR</span>
                </button>
                <button class="nav-item" data-page="guard-history">
                    <i class="fas fa-history"></i>
                    <span>History</span>
                </button>
            `;
        } else if (role === 'Student') {
            items = `
                <button class="nav-item active" data-page="student-dashboard">
                    <i class="fas fa-home"></i>
                    <span>Status</span>
                </button>
                <button class="nav-item" data-page="student-violations">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Violations</span>
                </button>
                <button class="nav-item" data-page="my-qr">
                    <i class="fas fa-qrcode"></i>
                    <span>My QR</span>
                </button>
            `;
        }

        mobileNavItems.innerHTML = items;

        document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadModule(btn.dataset.page);
                syncDesktopNav(btn.dataset.page);
            };
        });
    };

    const syncMobileNav = (page) => {
        document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.page === page);
        });
    };

    const syncDesktopNav = (page) => {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.page === page);
        });
    };

    const loadModule = (page) => {
        // Stop QR scanner if navigating away
        if (page !== 'qr-scanner') {
            stopQrScanner();
        }

        document.getElementById('current-view-title').innerText = page.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        pageContent.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        switch (page) {
            case 'dashboard': renderStaffDashboard(); break;
            case 'violations-manage': renderViolationsManage(); break;
            case 'guard-report': renderGuardReport(); break;
            case 'student-dashboard': renderStudentDashboard(); break;
            case 'guard-history': renderViolationsManage(); break;
            case 'students': renderStudents(); break;
            case 'archive': renderViolationsManage('Archived'); break;
            case 'student-violations': renderViolationsManage(); break;
            case 'qr-scanner': renderQrScanner(); break;
            case 'my-qr': renderMyQrCode(); break;
        }
    };

    // -------------------------------------------------------------------------
    // 3. GUARD MODULE (Auto-fetch & Reporting)
    // -------------------------------------------------------------------------
    const renderStudents = async () => {
        const students = await apiFetch(`${API_URL}/students`).then(res => res.json());
        const depts = await apiFetch(`${API_URL}/departments`).then(res => res.json());

        pageContent.innerHTML = `
            <div class="table-header">
                <h2>Student Registry</h2>
                <div class="header-actions" style="display:flex; gap:12px;">
                    <input type="text" id="search-students-input" placeholder="Search students..." style="padding:10px 16px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-main); color:var(--text-main); outline:none; font-size:0.9rem;">
                    <button class="btn-primary" id="add-student-btn"><i class="fas fa-plus"></i> Add Student</button>
                </div>
            </div>
            <div class="table-container">
                <div class="table-scroll">
                    <table id="students-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Course</th>
                                <th>Year</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderStudentRows(students)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const searchInput = document.getElementById('search-students-input');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = students.filter(s => s.student_id.toLowerCase().includes(term) || `${s.first_name} ${s.last_name}`.toLowerCase().includes(term));
                document.querySelector('#students-table tbody').innerHTML = renderStudentRows(filtered);
                attachStudentActions();
            };
        }

        document.getElementById('add-student-btn').onclick = () => openAddStudentModal(depts);
        attachStudentActions();
    };

    const renderStudentRows = (students) => {
        return students.map(s => `
            <tr>
                <td><strong>${s.student_id}</strong></td>
                <td>${s.first_name} ${s.last_name}</td>
                <td>${s.department_name}</td>
                <td>${s.course}</td>
                <td>${s.year_level}</td>
                <td>
                    <button class="btn-ghost sm view-history-btn" data-id="${s.student_id}">View History</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;">No students registered.</td></tr>';
    };

    const attachStudentActions = () => {
        document.querySelectorAll('.view-history-btn').forEach(btn => {
            btn.onclick = () => {
                const term = btn.dataset.id;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                const manageBtn = document.querySelector('[data-page="violations-manage"]');
                if (manageBtn) manageBtn.classList.add('active');
                loadModule('violations-manage');
                setTimeout(() => {
                    const searchInput = document.getElementById('search-student');
                    if (searchInput) {
                        searchInput.value = term;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }, 500);
            };
        });
    };

    const openAddStudentModal = (depts) => {
        showModal('Register New Student', `
            <form id="add-student-form">
                <div class="form-group">
                    <label>Student ID Number</label>
                    <input type="text" id="add-sid" required placeholder="e.g. Student02">
                </div>
                <div class="form-group">
                    <label>Password (Internal App Login)</label>
                    <input type="password" id="add-spass" required value="StuPass">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" id="add-fname" required>
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" id="add-lname" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <select id="add-sdept" required>
                        ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Course</label>
                    <input type="text" id="add-scourse" required placeholder="e.g. BSCS">
                </div>
                <div class="form-group">
                    <label>Year Level</label>
                    <input type="number" id="add-syear" required min="1" max="5">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-ghost close-modal-btn">Cancel</button>
                    <button type="submit" class="btn-primary">Register Student</button>
                </div>
            </form>
        `);

        document.getElementById('add-student-form').onsubmit = async (e) => {
            e.preventDefault();
            const body = {
                student_id: document.getElementById('add-sid').value,
                password_hash: document.getElementById('add-spass').value,
                first_name: document.getElementById('add-fname').value,
                last_name: document.getElementById('add-lname').value,
                department_id: document.getElementById('add-sdept').value,
                course: document.getElementById('add-scourse').value,
                year_level: document.getElementById('add-syear').value,
                email: `${document.getElementById('add-sid').value}@school.edu`
            };

            const res = await apiFetch(`${API_URL}/students`, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                modalContainer.classList.add('hidden');
                renderStudents();
            }
        };
    };

    const renderGuardReport = () => {
        pageContent.innerHTML = `
            <div class="table-container" style="max-width: 600px; margin: 0 auto;">
                <h2 style="margin-bottom: 1.5rem;"><i class="fas fa-clipboard-check" style="color: var(--primary); margin-right: 8px;"></i>Violation Report</h2>
                <form id="guard-report-form">
                    <div class="form-group">
                        <label>Student ID Number</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="report-student-id" required placeholder="Enter ID or scan QR" style="flex: 1;">
                            <button type="button" id="scan-for-report" class="btn-primary" style="flex-shrink:0;">
                                <i class="fas fa-qrcode"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Violation Type</label>
                        <select id="report-violation-type" required>
                            <option value="">Select Type</option>
                            <option value="Uniform Violation">Uniform Violation</option>
                            <option value="Late Coming">Late Coming</option>
                            <option value="Smoking/Vaping">Smoking/Vaping</option>
                            <option value="Cheating">Cheating</option>
                            <option value="Fighting">Fighting</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Severity</label>
                        <select id="report-severity" required>
                            <option value="Minor">Minor</option>
                            <option value="Major">Major</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Detailed Description</label>
                        <textarea id="report-desc" rows="4" placeholder="Describe the incident..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Evidence (Optional Image)</label>
                        <input type="file" id="report-evidence" accept="image/*" capture="environment" style="padding: 10px;">
                    </div>
                    <div class="form-group">
                        <label>Incident Date & Time</label>
                        <input type="text" value="${new Date().toLocaleString()}" readonly style="background: var(--border); opacity: 0.7;">
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 1rem; font-size: 1rem; justify-content: center;">
                        <i class="fas fa-paper-plane"></i> Submit Report
                    </button>
                </form>
            </div>
        `;

        // QR scan button inside guard report
        document.getElementById('scan-for-report').onclick = () => {
            showModal('Scan Student QR Code', `
                <div id="report-qr-reader" style="width: 100%; border-radius: var(--radius); overflow: hidden;"></div>
                <p style="text-align: center; margin-top: 1rem; color: var(--text-muted);">Point camera at student's QR code</p>
            `);

            setTimeout(() => {
                const qr = new Html5Qrcode("report-qr-reader");
                qr.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decoded) => {
                        document.getElementById('report-student-id').value = decoded;
                        qr.stop().then(() => {
                            modalContainer.classList.add('hidden');
                            showToast('QR Scanned', `Student ID: ${decoded}`);
                        });
                    },
                    () => { }
                ).catch(err => {
                    document.getElementById('report-qr-reader').innerHTML = `
                        <div style="padding: 2rem; text-align: center; color: var(--accent);">
                            <i class="fas fa-camera-slash" style="font-size: 2rem; margin-bottom: 1rem; display:block;"></i>
                            <p>Camera access denied. Please allow camera permissions or type the Student ID manually.</p>
                        </div>
                    `;
                });
            }, 300);
        };

        document.getElementById('guard-report-form').onsubmit = async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('report-student-id').value;

            const formData = new FormData();
            formData.append('student_id', studentId);
            formData.append('type', document.getElementById('report-violation-type').value);
            formData.append('severity', document.getElementById('report-severity').value);
            formData.append('description', document.getElementById('report-desc').value);

            const fileBtn = document.getElementById('report-evidence');
            if (fileBtn.files[0]) {
                formData.append('evidence', fileBtn.files[0]);
            }

            try {
                const res = await apiFetch(`${API_URL}/violations`, {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    showToast('Success', 'Violation recorded. OSA has been notified.');
                    loadModule('guard-report');
                } else {
                    const error = await res.json();
                    alert('Error: ' + (error.error || 'Failed to submit report.'));
                }
            } catch (err) {
                alert('Network error: ' + err.message);
            }
        };
    };

    // -------------------------------------------------------------------------
    // 4. OSA STAFF MODULE (Management & Real-time)
    // -------------------------------------------------------------------------
    const renderStaffDashboard = async () => {
        const stats = await apiFetch(`${API_URL}/stats`).then(res => res.json());

        pageContent.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon red"><i class="fas fa-triangle-exclamation"></i></div>
                    <div class="stat-info"><h3>Total Violations</h3><p>${stats.total}</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div>
                    <div class="stat-info"><h3>Active Cases</h3><p>${stats.active}</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-info"><h3>Completed</h3><p>${stats.completed}</p></div>
                </div>
            </div>
            
            <div class="dashboard-grid" style="display:grid; grid-template-columns: 1fr 350px; gap: 2rem;">
                <div class="table-container">
                    <h2 style="margin-bottom: 1rem;">Pending Review</h2>
                    <div id="pending-list">Loading pending reports...</div>
                </div>
                
                <div class="stats-card-list">
                    <div class="table-container">
                        <h3>Violations by Dept</h3>
                        <div class="dept-stats-list" style="margin-top: 1.5rem;">
                            ${stats.departments.map(d => `
                                <div class="dept-stat-item" style="margin-bottom: 20px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                        <strong>${d.code}</strong>
                                        <span style="color: var(--text-muted);">${d.count} Cases</span>
                                    </div>
                                    <div class="progress-bar-container" style="width:100%;">
                                        <div class="progress-bar" style="width: ${stats.total > 0 ? (d.count / stats.total) * 100 : 0}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const pending = await apiFetch(`${API_URL}/violations?status=Pending Review`).then(res => res.json());
        const list = document.getElementById('pending-list');

        if (pending.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success); display:block; margin-bottom: 10px;"></i>No pending violations to review.</p>';
            return;
        }

        list.innerHTML = `
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Student</th>
                            <th>Type</th>
                            <th>Severity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pending.map(v => `
                            <tr>
                                <td>${new Date(v.date_committed).toLocaleDateString()}</td>
                                <td>${v.student_id}<br><small style="color: var(--text-muted);">${v.first_name} ${v.last_name}</small></td>
                                <td>${v.type}</td>
                                <td><span class="violation-tag tag-${v.severity.toLowerCase()}">${v.severity}</span></td>
                                <td><button class="btn-primary sm approve-btn" data-id="${v.id}" data-name="${v.first_name} ${v.last_name}">Approve</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.onclick = () => openApproveModal(btn.dataset.id, btn.dataset.name);
        });
    };

    const renderViolationsManage = async (statusFilter = '') => {
        let url = `${API_URL}/violations`;
        if (statusFilter) url += `?status=${statusFilter}`;
        if (currentUser.role === 'Student') url = `${API_URL}/violations?student_id=${currentUser.student_id}`;

        const violations = await apiFetch(url).then(res => res.json());

        pageContent.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h2>${statusFilter || 'All'} Violations</h2>
                    <div class="filters">
                        <input type="text" placeholder="Search by Student ID..." id="search-student">
                        <button class="btn-ghost" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
                    </div>
                </div>
                <div class="table-scroll">
                    <table id="violations-table-manage">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Violation</th>
                                <th>Status</th>
                                <th>Hours</th>
                                <th>Progress</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderViolationRows(violations)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const searchInput = document.getElementById('search-student');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = violations.filter(v => v.student_id.toLowerCase().includes(term) || `${v.first_name} ${v.last_name}`.toLowerCase().includes(term));
                document.querySelector('#violations-table-manage tbody').innerHTML = renderViolationRows(filtered);
                attachManageActions();
            };
        }

        attachManageActions();
    };

    const renderViolationRows = (violations) => {
        return violations.map(v => {
            const pct = v.total_hours_required ? (v.rendered_hours / v.total_hours_required) * 100 : 0;
            return `
            <tr>
                <td>${v.student_id}<br><small style="color:var(--text-muted);">${v.first_name} ${v.last_name}</small></td>
                <td>
                    ${v.type} <span class="violation-tag tag-${v.severity.toLowerCase()}">${v.severity}</span>
                    ${v.evidence_url ? `<br><a href="${v.evidence_url}" target="_blank" style="font-size: 0.7rem; color: var(--primary);"><i class="fas fa-image"></i> View Evidence</a>` : ''}
                </td>
                <td><span class="status-badge status-${v.status.toLowerCase().replace(' ', '-')}">${v.status}</span></td>
                <td>${v.rendered_hours || 0} / ${v.total_hours_required}h</td>
                <td>
                    <div class="progress-bar-container" style="width: 100px;">
                        <div class="progress-bar" style="width: ${pct}%"></div>
                    </div>
                </td>
                <td>
                    ${v.status === 'Ongoing' && (currentUser.role === 'Staff' || currentUser.role === 'Admin') ? `<button class="btn-ghost sm log-btn" data-id="${v.id}">Log Service</button>` : ''}
                    ${v.status === 'Completed' && (currentUser.role === 'Staff' || currentUser.role === 'Admin') ? `<button class="btn-ghost sm archive-btn" data-id="${v.id}">Archive</button>` : ''}
                    ${v.status === 'Archived' ? `<button class="btn-ghost sm print-btn" onclick="window.print()"><i class="fas fa-print"></i></button>` : ''}
                </td>
            </tr>
            `;
        }).join('') || '<tr><td colspan="6" style="text-align:center;">No records found.</td></tr>';
    };

    const attachManageActions = () => {
        document.querySelectorAll('.log-btn').forEach(btn => btn.onclick = () => openLogModal(btn.dataset.id));
        document.querySelectorAll('.archive-btn').forEach(btn => {
            btn.onclick = async () => {
                await apiFetch(`${API_URL}/violations/${btn.dataset.id}/archive`, { method: 'PUT' });
                renderViolationsManage();
            };
        });
    };

    const openApproveModal = (id, name) => {
        showModal(`Approve Penalty for ${name}`, `
            <form id="approve-form">
                <div class="form-group">
                    <label>Required Community Service Hours</label>
                    <input type="number" id="approve-hours" required min="1" placeholder="e.g. 10">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-ghost close-modal-btn">Cancel</button>
                    <button type="submit" class="btn-primary">Set Penalty</button>
                </div>
            </form>
        `);

        document.getElementById('approve-form').onsubmit = async (e) => {
            e.preventDefault();
            const hours = document.getElementById('approve-hours').value;
            await apiFetch(`${API_URL}/violations/${id}/approve`, {
                method: 'PUT',
                body: JSON.stringify({ hours })
            });
            modalContainer.classList.add('hidden');
            renderStaffDashboard();
        };
    };

    const openLogModal = (id) => {
        showModal('Log Community Service', `
            <form id="log-form-service">
                <div class="form-group">
                    <label>Hours Rendered Today</label>
                    <input type="number" id="service-hours" required min="1">
                </div>
                <div class="form-group">
                    <label>Supervisor / Facilitator</label>
                    <input type="text" id="service-supervisor" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-ghost close-modal-btn">Cancel</button>
                    <button type="submit" class="btn-primary">Log Hours</button>
                </div>
            </form>
        `);

        document.getElementById('log-form-service').onsubmit = async (e) => {
            e.preventDefault();
            await apiFetch(`${API_URL}/service-logs`, {
                method: 'POST',
                body: JSON.stringify({
                    violation_id: id,
                    hours_rendered: document.getElementById('service-hours').value,
                    supervisor: document.getElementById('service-supervisor').value,
                    date_rendered: new Date().toISOString().split('T')[0]
                })
            });
            modalContainer.classList.add('hidden');
            renderViolationsManage('Ongoing');
        };
    };

    // -------------------------------------------------------------------------
    // 5. STUDENT MOBILE MODULE (Read-only Dashboard)
    // -------------------------------------------------------------------------
    const renderStudentDashboard = async () => {
        const violations = await apiFetch(`${API_URL}/violations?student_id=${currentUser.student_id}`).then(res => res.json());

        let activeViolation = violations.find(v => v.status === 'Ongoing') || violations.find(v => v.status === 'Pending Review') || null;
        const totalViolations = violations.length;
        const totalReq = violations.reduce((acc, v) => acc + (v.total_hours_required || 0), 0);
        const totalRnd = violations.reduce((acc, v) => acc + (v.rendered_hours || 0), 0);
        const remaining = totalReq - totalRnd;

        pageContent.innerHTML = `
            <div style="max-width: 500px; margin: 0 auto;">
                <div class="student-card">
                    <p style="opacity: 0.9; font-size: 0.9rem;">Total Violations Recorded</p>
                    <h1 style="font-size: 3rem; margin: 0.5rem 0;">${totalViolations}</h1>
                    <div class="student-meta">
                        <div class="meta-item"><span>REQUIRED</span><strong>${totalReq}h</strong></div>
                        <div class="meta-item"><span>COMPLETED</span><strong>${totalRnd}h</strong></div>
                        <div class="meta-item"><span>REMAINING</span><strong>${remaining}h</strong></div>
                    </div>
                </div>

                <div id="active-session-container"></div>

                <div class="progress-section">
                    <div class="progress-header">
                        <strong>My Latest Case</strong>
                        <span class="status-badge status-${activeViolation ? activeViolation.status.toLowerCase().replace(' ', '-') : 'none'}">${activeViolation ? activeViolation.status : 'Clear'}</span>
                    </div>
                    ${activeViolation && activeViolation.total_hours_required > 0 ? `
                        <p style="margin-top: 10px; color: var(--text-muted);">${activeViolation.type}</p>
                        <div class="progress-bar-lg">
                            <div class="progress-fill" style="width: ${(activeViolation.rendered_hours / activeViolation.total_hours_required) * 100}%"></div>
                        </div>
                        <p style="text-align: right; margin-top: 5px; font-weight: 600;">${Math.round((activeViolation.rendered_hours / activeViolation.total_hours_required) * 100)}% Complete</p>
                        
                        ${activeViolation.status === 'Ongoing' ? `
                            <button id="start-session-btn" class="btn-primary" style="width: 100%; margin-top: 1.5rem; justify-content: center; padding: 1rem;">
                                <i class="fas fa-play"></i> Start Service Session
                            </button>
                        ` : ''}
                    ` : activeViolation ? `<p style="margin-top: 10px; color: var(--text-muted);">${activeViolation.type}<br><small>Awaiting OSA Review</small></p>` : '<p style="margin-top: 10px; color: var(--success);"><i class="fas fa-check-circle"></i> No active punishments. Stay disciplined!</p>'}
                </div>

                <h3 style="margin: 2rem 0 1rem;">Recent History</h3>
                <div class="violation-list">
                    ${violations.map(v => `
                        <div class="violation-item">
                            <div>
                                <strong>${v.type}</strong>
                                <p style="font-size: 0.8rem; color: var(--text-muted);">${new Date(v.date_committed).toLocaleDateString()}</p>
                            </div>
                            <span class="status-badge status-${v.status.toLowerCase().replace(' ', '-')}">${v.status}</span>
                        </div>
                    `).join('') || '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No records found.</p>'}
                </div>
            </div>
        `;

        if (activeViolation && activeViolation.status === 'Ongoing') {
            document.getElementById('start-session-btn').onclick = () => {
                showModal('Start Session', `
                    <p>To start your session, scan the QR code provided by the supervisor or click below to start manually (if authorized).</p>
                    <button class="btn-primary" id="modal-scan-start" style="width: 100%; margin-top: 1rem; justify-content: center;">
                        <i class="fas fa-qrcode"></i> Scan Session QR
                    </button>
                    <button class="btn-ghost" id="modal-manual-start" style="width: 100%; margin-top: 0.5rem; justify-content: center;">
                        Start Manually
                    </button>
                `);

                document.getElementById('modal-scan-start').onclick = () => {
                    modalContainer.classList.add('hidden');
                    loadModule('qr-scanner');
                };

                document.getElementById('modal-manual-start').onclick = async () => {
                    await startServiceSession(activeViolation.id);
                    modalContainer.classList.add('hidden');
                    renderStudentDashboard();
                };
            };
        }

        checkActiveSession();
    };

    const startServiceSession = async (violationId) => {
        try {
            const res = await apiFetch(`${API_URL}/service/start`, {
                method: 'POST',
                body: JSON.stringify({ violation_id: violationId, student_id: currentUser.student_id })
            });
            if (res.ok) {
                showToast('Session Started', 'Service timer is now running.');
                renderStudentDashboard();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const checkActiveSession = async () => {
        const container = document.getElementById('active-session-container');
        if (!container) return;

        try {
            const res = await apiFetch(`${API_URL}/service/active/${currentUser.student_id}`);
            const session = await res.json();

            if (session) {
                renderActiveTimer(session);
            }
        } catch (err) {
            console.error('Failed to check active session');
        }
    };

    let timerInterval = null;
    const renderActiveTimer = (session) => {
        const container = document.getElementById('active-session-container');
        if (!container) return;

        clearInterval(timerInterval);

        const startTime = new Date(session.start_time);

        container.innerHTML = `
            <div class="student-card" style="background: linear-gradient(135deg, #6366f1, #4338ca); margin: 1.5rem 0;">
                <p style="opacity: 0.9; margin-bottom: 0.5rem;">Active Service Session</p>
                <h2 id="session-timer" style="font-size: 2.5rem; font-family: monospace; letter-spacing: 2px;">00:00:00</h2>
                <button id="stop-session-btn" class="btn-ghost" style="background: rgba(255,255,255,0.2); border: none; color: white; margin-top: 1rem; width: 100%; justify-content: center;">
                    <i class="fas fa-stop-circle"></i> End Session
                </button>
            </div>
        `;

        const updateTimer = () => {
            const now = new Date();
            const diff = now - startTime;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            const display = [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
            const timerEl = document.getElementById('session-timer');
            if (timerEl) timerEl.innerText = display;
        };

        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);

        document.getElementById('stop-session-btn').onclick = async () => {
            if (confirm('End this service session? Total time will be logged.')) {
                const res = await apiFetch(`${API_URL}/service/end`, {
                    method: 'POST',
                    body: JSON.stringify({ student_id: currentUser.student_id, session_id: session.id })
                });
                if (res.ok) {
                    clearInterval(timerInterval);
                    const data = await res.json();
                    showToast('Session Ended', `Logged ${data.minutes} minutes (${data.hours} hours).`);
                    renderStudentDashboard();
                }
            }
        };
    };

    // -------------------------------------------------------------------------
    // 6. QR CODE SCANNER MODULE
    // -------------------------------------------------------------------------
    const renderQrScanner = () => {
        pageContent.innerHTML = `
            <div style="max-width: 500px; margin: 0 auto; text-align: center;">
                <div class="table-container" style="margin-bottom: 1.5rem;">
                    <h2 style="margin-bottom: 0.5rem;"><i class="fas fa-qrcode" style="color: var(--primary); margin-right: 8px;"></i>QR Code Scanner</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Scan a student's QR code to look up their info</p>
                </div>
                
                <div id="qr-reader" style="width: 100%; border-radius: var(--radius); overflow: hidden; background: #111;"></div>
                
                <div id="qr-result" style="margin-top: 1.5rem;"></div>
                
                <button id="restart-scan-btn" class="btn-primary hidden" style="margin: 1rem auto; justify-content: center;">
                    <i class="fas fa-redo"></i> Scan Again
                </button>
            </div>
        `;

        startQrScanner();

        document.getElementById('restart-scan-btn').onclick = () => {
            document.getElementById('qr-result').innerHTML = '';
            document.getElementById('restart-scan-btn').classList.add('hidden');
            startQrScanner();
        };
    };

    const startQrScanner = () => {
        const qrReader = document.getElementById('qr-reader');
        if (!qrReader) return;

        // Check for secure context (Camera requires HTTPS or localhost)
        if (!window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            qrReader.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-shield-alt" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--warning);"></i>
                    <p style="margin-bottom: 1rem; font-weight: 600;">Security Limitation</p>
                    <p style="font-size: 0.85rem; margin-bottom: 1.5rem;">Browsers only allow camera access over <strong>HTTPS</strong>. Since you are using an IP address, the camera is blocked.</p>
                    <p style="font-size: 0.85rem; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px;">Tip: Use Chrome and go to <code style="word-break: break-all;">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> and add your IP URL to allow it.</p>
                    <div class="form-group" style="margin-top: 2rem; text-align: left;">
                        <label>Or enter Student ID manually:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="manual-student-id" placeholder="e.g. Student01">
                            <button class="btn-primary" id="manual-lookup-btn">Look up</button>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => {
                const manualBtn = document.getElementById('manual-lookup-btn');
                if (manualBtn) {
                    manualBtn.onclick = () => {
                        const val = document.getElementById('manual-student-id').value;
                        if (!val) return;
                        if (val.startsWith('osa-session-start:')) {
                            const vId = val.split(':')[1];
                            if (currentUser.role === 'Student') {
                                startServiceSession(vId);
                                loadModule('student-dashboard');
                            } else {
                                alert('Only students can start sessions.');
                            }
                        } else {
                            lookupStudent(val);
                        }
                    };
                }
            }, 100);
            return;
        }

        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            async (decodedText) => {
                html5QrCode.stop().then(() => {
                    html5QrCode = null;
                }).catch(() => { });

                showToast('QR Scanned!', `Result: ${decodedText}`);

                if (decodedText.startsWith('osa-session-start:')) {
                    const violationId = decodedText.split(':')[1];
                    if (currentUser.role === 'Student') {
                        startServiceSession(violationId);
                        loadModule('student-dashboard');
                    } else {
                        alert('Only students can scan this to start service.');
                        renderQrScanner();
                    }
                } else {
                    lookupStudent(decodedText);
                }
            },
            () => { }
        ).catch(err => {
            console.error("Camera error:", err);
            qrReader.innerHTML = `
                <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-video-slash" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--accent);"></i>
                    <p style="margin-bottom: 0.5rem; font-weight: 600;">Camera Issue</p>
                    <p style="font-size: 0.85rem; margin-bottom: 1rem;">Error: ${err.name || 'Unavailable'}</p>
                    <p style="font-size: 0.85rem;">Ensure no other app is using the camera and you have granted permission.</p>
                    <div class="form-group" style="margin-top: 1.5rem; text-align: left;">
                        <label>Or enter Student ID manually:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="manual-student-id" placeholder="e.g. Student01">
                            <button class="btn-primary" id="manual-lookup-btn">Look up</button>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const manualBtn = document.getElementById('manual-lookup-btn');
                if (manualBtn) {
                    manualBtn.onclick = () => {
                        const val = document.getElementById('manual-student-id').value;
                        if (!val) return;
                        if (val.startsWith('osa-session-start:')) {
                            const vId = val.split(':')[1];
                            if (currentUser.role === 'Student') {
                                startServiceSession(vId);
                                loadModule('student-dashboard');
                            } else {
                                alert('Only students can start sessions.');
                            }
                        } else {
                            lookupStudent(val);
                        }
                    };
                }
            }, 100);
        });
    };

    const stopQrScanner = () => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode = null;
            }).catch(() => {
                html5QrCode = null;
            });
        }
    };

    const lookupStudent = async (studentId) => {
        const resultDiv = document.getElementById('qr-result');
        const restartBtn = document.getElementById('restart-scan-btn');

        resultDiv.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Looking up student...</div>';

        try {
            const res = await apiFetch(`${API_URL}/students/id/${studentId}`);
            if (!res.ok) throw new Error('Student not found');
            const student = await res.json();

            // Also fetch violations for this student
            const vRes = await apiFetch(`${API_URL}/violations?student_id=${studentId}`);
            const violations = await vRes.json();

            const activeCount = violations.filter(v => v.status === 'Ongoing' || v.status === 'Pending Review').length;
            const totalHours = violations.reduce((acc, v) => acc + (v.total_hours_required || 0), 0);
            const renderedHours = violations.reduce((acc, v) => acc + (v.rendered_hours || 0), 0);

            resultDiv.innerHTML = `
                <div class="student-card" style="text-align: left;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 1rem;">
                        <img src="https://ui-avatars.com/api/?name=${student.first_name}+${student.last_name}&background=fff&color=6366f1&size=50" style="border-radius: 50%; width: 50px; height: 50px;">
                        <div>
                            <h3 style="margin: 0;">${student.first_name} ${student.last_name}</h3>
                            <p style="opacity: 0.8; font-size: 0.9rem;">${student.student_id}</p>
                        </div>
                    </div>
                    <div class="student-meta">
                        <div class="meta-item"><span>DEPT</span><strong>${student.department_name}</strong></div>
                        <div class="meta-item"><span>COURSE</span><strong>${student.course}</strong></div>
                        <div class="meta-item"><span>YEAR</span><strong>${student.year_level}</strong></div>
                    </div>
                </div>

                <div class="stats-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                    <div class="stat-card" style="flex-direction: column; text-align: center; padding: 1rem;">
                        <div class="stat-info"><h3>Total</h3><p style="font-size: 1.4rem;">${violations.length}</p></div>
                    </div>
                    <div class="stat-card" style="flex-direction: column; text-align: center; padding: 1rem;">
                        <div class="stat-info"><h3>Active</h3><p style="font-size: 1.4rem; color: var(--warning);">${activeCount}</p></div>
                    </div>
                    <div class="stat-card" style="flex-direction: column; text-align: center; padding: 1rem;">
                        <div class="stat-info"><h3>Hours</h3><p style="font-size: 1.4rem;">${renderedHours}/${totalHours}</p></div>
                    </div>
                </div>

                ${violations.length > 0 ? `
                    <h3 style="margin: 1.5rem 0 1rem;">Violation History</h3>
                    <div class="violation-list">
                        ${violations.map(v => `
                            <div class="violation-item">
                                <div>
                                    <strong>${v.type}</strong>
                                    <p style="font-size: 0.8rem; color: var(--text-muted);">${new Date(v.date_committed).toLocaleDateString()}</p>
                                </div>
                                <span class="status-badge status-${v.status.toLowerCase().replace(' ', '-')}">${v.status}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="text-align: center; padding: 1rem; color: var(--text-muted);">No violations on record.</p>'}
            `;

            restartBtn.classList.remove('hidden');
        } catch (err) {
            resultDiv.innerHTML = `
                <div class="table-container" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-user-slash" style="font-size: 2.5rem; color: var(--accent); margin-bottom: 1rem; display: block;"></i>
                    <h3 style="color: var(--accent); margin-bottom: 0.5rem;">Student Not Found</h3>
                    <p style="color: var(--text-muted);">No student with ID "${studentId}" was found in the system.</p>
                </div>
            `;
            restartBtn.classList.remove('hidden');
        }
    };

    // -------------------------------------------------------------------------
    // 7. MY QR CODE (Student view)
    // -------------------------------------------------------------------------
    const renderMyQrCode = () => {
        const qrData = currentUser.student_id || currentUser.id;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=6366f1`;

        pageContent.innerHTML = `
            <div style="max-width: 400px; margin: 0 auto; text-align: center;">
                <div class="student-card">
                    <p style="opacity: 0.9; margin-bottom: 0.5rem;">My Student QR Code</p>
                    <h2>${currentUser.name}</h2>
                    <p style="opacity: 0.8; font-size: 0.9rem;">${qrData}</p>
                </div>
                
                <div class="table-container" style="padding: 2rem;">
                    <img src="${qrUrl}" alt="QR Code" style="width: 250px; height: 250px; border-radius: 12px; margin: 0 auto; display: block; border: 4px solid var(--border);">
                    <p style="margin-top: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Show this QR code to guards or staff when requested.
                    </p>
                </div>
            </div>
        `;
    };

    // -------------------------------------------------------------------------
    // UTILS & SOCKETS
    // -------------------------------------------------------------------------
    function showModal(title, bodyHtml) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        modalContainer.classList.remove('hidden');

        const closeBtn = document.querySelector('.close-modal-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modalContainer.classList.add('hidden');
            };
        }
    }

    function showToast(title, message) {
        const toastEl = document.getElementById('notif-toast');
        toastEl.querySelector('strong').innerText = title;
        toastMsg.innerText = message;
        toastEl.classList.remove('hidden');
        setTimeout(() => toastEl.classList.add('hidden'), 4000);
    }

    closeModalBtn.onclick = () => modalContainer.classList.add('hidden');

    // Close modal on overlay click
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.classList.add('hidden');
        }
    });

    socket.on('new-violation', (data) => {
        if (currentUser.role === 'Staff' || currentUser.role === 'Admin') {
            showToast('New Violation Reported', `Student ID: ${data.student_id} | ${data.type}`);

            const badge = document.getElementById('notif-count');
            badge.classList.remove('hidden');
            badge.innerText = parseInt(badge.innerText) + 1;

            // Re-render if on dashboard
            const activeBtn = document.querySelector('.nav-btn.active');
            if (activeBtn && activeBtn.dataset.page === 'dashboard') {
                renderStaffDashboard();
            }
        }
    });

    init();
});
