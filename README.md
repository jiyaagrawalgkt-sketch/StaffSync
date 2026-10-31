# StaffSync: Modern HR Management System (MERN)

Built by Jiya Agrawal | [GitHub](https://github.com/yourusername) | [LinkedIn](www.linkedin.com/in/jiya-agrawal-055bba32a)

StaffSync digitises everyday HR work for three roles:

| Role | Can do |
|---|---|
| **HR administrator** | Manage employees and departments, org-wide attendance and leave, announcements, training, reports |
| **Manager** | See own team, review team leave, team attendance, create/manage own trainings, team reports |
| **Employee** | Check in/out, apply for leave, view balances, read announcements, enroll in training |

Stack: React 18 (Vite) + React Router + Axios + Bootstrap 5 + Recharts, Node.js + Express 4, MongoDB + Mongoose 8,
JWT in an HttpOnly cookie, bcryptjs, Zod validation, Helmet, CORS, rate limiting. Tests: Vitest + Supertest (+ mongodb-memory-server) and React Testing Library.

> **Verification status (please read):** this code was generated and statically checked (syntax, imports, identifiers, date/timezone helpers).
> The author's sandbox had no internet, so `npm install`, the automated test suites, the MongoDB queries and the UI were **not executed there**.
> Run the steps below on your machine; if anything fails, send the error and it will be fixed. Nothing has been deployed.

---

## 1. Prerequisites
- Node.js current LTS (v20 or newer): `node -v`
- Git, VS Code
- MongoDB: **Atlas free cluster** (recommended) or local MongoDB Community
- Postman (optional, for API testing)

## 2. Setup (Windows PowerShell; macOS/Linux use `cp` instead of `copy`)

```powershell
# --- Backend ---
cd server
copy .env.example .env        # then edit .env (see below)
npm install
npm run seed                  # optional: fictional demo data
npm run dev                   # API on http://localhost:5000
```
Open a **second terminal**:
```powershell
# --- Frontend ---
cd client
npm install
npm run dev                   # app on http://localhost:5173
```
**No client `.env` is needed.** In development Vite proxies `/api` to `localhost:5000`, so the browser only talks to one origin (no CORS or cookie problems).

### Edit `server/.env`
```
MONGODB_URI=mongodb://127.0.0.1:27017/staffsync   (or your Atlas string)
JWT_SECRET=<48+ random chars>   generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
CLIENT_URL=http://localhost:5173
SETUP_KEY=any-one-time-key-you-choose
```

### First login
- **With demo data:** `npm run seed`, then log in with any account below (password for all: `Password@123`).
- **Without demo data:** open http://localhost:5173/login, click *Set up the HR administrator*, enter your details and the `SETUP_KEY`.

| Account | Role |
|---|---|
| hr@staffsync.demo | HR administrator |
| manager.eng@staffsync.demo | Manager (Engineering team) |
| manager.sales@staffsync.demo | Manager (Sales team) |
| isha.verma@staffsync.demo | Employee (reports to the Engineering manager) |
| zoya.khan@staffsync.demo | Invited, not yet activated (HR can generate her invite link) |

### Health check
`http://localhost:5000/api/health` should return `{"success":true,"message":"StaffSync API is running",...}`.

## 3. Commands
| Where | Command | Purpose |
|---|---|---|
| server | `npm run dev` | API with auto-restart |
| server | `npm run seed` | Reset DB and load fictional data (refuses in production) |
| server | `npm test` | API tests (downloads a MongoDB binary the first time) |
| client | `npm run dev` / `build` / `preview` | Dev server / production build / preview build |
| client | `npm test` | Component tests |

## 4. Features
Authentication (login/logout, invitation links, first-admin setup, change password, session expiry) · role-based access ·
employee CRUD, activate/deactivate, search/filter/sort/paginate · departments · attendance (check-in/out, late detection, weekends/holidays, history, team/org reports) ·
leave (apply, approve/reject with reason, cancel, balances, overlap/balance rules, calendar) · announcements (draft/publish/archive, department targeting) ·
in-app notifications (unread count, read/unread) · training (create/publish/archive, capacity, enroll/cancel, enrollees) ·
dashboards for each role · reports with date/department filters.

## 5. Documentation
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): architecture, database design, business rules
- [docs/API.md](docs/API.md): every endpoint with role, body, responses, errors
- [docs/LEARNING_GUIDE.md](docs/LEARNING_GUIDE.md): concepts + module walkthroughs + interview prep
- [docs/SECURITY.md](docs/SECURITY.md): what is implemented, checklist, limitations
- [docs/TESTING.md](docs/TESTING.md): automated tests and Postman guide
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Atlas, Render/Railway, Netlify/Vercel
- [docs/INTERVIEW_AND_RESUME.md](docs/INTERVIEW_AND_RESUME.md): resume text and placement Q&A
- `docs/StaffSync.postman_collection.json`: import into Postman

## 6. Screenshots (placeholders: add your own after running the app)
`docs/screenshots/login.png` · `hr-dashboard.png` · `employees.png` · `attendance.png` · `leave-approvals.png` · `reports.png`

## 7. Project layout
```
staffsync/
├── server/  src/{config,models,routes,controllers,services,middleware,validators,utils,seed}  tests/
├── client/  src/{components,layouts,pages,features,services,hooks,context,routes,utils}  src/__tests__
└── docs/
```

## 8. Known limitations and not-implemented items (honest list)
- No email/SMS: invitation links are shown to HR to share manually. Notifications are in-app only (polled every 60 s).
- No salary, bank, or government-ID data is stored (data minimisation).
- Holidays are configured with the `HOLIDAYS` env variable (no holiday admin screen).
- Leave allocations are defaults in `server/src/config/env.js`; HR can adjust per employee through `PUT /api/leaves/balances` (API only, no screen).
- Attendance is self-reported: no GPS, biometrics or fraud prevention.
- Night shifts that cross midnight are not supported (a workday is a local calendar date).
- Concurrency: attendance, enrollment and approvals use atomic DB operations; overlapping-leave checks are not atomic (see ARCHITECTURE.md).
- See docs/SECURITY.md before using real employee data.
