# Deployment guide

> Nothing here has been deployed or tested by the author. Free tiers and menus change; check each provider's current docs.

## 1. MongoDB Atlas
1. Create a free (M0) cluster. 2. **Database Access** → add a user with a strong password (readWrite on `staffsync`). 3. **Network Access** → allow your host's IPs (free tiers often have changing IPs; `0.0.0.0/0` works but is the weakest option, so pair it with a strong password).
4. **Connect → Drivers** → copy the string, add the DB name: `mongodb+srv://USER:PASS@cluster.mongodb.net/staffsync`. URL-encode special characters in the password.
Atlas is a replica set, so transactions are available if you later want to upgrade leave approval to use them.

## 2. Pick a layout
**Option A (recommended, simplest): same site.** Serve the built front-end and the API under one domain via a reverse proxy, or host both on one platform. Cookies are first-party; keep `CROSS_SITE_COOKIES=false`.
**Option B: two domains** (e.g. Netlify front-end + Render API). Then cookies are cross-site: set `CROSS_SITE_COOKIES=true` (this sets `SameSite=None; Secure`) and use HTTPS on both. Some browsers block third-party cookies, so test carefully; Option A avoids that risk.

## 3. Backend (Render, Railway, Fly.io or similar Node host)
- Root directory: `server`. Build: `npm install`. Start: `npm start`.
- Environment variables:
```
NODE_ENV=production
MONGODB_URI=<atlas string>
JWT_SECRET=<48+ random chars>
CLIENT_URL=https://<your-frontend-domain>      (comma-separate several)
SETUP_KEY=<one-time key>
ORG_TIMEZONE=Asia/Kolkata  WORK_START=09:30  LATE_GRACE_MINUTES=15  WEEKEND_DAYS=0,6  HOLIDAYS=
CROSS_SITE_COOKIES=true   (only for Option B)
```
- The platform provides `PORT`; the server reads it. HTTPS is terminated by the platform; `trust proxy` is already enabled in production.
- Free-tier note: free web services usually sleep when idle, so the first request after a pause can take 30-60 s.
- Create the first admin: open `https://<frontend>/login` → "Set up the HR administrator" (uses `SETUP_KEY`). Then delete `SETUP_KEY` from the environment.
- Do **not** run `npm run seed` in production (it refuses anyway).

## 3b. Frontend (Netlify, Vercel, Cloudflare Pages)
- Root: `client`. Build: `npm run build`. Publish directory: `dist`.
- Environment variable (Option B): `VITE_API_URL=https://<api-domain>/api`.
- Single-page-app fallback so `/app/dashboard` works on refresh: Netlify `client/public/_redirects` containing `/*  /index.html  200` (included); Vercel needs a rewrite of all paths to `/index.html`.
- For Option A with a proxy host, forward `/api/*` to the backend and leave `VITE_API_URL` unset.

## 4. Test the deployed app
1. `https://<api>/api/health` → `"database":"connected"`.
2. Log in from the front-end; in browser DevTools → Application → Cookies confirm `token` is `HttpOnly` and `Secure`.
3. Refresh a deep link (`/app/leaves`) → still works.
4. Try a wrong password 25 times → you should get HTTP 429.

## 5. Handling database failures
- The server retries the first connection 5 times, then exits with a clear message (the host restarts it).
- After a successful start, Mongoose reconnects automatically; `/api/health` returns 503 while disconnected, which uptime monitors can watch.

## 6. Keeping secrets out of GitHub
`.gitignore` excludes `.env*` (except `.env.example`). Before pushing run `git status` and `git ls-files | findstr env`. If a secret was ever committed, **rotate it** (changing the file later does not remove it from history).
