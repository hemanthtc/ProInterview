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

Additional optional feature keys (all fail gracefully / fall back when unset — see `.env.example` for full descriptions):

- `SARVAM_API_KEY` — Indic TTS/voice provider (`aiProvider=sarvam`); without it that provider is unavailable but Gemini flows are unaffected.
- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` — live India job search in `/api/jobs`; without them, Adzuna is skipped and curated India fallback listings are used instead.
- `RAZORPAY_WEBHOOK_SECRET` — verifies `/api/razorpay/webhook` payloads.
- `CRON_SECRET` — shared secret for the cron-triggered coach-booking reminder endpoint (`/api/coaches/reminders`).
- `S3_BUCKET` + `AWS_REGION` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — Amazon S3 for profile photos, resumes, and `/api/upload` storage (`/api/s3/presign`). Optional `S3_PUBLIC_BASE_URL` for CloudFront. Without S3, uploads fall back to base64/Mongo as before.

**Do not wrap `.env` values in extra quotes** — the README warns this can break OAuth and UPI.

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` → http://localhost:3000 |
| Unit tests | `npm test` (Vitest; no external services) |
| Lint | `npm run lint` (ESLint via `eslint.config.mjs` / `eslint-config-next` flat config) |
| Production build | `npm run build` (needs `JWT_SECRET` + `GEMINI_API_KEY` in env) |
| Production serve | `npm start` |

CI runs `npm test`, then `npm run lint` (non-blocking — `continue-on-error: true`, since there's a pre-existing lint warning/error backlog), then `npm run build`.

### Gotchas

- `/features` and `/setup` redirect to `/login` without a session (`userLoggedIn` in localStorage or JWT cookie).
- Public pages that work without auth: `/`, `/labs`, `/coding-lab`, `/community`, `/login`.
- `/api/run-code` and several other APIs require authentication.
- Community chat falls back to an in-memory store when MongoDB is unavailable.
- Node 18+ required; CI uses Node 20.
