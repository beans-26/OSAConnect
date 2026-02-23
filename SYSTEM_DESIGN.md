# OSA Connect: Penalty and Service Tracking System
## System Design & Development Plan

### 1. System Architecture Diagram
The system follows a **Client-Server Architecture** (3-Tier) to ensure separation of concerns, scalability, and security.

*   **Presentation Tier (Frontend):** A Single Page Application (SPA) built with HTML5, CSS3 (Vanilla/Modern), and JavaScript. It communicates with the backend via RESTful APIs.
*   **Application Tier (Backend):** A Node.js/Express.js server responsible for business logic, authentication (RBAC), data validation, and report generation.
*   **Data Tier (Database):** A MySQL relational database for persistence.
*   **Integration Layer:** A dedicated module for read-only connection to the existing Student Information System (SIS) database or API.

---

### 2. Recommended Tech Stack
*   **Frontend:** Vanilla JS / (Optional: React for complex state management but Vanilla is fine for Capstone).
*   **Styling:** Modern CSS (using Flexbox/Grid) with CSS Variables for theme management.
*   **Backend:** Node.js with Express.js.
*   **Database:** MySQL (Relational structure is critical for ACID compliance).
*   **Authentication:** JSON Web Tokens (JWT) for secure session handling.
*   **Reports:** `jsPDF` or `PDFKit` for generating printable service logs and reports.

---

### 3. Database Schema Design
#### Tables & Fields:
1.  **Users (OSA Staff):** `id`, `username`, `password_hash`, `full_name`, `role` (Admin/Staff), `department_access`.
2.  **Students (Mirrored from SIS):** `id`, `student_id`, `first_name`, `last_name`, `course`, `year_level`, `department`.
3.  **Violations:** `id`, `student_record_id`, `violation_name`, `severity` (Minor/Major/Critical), `date_committed`, `recorded_by`.
4.  **Penalties:** `id`, `violation_id`, `penalty_type` (Hours/Suspension), `total_required_hours`, `status` (Pending/Ongoing/Completed).
5.  **Service_Logs:** `id`, `penalty_id`, `date_rendered`, `hours_rendered`, `supervisor_name`, `activity_description`.
6.  **Departments:** `id`, `name`, `head_officer`.

#### ER Diagram Explanation:
*   **One Student** has **Many Violations**.
*   **One Violation** triggers **One Penalty** (or set of penalties).
*   **One Penalty** has **Many Service Logs** (tracking the hours rendered over time).
*   **Staff** record **Violations** and approve **Service Logs**.

---

### 4. User Roles & Permissions (RBAC)
*   **System Admin:** Full access to user management, system settings, and high-level analytics. Can delete/void records.
*   **OSA Staff:** Can record violations, update penalty status, and log service hours. Access to reports.
*   **Viewer/Observer (Optional):** Read-only access to statistics and student statuses without editing capabilities.

---

### 5. API Endpoint Structure
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Staff authentication |
| GET | `/api/students/search` | Search from SIS/Local mirror |
| POST | `/api/violations/record` | Add a new student violation |
| GET | `/api/penalties/student/:id` | Tracking penalty status per student |
| POST | `/api/service/log` | Record rendered hours |
| GET | `/api/dashboard/stats` | Retrieve real-time counters & charts |
| GET | `/api/reports/generate` | Fetch department-based analytics |

---

### 6. Dashboard Feature Breakdown
*   **Total Violations Counter:** Filterable by Department.
*   **Service Hours Progress:** Visual bar showing hours rendered vs. total hours required across the student body.
*   **Severity Distribution:** Pie chart showing Minor vs. Major vs. Critical violations.
*   **Recent Activities:** List of the last 10 recorded violations and service logs.
*   **Department Leaderboard:** identifies departments with highest/lowest violation rates for targeted interventions.

---

### 7. Step-by-Step Development Roadmap
1.  **Phase 1: Foundation (Week 1)** - Setup MySQL database and Express server. Establish SIS connection.
2.  **Phase 2: Core Modules (Week 2-3)** - Build Student Violation Recording and RBAC system.
3.  **Phase 3: Tracking Logic (Week 4)** - Implement Community Service Hour logging and status transitions (Pending -> Completed).
4.  **Phase 4: Dashboard & Analytics (Week 5)** - Create chart-based visualizations and automated reporting tools.
5.  **Phase 5: Print & Export (Week 6)** - Develop PDF generation for logs and reports.
6.  **Phase 6: Testing & Quality Assurance (Week 7)** - Data validation stress tests and security audits.

---

### 8. UI Wireframe Description
*   **Layout:** Fixed sidebar on the left for navigation; Top navbar for search and user profile.
*   **Color Palette:** Professional deep blue (#1e3a8a) for OSA authority, with red (#dc2626) for urgent violations and green (#16a34a) for completed service.
*   **Interactions:** Modal-based forms to prevent page reloads, ensuring "Speed" as requested.

---

### 9. Security & Data Privacy
1.  **Input Sanitization:** Protect against SQL Injection.
2.  **BCrypt Hashing:** Never store passwords in plain text.
3.  **JWT Expiration:** Sessions expire after inactivity.
4.  **Audit Logs:** Track which staff member edited or added any record.
