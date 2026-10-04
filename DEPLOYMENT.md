# 🚀 e-chemEd: GitHub & Vercel Production Deployment Guide
**Engineering Chemistry e-Learning & Digital Attendance Suite**  
*Department of Engineering Science & Humanities — Sanjivani College of Engineering, Kopargaon*

---

## 📌 Architecture Overview

e-chemEd employs a **dual-engine persistence architecture**:

```
+---------------------------------------------------------------------------------------+
|                                     e-chemEd Core                                     |
+-------------------------------------------+-------------------------------------------+
|               LOCAL RUNTIME               |            PRODUCTION DEPLOYMENT          |
|-------------------------------------------+-------------------------------------------|
| • Host: Teacher's laptop / local PC       | • Host: Vercel (Edge CDN + Serverless)    |
| • Server: Node.js (scripts/serve-frontend)| • Serverless API: api/index.js            |
| • Persistence: SQLite (echemed.db)        | • Persistence: Vercel Postgres / Neon     |
| • Offline: 100% offline, classroom Wi-Fi  | • Online: HTTPS, same-origin /api routes  |
| • Cost: $0 (zero cloud dependencies)      | • Cost: Free tier / Serverless Postgres   |
+-------------------------------------------+-------------------------------------------+
```

When deployed to Vercel, the platform automatically detects `POSTGRES_URL` (or `DATABASE_URL`), connects using connection pooling (`pg.Pool`), bootstraps the required tables (`attendance`, `settings`, `users`, `sessions`, `user_progress`), and seeds the default admin and student accounts. Local offline operations remain 100% functional with SQLite.

---

## 🛡️ Pre-Flight Security & Privacy Checklist

Before publishing to a public GitHub repository, verify:

- [x] **No Secrets Committed**: `.env`, `.env.local`, and `backend/.env` are listed in `.gitignore`.
- [x] **No Database Files Committed**: `backend/data/*.db` and `*.sqlite` are git-ignored.
- [x] **No Private Faculty Documents**: High-resolution faculty CVs and personal documents are excluded.
- [x] **No Student PII Leakage**: API handlers use parameterized SQL exclusively and never log student names, roll numbers, or PRNs to console logs.
- [x] **Timing-Safe Auth**: Admin key comparisons use `crypto.timingSafeEqual`.
- [x] **Secure Cookies**: Session cookies automatically use `HttpOnly; SameSite=Lax; Secure` when served over HTTPS.

---

## 📦 Step 1: Push to Public GitHub Repository

Run these non-destructive Git commands from your repository root:

```bash
# 1. Review status to confirm only intended code and configuration files are present
git status

# 2. Stage all repository files
git add .

# 3. Create a conventional commit
git commit -m "feat: prepare e-chemEd for Vercel deployment with PostgreSQL and serverless API"

# 4. If creating a brand new GitHub repository:
# (Replace YOUR_ORGANIZATION_OR_USERNAME with your GitHub handle)
git remote add origin https://github.com/YOUR_ORGANIZATION_OR_USERNAME/e-chemEd.git
git branch -M main

# 5. Push to GitHub
git push -u origin main
```

---

## 🌐 Step 2: Deploy to Vercel

### 1. Import Repository
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Select your newly pushed GitHub repository (`e-chemEd`).

### 2. Configure Build Settings
- **Framework Preset**: `Other`
- **Root Directory**: `./` (leave default)
- **Build Command**: `npm run build` (or leave empty)
- **Output Directory**: `frontend` (automatically set by `vercel.json`, or enter `frontend` in UI)
- **Install Command**: `npm install` (installs root dependencies)

### 3. Attach PostgreSQL Database (Vercel Postgres or Neon)
1. In your project dashboard, navigate to the **Storage** tab.
2. Click **Connect Database** → **Create New** → **Postgres** (or connect existing Neon / Supabase database).
3. Select your region (e.g., `Singapore (sin1)` or `Mumbai (bom1)` for lowest latency from India).
4. Click **Create & Continue**.
5. Vercel automatically populates the following environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `DATABASE_URL`

### 4. Configure Required Environment Variables
Under **Project Settings** → **Environment Variables**, add:

| Variable Name | Recommended Value | Environment | Description |
|---|---|---|---|
| `ADMIN_KEY` | *(Generate a 32+ character hex string)* | Production, Preview | Cryptographic secret key for faculty administration. |
| `TRUST_PROXY` | `true` | Production, Preview | Enables accurate IP detection behind Vercel edge reverse proxies. |
| `NODE_ENV` | `production` | Production, Preview | Enforces production mode and Secure cookie headers. |
| `SESSION_CODE` | *(Optional, e.g. `CHEM101`)* | Production, Preview | Optional classroom gatekeeper code for attendance. |

> **Generate a secure ADMIN_KEY**: In Node.js or terminal, run:  
> `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`

### 5. Click "Deploy"
Vercel will build the frontend assets, bundle the serverless functions in `api/index.js`, and deploy the application.

---

## 🔬 Step 3: Automated Database Bootstrap & Verification

### Automatic First-Request Bootstrap
When the first request hits `/api/health` or `/api/auth/login`, e-chemEd automatically:
1. Connects to PostgreSQL using `POSTGRES_URL`.
2. Creates tables: `attendance`, `settings`, `users`, `sessions`, `user_progress`.
3. Seeds default demo credentials:
   - **Faculty Admin**: `admin` / `admin123` (`Dr. S. S. Chine`)
   - **Student**: `student` / `student123` (`Rahul Shinde`)

### Optional: Manual CLI Bootstrap
You can also run schema migrations locally against your remote Postgres instance:
```bash
node scripts/init-postgres.js "postgres://default:YOUR_PASSWORD@ep-sample.ap-southeast-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"
```

---

## 🧪 Step 4: Production Verification Checklist

Once deployed to `https://your-app.vercel.app`, perform this 2-minute smoke test:

1. **Verify Health Endpoint**:
   - Open: `https://your-app.vercel.app/api/health`
   - Verify JSON output:
     ```json
     {
       "ok": true,
       "service": "e-chemEd API",
       "version": "1.0.0",
       "dbEngine": "postgresql"
     }
     ```
2. **Verify Route Guarding**:
   - Open `https://your-app.vercel.app/` in a fresh Incognito window.
   - Confirm automatic redirect to `https://your-app.vercel.app/pages/login.html?redirect=%2Findex.html`.
3. **Verify Student Login**:
   - Click **Fill Student** (`student` / `student123`) and click **Sign In**.
   - Verify header shows `Rahul Shinde` with `Student` badge.
   - Open **Attendance**, select `Lecture`, and click **Submit Attendance**.
4. **Verify Duplicate Protection**:
   - Click **Submit Attendance** a second time.
   - Verify response: *"Attendance already recorded"*.
5. **Verify Admin Roster & CSV Export**:
   - Click **Sign Out**, then sign in with **Fill Admin** (`admin` / `admin123`).
   - Click **Admin Portal** in navigation.
   - Verify live attendance record appears in the table.
   - Click **Download Attendance CSV** and confirm RFC-4180 formatted CSV download.

---

## 🛠️ Local Development & Offline Continuity

Your local workflow remains completely unchanged:
- Double-clicking [`start.bat`](start.bat) launches SQLite (`echemed.db`) on port 3000/3001 without internet.
- Running `npm test` runs all 13 automated acceptance tests locally.
- Running `npm run audit` audits all static links, CSS design tokens, and JSON datasets.
