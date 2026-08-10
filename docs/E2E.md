# Manual E2E Smoke Checklist

There is no automated browser E2E suite in this repo (see `REPORT.md` §10 for why —
adding Playwright is a non-trivial dependency footprint for a "minimal smoke" pass).
Until that changes, run this checklist manually before a release, or use it as the
spec for a future `tests/e2e/*.spec.ts` suite.

Pure utility logic behind each of these flows (score merging, location matching,
error formatting, calendar links, etc.) is already covered by fast unit tests in
`tests/` — see `npm test`. This checklist is for the parts that only make sense with
a real browser + server: navigation, auth, and rendering.

## Prerequisites

- `npm run dev` running locally (http://localhost:3000).
- `.env` populated per `AGENTS.md` — at minimum `GEMINI_API_KEY` and `JWT_SECRET`. For
  the full checklist below (login, prep, coaches, jobs persistence) also set
  `MONGODB_URI`. Real `SARVAM_API_KEY` / `ADZUNA_APP_ID`+`ADZUNA_APP_KEY` are optional —
  those features degrade gracefully without them (Sarvam provider hidden/disabled,
  Adzuna skipped in favor of `INDIA_FALLBACK_JOBS`).

## 1. Public pages (no auth required)

- [ ] `/` loads, portfolio-analysis landing page renders without console errors.
- [ ] `/labs` loads and lists the lab cards (STAR Coach, Coding Lab, System Design,
      ATS Match, Panel Interview, Film Room).
- [ ] `/coding-lab` loads and shows the problem list even when logged out (a
      `LabAuthBanner` should appear rather than a hard redirect).
- [ ] `/community` loads; posting falls back to the in-memory store if MongoDB is
      unavailable (per `AGENTS.md` gotchas) — verify no 500s.
- [ ] `/login` renders the login form.

## 2. Auth-gated redirect behavior

- [ ] With no session (clear `localStorage` / cookies), visiting `/features` or
      `/setup` redirects to `/login`.
- [ ] `/api/run-code` returns 401 (not a crash) when called without a session cookie.

## 3. Login → STAR Coach flow

- [ ] Sign in via `/login` (email/OTP or Google OAuth per configured providers).
- [ ] After login, `userLoggedIn` is set in `localStorage` and a JWT cookie is present.
- [ ] Navigate to `/star-coach`. A behavioral question loads from the seed bank.
- [ ] Record or type an answer; submit for scoring. A score + STAR breakdown +
      improvement tips render.
- [ ] Reload the page — the most recent STAR entry appears in history (capped at 5,
      per `loadStarHistory`/`saveStarHistoryEntry` in `src/utils/labProgress.ts`).
- [ ] If signed in with cloud sync enabled, check `/api/sync-prep` (or the Prep page)
      reflects the same STAR entry after a refresh — verifies the merge logic in
      `mergePrepProgress` end-to-end.

## 4. Coding Lab flow

- [ ] From `/coding-lab`, open the first problem (`two-sum`) and submit a correct
      solution. Score ≥ 70 marks it solved and unlocks the next problem
      (`progressivePath` order).
- [ ] Submit an incorrect/partial solution to a second problem; confirm it is *not*
      marked solved but the best score is still recorded.
- [ ] Hidden test count is shown without leaking hidden test contents (matches
      `getProblemPublic` behavior).

## 5. Jobs search flow

- [ ] Go to `/jobs`, paste a short resume, and search with location `Bangalore`.
- [ ] Confirm results include either live listings (Remotive/Arbeitnow/RemoteOK/Adzuna)
      or, when live sources return too few, a top-up from the curated India fallback
      list (`INDIA_FALLBACK_JOBS` — Razorpay/Swiggy/Flipkart/Microsoft
      India/Salesforce/Postman).
- [ ] Confirm the "Google Jobs search" and "LinkedIn Jobs search" deep links open with
      the location applied.
- [ ] Repeat with location `Remote` and confirm remote-tagged listings surface.
- [ ] Trigger the rate limit (12 requests / 15 min per IP) and confirm the UI shows a
      friendly "Rate limited. Retry in Ns." message (`formatRateLimitMessage`), not a
      raw error.

## 6. Coaches marketplace (optional, needs Razorpay + Mongo)

- [ ] `/coaches` lists the curated coach directory with INR rates and slots.
- [ ] Booking a slot generates a `meet.jit.si/ProInterview-*` link and an "Add to
      Google Calendar" button whose URL encodes the correct start/end time
      (`buildGoogleCalendarUrl`).

## 7. Regression checks

- [ ] No new console errors/warnings introduced on any of the above pages.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds with `JWT_SECRET` + `GEMINI_API_KEY` set (per
      `AGENTS.md`).
