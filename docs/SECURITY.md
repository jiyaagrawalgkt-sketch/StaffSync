# Security

## Implemented
| Area | How |
|---|---|
| Passwords | bcryptjs, cost 12 (4 in tests); never logged or returned; `select:false` + `toJSON` strips hashes |
| Authentication | JWT (HS256, 8 h) in an **HttpOnly** cookie, so page JavaScript (and XSS) cannot read it. `Secure` in production, `SameSite=Lax` (or `None` + Secure only if `CROSS_SITE_COOKIES=true`) |
| Session invalidation | Tokens issued before the last password change are rejected; deactivated users are rejected on the next request |
| Authorization | `authorize(role)` middleware **and** resource checks in services (team scope, own records). Frontend guards are UX only |
| CSRF | State-changing requests need a custom header (`X-Requested-With: StaffSync`). Cross-site pages cannot send it without a CORS preflight, and CORS only allows `CLIENT_URL` |
| Input validation | Zod on body, query and params for every route; unknown fields dropped (mass assignment); typed strings stop NoSQL operator injection; regexes from user input are escaped |
| Brute force | Rate limit on login/setup/invite/change-password (20 / 15 min / IP) + general API limit; unknown email and wrong password return the same message; bcrypt runs even for unknown emails (timing) |
| Headers / CORS | Helmet defaults; CORS restricted to explicit origins with credentials; 10 kb JSON body limit |
| Errors | Central handler; stack traces never sent; production 500s are generic; CastError/duplicate-key mapped to 400/409 |
| Secrets | `.env` git-ignored; `.env.example` has placeholders; server refuses to start without a 32+ char `JWT_SECRET`; no secrets in client code |
| First admin | `/auth/setup` needs `SETUP_KEY`, works only while the DB has no users, constant-time comparison |
| Invites | 256-bit random token, stored only as SHA-256 hash, 7-day expiry, single use |
| Data minimisation | No salary, bank, government ID, DOB or address collected |
| Lockout protection | Last active HR cannot be deactivated/demoted; nobody can change their own role or deactivate themselves |

## Checklist before using with real data
- [ ] Serve everything over HTTPS; set `NODE_ENV=production`.
- [ ] Unique, random `JWT_SECRET` and `SETUP_KEY`; remove `SETUP_KEY` after the first admin exists.
- [ ] Atlas: dedicated DB user with least privilege, IP allow-list, backups enabled.
- [ ] `CLIENT_URL` lists only your real front-end origin(s).
- [ ] Run `npm audit` and update dependencies regularly.
- [ ] Add monitoring/alerting and log retention rules.
- [ ] Review privacy law obligations (consent, retention, deletion) for employee data.

## Limitations of a student-level project
- **No email**: invite links are shared manually; no password-reset-by-email flow (HR can issue a new invite only for unactivated accounts).
- **No MFA**, account lockout after repeated failures, or password breach checking.
- **No audit log** of who changed what (the "recent activity" feed is derived from business data, not a security log).
- **JWT is stateless**: logout clears the cookie, but a stolen token stays valid until it expires (8 h) unless the password changes.
- **Multi-step operations** (leave approval) use compensation, not transactions, so a crash between steps can leave inconsistent data.
- **No file uploads**, so no malware scanning is needed, but also no document storage.
- Rate limiting is in-memory per process (fine for one server; use a shared store when scaling out).
- No penetration test or third-party security review has been done. Attendance is self-reported (no GPS/biometrics).
