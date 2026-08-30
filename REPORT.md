# AI Interviewer Platform (ProInterview) — Full Development Report

> **Last Updated:** 2026-08-10  
> **Purpose:** This report documents the complete project structure, all modifications made, known issues, environment setup, and important context for any agent or contributor working on this codebase.

---

## Table of Contents

0. [2026-08-10 Update — Platform Feature Summary](#0-2026-08-10-update--platform-feature-summary)
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [All Modifications — Changelog](#5-all-modifications--changelog)
6. [Page-by-Page Breakdown](#6-page-by-page-breakdown)
7. [API Routes Reference](#7-api-routes-reference)
8. [Known Issues & Gotchas](#8-known-issues--gotchas)
9. [Build & Dev Server Instructions](#9-build--dev-server-instructions)
10. [Testing & Quality Tooling](#10-testing--quality-tooling)
11. [Future Work & Open Items](#11-future-work--open-items)

---

## 0. 2026-08-10 Update — Platform Feature Summary

The project has grown well beyond the original email-analyser/interview MVP described in the sections below (which are kept for history). ProInterview is now a much larger prep platform. The features below are **implemented and shipped** — sections 1–9 predate them and are only accurate for the original feature set.

| Feature | Where it lives | Notes |
|---|---|---|
| **Sarvam TTS / Indic voice** | `src/utils/sarvam.ts`, `src/app/api/sarvam/tts` | Optional AI provider (`aiProvider=sarvam`) for Indic-language text-to-speech in interviews; `toSarvamLanguageCode()` maps browser locales (e.g. `hi-IN`, `ta-IN`) to Sarvam voice codes, defaulting to `en-IN`. Gated behind `SARVAM_API_KEY`; metered via `usageMeter.ts` (`sarvamCalls`, `FREE_SARVAM_MONTHLY` / `PRO_SARVAM_MONTHLY`). |
| **Labs hub** | `src/app/labs/page.tsx`, `src/components/labs/` | Public entry point (no auth required) linking out to STAR Coach, Coding Lab, System Design, ATS Match, Panel Interview, and Film Room. Also the PWA offline shell root (see below). |
| **Prep packs / spaced drills** | `src/app/prep/page.tsx`, `src/utils/prepPack.ts`, `src/utils/spacedDrills.ts` | Builds a "prep pack" (checklist + meeting link extraction) from a pasted job/interview email and schedules spaced-repetition drills leading up to the interview date. |
| **Coaches marketplace v2** | `src/app/coaches/page.tsx`, `src/data/coaches.ts`, `src/app/api/coaches/*` | Curated human-coach directory (`COACHES`) with INR/USD rates, domains, and available slots; `buildMeetLink()` generates a `meet.jit.si/ProInterview-*` room per booking. Razorpay-backed booking + a cron-triggered reminder endpoint (`/api/coaches/reminders`, gated by `CRON_SECRET`). |
| **Sync-prep (cross-device progress)** | `src/app/api/sync-prep/route.ts`, `src/utils/usageMeter.ts`, `src/models/CloudSession.ts` | Merges local (`localStorage`) and cloud (`CloudSession.prepProgress`) STAR history, coding progress, ATS scores, referral credits, and monthly usage counters — last-write-wins per field, union/max for lists and counters. `mergePrepProgress`/`ensurePrepProgressShape`/`mergeStarHistory` are pure and unit-tested (see `tests/sync-prep.test.ts`). |
| **Notifications** | `src/app/api/notifications`, `src/app/api/notify-prep`, `src/models/Notification.ts` | In-app notification feed (`kind: "prep" \| "coach" \| "gmail" \| "referral" \| "system"`) plus a PWA web-push handler in `public/sw.js` (`self.addEventListener("push", ...)`) for prep reminders. |
| **Adzuna India jobs** | `src/utils/jobSearch.ts` (`fetchAdzunaIndia`, `INDIA_FALLBACK_JOBS`), `src/app/api/jobs/route.ts` | Live India job search via the Adzuna API (`ADZUNA_APP_ID`/`ADZUNA_APP_KEY`, `country=in`), combined with Remotive/Arbeitnow/RemoteOK. Falls back gracefully to a curated `INDIA_FALLBACK_JOBS` list (Bangalore/Hyderabad-heavy) when credentials are absent or live results are sparse. India city-synonym matching (Bangalore/Bengaluru, Gurgaon/Gurugram/NCR/Delhi, etc.) lives in `locationMatches`/`indiaCitySynonyms`. |
| **Vision system-design eval** | `src/app/api/evaluate-system-design/route.ts` | Sends the candidate's whiteboard as a base64 image (`diagramImageBase64` + `mimeType`) to Gemini's multimodal ("vision") endpoint alongside the text notes/board summary, so architecture diagrams — not just typed notes — are graded. Requires `GEMINI_API_KEY`; rate-limited per session. |
| **Voice STAR / panel coaching** | `src/utils/voiceCoach.ts`, `src/app/star-coach/page.tsx`, `src/app/panel-interview/page.tsx` | Real-time speech analysis of interview answers: filler-word detection (`countFillers`), words-per-minute, silence tracking, and a `moodHint` ("calm"/"rushed"/"hesitant"/"strong") surfaced live during STAR practice and multi-panelist mock interviews. |
| **Usage meters / plan limits** | `src/utils/usageMeter.ts` | Per-identifier, per-calendar-month counters for Gemini calls, Sarvam calls, and coach bookings (`checkAndIncrementUsage`), with `getPlanLimits(plan)` distinguishing Free Tier from Pro/Elite/Enterprise. Resets automatically when `periodStart` rolls into a new month. |
| **Referral credits** | `src/app/referrals/page.tsx`, `src/app/api/referrals/route.ts`, `addReferralCredits()` | Per-user referral code (`Referral` model) tracks invite usage; successful referrals add credits via `usageMeter.addReferralCredits`, stored on `prepProgress.referralCredits` and merged across devices by `mergePrepProgress`. |
| **PWA offline drills** | `public/manifest.json`, `public/sw.js`, `public/offline-drills.json` | Installable PWA (`display: standalone`) with shell cache `prointerview-shell-v4` covering `/`, `/labs`, `/prep`, `/star-coach`, `/coding-lab`, and seed STAR drills; network-first cache for `/api/star-coach-questions` and `/api/coding-problems`. Self-unregisters on `localhost`. |
| **Admin funnel dashboard** | `src/app/admin/page.tsx`, `src/app/api/admin/stats`, `/users`, `/employees`, `/leaderboard`, `/create-admin` | Signup → activation funnel (signups → first mock → first STAR drill → confirmed coach booking) plus user/employee management and a leaderboard, gated by admin-role JWT sessions (`getVerifiedSession`). |
| **S3 Community Chat** | `src/app/community/page.tsx`, `src/utils/s3Community.ts`, `src/app/api/community/*` | Bypasses MongoDB completely for channel/DM rooms, messages, read receipts, and likes. Saves structured JSON files directly to AWS S3. Features a 7-day retention period, a 5000-message room cap, WhatsApp ticks (single check for local offline queue, double checks for server, blue checks once read), and client offline synchronization. |

**Related environment variables** (already documented in `.env.example`): `SARVAM_API_KEY`, `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`, `RAZORPAY_WEBHOOK_SECRET` (for `/api/razorpay/webhook`), `CRON_SECRET` (for `/api/coaches/reminders`), `HAPPENSTANCE_API_KEY`. See `AGENTS.md` for the minimal set needed for build/dev.

---

## 1. Project Overview

**AI Interviewer** is a full-stack web platform that simulates realistic AI-driven technical interviews. It includes:

- **AI-powered mock interviews** with voice synthesis and multi-modal interaction (code editor, drawing canvas, and conversational chat).
- **Portfolio pre-analysis** (GitHub, LinkedIn, ZIP uploads → Gemini-graded baseline score).
- **Post-interview grading** with weighted scoring (35% portfolio + 65% interview performance).
- **Career coaching** across multiple past sessions.
- **Resume Builder** with templates and PDF export.
- **AI Email Analyser** — Paste job invitation or offer letter emails → AI classifies, extracts metadata, and verifies authenticity.
- **Roadmap Generator** — AI-generated learning roadmaps based on target company/role.
- **Profile Management** with Google OAuth, photo cropping, session history, and UPI-based payments.
- **Job Listings Board** — browse job openings.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | React 19 |
| Styling | Tailwind CSS v4 | Dark cyber-theme, glassmorphism |
| Animations | Framer Motion v12 | Page transitions, micro-animations |
| Icons | Lucide React | SVG icon library |
| AI Model | Google Gemini 2.5 Flash | Via `@google/generative-ai` SDK |
| PDF Parsing | `pdf-parse` v2.4.5 | Backend resume extraction |
| ZIP Analysis | `jszip` v3.10.1 | Client-side project upload analysis |
| Markdown | `marked` v17 | Render AI-generated markdown to HTML |
| Auth | Google OAuth | Via `@react-oauth/google` |
| Dropdowns | `react-select` | Company/Role multi-select components |

---

## 3. Project Structure

```
Ai-interviewer-main/
├── .env                          # API keys and config (ignored by git)
├── .env.example                  # Template config with placeholders for other developers
├── ARCHITECTURE.md               # Original architecture docs (including D-ID WebRTC avatar docs)
├── REPORT.md                     # THIS FILE — full dev report
├── package.json                  # Dependencies and scripts
├── next.config.ts                # Next.js configuration
├── postcss.config.mjs            # PostCSS + Tailwind config
├── tsconfig.json                 # TypeScript config
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (Google OAuth provider)
│   │   ├── globals.css           # Global CSS imports
│   │   ├── page.tsx              # Landing page / Portfolio analysis
│   │   │
│   │   ├── features/
│   │   │   └── page.tsx          # Features hub: Email Analyser, Resume Builder, Roadmap Generator
│   │   │
│   │   ├── setup/
│   │   │   └── page.tsx          # Interview setup (resume upload, mode selection)
│   │   │
│   │   ├── interview/
│   │   │   └── page.tsx          # Main interview engine (voice, code, drawing modes)
│   │   │
│   │   ├── interviewer/
│   │   │   └── page.tsx          # Alternative interviewer interface
│   │   │
│   │   ├── realistic-interview/
│   │   │   └── page.tsx          # Realistic interview mode
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx          # User profile, sessions, payments, account mgmt
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx          # Login/Signup page
│   │   │
│   │   ├── jobs/
│   │   │   └── page.tsx          # Job listings board
│   │   │
│   │   └── api/
│   │       ├── analyze-email/
│   │       │   └── route.ts      # Gemini-powered email analysis + verification
│   │       ├── analyze-interview/
│   │       │   └── route.ts      # Post-interview grading
│   │       ├── analyze-portfolio/
│   │       │   └── route.ts      # Portfolio/GitHub/LinkedIn analysis
│   │       ├── generate-resume/
│   │       │   └── route.ts      # AI resume generation
│   │       ├── generate-roadmap/
│   │       │   └── route.ts      # AI roadmap generation
│   │       ├── interviewer/
│   │       │   └── route.ts      # Live interview conversation API
│   │       ├── realistic-interviewer/
│   │       │   └── route.ts      # Realistic interview API
│   │       ├── profile-guidance/
│   │       │   └── route.ts      # Career coaching / cross-session analysis
│   │       ├── upload/
│   │       │   └── route.ts      # Resume PDF upload + text extraction
│   │       └── auth/
│   │           └── route.ts      # Authentication endpoints
│   │
│   ├── components/
│   │   ├── CompanySelect.tsx     # Multi-select dropdown for target companies
│   │   └── RoleSelect.tsx        # Multi-select dropdown for preferred roles
│   │
│   ├── data/
│   │   └── templates.ts          # Resume template definitions
│   │
│   └── utils/
│       └── storage.ts            # User-scoped localStorage helpers
```

---

## 4. Environment Setup

### `.env` File (Required Variables)

```env
GEMINI_API_KEY=<your-gemini-api-key>
SARVAM_API_KEY=<your-sarvam-api-key>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
NEXT_PUBLIC_MERCHANT_UPI_ID=<your-upi-id>
DID_API_KEY=<your-did-api-key-for-talking-avatar>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
NEXT_PUBLIC_API_URL=<your-api-base-url-e.g.-http://localhost:3000>
```

> [!NOTE]
> A template configuration file [.env.example](file:///d:/Project%20repo/Ai-interviewer-main/.env.example) is included in the project root. You can quickly set up your environment by copying it: `cp .env.example .env`.

### ⚠️ CRITICAL: Windows `.env` Sanitization

On Windows, some env values may include extra double quotes that break parsing. For example:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID="some-value"` → The wrapping `"` can cause `Invalid client ID` errors.
- `NEXT_PUBLIC_MERCHANT_UPI_ID` → Extra quotes make UPI IDs invalid in QR generation.

**Fix:** Ensure no wrapping double-quotes around values in `.env`, or sanitize them in code using `.replace(/"/g, "")`.

### Install & Run

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build (Windows workaround)
node node_modules/next/dist/bin/next build
# NOTE: `npm run build` may fail on Windows due to path issues.
# Always use the above command for production builds on Windows.
```

---

## 5. All Modifications — Changelog

### Session: 2026-06-26

Below is a chronological list of every change made during this session.

---

### Change 1: Robust .gitignore and .env.example Template
**Files Modified:**
- [.gitignore](file:///d:/Project%20repo/Ai-interviewer-main/.gitignore)
- [.env.example](file:///d:/Project%20repo/Ai-interviewer-main/.env.example) [NEW]

**What:** Created a new environment configuration template `.env.example` to guide new developers on key setups. Excluded `.env.example` from the Git ignore list by adding the `!.env.example` rule, and standardized `node_modules/` in `.gitignore`.  
**Why:** Improves developer onboarding and repository setup.

---

### Change 2: Architectural Documentation Refactoring
**File:** [ARCHITECTURE.md](file:///d:/Project%20repo/Ai-interviewer-main/ARCHITECTURE.md)  
**What:** Added comprehensive architectural deep-dives for the **D-ID Talking Head WebRTC Avatar Stream** engine, realistic mock interview flows, email invitation/offer letter parser, and interactive career roadmap builder. Added clickable file references.  
**Why:** Syncs documentation with existing codebase capabilities.

---

### Session: 2026-06-23

Below is a chronological list of every change made during this session.

---

### Change 1: QR Code Scanner — Close Button
**File:** `src/app/profile/page.tsx`  
**What:** Added a close (X) button to the QR code scanning interface/modal so users can dismiss it without completing a scan.  
**Why:** UX improvement — the scanner modal previously had no way to exit.

---

### Change 2: UPI ID Fix — QR Code Validity
**File:** `src/app/profile/page.tsx`  
**What:** Fixed the UPI QR code generation by sanitizing the `NEXT_PUBLIC_MERCHANT_UPI_ID` environment variable to strip any wrapping double-quotes. The generated `upi://pay?pa=...` URI was previously producing an "invalid beneficiary UPI ID" error on scanning.  
**Why:** Windows `.env` files sometimes wrap values in quotes, which gets included literally in the QR payload.  
**Technical Detail:** Added `.replace(/"/g, "")` to the UPI ID before embedding it in the QR data URI.

---

### Change 3: Email Analyser — `importantPoints.split` Fix
**File:** `src/app/features/page.tsx`  
**What:** Fixed `TypeError: emailAnalysisResult.importantPoints.split is not a function`. The `importantPoints` field was being returned as an array from the API but the UI was calling `.split("\\n")` on it expecting a string.  
**Why:** The API response shape was changed but the frontend rendering code was not updated to match.  
**Technical Detail:** Changed rendering logic to handle `importantPoints` as either a string (split by `\n`) or array (render directly).

---

### Change 4: Email Analyser — Redirect to Gmail/Outlook
**File:** `src/app/features/page.tsx`  
**What:** Instead of making the user paste raw email text, added a button to redirect users to their Gmail or Outlook inbox in a new tab so they can copy the email from there. Added "Open Gmail" and "Open Outlook" buttons above the text area.  
**Why:** User requested a more streamlined flow rather than pasting emails manually.

---

### Change 5: Gemini 503 Error — Retry Logic
**File:** `src/app/api/analyze-email/route.ts`  
**What:** Added a 3-attempt retry mechanism with exponential backoff (3s, 6s delays) for transient Gemini API errors (429 rate limit, 503 overload).  
**Why:** The Gemini 2.5 Flash model was intermittently returning 503 "high demand" errors. Retries allow the request to succeed on subsequent attempts.  
**Technical Detail:** Catches errors with status 429 or 503, or messages containing "demand", and retries with increasing delay.

---

### Change 6: Client-Side Email Parser — Regex Fix
**File:** `src/app/features/page.tsx`  
**What:** Fixed `SyntaxError: Invalid regular expression: /\bC++\b/i: Nothing to repeat`. The `+` characters in "C++" were not escaped in the regex pattern used by the client-side skill parser.  
**Why:** JavaScript regex treats `+` as a quantifier. Unescaped `C++` in a `\b` word boundary pattern causes a syntax error.  
**Technical Detail:** Escaped special regex characters in skill names using `skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before constructing the RegExp.

---

### Change 7: Full API-Driven Email Analysis Refactoring
**Files Modified:**
- `src/app/api/analyze-email/route.ts` — Complete rewrite
- `src/app/features/page.tsx` — Major refactor

**What:** Replaced the entire client-side regex-based email parser (`parseEmailClientSide`, ~220 lines) with a unified Gemini API call that performs classification, extraction, and verification in a single request.

**Backend Changes (`route.ts`):**
- Rewrote the POST handler to accept `{ emailText, company?, location? }`.
- Built a comprehensive Gemini 2.5 Flash prompt that:
  - **Classifies** the email as `"job_invite"` or `"offer_letter"`.
  - **Extracts** company, role, location, skills array, HR name, platform/format, interview date.
  - **Extracts offer details**: base salary, benefits array, joining date (for offer letters).
  - **Scores authenticity** (0-100) for company and location with professional feedback.
- Supports optional `company`/`location` override parameters for re-verification.
- Returns a single structured JSON response.
- Includes 3-attempt retry logic for transient 429/503 Gemini errors.
- Falls back to a default JSON structure if Gemini response parsing fails.

**Frontend Changes (`page.tsx`):**
- **Deleted** the entire `parseEmailClientSide` function (~220 lines of regex heuristics).
- **Rewrote `handleAnalyzeEmail`**: Now calls `/api/analyze-email` with raw email text, sets both `emailAnalysisResult` and `verificationResult` from the single API response.
- **Rewrote `handleVerifyTargetCredentials`**: Sends email text + user-edited overrides to get fresh API analysis + verification scores.

**New UI Features:**
- **Email Type Classification Badge**: Glassmorphic pill badge above the parameters card:
  - **Interview Invitation** → Teal badge with `Mail` icon.
  - **Job Offer Letter** → Indigo/violet badge with `Award` icon.
- **HR / Sender Row**: Displays the extracted recruiter name.
- **Conditional Interview Fields** (for `job_invite`):
  - Platform / Format (e.g., Zoom, HackerRank).
  - Interview Schedule date.
- **Conditional Offer Fields** (for `offer_letter`):
  - Salary / CTC displayed in indigo highlight.
  - Joining Date.
  - Benefits & Perks rendered as tag pills.
- **Skills Tags Row**: All extracted skills render as teal tag pills.
- **Roadmap Redirect**: Updated to append salary, joining date, and benefits to the roadmap's additional context when the email is an offer letter.
- All existing features preserved: inline editing, Save & Re-verify, authenticity progress bar, Google Maps link.

---

### Change 8: S3 Saved Resumes Sync & Offline Fallback
**Files Modified:**
- `src/app/api/resumes/route.ts` [NEW] — GET/POST resumes stored in AWS S3 scoped to user identifier.
- `src/components/prointerviewer/ProInterviewerApp.tsx` — Sync and load-time merge algorithms.

**What:** Implemented cross-device saved resumes synchronization to AWS S3. If S3 is offline or unreachable (returns 503 or throws connection error), it seamlessly falls back to `localStorage` in the browser and displays a beautiful warning notification popup. When S3 comes back online, the mount check merges lists by `updatedAt` timestamp and automatically migrates local changes to the cloud.

---

### Change 9: Phone Demo Mode Deletion
**Files Modified:**
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/login/page.tsx`

**What:** Completely removed phone number registration and login support. Replaced the auto-OTP generation for numbers and deleted the bypass verification indicator banners. Only valid email-based logins are supported for candidate accounts.

---

### Change 10: Isolated Guest Mode (The Sandbox Bubble)
**Files Modified:**
- `src/middleware.ts` — Router session filters.
- `src/app/features/page.tsx` — LocalStorage-only resume builder and API restriction checks.

**What:** Implemented a secure Guest Mode accessed via the new "Explore as Guest" option on the login screen. It allows guests to use the Resume Builder locally/offline in their browser, but blocks access to sensitive user data, admin portals, and external APIs (AI generator, mock interview, roadmaps, etc.). Attempting to open these online features pops up an authentication warning.

---

### Change 11: Rate Limiter Garbage Collection (Memory Leak Fix)
**File Modified:**
- `src/utils/rateLimit.ts`

**What:** Fixed a memory leak in the rate limiter by implementing periodic garbage collection. When the buckets map exceeds 1000 items, it iterates and purges keys with no active timestamps.

---

### Change 12: Hydration Flash Fix
**Files Modified:**
- `src/app/page.tsx`
- `src/app/login/page.tsx`

**What:** Prevented logged-out layouts from flashing for a few seconds during Next.js client-side page hydration. Added `isHydrated` checks that render a clean loading spinner until client-side hydration has successfully verified the session.

---

## 6. Page-by-Page Breakdown

### Landing Page (`src/app/page.tsx`)
- Portfolio analysis form (GitHub URL, LinkedIn URL, Portfolio URL, ZIP uploads).
- Glassmorphic dark-mode design with animated gradients.
- Target company & role multi-select dropdowns.
- "Analyze & Continue" triggers `/api/analyze-portfolio`.

### Features Hub (`src/app/features/page.tsx`) — ~2680 lines
The largest file in the project. Contains 4 tool tabs:
1. **Portfolio Analysis** — Pre-interview context analyzer.
2. **Resume Builder** — Template-based resume creation with AI assist and PDF download.
3. **AI Email Analyser** — Paste job emails → API-driven classification + verification.
4. **Roadmap Generator** — AI-generated learning roadmaps with task checklists.

**Key State Variables:**
- `activeTool` / `activeModal` — Controls which tool tab is visible.
- `emailText` / `emailAnalysisResult` / `verificationResult` — Email analyser state.
- `isEditingExtracted` / `editableCompany` / `editableLocation` — Inline editing for extracted details.
- `emailType` — Stored in `emailAnalysisResult.emailType` (`"job_invite"` or `"offer_letter"`).

### Profile Page (`src/app/profile/page.tsx`) — ~2188 lines
- Session history with expandable details.
- AI Career Guidance (cross-session analysis).
- Account details (name editing, email, member since).
- Profile photo upload with WhatsApp-style circular crop modal.
- Delete account with confirmation dialog.
- **UPI Payment System**: QR code generation, payment verification modal, manual payment option with QR scanner.

### Interview Pages
- `src/app/interview/page.tsx` — Standard AI interview with voice synthesis.
- `src/app/realistic-interview/page.tsx` — Realistic mode interview.
- Both support pause/resume via localStorage serialization.
- Tag interception pattern: `[MODE:CODE]`, `[MODE:DRAW]`, `[MODE:CHAT]`.

### Setup Page (`src/app/setup/page.tsx`)
- Resume upload (PDF → `pdf-parse` extraction).
- Interview configuration (type, difficulty, AI provider).

### Login Page (`src/app/login/page.tsx`)
- Google OAuth integration.
- Phone number login option.

### Jobs Page (`src/app/jobs/page.tsx`)
- Job listings board.

---

## 7. API Routes Reference

| Route | Method | Purpose | Key Params |
|-------|--------|---------|------------|
| `/api/analyze-email` | POST | Email classification, extraction & verification | `{ emailText, company?, location? }` |
| `/api/analyze-interview` | POST | Post-interview grading (Technical, Communication, Behavioral) | `{ transcript, resumeText, portfolioRating }` |
| `/api/analyze-portfolio` | POST | Portfolio/GitHub/LinkedIn analysis → baseline score | `{ githubUrl, linkedinUrl, portfolioUrl, files }` |
| `/api/generate-resume` | POST | AI-assisted resume content generation | `{ template, userInfo }` |
| `/api/generate-roadmap` | POST | AI-generated learning roadmap | `{ course, company, location, additionalInfo }` |
| `/api/interviewer` | POST | Live interview conversation | `{ message, context, mode }` |
| `/api/realistic-interviewer` | POST | Realistic interview conversation | Same as above |
| `/api/profile-guidance` | POST | Career coaching across sessions | `{ pastSessions }` |
| `/api/upload` | POST | Resume PDF upload + text extraction | `FormData { file }` |
| `/api/auth` | POST | Authentication | `{ token, provider }` |
| `/api/tavus-talk` | POST | Triggers static talking head video generation | `{ text }` |
| `/api/tavus-stream` | POST | Creates Tavus WebRTC conversation session | `{ action: "create" }` |

### `/api/analyze-email` — Response Shape

```json
{
  "emailType": "job_invite" | "offer_letter",
  "extractedDetails": {
    "company": "Google",
    "role": "Senior Software Engineer",
    "location": "Bangalore, India",
    "skills": ["React", "TypeScript", "Node.js"],
    "hrName": "Sarah Connor",
    "platformOrFormat": "Google Meet",
    "interviewDate": "July 15, 2026 at 10:00 AM IST",
    "salaryDetails": {
      "baseSalary": "₹32 LPA",
      "benefits": ["Health Insurance", "RSUs", "Relocation Bonus"],
      "joiningDate": "August 1, 2026"
    }
  },
  "importantPoints": ["Bring government ID", "Review system design"],
  "mandatoryThings": ["- [ ] Complete HackerRank assessment", "- [ ] Upload ID proof"],
  "companyValid": true,
  "companyScore": 100,
  "locationValid": true,
  "locationScore": 100,
  "verificationFeedback": "Google is a globally recognized technology company..."
}
```

---

## 8. Known Issues & Gotchas

### ⚠️ Windows Build Command
```bash
# DO NOT USE:
npm run build    # ← Fails on Windows due to path issues

# USE INSTEAD:
node node_modules/next/dist/bin/next build
```

### ⚠️ Gemini API Rate Limits
- The Gemini 2.5 Flash model has a **20 RPM (requests per minute)** quota on the free tier.
- The `/api/analyze-email` route has built-in 3-attempt retry with exponential backoff.
- During heavy testing, you may hit **429 (RESOURCE_EXHAUSTED)** errors. Wait ~1 minute for quota reset.
- Occasional **503 (Service Unavailable)** errors during high-demand periods — retry logic handles this.

### ⚠️ `.env` Double-Quote Issue
- On Windows, some tools wrap `.env` values in double quotes.
- The code sanitizes `NEXT_PUBLIC_MERCHANT_UPI_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` by stripping wrapping `"`.
- If adding new env variables, ensure they don't contain accidental wrapping quotes.

### ⚠️ TypeScript Strict Mode
- State updater callbacks require explicit type annotations: `(prev: any) => ...`
- The `emailAnalysisResult` and related states use `any` type for flexibility with varying API response shapes.

### ⚠️ Large File Warning
- `src/app/features/page.tsx` is ~2680 lines and `src/app/profile/page.tsx` is ~2188 lines.
- When editing these files, use precise line ranges and targeted replacements.
- Never attempt to rewrite the entire file — use `replace_file_content` or `multi_replace_file_content` on specific line ranges.

### ⚠️ Turbopack vs Webpack
- `next dev` uses Turbopack by default in Next.js 16. It can have issues with certain imports.
- Use `next dev --webpack` if you encounter unexplained module resolution errors during development.
- For production builds, always use `node node_modules/next/dist/bin/next build` (uses Webpack).

---

## 9. Build & Dev Server Instructions

```bash
# Development (Turbopack — default, faster)
npm run dev

# Development (Webpack — fallback if Turbopack has issues)
npx next dev --webpack
# OR with increased memory:
$env:NODE_OPTIONS="--max-old-space-size=4096"; node node_modules/next/dist/bin/next dev --webpack

# Production Build (Windows)
node node_modules/next/dist/bin/next build

# Start Production Server
npm run start
```

### Expected Build Output (Healthy)
```
Route (app)                    Size
┌ ○ /                          17.3 kB
├ ○ /features                  196 kB
├ ○ /interview                 ...
├ ○ /profile                   151 kB
├ ○ /setup                     ...
├ ƒ /api/analyze-email         ...
├ ƒ /api/analyze-interview     ...
└ ... (19 total routes)

✓ Compiled successfully
✓ 0 errors, 0 warnings
```

---

## 10. Testing & Quality Tooling

### Unit / API tests (Vitest)

`npm test` runs `vitest run` over `tests/**/*.test.ts` (Node environment, no external services required — MongoDB/Gemini/Sarvam calls are never exercised by this suite). As of 2026-08-10:

| File | Covers |
|---|---|
| `tests/auth-security.test.ts` | OTP hashing/verification, rate limiting, interview scoring, JWT create/verify |
| `tests/backlog-features.test.ts` | Prep-pack meeting link extraction, coding progression, domain packs, rate limiting |
| `tests/coaches-sarvam.test.ts` | Coach catalog data shape, Sarvam locale-code mapping |
| `tests/community.test.ts` | Community store helpers |
| `tests/job-search.test.ts` | Resume-profile heuristic, generic search query building, web-search deep links |
| `tests/lab-progress.test.ts` | `localStorage`-backed STAR history and coding-progress helpers |
| `tests/star-coach.test.ts` | STAR question bank, shuffling, generated-question normalization |
| `tests/system-design.test.ts` | System design board helpers |
| **`tests/sync-prep.test.ts`** *(new)* | `mergePrepProgress`, `ensurePrepProgressShape`, `getPlanLimits`, `mergeStarHistory` from `usageMeter.ts` — pure merge/shape logic used by `/api/sync-prep` |
| **`tests/job-india.test.ts`** *(new)* | `INDIA_FALLBACK_JOBS` shape/coverage (Bangalore/Hyderabad/remote) and India-city-aware `buildSearchQueries` (Bangalore/Bengaluru/Hyderabad) from `jobSearch.ts` |
| **`tests/api-error.test.ts`** *(new)* | `formatRateLimitMessage` and `readApiError` from `apiError.ts` against mocked `Response` objects |
| **`tests/coach-catalog.test.ts`** *(new)* | `buildGoogleCalendarUrl` and `nextSlotDate` from `googleCalendar.ts` (used by the coaches marketplace "Add to Calendar" flow) |

Note: `locationMatches`/`indiaCitySynonyms` in `jobSearch.ts` are module-private, so India location-matching is exercised indirectly through the exported `INDIA_FALLBACK_JOBS` data and `buildSearchQueries`, per the existing `job-search.test.ts` pattern of only testing exported surface area. `searchMatchingJobs` itself performs live `fetch()` calls (Remotive/Arbeitnow/RemoteOK/Adzuna) and is intentionally left untested at the unit level — it would need network mocking to be a reliable pure test.

Full suite: **12 test files / 76 tests**, all passing (`npm test`).

### ESLint

Next.js 16 removed `next lint` in favor of running ESLint directly, and `eslint-config-next` 16.x ships native flat config. This repo now has:

- `eslint` + `eslint-config-next` (matched to the installed `next@16.3.0`) as devDependencies.
- `eslint.config.mjs` — flat config spreading `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, with `@typescript-eslint/no-explicit-any` downgraded from the default `error` to `warn` (the codebase relies on `any` heavily for Gemini/Mongo/legacy API payloads; tightening this is tracked as backlog, not blocked on).
- `"lint": "eslint \"src/**/*.{ts,tsx}\" --max-warnings 999"` in `package.json` — the high `--max-warnings` threshold and `warn`-level `any`/unused-vars mean the script exists and is useful without being blocked by the current warning backlog (~380 warnings, mostly `no-explicit-any` and unused vars).
- `.github/workflows/ci.yml` runs `npm run lint` as a **non-blocking** (`continue-on-error: true`) step between `npm test` and `npm run build`, so CI surfaces lint output without gating merges on pre-existing issues.

**Known pre-existing lint errors (not introduced by this change, left untouched to avoid unrelated risk):** ~66 hard errors as of 2026-08-10, mostly:
- `react-hooks/set-state-in-effect` / `react-hooks/purity` / `react-hooks/immutability` (32 + 7) — newer React Compiler-oriented rules flagging pre-existing `useEffect` patterns (e.g. `ProInterviewerApp.tsx` calling `setState` synchronously inside effects).
- `react/no-unescaped-entities` (17) — raw `'`/`"` in JSX text.
- `@typescript-eslint/no-require-imports` (6) — `require()` used for `pdf-parse` in a few API routes (likely intentional, to avoid bundling issues).
- `react-hooks/rules-of-hooks` (2) — a plain helper function named `useMockFallbackRoadmap` in `features/page.tsx` is not actually a hook, just misnamed.
- `prefer-const` (2) — in `src/utils/db.ts`.

These are real, fixable issues but are pre-existing and out of scope for this pass; see the CI step's `continue-on-error` and the rule breakdown above for anyone picking this up next.

### End-to-end / smoke testing

No Playwright (or other browser-automation) dependency is installed — adding one is a non-trivial dependency + browser-download footprint for a "minimal smoke" ask, so instead:

- `docs/E2E.md` *(new)* — a manual smoke-test checklist covering login → STAR coach → coding lab → jobs search, plus the public-page and auth-gated-route matrix from `AGENTS.md`. Use this as a scripted manual QA pass, or as the basis for a future `tests/e2e/*.spec.ts` suite once Playwright is added.
- The pure-function Vitest suite above (`sync-prep`, `job-india`, `api-error`, `coach-catalog`, plus the pre-existing files) covers the underlying utility logic that those flows depend on, without needing a running server or browser.

---

## 11. Future Work & Open Items

### Pending Verification
- [ ] **Email Analyser E2E Test** — Verify "Interview Invitation" classification renders Platform/Schedule fields correctly.
- [ ] **Email Analyser E2E Test** — Verify "Offer Letter" classification renders Salary/Benefits/Joining Date fields correctly.
- [ ] Test the "Save & Re-verify" flow (inline edit company/location → re-call API → updated scores).
- [ ] Test "Create Preparation Roadmap" redirect with offer letter context (salary, benefits pre-populated).
- [ ] Run through `docs/E2E.md` manually against a real MongoDB + Gemini key before each release.

### Potential Improvements
- [ ] Break `features/page.tsx` (~2680 lines) into smaller components for maintainability.
- [ ] Break `profile/page.tsx` (~2188 lines) and `admin/page.tsx` (~1221 lines) into smaller components.
- [ ] Add proper TypeScript interfaces for `emailAnalysisResult` and other `any`-typed API payloads (see the ESLint `no-explicit-any` backlog above — ~270 warnings).
- [ ] Add error boundary components for graceful failure handling.
- [ ] Consider caching Gemini responses (e.g., for repeated analysis of the same email).
- [ ] Add rate-limit UI feedback (show countdown timer when 429 is hit).
- [ ] Add route-level (`/api/*`) integration tests once a test MongoDB instance is available in CI.
- [ ] Fix the pre-existing ESLint hard errors listed in [§10](#10-testing--quality-tooling) (`react-hooks/set-state-in-effect`, `no-unescaped-entities`, `no-require-imports`, the misnamed `useMockFallbackRoadmap` helper, `prefer-const` in `db.ts`), then flip `npm run lint` (and the CI step) back to blocking.
- [ ] Add a real Playwright/browser E2E suite once the team decides on a CI runner budget for it; `docs/E2E.md` is the interim manual checklist.

### Honest gaps (as of 2026-08-10)
- Sarvam AI is now implemented as an alternative TTS/voice provider (see §0) — no longer a gap, but it is **not** used for the text-based email/portfolio analysis routes, which remain Gemini-only.
- E2E coverage is a manual checklist (`docs/E2E.md`), not automated — see "Potential Improvements" above.
- ESLint has a real backlog of ~66 hard errors and ~380 warnings on pre-existing code; the lint script and CI step exist and run, but are intentionally non-blocking until that backlog is paid down.
- Admin funnel stats (`/api/admin/stats`) and the coaches/referrals flows depend on MongoDB; they are untested at the API level in this pass (only their pure helper functions are unit-tested).

---

## Appendix: Key Data Flows

### Email Analysis Flow
```
User pastes email → handleAnalyzeEmail()
  → POST /api/analyze-email { emailText }
  → Gemini 2.5 Flash (structured prompt)
  → Returns { emailType, extractedDetails, scores }
  → setEmailAnalysisResult(response)
  → setVerificationResult({ companyScore, locationScore, ... })
  → UI renders classification badge + conditional fields
```

### Re-verification Flow
```
User edits company/location → handleVerifyTargetCredentials()
  → POST /api/analyze-email { emailText, company, location }
  → Gemini re-analyzes with overrides
  → Updates both emailAnalysisResult and verificationResult
```

### Interview Flow
```
Portfolio Analysis → Setup (resume + config) → Live Interview
  → Voice recognition (webkitSpeechRecognition)
  → AI responses (window.speechSynthesis)
  → Tag interception: [MODE:CODE], [MODE:DRAW], [MODE:CHAT]
  → [TERMINATE] → Post-interview grading
  → finalScore = (portfolioRating * 0.35) + (interviewScore * 0.65)
```

### Payment Flow (Profile Page)
```
User clicks "Upgrade" → Payment modal opens
  → UPI QR code generated (upi://pay?pa=...)
  → User scans QR with UPI app
  → OR user enters UPI ID manually
  → Payment verification (client-side confirmation)
```

---

*This report should be updated each time changes are made to the codebase to keep it current for all contributors and agents.*
