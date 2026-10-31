# Learning guide: understand StaffSync well enough to explain it

Read this in order. Each module follows the same pattern: **What → Why → Files → How it works → Run & test → Common errors → Interview prep.**
Hinglish hints are in *italics*.

---
## Part A: Core concepts (first time they appear)

**Promises and async/await.** Network and database calls take time. A *promise* is "a value that will arrive later". `await` pauses *this function* (not the whole server) until the promise finishes. `try/catch` handles failure. *await ka matlab: "ruko, result aane do".*
```js
const user = await User.findOne({ email });   // waits for MongoDB
```
**HTTP methods and REST.** GET = read, POST = create/action, PUT = replace, PATCH = partial update, DELETE = remove. REST means URLs are *nouns* (`/api/leaves/42`) and the method is the verb. Status codes tell the result: 200 OK, 201 created, 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict, 429 too many requests, 500 server bug.

**Middleware.** A function `(req, res, next)` that runs before the final handler. Express runs them in order: `helmet → cors → json → cookieParser → csrfGuard → route → validate → authenticate → authorize → controller`. Any of them can stop the request by sending a response or calling `next(error)`. An *error middleware* has four arguments `(err, req, res, next)`.

**Password hashing.** `bcrypt.hash(password, 12)` turns a password into an irreversible string containing a random *salt* and a *cost* (12 = 2^12 rounds, deliberately slow). On login we hash the attempt with the stored salt and compare. Even we cannot recover the password. *Hash = one-way; encryption = two-way.*

**JWT.** A signed token `header.payload.signature`. Payload holds `{ sub: userId, iat, exp }`. The server signs it with `JWT_SECRET`; anyone can *read* a JWT, but nobody can *change* it without breaking the signature. We keep it in an **HttpOnly cookie**: JavaScript cannot read it (protects against XSS theft) and the browser attaches it automatically. Trade-off: cookies are sent automatically, which is why CSRF protection is needed (custom header).

**Mongoose schema, references, populate, aggregate.** A schema describes a document (types, required, unique, indexes). A *reference* stores another document's `_id`. `populate()` replaces ids with documents (extra query). `aggregate()` runs a pipeline *inside MongoDB* (`$match` filter → `$group` count → `$lookup` join → `$project` shape) and is the right tool for reports.

**Indexes and unique constraints.** An index makes queries fast. A *unique* index makes the database itself reject duplicates, which is the only race-proof way to stop two simultaneous requests creating the same record.

**React basics.** *Component* = function returning UI. *Props* = inputs from the parent. *State* (`useState`) = data that, when changed, re-renders. `useEffect` = run code after render (fetch data). `useContext` = read shared data without passing props through every level. *Hooks* must be called at the top level of a component. Custom hooks (`useFetch`, `useForm`) package repeated logic.

**React Router.** Maps URLs to components. `<Outlet />` renders the matching child route. `ProtectedRoute` checks login/role and redirects.

**Axios + service layer.** Pages never call Axios directly; they call `services/endpoints.js`. One place to change URLs, headers (CSRF) and 401 handling (`api.js` interceptor).

---
## Part B: Module walkthroughs

### 1. Authentication & accounts
**What:** login/logout, first-admin setup, invitation links, change password, protected routes.
**Why:** HR data is private; we must know *who* is calling and *what role* they have.
**Files:** `server/src/services/auth.service.js`, `middleware/auth.js`, `middleware/csrf.js`, `controllers/auth.controller.js`, `routes/auth.routes.js`, `validators/auth.validators.js`; client `context/AuthContext.jsx`, `routes/ProtectedRoute.jsx`, `pages/Login.jsx`, `Setup.jsx`, `AcceptInvite.jsx`.
**How it works:**
1. `POST /auth/login` → Zod validates → `login()` loads the user with `+passwordHash`, always runs `bcrypt.compare` (even for unknown emails so timing is the same) → issues a JWT → controller sets the cookie.
2. Later requests: `authenticate` reads the cookie, verifies the signature, reloads the user from the DB (so deactivation takes effect immediately), and rejects tokens older than `passwordChangedAt`.
3. `authorize('hr')` compares `req.user.role`.
4. Invitation: HR creates a user → server generates 32 random bytes, stores only the SHA-256 hash, returns the raw token once → employee opens `/accept-invite?token=…` and sets a password.
5. Frontend: `AuthProvider` calls `/auth/me` at startup; an Axios interceptor logs the user out on any 401.
**Run & test:** register nothing; use seed accounts. In DevTools → Application → Cookies check `token` is HttpOnly. In Postman try `GET /auth/me` without a cookie → 401.
**Common errors:** *"Missing or invalid X-Requested-With header"* (custom client forgot the header); *401 right after login in prod* (cookie `Secure`/`SameSite` mismatch, see DEPLOYMENT.md); *"Invalid email or password"* (use seed password `Password@123`).
**Interview prep**
- *Why HttpOnly cookie instead of localStorage?* localStorage is readable by any script, so one XSS bug leaks the token; HttpOnly cookies are not readable by JS. Cost: need CSRF protection.
- *How do you prevent CSRF here?* Custom header required on unsafe methods + CORS allow-list + SameSite=Lax; forms from other sites can't add the header.
- *Why bcrypt and not SHA-256 for passwords?* SHA-256 is fast, so attackers can try billions of guesses; bcrypt is intentionally slow and salted.
- Follow-up: *How would you add "logout everywhere" or revoke one token?* Keep a `tokenVersion`/`passwordChangedAt` per user (we already do for password changes) or a server-side session store.
**Internals:** JWT is stateless, so we re-query the user each request to get revocation (deactivation) at the cost of one DB read.

### 2. Employee & department management
**What:** HR CRUD on employees; managers see only their team; employees edit only name/phone.
**Why:** a single source of truth for who works here, who reports to whom.
**Files:** `services/user.service.js`, `services/scope.js`, `controllers/user.controller.js`, `validators/user.validators.js`; client `pages/Employees.jsx`, `EmployeeDetail.jsx`, `Departments.jsx`.
**How:** `scope.js` answers "which user ids may this actor see?" (HR → all, manager → `manager == me`, employee → self). `listUsers` forces `filter.manager = actor._id` for managers *on the server*, so changing the URL or the UI cannot widen access. Zod strips fields like `role` from `PATCH /auth/me` (mass assignment). Duplicate email/ID → Mongo error 11000 → central handler → 409.
**Test:** log in as `manager.eng@…` → Employees shows 5 people; open another team's ID in the URL (`/app/employees/<id>`) → 403 message.
**Errors:** *"manager must be an active manager or HR"*; *409 email already exists*.
**Interview**
- *How do you stop a manager reading another team's data?* Scope computed from the authenticated user on the server, applied in every query; never trusting IDs from the client.
- *What is mass assignment?* Letting a client set fields it shouldn't (`role:'hr'`) because the whole body is saved. Fix: whitelist with a validator.
- *Why one `users` collection instead of users + employees?* Same entity, read together; avoids joins. Trade-off: sensitive hash lives beside HR data (so `select:false`).
- Follow-up: *How would you model multi-level reporting chains?* Store `manager` and use `$graphLookup` for descendants.

### 3. Attendance
**What:** check-in/out, history, org/team reports, late detection.
**Why:** accurate working-day records without spreadsheets.
**Files:** `models/Attendance.js`, `services/attendance.service.js`, `utils/dates.js`; client `pages/Attendance.jsx`.
**How:** `workDate` = today's date in the org timezone (via `Intl.DateTimeFormat`). The **unique index (user, workDate)** guarantees one record per day. Check-out uses a *conditional update* (`checkOut: null`) so double clicks can't overwrite. Rules (weekend, holiday, leave, late) are in the service, so Postman can't bypass them.
**Test:** check in twice → 409 "already checked in". Check out before in → 400.
**Errors:** weekend → "Today is a weekend or holiday" (change `WEEKEND_DAYS`); wrong timezone → set `ORG_TIMEZONE`.
**Interview**
- *How do you prevent duplicate attendance under concurrency?* DB unique compound index; catch error 11000.
- *Why store `workDate` as a string?* Avoids timezone shifts: "the 28th" stays the 28th for everyone.
- *How do you handle timezones?* Store UTC instants; derive local date/time with the org timezone; the UI formats with the same zone.
- Follow-up: *Night shifts?* Introduce shift definitions and assign the record to the shift's start date.

### 4. Leave management
**What:** apply, approve/reject, cancel, balances, calendar.
**Why:** replaces email chains, keeps balances correct.
**Files:** `services/leave.service.js`, `models/Leave.js`, `LeaveBalance.js`; client `pages/Leaves.jsx`.
**How:** working days are counted server-side. Approval is a **claim-then-deduct** pattern: `findOneAndUpdate({status:'pending'})` ensures one winner; a conditional `$inc` with `$expr` deducts only if balance suffices; otherwise the claim is reverted. Cancel of an approved future leave gives days back with `$inc: {used: -days}`.
**Test:** employee applies for 2 days → manager approves → balance drops by 2 → employee cancels → balance returns. Approve twice → 409.
**Errors:** "Insufficient balance", "overlapping" (409), "cannot span two years".
**Interview**
- *How do you avoid double approval?* Atomic conditional update on status.
- *Why not a transaction?* Needs a replica set; we use atomic single-document ops + compensation, and document the small gap. With Atlas you could wrap both writes in `session.withTransaction`.
- *Who can approve?* HR (not own), a manager only for direct reports, never yourself.
- Follow-up: *Make the overlap check race-free?* Use a transaction or store one document per leave day with a unique index `(user, date)`.

### 5. Announcements & notifications
**What:** HR drafts, publishes, archives; targets departments; in-app alerts with unread count.
**Files:** `services/announcement.service.js`, `notification.service.js`; client `Announcements.jsx`, `NotificationBell.jsx`, `NotificationContext.jsx`.
**How:** visibility filter `{status:'published', $or:[{targetDepartments:{$size:0}}, {targetDepartments: myDepartment}]}`. Publishing inserts one notification per recipient (`insertMany`). The bell polls `/notifications/unread-count` every 60 s.
**Test:** HR publishes a draft → log in as an employee → bell shows +1.
**Interview**
- *Polling vs WebSockets?* Polling is simpler and enough here; WebSockets/SSE give instant updates but add connection management.
- *Fan-out on write vs read?* We write a row per recipient (fast reads, more storage).
- Follow-up: *How to scale to 100k users?* Queue the fan-out (job worker) and paginate.

### 6. Training
**What:** programs with capacity, publish/archive, enroll/cancel, enrollee list.
**How:** enrolment = atomic `$inc` guarded by capacity → create enrolment (unique index) → roll back the counter on failure. Managers manage only trainings they created.
**Interview**
- *How do you enforce capacity under concurrency?* Single conditional update (`enrolledCount < capacity`) so two users can't take the last seat.
- *Why a counter on the training instead of counting enrolments?* O(1) capacity check; must be kept consistent (done on enrol/cancel).

### 7. Reports & dashboards
**What:** role-specific dashboards and filterable analytics.
**How:** `report.service.js` builds aggregation pipelines scoped to the caller's visible user ids (HR all, manager team). `$lte: ['$checkOut', null]` is true for missing *or* null, which is how missed check-outs are counted. Absent = derived (never stored).
**Interview**
- *Why aggregation instead of loading documents into Node?* Less data moved, uses indexes, computed in the DB.
- *Why not compute a "performance score"?* Attendance counts do not measure performance; inventing a score would be misleading.

### 8. Frontend architecture
Pages (route-level) → feature components → shared components (`DataTable`, `Modal`, `Form`…) → `services` (Axios) → `context` (auth, toast). `React.lazy` splits each page into its own bundle. `useFetch` handles loading/error/race conditions; `useForm` handles values + server field errors.
**Interview**
- *Why Context instead of Redux?* Only three small global concerns; Redux adds boilerplate without benefit.
- *How do you avoid race conditions in search boxes?* Debounce input and ignore stale responses (`latest` ref in `useFetch`).
- *Is a frontend route guard a security control?* No; it's UX. The API enforces access.

### 9. Testing
Supertest sends real HTTP requests to the Express `app` (no port needed) against an in-memory MongoDB. An *agent* keeps the cookie like a browser. Tests assert both the HTTP result **and** the database state (e.g., balance not deducted twice).
**Interview:** *Unit vs integration tests?* Unit = one function in isolation; integration = several parts together (route + middleware + DB). *What would you add next?* Concurrency tests (parallel check-ins), E2E tests (Playwright).

---
## Part C: Debugging cheat sheet
| Symptom | Likely cause |
|---|---|
| Blank page / "Cannot reach the server" | Backend not running; check `http://localhost:5000/api/health` |
| `MongoServerSelectionError` | Atlas IP not allowed / wrong password / local mongod not started |
| 403 "Missing X-Requested-With" | Custom client without the header |
| Login works but next request is 401 | Cookie blocked (prod: `Secure`/`SameSite`/domain) |
| 400 "Validation failed" | Read `errors[]` in the response for the exact field |
| Seed says refusing | `NODE_ENV=production` is set |
