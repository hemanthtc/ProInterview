# AI Interviewer Platform — Full Development Report

> **Last Updated:** 2026-06-23  
> **Purpose:** This report documents the complete project structure, all modifications made, known issues, environment setup, and important context for any agent or contributor working on this codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [All Modifications — Changelog](#5-all-modifications--changelog)
6. [Page-by-Page Breakdown](#6-page-by-page-breakdown)
7. [API Routes Reference](#7-api-routes-reference)
8. [Known Issues & Gotchas](#8-known-issues--gotchas)
9. [Build & Dev Server Instructions](#9-build--dev-server-instructions)
10. [Future Work & Open Items](#10-future-work--open-items)

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
├── .env                          # API keys and config
├── ARCHITECTURE.md               # Original architecture docs
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
```

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

## 10. Future Work & Open Items

### Pending Verification
- [ ] **Email Analyser E2E Test** — Verify "Interview Invitation" classification renders Platform/Schedule fields correctly.
- [ ] **Email Analyser E2E Test** — Verify "Offer Letter" classification renders Salary/Benefits/Joining Date fields correctly.
- [ ] Test the "Save & Re-verify" flow (inline edit company/location → re-call API → updated scores).
- [ ] Test "Create Preparation Roadmap" redirect with offer letter context (salary, benefits pre-populated).

### Potential Improvements
- [ ] Break `features/page.tsx` (~2680 lines) into smaller components for maintainability.
- [ ] Break `profile/page.tsx` (~2188 lines) into smaller components.
- [ ] Add proper TypeScript interfaces for `emailAnalysisResult` instead of `any`.
- [ ] Add error boundary components for graceful failure handling.
- [ ] Consider caching Gemini responses (e.g., for repeated analysis of the same email).
- [ ] Add rate-limit UI feedback (show countdown timer when 429 is hit).
- [ ] Add unit tests for API routes.
- [ ] Add Sarvam AI as alternative provider for email analysis (currently only Gemini).

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
