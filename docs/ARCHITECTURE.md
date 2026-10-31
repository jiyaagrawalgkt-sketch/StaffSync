# Architecture, database and business rules

## 1. High-level architecture
```
Browser (React SPA)                         Express API                              MongoDB
┌────────────────────────┐   /api (JSON)   ┌─────────────────────────────────┐    ┌──────────┐
│ pages → services(Axios)│ ──────────────► │ helmet → cors → json → cookies  │    │ users    │
│ context (auth, toasts) │   HttpOnly      │ → csrfGuard → route             │    │ attendance│
│ Bootstrap + Recharts   │ ◄────────────── │   → validate(zod) → authenticate│ ──►│ leaves ...│
└────────────────────────┘   cookie        │   → authorize(role) → controller│    └──────────┘
                                           │   → service (rules) → model     │
                                           │ → errorHandler                  │
                                           └─────────────────────────────────┘
```
Layers: **routes** (URL + middleware order) → **controllers** (HTTP in/out) → **services** (business rules) → **models** (schemas/indexes).

## 2. Collections (10)
`Users` and `Employees` are **merged** into one `users` collection. A person's login and HR profile are always read together, and two collections would need a join on almost every request. The trade-off: password hashes live next to HR data, so they are `select: false` and stripped in `toJSON`.

| Collection | Purpose | Key fields | Indexes / constraints |
|---|---|---|---|
| users | Accounts + employee profile | fullName, email, employeeId, passwordHash(select:false), role, department→departments, manager→users, jobTitle, joiningDate, employmentStatus, phone, isActive, activated, passwordChangedAt, inviteTokenHash, inviteExpires | unique email, unique employeeId; manager; department+isActive; role+isActive |
| departments | Org units | name, code, description | unique name, unique code |
| attendance | One row per person per workday | user→users, workDate("YYYY-MM-DD"), checkIn, checkOut, status(present/late), workMinutes | **unique (user, workDate)**; workDate |
| leaves | Leave requests | user, type, startDate, endDate, year, days, reason, status, reviewedBy, reviewedAt, rejectionReason | user+startDate; status+createdAt; startDate+endDate |
| leavebalances | Yearly entitlement per type (acts as the leave policy) | user, year, type, allocated, used | **unique (user, year, type)** |
| announcements | HR messages | title, body, targetDepartments[]→departments (empty = everyone), status, publishedAt, createdBy | status+publishedAt |
| trainings | Programs | title, description, startDate, endDate, location, capacity(0=unlimited), enrolledCount, status, createdBy | status+startDate; createdBy |
| trainingenrollments | Who joined what | training, user | **unique (training, user)** |
| notifications | In-app alerts | user, type, title, message, link, isRead | user+isRead+createdAt |
| counters | Auto-increment for employee IDs | _id, seq | primary key |

### Relationship diagram
```
departments 1──* users *──1 users (manager)
users 1──* attendance          users 1──* leaves *──1 users (reviewedBy)
users 1──* leavebalances       users 1──* notifications
trainings 1──* trainingenrollments *──1 users
announcements *──* departments
```
### References, populate and aggregation
A **reference** stores another document's `_id` (`manager: ObjectId`). MongoDB does not join automatically:
- `populate('department', 'name')` makes Mongoose run a second query and swap ids for documents (used in list endpoints).
- `aggregate([...])` runs a pipeline inside MongoDB (`$match → $group → $lookup → $project`) and is used for reports because it computes counts without loading every document.

## 3. Business rules (all enforced on the server)
**Dates and timezone.** Check-in/out are stored as UTC `Date`s. `workDate`, leave dates and joining dates are plain `YYYY-MM-DD` strings in the organisation timezone (`ORG_TIMEZONE`, default Asia/Kolkata). The browser formats timestamps in that same timezone, so everyone sees the same times.

**Attendance**
- Workday = not in `WEEKEND_DAYS` (default Sun, Sat) and not in `HOLIDAYS`. Check-in on a non-workday or on approved leave is refused.
- Late = check-in later than `WORK_START` (09:30) + `LATE_GRACE_MINUTES` (15). Otherwise "present".
- One check-in per day: guaranteed by the unique index, even for simultaneous requests.
- Check-out needs a check-in, and only works once (conditional update `checkOut: null`).
- Missed check-out: a past day with a check-in and no check-out is flagged `missedCheckout` (not auto-filled, not treated as absent).
- Absent is *derived*, never stored: on a workday, active employees − checked in − on approved leave.

**Leave**
- Days counted = working days in range (weekends/holidays excluded). Max 60 days per request; a request cannot span two calendar years.
- Start date cannot be in the past (sick leave may be backdated up to 7 days).
- Overlap with another pending/approved request is refused (409).
- Apply-time balance check = allocated − used − pending days of that type.
- Who reviews: HR any request (not their own); a manager only requests of employees whose `manager` is them; nobody reviews their own.
- **Approve** (two atomic steps): (1) `findOneAndUpdate({status:'pending'} → 'approved')` claims the request, so only one reviewer wins. (2) A single conditional `$inc` deducts days only if `used + days <= allocated`. If step 2 fails, step 1 is undone (compensating action) and the reviewer gets an error.
- **Reject** needs a reason. **Cancel**: pending → just cancelled; approved & not started → cancelled and days restored; started/other statuses → refused.
- **Transactions:** MongoDB transactions need a replica set. Atlas has one, a plain local install does not, so the project uses atomic single-document operations plus compensation instead. Known gap: a crash *between* steps 1 and 2 could leave an approved leave without deduction; transactions (Atlas) would close it.
- Known gap: the overlap check is read-then-write, so two simultaneous applications by the same person could both pass. A unique index cannot express date-range overlap.

**Training**: enrolment increments `enrolledCount` with a capacity guard in one atomic update, then inserts the enrolment (unique index blocks duplicates; on failure the count is rolled back). Cancel is allowed only before the start; HR manage all, managers only trainings they created.

**Announcements**: draft → published (notifies the audience) → archived. Visible to a user when published and (no target departments, or the user's department is targeted).

**Accounts**: HR creates a user → system returns a one-time invite link (token hashed in DB, valid 7 days) → user sets a password. The last active HR can't be deactivated or demoted; nobody can deactivate themselves or change their own role.

## 4. Why these design choices
- **Services layer**: rules live in one place and are reused by controllers, dashboards and tests.
- **Zod at the edge**: every request is parsed into the exact shape we expect; unknown fields are dropped (mass-assignment protection); strings only (blocks `{"$ne": ...}` injection).
- **Context, not Redux**: only auth, toasts and a notification counter are shared. Everything else is page-local state, so Redux would add complexity without benefit.
- **Polling, not WebSockets**: simple and reliable for a student project; unread count refreshes every 60 s.
