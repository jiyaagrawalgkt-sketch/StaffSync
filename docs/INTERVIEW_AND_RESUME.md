# Resume text and placement interview pack

## Resume entry (edit to match what you actually built and ran)
**StaffSync: HR Management System** | React, Node.js, Express, MongoDB, JWT
- Built a role-based HR platform (HR / manager / employee) with 10 MongoDB collections and 50+ REST endpoints covering employees, attendance, leave, announcements, training and analytics.
- Implemented JWT authentication in HttpOnly cookies, bcrypt hashing, Zod validation, rate limiting and server-side authorization scoped to a manager's team.
- Designed race-safe business rules: unique indexes for one-check-in-per-day, atomic claim-then-deduct leave approval, capacity-guarded training enrolment.
- Created dashboards and filterable reports with MongoDB aggregation pipelines and Recharts; wrote Vitest/Supertest integration tests for auth, RBAC, attendance, leave and training flows.
*(Only keep the testing line after you have run the tests successfully. Only mention deployment after you have deployed.)*

## 2-minute walkthrough script
"StaffSync replaces spreadsheets for HR. There are three roles. The React front-end calls an Express API; every request passes validation, authentication and role checks before reaching a service layer where the business rules live. MongoDB holds ten collections. For example, attendance has a unique index on user and date, so even simultaneous check-ins can't create duplicates. Leave approval first atomically claims the pending request, then deducts balance with a conditional update, so two managers can't double-approve and balances can't go negative. Security-wise I used HttpOnly cookies, bcrypt, Zod, rate limiting and a custom-header CSRF defence. Reports use aggregation pipelines scoped to what the viewer is allowed to see."

## Likely questions and answers
**Architecture**
1. *Walk me through a request.* Browser → Axios (cookie + CSRF header) → Express middleware chain → route validator → `authenticate` → `authorize` → controller → service → Mongoose → MongoDB → JSON back → React state → UI.
2. *Why a service layer?* Keeps rules reusable/testable, controllers thin.
3. *Why Vite and React Router?* Fast dev server and builds; client-side routing for an SPA.
4. *REST design choices?* Nouns for resources, verbs via HTTP methods, consistent envelope `{success,data,meta}`, proper status codes.

**Database**
5. *Embedding vs referencing?* We reference (users↔departments, leaves↔users) because those entities are queried independently and grow unboundedly; embedding suits small, owned data.
6. *How did you design indexes?* Unique constraints for correctness (email, employeeId, user+workDate, training+user, user+year+type) and compound indexes for frequent filters (status+createdAt, user+isRead+createdAt).
7. *Explain an aggregation you wrote.* Department attendance: `$match` dates and scope → `$lookup` users → `$group` by department → `$lookup` departments → `$project` with average hours.
8. *Transactions?* Need replica sets; I used atomic conditional updates plus compensation and documented the residual risk.

**Security**
9. *How is authorization enforced?* Role middleware + resource scoping in services; UI hiding is cosmetic.
10. *XSS/CSRF/NoSQL injection?* React escapes output; HttpOnly cookie; custom header + CORS; Zod types and escaped regex.
11. *What would you do next for security?* MFA, email-based reset, audit logs, lockout, dependency scanning, a pen test.

**Frontend**
12. *`useEffect` dependency array?* Controls when the effect re-runs; empty = once; wrong deps cause stale data or loops.
13. *Controlled inputs?* The input's value comes from state; `onChange` updates state (`useForm.bind`).
14. *Code splitting?* `React.lazy` + `Suspense` per page.

**Scenario / design**
15. *Two managers click approve at the same time.* One wins the atomic status update; the other gets 409.
16. *Employee works across midnight?* Not supported; propose shifts.
17. *Scale to 10k employees?* Index review, pagination (done), queue notification fan-out, cache dashboards, replica reads.
18. *What was the hardest bug?* (Be honest and specific, e.g. timezone handling of "today" or duplicate counts when enrolment failed; explain the fix.)
19. *What would you improve?* Transactions, email, audit log, e2e tests, holiday admin UI.
