# Testing

> The tests were written but **not run** in the authoring sandbox (no internet). Run them yourself and report failures.

## Backend (Vitest + Supertest + mongodb-memory-server)
```powershell
cd server
npm test
```
First run downloads a MongoDB binary (needs internet, ~100 MB). Tests use an in-memory database, so your real data is never touched.

| File | Covers |
|---|---|
| tests/auth.test.js | valid/invalid login, same error for unknown email, malformed input, bcrypt hashing, deactivated user, protected route, CSRF header, password change, mass-assignment on profile, first-admin setup |
| tests/rbac.test.js | employee blocked from listing/other profiles, manager sees only own team, managers cannot create/edit, HR create/edit, duplicate email/ID (409), invalid id (400), self-manager, last-HR protection |
| tests/attendance.test.js | duplicate check-in (409), check-out before check-in (400), double check-out, DB unique index, role access, manager scope |
| tests/leave.test.js | end-before-start, past start, overlap, insufficient balance, self-approval, other-team manager, direct manager approval + balance, double approval, HR approval, reject needs reason, cancel restores balance, safe rollback |
| tests/training.test.js | permissions, duplicate enrollment (count not inflated), capacity, unpublished, cancel; JSON 404 and malformed JSON |

## Frontend (Vitest + React Testing Library)
```powershell
cd client
npm test
```
`ProtectedRoute` (anonymous → login, wrong role → unauthorized, allowed role) and the Login page (client-side check, server error shown).

## Manual testing checklist
1. Log in as `hr@staffsync.demo`: dashboard numbers appear; Employees → Add employee → copy invite link.
2. Open the link in a private window → set password → employee dashboard loads.
3. Employee: Check in (twice → error toast), Check out, apply for leave, try overlapping dates (error).
4. Log in as `manager.eng@staffsync.demo`: Leave → Approvals → approve one request; employee sees a notification and a reduced balance.
5. Manager tries `/app/departments` → redirected to "Access denied".
6. HR: Announcements → create draft → Publish → employees get notified (bell count).
7. Training: employee enrolls in the 2-seat workshop until it shows "Full".
8. Reports: change dates and department; charts update.

## Postman
1. Import `docs/StaffSync.postman_collection.json`.
2. Run **Auth → Login (HR)** first. Postman stores the HttpOnly cookie automatically.
3. Every request already carries the `X-Requested-With: StaffSync` header (collection-level).
4. Collection variable `baseUrl` defaults to `http://localhost:5000/api`. Set `id`, `userId`, etc. from list responses.
5. Switch accounts by running another Login request; to test 401, delete cookies (Cookies button under Send).
