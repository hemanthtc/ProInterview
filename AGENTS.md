# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

Single **Next.js 16** app (ProInterview / AI Interviewer). One dev process serves UI and all `/api/*` routes. There is no monorepo, Docker Compose, or separate backend service in the repo.

### Prerequisites (outside `npm install`)

- **Node.js 18+** (20+ recommended) and **npm** — lockfile is `package-lock.json`; use `npm install` / `npm ci`.
- **MongoDB** for auth, profiles, admin, scorecards, and cloud sync. Local dev in Cloud VMs: run MongoDB in Docker (see below). Set `MONGODB_URI` in `.env` (copy from `.env.example`).
- **`GEMINI_API_KEY`** in `.env` is required for the AI interview engine and most AI API routes. Without it, `/api/interviewer` returns 500.
- Optional: Gmail SMTP (`EMAIL_USER` / `EMAIL_PASS`) for email OTP on login/register; **phone registration** returns `otpCode` in the JSON response when `type` is not `email` (useful without SMTP).

### MongoDB + Docker on Cloud VMs

Docker is not started automatically. Before first use in a fresh VM:

1. Start `dockerd` if needed (storage driver `fuse-overlayfs` is typical in this environment).
2. Run MongoDB, e.g. `sudo docker run -d --name prointerview-mongo -p 27017:27017 mongo:7`
3. Use `MONGODB_URI=mongodb://127.0.0.1:27017/prointerview` in `.env`.
4. One-time seed: `GET http://localhost:3000/api/init-db` creates default org admin/employee accounts (see README / `src/app/api/init-db/route.ts`).

### Run / test / lint

| Goal | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:3000 |
| Typecheck + production compile | `npm run build` |
| Production serve | `npm run start` (after `build`) |

There is **no** `npm run lint` or ESLint config in this repo; treat **`npm run build`** as the compile/typecheck gate.

### Auth flows useful for automated testing

- **Phone signup:** `POST /api/auth/register` with `"type":"phone"` → response includes `otpCode` → `POST /api/auth/verify-otp` sets session cookie.
- **Org admin (after init-db):** identifier `hemanthtchemu2003@gmail.com` / default seed password in `init-db` route; login sends email OTP and fails without SMTP — OTP is still stored in MongoDB if you need to complete `verify-otp` manually.
- **Interview UI** (`/setup`, `/interview`) expects `localStorage` keys such as `userLoggedIn=true` (set by the login page after OTP).

### External services / gotchas

- **Piston** (`/api/run-code`): the public `emkc.org` executor may return “whitelist only”; code runner E2E may fail even with a valid session.
- **Hot reload:** `next dev` picks up most code changes; changing `.env` requires restarting the dev server.
- Do not commit `.env` (gitignored); only `.env.example` is tracked.
