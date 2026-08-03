# AGENTS.md

## Cursor Cloud specific instructions

ProInterview is a single **Next.js 16** app (UI + API routes). There is no separate backend service or `docker-compose` in the repo.

### Services

| Service | When needed | How to run |
|---------|-------------|------------|
| Next.js dev server | Always | `npm run dev` → http://localhost:3000 |
| MongoDB | Auth, profiles, admin, payments, cloud sync | **Atlas** via `MONGODB_URI` in `.env`, or local: `sudo docker run -d --name prointerview-mongo -p 27017:27017 mongo:7` with `MONGODB_URI=mongodb://127.0.0.1:27017/prointerview` |

Docker on Cloud Agent VMs: use `sudo docker` (daemon is installed but the socket is root-only). Start `dockerd` if `docker ps` fails: `sudo dockerd > /tmp/dockerd.log 2>&1 &` then wait a few seconds.

### Environment

1. Copy `cp .env.example .env` (never commit `.env`).
2. **Required for AI features:** `GEMINI_API_KEY` (valid Google AI key).
3. **Required for auth/persistence:** reachable `MONGODB_URI` (local Docker Mongo or Atlas).
4. Do not wrap `.env` values in extra quotes (README warns this breaks OAuth/UPI).
5. Optional: Gmail SMTP (`EMAIL_USER`/`EMAIL_PASS`), Google OAuth, D-ID, Razorpay, Happenstance — see README.

Seed org admin/employee collections (dev): `GET http://localhost:3000/api/init-db` after Mongo is up.

### Auth testing without Gmail SMTP

- **Phone registration** (`type: "phone"` on `/api/auth/register`) returns `otpCode` in the JSON response; use it on `/api/auth/verify-otp` with `flowType: "register"`.
- **Phone login** also returns `otpCode` in the login API response when `type` is phone.
- Email-based org/user login requires working SMTP or OTP email send fails.

Interview and most protected pages check **client** `localStorage.userLoggedIn === "true"` (set after OTP verify on the login page).

### Verify / quality checks

| Check | Command |
|-------|---------|
| Typecheck | `npx tsc --noEmit` |
| Production build | `npm run build` |
| Lint | No ESLint script in `package.json` |

There is no automated E2E test runner in the repo (manual checklists in `REPORT.md`).

### Dev server

Run in a persistent tmux session (HMR stays attached). Default port **3000**. After changing `.env`, restart the dev server.
