# API reference

Base URL (dev): `http://localhost:5000/api` (or `/api` through the Vite proxy).
All bodies are JSON. Responses:
```json
{ "success": true, "message": "optional", "data": { } }                       // single / action
{ "success": true, "data": [ ], "meta": { "page":1,"limit":10,"total":42,"totalPages":5 } }   // lists
{ "success": false, "message": "Validation failed", "errors": [ { "path":"email","message":"..." } ] }
```
**Auth:** the JWT lives in an HttpOnly cookie named `token` (set by login/setup/accept-invite).
**CSRF header:** every POST/PUT/PATCH/DELETE must include `X-Requested-With: StaffSync` (403 otherwise).
Roles: **HR**, **MGR** (manager), **EMP** (employee), **Any** = any logged-in user.
Common errors: `400` validation, `401` not logged in/expired, `403` not allowed, `404` not found, `409` conflict, `429` rate limited.

## Public
| Method | URL | Purpose | Notes |
|---|---|---|---|
| GET | /health | Liveness + DB state | 200, or 503 if DB down |
| GET | /config | Timezone, work start, grace, weekends, holidays | used by the UI to format times |
| GET | /auth/setup-status | `{needsSetup}` | true while no users exist |
| POST | /auth/setup | Create the first HR admin | body `{fullName,email,password,setupKey}`; 403 wrong key, 409 already done |
| POST | /auth/login | Log in | body `{email,password}` → user + cookie; 401 invalid, 403 deactivated |
| POST | /auth/accept-invite | Activate invited account | body `{token,password}`; 400 invalid/expired |
| POST | /auth/logout | Clear cookie | |
Rate limited: setup, login, accept-invite, change-password (20 per 15 min per IP).

## Auth / profile (Any)
| Method | URL | Purpose | Body |
|---|---|---|---|
| GET | /auth/me | Current user (department & manager populated) | |
| PATCH | /auth/me | Update own name/phone only | `{fullName?,phone?}` |
| POST | /auth/change-password | Change password (other sessions invalidated) | `{currentPassword,newPassword}` |
Password rule: 8-72 chars, at least one letter and one number.

## Users (employees)
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /users | HR, MGR (team only) | Query: `page,limit,search,department,role,status(active/inactive),sort(name,-name,joiningDate,-joiningDate,employeeId)` |
| GET | /users/managers | HR | Active managers/HR for the "manager" dropdown |
| POST | /users | HR | Create. Body `{fullName,email,employeeId?,role?,department?,jobTitle?,manager?,joiningDate?,employmentStatus?,phone?}` → `{user,inviteToken}`. 409 duplicate email/ID |
| GET | /users/:id | HR any; MGR team; Any self | 403 otherwise |
| PATCH | /users/:id | HR | Same fields as create (all optional). Cannot change own role; manager must be an active manager/HR and not self |
| PATCH | /users/:id/status | HR | `{isActive}`; not yourself, not the last HR |
| POST | /users/:id/invite | HR | New invite link for a not-yet-activated user |

## Departments
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /departments | Any | list with active `employeeCount` |
| POST | /departments | HR | `{name,code,description?}` (409 duplicates) |
| PATCH | /departments/:id | HR | partial |
| DELETE | /departments/:id | HR | 409 if employees or announcements still use it |

## Attendance
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /attendance/today | Any | Today's record, `isWorkday`, `onLeave`, rules |
| POST | /attendance/check-in | Any | 201; 409 already checked in; 400 non-workday / on leave |
| POST | /attendance/check-out | Any | 200; 400 no check-in; 409 already checked out |
| GET | /attendance/me | Any | own history; query `page,limit,from,to` |
| GET | /attendance | HR, MGR(team) | query `page,limit,user,from,to`; 403 if `user` is outside scope |

## Leaves
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /leaves/balances | Any | `?user=&year=`: own, or a person you may access (HR any, MGR team) |
| PUT | /leaves/balances | HR | `{user,year,type,allocated}`: adjust entitlement (cannot go below used) |
| GET | /leaves/calendar?month=YYYY-MM | Any | approved leave in scope (HR all, MGR team+self, EMP self) |
| GET | /leaves/me | Any | own requests; `page,limit,status,type` |
| GET | /leaves | HR, MGR(team) | requests in scope; `page,limit,status,type,user` |
| POST | /leaves | Any | apply `{type,startDate,endDate,reason}` → 201. 400 range/balance/past, 409 overlap |
| PATCH | /leaves/:id/approve | HR, MGR | 403 own/not your team; 409 already processed; 400 insufficient balance |
| PATCH | /leaves/:id/reject | HR, MGR | `{reason}` required |
| PATCH | /leaves/:id/cancel | owner | pending or future approved; restores balance if approved |

## Announcements
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /announcements | Any | HR: all (filter `status`); others: published and targeted at them |
| POST | /announcements | HR | `{title,body,targetDepartments[]}` → draft |
| PATCH | /announcements/:id | HR | not archived |
| POST | /announcements/:id/publish | HR | draft → published, notifies audience |
| POST | /announcements/:id/archive | HR | |

## Trainings
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /trainings | Any | adds `isEnrolled`, `canManage`, `isFull`, `hasStarted`. EMP: published; MGR: published + own; HR: all |
| GET | /trainings/mine | Any | my enrollments |
| POST | /trainings | HR, MGR | `{title,description,startDate(ISO),endDate,location?,capacity?}` → draft |
| PATCH | /trainings/:id | HR, MGR(own) | capacity cannot drop below enrolled |
| POST | /trainings/:id/publish | HR, MGR(own) | notifies everyone |
| POST | /trainings/:id/archive | HR, MGR(own) | |
| GET | /trainings/:id/enrollees | HR, MGR(own) | |
| POST | /trainings/:id/enroll | Any | 201; 409 duplicate; 400 unpublished/ended/full |
| DELETE | /trainings/:id/enroll | Any | before start only |

## Notifications (own only)
GET `/notifications` (`page,limit,unread=true`) · GET `/notifications/unread-count` → `{count}` · PATCH `/notifications/:id/read` · PATCH `/notifications/read-all`

## Reports and dashboards
| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | /reports/summary | HR, MGR(team) | `?from&to&department` (default last 30 days, max 1 year). Returns employeesByDepartment, attendanceTrend, attendanceDistribution{present,late,missedCheckout}, leavesByStatus, departmentAttendance, trainingSummary |
| GET | /dashboard | Any | Shape depends on the caller's role (`role: hr/manager/employee`) |

### Metric definitions
- **Employees by department**: active employees now (not date-filtered).
- **Attendance trend**: check-ins per workDate, split present/late.
- **Missed check-out**: records before today with a check-in and no check-out (a flag, overlaps with present/late).
- **Leave by status**: requests whose *start date* is inside the range; `days` = working days.
- **Department attendance**: record counts and average hours (check-out − check-in) per department; no "performance score" is computed.
- **Training summary**: latest 10 published programs, enrolled vs capacity (0 = unlimited).
