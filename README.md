# e-chemEd: Engineering Chemistry e-Learning & Attendance Platform
**Department of Engineering Science & Humanities, Sanjivani College of Engineering, Kopargaon**

e-chemEd is a self-contained, privacy-first educational suite for First-Year Engineering (FE) students. It combines syllabus mind maps, question banks, quizzes, interactive arcade games, video lectures, and a local student attendance logging server.

> 📢 **Faculty & Department Pitch**: A plain-English teacher presentation guide with a 5-minute meeting script and demo walkthrough is available in [`TEACHER_PITCH.md`](TEACHER_PITCH.md).

---

## 📚 Open Access & Faculty Portal Security

e-chemEd is designed for friction-free student learning with open, direct access to all syllabus units and interactive activities, coupled with secure faculty administration.

### Friction-Free Student Access
All learning pages and resources are openly accessible without requiring user sign-in or accounts:
- **5 Complete Syllabus Units**: Direct access to all theory modules, syllabus units, and multimedia.
- **Syllabus Mind Maps & Interactive Quizzes**: Immediate access across all units.
- **Question Banks & Video Lectures**: Open learning and review materials.
- **Educational Games**: Interactive chemistry learning games (Periodic Table, Unit 1 Puzzle, Unit 2 Arcade).
- **Self-Service Attendance Logging**: Students submit their name, roll number, division, and PRN directly with duplicate submission protection.

### Faculty Portal Protection (`pages/admin.html`)
The Faculty Coordinator Portal is secured using an `ADMIN_KEY` environment secret:
- Access to live attendance rosters, real-time student filtering, and official CSV exports is strictly protected via the `x-admin-key` header with constant-time verification (`crypto.timingSafeEqual`).
- Daily Session Code manager allows faculty to enforce an optional one-time pass-code for attendance.

---

## 🚀 Quick Start (One-Click Launch)

No command line experience is needed. Simply double-click the launcher for your operating system:

| Platform | Launcher File | How to Run |
|---|---|---|
| **Windows** | [`start.bat`](start.bat) | Double-click `start.bat` |
| **macOS** | [`start.command`](start.command) | Double-click `start.command` (Run `chmod +x start.command` once if prompted) |
| **Linux** | [`start.sh`](start.sh) | Run `./start.sh` (or `bash start.sh`) |

To stop both frontend and backend servers at any time, run [`stop.bat`](stop.bat) (Windows) or [`./stop.sh`](stop.sh) (Linux/macOS), or press any key in the main launcher window.

### First-Run Setup
1. **Node.js 18+ Requirement**: The launcher checks if Node.js 18+ is installed. If not found, it opens [https://nodejs.org](https://nodejs.org) to download the latest LTS release (v20 or v22).
2. **Automatic Dependencies**: Installs lightweight backend dependencies into `backend/node_modules/` automatically.
3. **Secret Generation**: Creates `backend/.env` from `.env.example` and generates a cryptographically secure 48-character `ADMIN_KEY`. **Save this key** displayed on your screen to access the Faculty Admin Portal.
4. **Browser Auto-Launch**: Once the backend health probe responds, your default browser opens `http://localhost:3000`.

---

## 📱 Mobile & Tablet Access (Over Classroom Wi-Fi)

Students and faculty in the classroom can access e-chemEd from their smartphones, tablets, or laptops over the local Wi-Fi network without an internet connection:

1. Connect the host computer and student devices to the **same Wi-Fi router / hotspot**.
2. Note the Wi-Fi address printed in the launcher window, for example:
   ```
   On phones/tablets on the same Wi-Fi:
     http://192.168.1.15:3000
   Student Attendance Portal:
     http://192.168.1.15:3000/pages/attendance.html
   ```
3. **Windows Firewall Prompt**: If Windows Firewall displays an alert on first launch, select **"Private networks (such as my home or work network)"** and click *Allow access*.

---

## 🔒 Privacy & Attendance Data Management

Student privacy is strictly protected by architectural design:
- **Local SQLite Database**: All records are stored exclusively in `backend/data/echemed.db`.
- **No Cloud Leakage**: Student PII (Full Name, Roll Number, PRN) is **never** sent to Google Forms, third-party clouds, or logged to console/terminal outputs.
- **Git Isolation**: The database file (`backend/data/*.db`) and environment keys (`.env`) are excluded in `.gitignore`.
- **Unique Constraint**: The database enforces a `UNIQUE(prn, unit, session, date)` constraint to prevent accidental or duplicate attendance entries.
- **Timing-Safe Admin Auth**: Admin endpoints are protected by `x-admin-key` header verified with `crypto.timingSafeEqual`.
- **Department Ownership**: Attendance data belongs strictly to the department for academic accreditation and university compliance.

### End-of-Semester Data Purge
At the conclusion of the academic semester, faculty can wipe attendance records with the built-in purge script:
```bash
npm run purge
```
This prompts for explicit confirmation (`type 'PURGE'`) before clearing the table and resetting auto-increment counters.

---

## 👩‍🏫 Faculty Coordinator Portal (`pages/admin.html`)

Access the portal at `http://localhost:3000/pages/admin.html`:
1. Enter your `ADMIN_KEY` (kept strictly in browser memory, never saved to localStorage or cookies).
2. **Review Live Roster**: View all submissions sorted by date, unit, division, roll number, and PRN. Filter by unit or search by name in real time.
3. **Download CSV**: Click **Download Attendance CSV** to download an RFC-4180 formatted `.csv` spreadsheet compatible with Microsoft Excel and Google Sheets.
4. **Session Code Manager**: Optionally set a daily session code (e.g., `CHEM101`). When active, students must enter this code to submit attendance. Leave blank for open submission.

---

## ⚙️ Configuration & Customization

### Editing Academic Divisions & Sessions
All college branches, units, and session types can be edited without touching backend code in [`backend/config/academic-config.json`](backend/config/academic-config.json):
```json
{
  "divisions": ["A (Computer)", "B (IT)", "C (E&TC)", "D (Mechanical)", "E (Civil)", "F (Electrical)"],
  "sessions": ["Lecture", "Lab Practical", "Tutorial"],
  "units": [
    "Unit 1: Water Processing and Environmental Sustainability",
    "Unit 2: Electrochemical Energy Storage Systems",
    "Unit 3: Flexible Electronics & Optoelectronic Materials",
    "Unit 4: Nanomaterials, Electrochemistry & Thermal Analysis",
    "Unit 5: Energy Generation & Sustainable Fuels"
  ]
}
```

### Changing the Admin Key
To update your faculty secret key, edit `ADMIN_KEY` inside `backend/.env`:
```env
ADMIN_KEY=your_new_super_secret_faculty_key_here
```
Then restart the backend.

---

## 🌐 Production Deployment (Vercel + PostgreSQL)

e-chemEd is engineered for turnkey deployment to **Vercel** with a **PostgreSQL** database (Vercel Postgres or Neon):

- **Serverless API**: Handled via `api/index.js` running standard Node.js serverless functions.
- **Durable Persistence**: Automatically switches to PostgreSQL when `POSTGRES_URL` or `DATABASE_URL` is detected, avoiding ephemeral filesystem data loss.
- **Same-Origin API Integration**: Frontend dynamically uses relative `/api` paths on Vercel, eliminating hardcoded host or port assumptions.
- **Automated Schema Bootstrap**: Automatically creates tables and seeds default `admin` and `student` accounts on first request.

> 📖 **Full Deployment Walkthrough**: For step-by-step instructions on pushing to a public GitHub repository, configuring Vercel environment variables, and verifying production health, see [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 🔬 Database Architecture: Multi-Engine Persistence

| Factor | PostgreSQL (Production / Vercel) | `better-sqlite3` (Local / Offline) | `node:sqlite` (Fallback) |
|---|---|---|---|
| **Target Runtime** | Vercel Serverless / Cloud Hosting | Local classroom laptops & PCs | Node 22.5+ without C++ build tools |
| **Persistence** | Durable cloud database (Vercel Postgres / Neon) | Single local file (`backend/data/echemed.db`) | Single local file (`backend/data/echemed.db`) |
| **Internet Required** | Yes (for cloud connection) | **No (100% offline-first)** | **No (100% offline-first)** |
| **Connection Model** | `pg.Pool` connection pooling | Synchronous WAL mode | Synchronous built-in WAL mode |
| **Activation** | Set `POSTGRES_URL` or `DATABASE_URL` | Default when `POSTGRES_URL` is unset | Automatic fallback |

---

## 🧪 Automated Verification & Test Suites

The repository contains an end-to-end automated test suite verifying static assets, route protection, database persistence, role-based authorization, rate limiting, and LAN CORS:

```bash
# Run the complete verification suite (13 automated acceptance tests)
npm test

# Run the dedicated authentication, route protection & progress persistence suite
npm run test:auth

# Test PostgreSQL multi-engine adapter logic
npm run test:adapter

# Run PostgreSQL schema migration / bootstrap CLI
npm run migrate:postgres

# Audit all HTML links, tokens, and static JSON data integrity
npm run audit
```

---

## 📁 Repository Structure

```
e-chemEd/
├── DEPLOYMENT.md                            # GitHub & Vercel production deployment walkthrough
├── TEACHER_PITCH.md                         # Plain-English teacher pitch & 5-minute demo script
├── vercel.json                              # Vercel serverless routing & security headers
├── .env.example                             # Environment configuration template
├── api/
│   └── index.js                             # Vercel serverless function entry point
├── frontend/                                # All client-side files & assets
│   ├── index.html                           # Main entry point (open access)
│   ├── pages/                               # Educational & faculty pages
│   │   ├── attendance.html                  # Student attendance portal
│   │   ├── admin.html                       # Faculty coordinator admin dashboard (protected by ADMIN_KEY)
│   │   ├── unit.html                        # Unit syllabus and learning modules
│   │   ├── mind-maps.html                   # Interactive visual syllabus mind maps
│   │   ├── quizzes.html                     # Self-grading timed quizzes
│   │   ├── question-bank.html               # Practice questions with model answers
│   │   ├── video-lectures.html              # Offline MP4 lecture streaming
│   │   └── games.html                       # Interactive games hub
│   ├── games/                               # Chemistry arcade & puzzles
│   │   ├── periodic-table.html              # Interactive periodic table
│   │   ├── unit1-puzzle.html                # Water treatment reaction puzzle
│   │   └── unit2-arcade.html                # Battery charging circuit game
│   ├── assets/
│   │   ├── css/                             # Design tokens, base styles, components
│   │   ├── js/                              # config.js, auth.js, data-store.js, main.js, components.js
│   │   ├── docs/                            # Curriculum PDF documents
│   │   ├── video/                           # Lecture MP4 videos
│   │   └── img/                             # Logos, favicons, illustrations
│   └── data/                                # Embedded offline JSON datasets
├── backend/
│   ├── app.js                               # Shared Express application factory
│   ├── server.js                            # Express API standalone entry point (Port 3001)
│   ├── db.js                                # Multi-engine database adapter (PostgreSQL + SQLite)
│   ├── data/                                # Local SQLite data store (echemed.db - git ignored)
│   ├── routes/
│   │   ├── attendance.js                    # Attendance logging & CSV export
│   │   ├── auth.js                          # Login, logout, me, verify endpoints
│   │   ├── health.js                        # Health check probe
│   │   └── progress.js                      # Student progress database persistence
│   ├── middleware/                          # auth.js, rate-limit.js, validation.js
│   ├── config/academic-config.json          # Editable divisions, units, and sessions
│   ├── scripts/purge.js                     # Semester data wipe script
│   ├── package.json                         # Backend dependencies (engines >= 18.0.0)
│   └── .env.example                         # Backend environment configuration template
├── scripts/
│   ├── serve-frontend.js                    # Static HTTP server with video streaming & API proxy (Port 3000)
│   ├── check-ports.js                       # Port conflict validator
│   ├── init-env.js                          # Auto-configuration of .env & ADMIN_KEY
│   ├── init-postgres.js                     # PostgreSQL migration and seeding CLI tool
│   ├── test-postgres-adapter.js             # PostgreSQL adapter integrity test
│   ├── print-lan.js                         # Wi-Fi LAN IP detection
│   ├── kill-pids.js                         # Clean process termination
│   ├── wait-and-launch.js                   # Health polling & auto-browser launch
│   ├── verify-site.js                       # Link audit & asset integrity test
│   ├── verify-auth.js                       # Dedicated auth & route guard test suite
│   └── verify-all.js                        # Comprehensive 13-stage acceptance test suite
├── start.bat                                # Windows double-click launcher
├── start.command                            # macOS double-click launcher
├── start.sh                                 # Linux launcher
├── stop.bat                                 # Windows server stopper
├── stop.sh                                  # Linux/macOS server stopper
├── .gitignore                               # Git exclusion rules
├── package.json                             # Root scripts & serverless dependencies
└── README.md                                # Platform documentation
```

---

## Notice
This project and its instructional contents are created specifically for **Sanjivani College of Engineering** First-Year Engineering (FE) coursework within the Department of Engineering Science & Humanities. All educational rights are reserved. This material is provided strictly for academic and institutional evaluation and is not licensed for open-source redistribution or commercial use.
