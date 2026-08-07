# AGENTS.md

## Cursor Cloud specific instructions

ProInterview is a **single Next.js 16 monolith** (React 19, TypeScript, Tailwind v4). There is no docker-compose and no separate backend service — `npm run dev` serves both the UI and all `/api/*` routes on port 3000.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js dev server | `npm run dev` | Only local process required |
| MongoDB | External (Atlas) or local `mongod` | Required for auth, profiles, admin, persistent community; optional for public pages and coding lab |

### Environment

Copy `.env.example` → `.env` before running the app. Minimum for **build + dev server startup**:

- `GEMINI_API_KEY` — use `dummy` for build/CI; real key needed for AI interview features
- `JWT_SECRET` — at least 32 characters (CI uses `ci-build-secret-key-with-at-least-32-chars`)

Full auth/persistence E2E also needs `MONGODB_URI`. Other keys (Google OAuth, D-ID, Razorpay, SMTP) are optional per feature.

**Do not wrap `.env` values in extra quotes** — the README warns this can break OAuth and UPI.

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` → http://localhost:3000 |
| Unit tests | `npm test` (Vitest; no external services) |
| Production build | `npm run build` (needs `JWT_SECRET` + `GEMINI_API_KEY` in env) |
| Production serve | `npm start` |

There is **no lint script** in `package.json`; CI runs `npm test` and `npm run build` only.

### Gotchas

- `/features` and `/setup` redirect to `/login` without a session (`userLoggedIn` in localStorage or JWT cookie).
- Public pages that work without auth: `/`, `/labs`, `/coding-lab`, `/community`, `/login`.
- `/api/run-code` and several other APIs require authentication.
- Community chat falls back to an in-memory store when MongoDB is unavailable.
- Node 18+ required; CI uses Node 20.
