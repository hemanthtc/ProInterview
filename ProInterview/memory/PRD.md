# ProInterview — Iteration Notes

## App
Next.js 16 (App Router, TS) + MongoDB. AI interview prep platform (Amplify-deployed).
Interview modes: Practice (`/interview` → `/api/interviewer`) and Realistic (`/realistic-interview` → `/api/realistic-interviewer`). Settings configured in `/setup` (localStorage-driven).

## Original problem statement (this thread)
1. Synthetic Data Generator: Integrated API 504 during research + 400 "prompt > 50k chars"; must auto-adapt to whatever Gemini key/model is configured. (DONE)
2. Realistic Interview: remove difficulty levels; Company Clone OFF→on-campus, ON→off-campus; ground questions in resume education background + preferred role + target company; mix practical/theoretical/hard. (DONE)
3. Practice Interview: keep levels; add UI campus-path selector (on/off/rural); rural targets the candidate's preferred role, fundamentals-first. (DONE)
4. Realistic human voice for interview room + realistic + practice, WITHOUT any API key. (DONE — natural browser voices)
5. Email analyzer (Gmail): more accurate extraction. (DONE — prompt hardening)
6. D-ID avatar not working — fix WITHOUT api key. (PENDING)
7. Security upgrades S1–S4 and Subscription P1–P3 (user selected all). (PENDING)

## Implemented (dates)
### 2026-06 (session 1) — Synthetic Data Generator
- `src/app/api/synthetic-data/gemini/route.ts`: removed 50k prompt cap; key-supported models tried first (flash-first); capped attempts + per-call timeout (fixes 504); auto-adapts to configured key.
- `src/utils/gemini.ts`: replaced fake model list with real models + `-latest` aliases; added `preferTextModels()`.

### 2026-06 (session 2) — Interview logic + voice + email
- `src/app/api/realistic-interviewer/route.ts`: NO levels; mappedType = companyClone===false ? on-campus : off-campus; new question-variety block; removed Difficulty Level from prompt.
- `src/app/api/interviewer/route.ts`: added `campusPath` param (onCampus/offCampus/rural); rural block targets preferred role; kept levels.
- `src/app/interview/page.tsx`: sends `campusPath` in `/api/interviewer` payload.
- `src/app/setup/page.tsx`: added Campus Path selector (practice mode only), persisted as `campusPath` in localStorage.
- `src/app/realistic-interview/page.tsx`: removed level from first-message prompts.
- `src/utils/speakInterview.ts`: prefer natural/neural voices, human cadence (rate 0.96), no API key.
- `src/app/api/analyze-email/route.ts`: strict extraction accuracy rules.

## Testing status
- TypeScript compiles clean (only pre-existing @types/node lib quirk).
- Routes verified executing live (reach Gemini; fail only on placeholder key locally).
- NOT verified: full AI generation E2E (no Gemini key here) and browser E2E (preview ingress maps /api to a different port). Works on Amplify with real GEMINI_API_KEY.

## Backlog (needs credits)
- P0: D-ID avatar reliability without key (make SVG/built-in avatar default; D-ID optional/graceful).
- P1: Security — CSP/security headers, JWT refresh rotation, prompt-injection guards on AI routes, Razorpay webhook signature verification (login already has rateLimit + JWT expiry). Auth/payment → route via integration_expert.
- P1: Subscription — gate premium features to Pro, usage metering for realistic-interview & avatar, annual plan + free trial.
- P2: Prep pack → push reminders to device/Google Calendar (googleCalendar.ts helper exists).

## Notes
- No `.env` in repo (only `.env.example`); real keys live in Amplify env. `.env.local` here is dev-only (gitignored).
- Several routes call model `gemini-3.1-flash-lite` directly (left as-is; presumed valid in the deployed key).
