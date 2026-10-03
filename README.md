# e-chemEd: Engineering Chemistry e-Learning & Attendance Platform
**Department of Engineering Science & Humanities, Sanjivani College of Engineering, Kopargaon**

e-chemEd is a self-contained, privacy-first educational suite for First-Year Engineering (FE) students. It combines syllabus mind maps, question banks, quizzes, interactive arcade games, video lectures, and a local student attendance logging server.

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

## 🌐 Remote Deployment Guide

e-chemEd can also be deployed to cloud hosting:

### 1. Frontend (Static Hosting)
Deploy `frontend/` to **GitHub Pages**, **Netlify**, or **Vercel**:
- Set the publish directory to `frontend/`.
- Point the API base to your deployed backend using an override in your browser console:
  ```javascript
  localStorage.setItem('echemed_api_override', 'https://your-backend.onrender.com');
  ```
  Or define `window.__ECHEMED_API_OVERRIDE__ = 'https://your-backend.onrender.com'` in `frontend/assets/js/config.js`.

### 2. Backend (Node.js Service)
Deploy `backend/` to **Render**, **Railway**, **Fly.io**, or an Ubuntu VPS:
- Build command: `npm install`
- Start command: `npm start`
- Environment Variables:
  - `PORT`: `3001` (or host-provided port)
  - `ADMIN_KEY`: `<your-secure-secret-key>`
  - `CORS_ORIGIN`: `https://your-frontend.netlify.app`
  - `TRUST_PROXY`: `true`
- Note: Persistent storage (volume) should be attached to `backend/data` so the SQLite database persists across redeployments.

---

## 🔬 Database Architecture Evaluation: `better-sqlite3` vs `node:sqlite`

| Factor | `better-sqlite3` (Primary Choice) | `node:sqlite` (Built-in Alternative) |
|---|---|---|
| **Node Compatibility** | Node 18, 20 LTS, 22, 24 | Node 22.5+ only (Not present in Node 18 or 20 LTS) |
| **Dependencies** | Requires `better-sqlite3` npm package | Zero npm dependencies |
| **C++ Build Requirement** | Uses prebuilt binaries; requires build tools if rebuilding | Zero build tools required |
| **Performance** | Synchronous, rock-solid, WAL mode | Synchronous, experimental in 22.x |

**Architectural Choice**:
We selected **`better-sqlite3`** as the primary driver to fulfill the requirement for **Node 18+ backwards compatibility** (as Node 18 and Node 20 LTS lack `node:sqlite`). Furthermore, [`backend/db.js`](backend/db.js) implements an **intelligent fallback**: if `better-sqlite3` ever encounters a compilation issue on a Node 22+ host, it automatically utilizes built-in `node:sqlite` (`DatabaseSync`), ensuring 100% operational uptime.

---

## 📁 Repository Structure

```
e-chemEd/
├── frontend/                                # All client-side files & assets
│   ├── index.html                           # Main entry point
│   ├── pages/                               # attendance.html, admin.html, unit.html, etc.
│   ├── games/                               # periodic-table.html, unit1-puzzle.html, unit2-arcade.html
│   ├── assets/
│   │   ├── css/                             # Design tokens, base styles, components
│   │   ├── js/                              # config.js, data-store.js, main.js, components.js
│   │   ├── docs/                            # Curriculum PDF documents
│   │   ├── video/                           # Lecture MP4 videos
│   │   └── img/                             # Logos, favicons, illustrations
│   └── data/                                # Embedded offline JSON datasets
├── backend/
│   ├── server.js                            # Express API entry point (Port 3001)
│   ├── db.js                                # SQLite connection (WAL mode, parameterized SQL)
│   ├── data/                                # Local SQLite data store (echemed.db - git ignored)
│   ├── routes/                              # attendance.js, health.js
│   ├── middleware/                          # auth.js, rate-limit.js, validation.js
│   ├── config/academic-config.json          # Editable divisions, units, and sessions
│   ├── scripts/purge.js                     # Semester data wipe script
│   ├── package.json                         # Backend dependencies (engines >= 18.0.0)
│   └── .env.example                         # Environment configuration template
├── scripts/
│   ├── serve-frontend.js                    # Dependency-free HTTP static server (Range requests, Port 3000)
│   ├── check-ports.js                       # Port conflict validator
│   ├── init-env.js                          # Auto-configuration of .env & ADMIN_KEY
│   ├── print-lan.js                         # Wi-Fi LAN IP detection
│   ├── kill-pids.js                         # Clean process termination
│   ├── wait-and-launch.js                   # Health polling & auto-browser launch
│   └── verify-site.js                       # Link audit & asset integrity test
├── start.bat                                # Windows double-click launcher
├── start.command                            # macOS double-click launcher
├── start.sh                                 # Linux launcher
├── stop.bat                                 # Windows server stopper
├── stop.sh                                  # Linux/macOS server stopper
├── .gitignore                               # Git exclusion rules
└── README.md                                # Platform documentation
```

---

## Notice
This project and its instructional contents are created specifically for **Sanjivani College of Engineering** First-Year Engineering (FE) coursework within the Department of Engineering Science & Humanities. All educational rights are reserved. This material is provided strictly for academic and institutional evaluation and is not licensed for open-source redistribution or commercial use.
