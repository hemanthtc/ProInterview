# ProInterview

**Master your technical interviews with AI.**

ProInterview is a full-stack AI interview platform that simulates realistic technical interviews — with voice, code challenges, drawing boards, portfolio analysis, synthetic data generation, and career coaching — so candidates can practice under pressure and improve with measurable feedback.

---

## Features

| Feature | Description |
|--------|-------------|
| **AI Mock Interviews** | Conversational interviews powered by Google Gemini (optional Sarvam AI), with browser speech recognition and synthesis |
| **Multi-modal Interaction** | Dynamic UI modes for chat, code editing (`[MODE:CODE]`), and sketching (`[MODE:DRAW]`) driven by the AI |
| **Synthetic Data Generator** | Interactive tabular dataset & document generator with AI schema design, export (PDF, DOCX, MD, TXT), folder management, and public/private workspace sharing |
| **Portfolio Pre-Analysis** | Analyze GitHub, LinkedIn, portfolio links, or ZIP project uploads for a baseline score |
| **Weighted Scoring** | Final grade blends portfolio (35%) and live interview performance (65%) across technical, communication, and behavioral vectors |
| **Realistic Avatar Mode** | D-ID talking-head avatar via REST video or low-latency WebRTC streaming |
| **Career Coaching** | Cross-session guidance that maps skill growth and recurring weak areas |
| **AI Resume Builder** | Templates, style customization, and printable/downloadable resumes |
| **Email Analyser** | Classify job invites / offer letters and extract role, salary, skills, and meeting details |
| **Learning Roadmaps** | AI-generated multi-week prep plans for a target company and role |
| **Auth & Payments** | Google OAuth, email OTP auth, MongoDB profiles, Razorpay / UPI support |
| **Admin Dashboard** | Org admin tools for users, employees, and platform stats |
| **Happenstance HR Intel** | Research the recruiter named in an invite — mood, tone, likely questions |
| **Mock as this HR** | One-click mock interview in that person's style, preloaded with company + questions |
| **Live Voice Coach** | Filler words, WPM, silence, confidence during the call + end-screen habits |
| **Company Clone Mode** | Interview prompts tuned to Google/Meta/Amazon/Stripe/etc. hiring styles |
| **Film Room** | Annotated replay with rewrites and “try again” retakes |
| **Prep Packs** | Auto checklist + 48h/24h/1h reminders (+ `.ics` calendar download) from invites |
| **Offer Negotiation** | Counter-script simulator with BATNA / levers |
| **Code Runner** | Piston execute + auto-grade in `[MODE:CODE]` |
| **Shareable Scorecard** | Public link + Print/PDF interview report |
| **Spaced Drills** | Weak-spot drills with Practice now |
| **Cloud Session Sync** | Interview history, prep packs, and synthetic datasets synced to Mongo across devices |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16** (App Router) · **React 19** · **TypeScript** |
| Styling | **Tailwind CSS v4** · **Framer Motion** · **Lucide React** |
| AI | **Google Gemini** (`@google/generative-ai`) · optional **Sarvam AI** |
| Avatar | **D-ID** (talk + WebRTC stream) |
| Data | **MongoDB Atlas** (Mongoose for Synthetic Files, Folders, Profiles & Cloud Sessions) · browser `localStorage` for session state |
| Auth | Google OAuth · email OTP · bcrypt · Guest Mode sandbox |
| Payments | **Razorpay** · UPI |
| Parsing & Export | `pdf-parse` (resumes) · `html2canvas` (PDF export) · `docx` / `marked` · `jszip` (project ZIPs) |
| Deploy | **AWS Amplify** (`amplify.yml`) |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+
- API keys for Gemini (required) and optionally Google OAuth, MongoDB, D-ID, Razorpay, and email SMTP

### 1. Clone & install

```bash
git clone https://github.com/Indrajithinna/ProInterview.git
cd ProInterview
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values in `.env` (see [Environment Variables](#environment-variables)). Do **not** wrap values in extra quotes — especially on Windows — or OAuth and UPI can break.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

---

## Environment Variables

Copy from [`.env.example`](.env.example):

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Interview chat, synthetic data, analysis, resume/roadmap generation |
| `SARVAM_API_KEY` | No | Alternate AI provider |
| `MONGODB_URI` | Yes* | Auth, profiles, synthetic files & folders, admin data |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No* | Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | No* | Google OAuth backend verification |
| `DID_API_KEY` | No | Realistic talking-head avatar |
| `NEXT_PUBLIC_API_URL` | No | Base URL (default `http://localhost:3000`) |
| `EMAIL_USER` / `EMAIL_PASS` | No* | Gmail SMTP for OTP / verification |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Payments |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No | Razorpay client key |
| `NEXT_PUBLIC_MERCHANT_UPI_ID` | No | UPI / donation QR |
| `HAPPENSTANCE_API_KEY` | No | HR people research (falls back to Gemini-only guidance) |
| `S3_BUCKET` / `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | No | Amazon S3 for profile photos, resumes, uploads (presigned PUT) |
| `S3_PUBLIC_BASE_URL` | No | Optional CloudFront/CDN base URL for S3 objects |

\*Required for full auth, cloud sync, and synthetic dataset persistence; core interview demos can run with Gemini alone, but login and profile sync need MongoDB and auth keys.

---

## How It Works

```text
Pre-Analysis → Setup → Live Interview → Grading → Career Coaching & Synthetic Data Studio
```

1. **Pre-Analysis** — Candidate shares GitHub / LinkedIn / portfolio or uploads project ZIPs. `/api/analyze-portfolio` produces a `portfolioRating` (0–100).
2. **Setup** — Upload resume (PDF → text via `/api/upload`), pick interview type (Realistic vs Strict Technical), difficulty, and AI provider.
3. **Live Interview** — `/api/interviewer` drives conversation; the UI intercepts mode tags (`[MODE:CODE]`, `[MODE:DRAW]`, `[MODE:CHAT]`) and `[TERMINATE]`. Pause/resume snapshots state in `localStorage`.
4. **Grading** — `/api/analyze-interview` scores technical depth, communication, and behavioral fit; final score:

   ```js
   finalScore = Math.round((portfolioRating * 0.35) + (iScore * 0.65))
   ```

5. **Synthetic Data Studio** — AI-assisted dataset & document generation saved directly into MongoDB Atlas. Files can be created privately under "My Files" or published to the community under "All Files".

Deep dives: [ARCHITECTURE.md](ARCHITECTURE.md) · contributor notes: [REPORT.md](REPORT.md).

---

## Project Structure

```text
ProInterview/
├── amplify.yml              # AWS Amplify build & env injection
├── ARCHITECTURE.md          # Scoring, tag interception, D-ID pipelines
├── REPORT.md                # Dev report, changelog, known issues
├── .env.example             # Environment template
├── next.config.ts
├── package.json
├── public/                  # Static assets, study materials & synthetic data web app
└── src/
    ├── app/
    │   ├── page.tsx                 # Landing / home
    │   ├── login/                   # Login & signup
    │   ├── setup/                   # Interview configuration
    │   ├── interview/               # Main interview engine
    │   ├── realistic-interview/     # D-ID avatar interview
    │   ├── features/                # Resume, email, roadmaps, synthetic data generator
    │   ├── profile/                 # Account, sessions, payments
    │   ├── admin/                   # Org admin dashboard
    │   └── api/                     # Serverless API routes (interview, auth, synthetic files/folders)
    ├── components/                  # UI (selects, panels, resume builder)
    ├── data/                        # Templates & mock-test data
    ├── models/                      # Mongoose models (User, SyntheticFile, SyntheticFolder, Scorecard)
    └── utils/                       # Auth, DB, mailer, storage, SSRF
```

---

## Key Routes

### Pages

| Path | Purpose |
|------|---------|
| `/` | Home, past sessions, portfolio entry |
| `/login` | Auth |
| `/setup` | Resume upload & interview options |
| `/interview` | Standard AI interview |
| `/realistic-interview` | Avatar / video-style interview |
| `/features` | Resume builder, synthetic data generator, email analyser, roadmaps |
| `/profile` | Profile, history, payments |
| `/admin` | Admin dashboard |

### APIs (selection)

| Endpoint | Role |
|----------|------|
| `POST /api/analyze-portfolio` | Portfolio baseline score |
| `POST /api/upload` | Resume PDF → text |
| `POST /api/interviewer` | Live interview turns |
| `POST /api/analyze-interview` | Post-interview grading |
| `POST /api/synthetic-data/gemini` | AI Synthetic dataset & document generation |
| `GET` / `POST /api/synthetic/files` | Fetch & create user synthetic files in MongoDB Atlas |
| `GET` / `PUT` / `DELETE /api/synthetic/files/[id]` | Manage synthetic file content & permissions |
| `PATCH /api/synthetic/files/[id]/visibility` | Toggle file visibility between `private` and `public` |
| `GET` / `POST /api/synthetic/folders` | Manage folder hierarchy in MongoDB Atlas |
| `POST /api/profile-guidance` | Cross-session coaching |
| `POST /api/generate-resume` | AI resume content |
| `GET` / `POST /api/resumes` | Fetch and save user saved resumes list in S3 |
| `POST /api/analyze-email` | Job invite / offer parsing |
| `POST /api/generate-roadmap` | Learning roadmap |
| `POST /api/d-id-talk` / `d-id-stream` | Avatar video & WebRTC |
| `/api/auth/*` | Register, login, OTP, Google, password reset |
| `/api/razorpay/*` | Create order & verify payment |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm start` | Serve production build |

---

## Deployment (AWS Amplify)

The repo includes [`amplify.yml`](amplify.yml). Amplify runs `npm ci`, writes `.env.production` from console environment variables, then `npm run build`. Artifacts are taken from `.next`.

Ensure all variables from [Environment Variables](#environment-variables) are set in the Amplify app settings (including `NEXT_PUBLIC_*` keys at build time).

---

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Scoring math, tag interception, D-ID REST/WebRTC, feature suite design
- **[REPORT.md](REPORT.md)** — Full project report, page/API map, known issues, changelog
- **[`.env.example`](.env.example)** — Env template for local and production setup

---

## License

Proprietary — all rights reserved unless otherwise stated by the repository owner.

---

<p align="center">
  <strong>ProInterview</strong> · Practice like it’s the real interview.
</p>
