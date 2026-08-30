# ProInterview Platform — Comprehensive Development Report & Investor Pitch Master Guide

> **Document Version:** 2026-08-30 (v3.0 - Investor Edition)  
> **Platform:** ProInterview (AI-Powered Career & Technical Interview Acceleration Engine)  
> **Architecture:** Single Next.js 16 Monolith (React 19, TypeScript, Tailwind v4, MongoDB, AWS S3, Gemini 2.5 Flash, Sarvam AI)

---

## 🎯 Executive Summary & Table of Contents

This document serves as the **definitive operational guide** for ProInterview. It is structured into two core parts:
1. **Part I: 4-Member Team Investor Presentation Master Guide** — A step-by-step pitch deck script, role distribution, live demo sequence (prioritizing flagship features first, followed by ecosystem/supporting features), investor value propositions, metrics, and Q&A defense.
2. **Part II: Full Engineering & System Architecture Reference** — Technical documentation of all 20+ routes, APIs, database schemas, S3 integration, offline PWA capabilities, and development instructions.

```
TABLE OF CONTENTS
├── PART I: 4-MEMBER INVESTOR PRESENTATION PLAYBOOK
│   ├── 1. Presentation Structure & Time Allocation
│   ├── 2. Team Member Role Assignments & Hand-off Matrix
│   ├── 3. Step-by-Step Investor Presentation Script & Live Demos
│   │   ├── Member 1: Vision, Market Problem & Live Multimodal Interviewer (Hero Demo 1)
│   │   ├── Member 2: Deep Tech Demos — System Design Vision, STAR Voice & Coding Lab (Hero Demos 2, 3, 4)
│   │   ├── Member 3: Workflow Automation — AI Email Analyser & Ecosystem Utility Stack
│   │   └── Member 4: Monetization, Coaches Marketplace, S3 Infrastructure & Investment Ask
│   ├── 4. Investor Q&A Defense & Objection Handling Cheat Sheet
│   └── 5. Demo Setup Checklist & Failsafe Plan
│
└── PART II: PLATFORM ARCHITECTURE & ENGINEERING REFERENCE
    ├── 6. Comprehensive Feature Inventory
    ├── 7. Technology Stack & Multi-Cloud Infrastructure
    ├── 8. Full Page & Route Catalog (20+ App Pages)
    ├── 9. Complete API Routes Reference
    ├── 10. Security, Rate Limiting & Conflict-Free State Sync
    ├── 11. Test Suite & Verification Matrix
    └── 12. Environment Setup & Windows Deployment Guide
```

---

# PART I: 4-MEMBER INVESTOR PRESENTATION PLAYBOOK

## 1. Presentation Structure & Time Allocation (Total: 15–20 Mins + 10 Mins Q&A)

```mermaid
gantt
    title ProInterview 18-Minute Investor Pitch Flow
    dateFormat  m:s
    axisFormat  %M:%S
    
    section Member 1: Vision & Core AI
    Market Opportunity & Problem (2m)       :00:00, 02:00
    Flagship Live AI Interviewer Demo (3m)  :02:00, 05:00
    
    section Member 2: Deep Tech
    Multimodal Vision System Design (2m)    :05:00, 07:00
    Biometric Voice STAR Coach (1.5m)       :07:00, 08:30
    Interactive Coding Execution Lab (1.5m) :08:30, 10:00
    
    section Member 3: Workflow & Tools
    AI Email & Offer Letter Shield (2m)     :10:00, 12:00
    ATS Scanner, Prep Packs & Job Board (2m):12:00, 14:00
    
    section Member 4: Business & Ops
    Human Coach Marketplace & S3 Chat (2m)  :14:00, 16:00
    Traction, Monetization & The Ask (2m)   :16:00, 18:00
```

---

## 2. Team Member Role Assignments & Hand-off Matrix

| Role & Title | Team Member | Core Focus Areas | Key Deliverables & Screens |
|---|---|---|---|
| **Speaker 1: Chief Executive / Product Visionary** | **Member 1** | Market size ($20B+), candidate anxiety problem, USP overview, and the **Flagship Live Multimodal AI Interviewer**. | `/` (Landing Page), `/setup`, `/interview` (Live Voice + Code + Canvas). |
| **Speaker 2: VP of AI & Core Technology** | **Member 2** | Proprietary AI pipeline, **Multimodal Vision Architecture Evaluation**, **Real-Time Voice STAR Coaching**, and **In-Browser Coding Engine**. | `/system-design`, `/star-coach`, `/coding-lab`, `/panel-interview`. |
| **Speaker 3: Head of Product Experience & Career Stack** | **Member 3** | **AI Email & Offer Letter Verifier (Anti-Scam Shield)**, ATS Resume Scanner, Spaced Repetition Drills, and Pan-India Job Aggregator. | `/features` (Email Analyser, Resume Builder, Roadmap), `/ats-match`, `/prep`, `/jobs`. |
| **Speaker 4: Chief Business Officer & Infrastructure Lead** | **Member 4** | **Human Coaches Marketplace (Razorpay + Jitsi)**, S3-Native low-latency Community, Usage Metering, Business Model, Unit Economics & **The Investment Ask**. | `/coaches`, `/community`, `/admin`, `/profile` (UPI/Billing). |

---

## 3. Step-by-Step Investor Presentation Script & Live Demos

> [!IMPORTANT]
> **Pitch Rule of Thumb:** Present the **Flagship / Main Value-Proposition Features first** to grab investor attention immediately. Only after proving technological superiority and defensibility should the team demonstrate the supporting ecosystem utilities and business engine.

```
                               PITCH SEQUENCE
╔═══════════════════════════════════════════════════════════════════════════╗
║  PHASE 1: MAIN / FLAGSHIP FEATURES (First 10 Minutes)                     ║
║  1. Live AI Adaptive Interviewer (Speech + Code + Canvas + Scorecard)     ║
║  2. Multimodal Gemini Vision System Design Evaluation                     ║
║  3. Real-Time Speech Biometrics & STAR Behavioral Coach                   ║
║  4. Multi-Language In-Browser Coding Execution Engine                     ║
║  5. AI Email & Offer Letter Authenticity Verifier                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  PHASE 2: REMAINING / ECOSYSTEM & MONETIZATION FEATURES (Last 8 Minutes)   ║
║  6. ATS Resume Matcher & Career Roadmap Generator                         ║
║  7. Spaced Repetition Prep Packs & PWA Offline Engine                     ║
║  8. Human Coach Marketplace with Automated Jitsi & Razorpay Integrations  ║
║  9. AWS S3-Native Zero-Database Real-Time Community                       ║
║ 10. Business Model, Tiered SaaS Funnel & The Investment Ask               ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

### 🎙️ Member 1: Vision, Problem & Live AI Interviewer Demo (00:00 – 05:00)

#### 1. Hook & The Market Problem (00:00 – 02:00)
- **Opening Script:**
  > *"Good morning investors. Over 40 million tech professionals and graduates worldwide prepare for high-stakes interviews each year. Yet, 88% suffer severe interview anxiety and fail not because of lack of talent, but because existing preparation is passive: static LeetCode problems, generic YouTube videos, and prohibitively expensive $250/hour human coaches.*
  > 
  > *We built **ProInterview** — the world’s first end-to-end, multimodal AI career simulation and acceleration platform. Instead of reading questions, candidates practice in a hyper-realistic, dynamic environment that listens, watches, evaluates code in real-time, inspects architecture diagrams with computer vision, and delivers instant, calibrated feedback."*
- **Market Opportunity:** $20.4B Global EdTech & Career Prep market, growing at 16.5% CAGR.

#### 2. MAIN FEATURE LIVE DEMO: Multimodal AI Live Interviewer (02:00 – 04:45)
- **Screen:** Navigate to `/setup` → Select Role (`Full Stack Engineer`), Level (`Senior`), AI Voice (`Sarvam Indic Voice / Gemini`). Click **Start Interview** (`/interview`).
- **Live Actions & Narration:**
  1. **Voice Conversation & Speech Synthesis:** Speak naturally into the microphone: *"Hello, I'm ready to begin the interview."* Show real-time speech recognition and AI vocal response.
  2. **Tag Interception Mode Switching:** Show the AI seamlessly triggering:
     - `[MODE:CODE]` → The IDE panel slides in dynamically with syntax highlighting.
     - `[MODE:DRAW]` → The interactive whiteboard canvas launches for data structures.
  3. **Live Coding & Grading:** Type a short React/TypeScript snippet or execute a function. Show how the AI analyzes edge cases and time complexity.
  4. **The Scorecard & Weighted Algorithm:** Conclude the session to show the instant **Evaluation Report**:
     $$\text{Final Score} = (\text{Portfolio Baseline} \times 0.35) + (\text{Live Performance} \times 0.65)$$
     Highlight technical depth, behavioral communication, and filler-word breakdown.
- **Handoff Line (04:45):**
  > *"To show you the deep technological moat powering our multimodal visual evaluation and real-time speech analytics, I'll hand over to our VP of AI & Core Technology, [Member 2 Name]."*

---

### 🧠 Member 2: Deep Tech Demos — System Design, Voice Biometrics & Coding Lab (05:00 – 10:00)

#### 1. MAIN FEATURE LIVE DEMO: Multimodal Vision System Design Evaluation (05:00 – 07:00)
- **Screen:** Open `/system-design`.
- **Live Actions & Narration:**
  1. **Architecture Canvas:** Draw a distributed architecture on the canvas: Client $\rightarrow$ Load Balancer $\rightarrow$ API Gateway $\rightarrow$ Microservices $\rightarrow$ Redis Cache + Sharded Database.
  2. **Multimodal Vision Grading:** Click **"Evaluate Architecture"**. 
  3. **AI Vision Ingestion:** Explain that the canvas is encoded as a base64 image stream and evaluated by **Gemini 2.5 Multimodal Vision API** against enterprise architecture principles (SPOF, caching strategies, replication, scalability).
  4. **Key Investor Takeaway:** *"Unlike competitors who only read typed text, ProInterview grades actual visual system blueprints just like a Principal Architect at Google or Meta."*

#### 2. MAIN FEATURE LIVE DEMO: Real-Time Voice STAR Coach & Biometrics (07:00 – 08:30)
- **Screen:** Open `/star-coach`.
- **Live Actions & Narration:**
  1. Pick a behavioral scenario: *"Tell me about a time you resolved a critical production outage under pressure."*
  2. Answer using the STAR method (Situation, Task, Action, Result).
  3. **Live Biometric Telemetry:** Point to the real-time indicators:
     - **Filler Word Counter:** Flags "um", "uh", "like", "actually".
     - **Pacing & WPM:** Alerts if speech is too fast (>160 WPM) or sluggish (<100 WPM).
     - **Sentiment/Mood Classification:** Real-time badge updating from `Hesitant` $\rightarrow$ `Rushed` $\rightarrow$ `Calm & Authoritative`.

#### 3. MAIN FEATURE LIVE DEMO: Multi-Language In-Browser Coding Lab (08:30 – 09:45)
- **Screen:** Open `/coding-lab` or `/coding-assessment`.
- **Live Actions & Narration:**
  1. Show full polyglot sandbox supporting **Python, JavaScript, TypeScript, C++, Java**.
  2. Run unit test test-cases with sub-millisecond execution, memory benchmarks, and automated Big-O space/time complexity deductions.
  3. Show the **Panel Interview Mode** (`/panel-interview`), where candidate faces 3 distinct AI personas (Engineering Manager, Tech Lead, HR Director) in a single session.
- **Handoff Line (09:45):**
  > *"Now that you've seen our core AI engines, let's explore how ProInterview transforms the candidate's entire day-to-day workflow. Here is our Head of Product Experience, [Member 3 Name]."*

---

### 🚀 Member 3: Workflow Automation — AI Email Shield & Ecosystem Utilities (10:00 – 14:00)

#### 1. MAIN FEATURE LIVE DEMO: AI Email Analyser & Anti-Scam Shield (10:00 – 12:00)
- **Screen:** Open `/features` $\rightarrow$ Select **AI Email Analyser**.
- **Live Actions & Narration:**
  1. **Paste Real Recruiter / Offer Email:** Paste a sample job invitation or offer letter.
  2. **One-Click Instant Classification:** The AI instantly classifies the document:
     - **Job Invitation:** Extracts Recruiter Name, Interview Date, Platform (Zoom/Meet), and Technical Requirements.
     - **Offer Letter:** Unpacks Base Salary, Joining Date, CTC breakdown, and Benefits.
  3. **Authenticity & Anti-Scam Verification:** Highlight the company credibility score (0–100) and location legitimacy verification against fraudulent recruiting scams.
  4. **Dynamic Roadmap Generation:** Click **"Generate Preparation Roadmap"** to instantly convert the extracted skills into an adaptive, day-by-day prep curriculum (`/features`).

#### 2. SUPPORTING FEATURES: ATS Matcher, Spaced Drills & PWA Engine (12:00 – 13:45)
- **Screen:** Quick walkthrough across `/ats-match`, `/prep`, `/labs`, and `/jobs`.
- **Key Talking Points:**
  - **ATS Resume Matcher (`/ats-match`):** Upload resume PDF $\rightarrow$ Compares keyword semantic vector against target job description $\rightarrow$ Generates missing skill recommendations.
  - **Spaced Repetition Drills (`/prep`):** Calculates exponential forgetting curves and automatically sends notifications to ensure candidate retains algorithmic patterns before interview day.
  - **Offline PWA Engine (`/labs`):** Service-worker powered offline shell allows practice on trains/flights without internet connection.
  - **Pan-India Smart Job Search (`/jobs`):** Aggregates live jobs via Adzuna API with Indian city synonym normalization (Bangalore $\leftrightarrow$ Bengaluru, Gurgaon $\leftrightarrow$ NCR).
- **Handoff Line (13:45):**
  > *"To explain how this translates into robust revenue streams, enterprise unit economics, and our defensible infrastructure, I'll hand over to our Chief Business Officer, [Member 4 Name]."*

---

### 💰 Member 4: Monetization, Infrastructure & The Investment Ask (14:00 – 18:00)

#### 1. SUPPORTING DEMO: Human Coach Marketplace & S3 Chat (14:00 – 15:30)
- **Screen:** Open `/coaches` and `/community`.
- **Live Actions & Narration:**
  1. **Hybrid Marketplace Model:** Showcase verified Tier-1 industry mentors (FAANG/FinTech).
  2. **Automated End-to-End Booking:** Show dynamic Jitsi Meet room generation (`meet.jit.si/ProInterview-*`), Razorpay INR/USD payments, and Google Calendar sync.
  3. **Serverless S3 Community Engine:** Demonstrate real-time community chat running **directly on AWS S3** with zero database bottlenecks, 7-day automated pruning, and WhatsApp-style tick receipts (Offline $\rightarrow$ Sent $\rightarrow$ Read).

#### 2. Business Model, Traction & Unit Economics (15:30 – 17:00)
- **Revenue Model Matrix:**

| Tier | Price | Features & Inclusions | Target Customer |
|---|---|---|---|
| **Freemium Starter** | ₹0 / Free | 3 AI Mock Interviews/mo, Public Coding Lab, Community Access. | Students & Early Seekers (Viral Top-of-Funnel). |
| **Pro Career Pass** | ₹999/mo ($19/mo) | Unlimited Multimodal Interviews, Vision System Design, STAR Coach, ATS Optimization. | Active Job Seekers (High LTV). |
| **Elite Accelerator** | ₹3,499/mo ($49/mo) | Everything in Pro + 2 1-on-1 Human Coach sessions + Guaranteed Referral Pipeline. | Tier-1 Company Aspirants. |
| **B2B University / Enterprise** | ₹1.5L – ₹5L / yr | Campus Placement Analytics, Candidate Skill Verification, Custom Mock Pools. | Universities & Bootcamps. |

- **Unit Economics & Moat:**
  - **Blended AI Cost per Interview:** ~₹1.80 ($0.022) using Gemini 2.5 Flash + Sarvam Indic Voice.
  - **Gross Margin:** **94.2%** on pure software subscriptions; **25% take-rate** on Coach Marketplace bookings.
  - **Viral Growth Loop:** In-app Referral Credit Engine (`/referrals`) granting mock interview credits for candidate invites.

#### 3. The Investment Ask & Use of Funds (17:00 – 18:00)
- **The Ask:** Seeking **$500,000 Seed Round** for 18 months of runway.
- **Allocation of Capital:**
  - 🛠️ **50% Engineering & AI Research:** Real-time video emotion analysis, multi-language speech models, B2B enterprise dashboard.
  - 📈 **30% User Acquisition & Growth:** Campus ambassador programs across 200+ universities, SEO job portals, developer community hackathons.
  - 🤝 **20% Operations & Partnerships:** Coach onboarding, SOC2 compliance, enterprise sales pipeline.
- **Closing Statement:**
  > *"ProInterview is not just another mock interview tool; it is the comprehensive AI career operating system. We have the technology, the unit economics, and the team to scale this to 1M+ active users. Thank you, and we welcome your questions."*

---

## 4. Investor Q&A Defense & Objection Handling Cheat Sheet

| Likely Investor Question | Underlying Concern | Winning Answer & Technical Evidence |
|---|---|---|
| *"Why can't OpenAI or Google easily build this themselves?"* | Platform risk & AI wrapper vulnerability. | *"LLMs provide raw intelligence, but not the specialized domain workflows. Our defensibility lies in our **proprietary multi-modal orchestration layer**: tag interception modes, vision-based whiteboard evaluation, real-time voice latency tuning, weighted scoring algorithms, and the hybrid human-expert marketplace integration."* |
| *"What are your AI API token costs at scale?"* | High inference cost compressing SaaS gross margins. | *"We engineered ProInterview with extreme cost efficiency. By pairing **Gemini 2.5 Flash** with client-side audio analysis and caching, our inference cost is **under ₹2 per full 20-minute interview**, giving us a SaaS gross margin of over 90%."* |
| *"How do you verify human coaches and prevent disintermediation?"* | Marketplace leakage (coaches taking candidates off-platform). | *"We eliminate platform leakage through end-to-end tooling: recordings, AI automated transcript evaluation, structured prep packs, and integrated calendar/Jitsi rooms. Coaches earn higher through our platform reputation system than private clients."* |
| *"Is candidate data secure, especially uploaded resumes and compensation details?"* | Privacy, GDPR & candidate confidentiality. | *"All resume PDFs are parsed in-memory or stored via encrypted AWS S3 presigned URLs. Session data is scoped to isolated JWT sessions, and community chat data is automatically pruned on a 7-day retention cycle."* |
| *"How will you scale candidate acquisition without huge ad spend?"* | High CAC (Customer Acquisition Cost). | *"Our product is inherently viral. The free AI Email Analyser and ATS Matcher act as high-converting organic top-of-funnel hooks. Candidates invite peers using our built-in **Referral Credit Loop** (`/referrals`), keeping our organic acquisition above 65%."* |

---

## 5. Demo Setup Checklist & Failsafe Plan

### Pre-Presentation Verification Checklist (T-Minus 15 Mins)
- [ ] Run dev server using standard command: `node node_modules/next/dist/bin/next dev` (or `npm run dev`).
- [ ] Verify `.env` variables are active (`GEMINI_API_KEY`, `JWT_SECRET`, `SARVAM_API_KEY`).
- [ ] Open 4 clean browser tabs in order:
  1. `http://localhost:3000/` (Landing & Setup)
  2. `http://localhost:3000/system-design` (Whiteboard Vision)
  3. `http://localhost:3000/star-coach` (Voice Biometrics)
  4. `http://localhost:3000/features` (Email Analyser & Tools)
- [ ] Test microphone permissions in Chrome for Web Speech API recognition.
- [ ] Ensure dummy sample text for the email analyser is copied to clipboard.

### Failsafe Plan (In Case of Network/API Disruption)
- **If Gemini hits 429/503:** The application has built-in 3-attempt exponential backoff retry logic and automatic local mock fallback roadmaps and drills.
- **If MongoDB is offline:** The system automatically falls back to in-memory store for chat and `localStorage` for all user progress and resume builder tools.
- **If S3 is offline:** The resume builder and chat client fall back seamlessly to local browser persistence with non-blocking UI notifications.

---

# PART II: PLATFORM ARCHITECTURE & ENGINEERING REFERENCE

## 6. Comprehensive Feature Inventory

```
ProInterview Platform Ecosystem
├── 🌟 FLAGSHIP AI INTERVIEW ENGINES
│   ├── Live Multimodal Interviewer (/interview, /realistic-interview)
│   ├── Multimodal Vision System Design Evaluator (/system-design)
│   ├── Real-Time Voice STAR Behavioral Coach (/star-coach)
│   ├── Multi-Panelist Mock Interview Chamber (/panel-interview)
│   └── In-Browser Polyglot Coding Execution Lab (/coding-lab, /coding-assessment)
│
├── 🛠️ CAREER TOOLS & WORKFLOW SUITE
│   ├── AI Email Analyser & Offer Authenticity Verifier (/features)
│   ├── ATS Resume Keyword & Semantic Matcher (/ats-match)
│   ├── AI Resume Builder & PDF Generation (/features)
│   ├── Dynamic Career Roadmap Generator (/features)
│   └── Film Room & Past Session Video Review (/film-room)
│
├── 🌐 ECOSYSTEM, COMMUNITY & MARKETPLACE
│   ├── Human Coach Mentorship Marketplace (/coaches)
│   ├── S3-Native Low-Latency Community Chat (/community)
│   ├── Pan-India Live Job Aggregator (/jobs)
│   ├── Spaced Repetition Prep Pack Engine (/prep, /labs)
│   └── PWA Standalone Offline Drills (public/sw.js, public/manifest.json)
│
└── 📊 PLATFORM INFRASTRUCTURE & ADMIN
    ├── Admin Funnel & Conversion Dashboard (/admin)
    ├── Cross-Device Conflict-Free Prep Sync (/api/sync-prep)
    ├── UPI & Razorpay Payment Integration (/profile, /coaches)
    └── Viral Referral Credits Engine (/referrals)
```

---

## 7. Technology Stack & Multi-Cloud Infrastructure

| Layer | Technologies Used | Engineering Rationale |
|---|---|---|
| **Core Framework** | **Next.js 16 (App Router)**, React 19, TypeScript 5.8 | Modern server-side rendering, low latency API routes, seamless client components. |
| **Styling & Motion** | **Tailwind CSS v4**, Framer Motion 12, Lucide Icons | Dark cyber aesthetic, glassmorphic UI, fluid micro-interactions, responsive layouts. |
| **Artificial Intelligence** | **Google Gemini 2.5 Flash**, Gemini Multimodal Vision, Sarvam AI | Ultra-low inference cost, high throughput, Indic regional voice support, vision parsing. |
| **Data & Storage** | **MongoDB Atlas**, **AWS S3** (Presigned URLs & Direct Store), `localStorage` | Hybrid persistence: Mongo for user accounts, S3 for ephemeral real-time chat & resumes, local cache for offline execution. |
| **Voice & Media** | Web Speech API, `window.speechSynthesis`, Tavus / D-ID WebRTC streams | Zero-latency client-side speech detection with cloud avatar fallback options. |
| **Payments** | **Razorpay Gateway**, Merchant UPI QR Code Generator | Native INR and USD multi-currency checkout support. |
| **Document Processing** | `pdf-parse`, `marked`, `jszip` | High-fidelity PDF resume text parsing and ZIP portfolio analysis. |

---

## 8. Full Page & Route Catalog

### Core Interactive Routes
- **`/` (Landing Page):** High-converting entry point with instant GitHub/LinkedIn portfolio analyzer.
- **`/setup`:** Interview configuration wizard (Resume upload, domain selection, difficulty setting).
- **`/interview`:** Primary live interview environment featuring voice synthesis, code editor, and canvas whiteboard.
- **`/system-design`:** Interactive architecture drawing canvas with multimodal Gemini Vision evaluation.
- **`/star-coach`:** Behavioral voice coaching lab with real-time speech telemetry and filler-word detection.
- **`/panel-interview`:** Multi-interviewer simulation simulating diverse engineering interview panels.
- **`/coding-lab` & `/coding-assessment`:** In-browser coding challenges with real-time test execution.
- **`/scorecard`:** Post-session comprehensive scoring report with weighted evaluation breakdown.

### Career Hub & Tools
- **`/features`:** Central command hub housing the AI Email Analyser, Resume Builder, and Roadmap Generator.
- **`/ats-match`:** ATS score calculator comparing resume text against job descriptions.
- **`/prep` & `/labs`:** Spaced repetition drills, prep pack generation, and PWA offline shell.
- **`/film-room`:** Archive of past interview recordings and historical telemetry analysis.
- **`/jobs`:** Live job search engine with India city synonym mapping.

### Marketplace, Community & Admin
- **`/coaches`:** Human mentor directory with Razorpay checkout and Jitsi meeting scheduling.
- **`/community`:** Zero-database, S3-powered real-time messaging with WhatsApp-style tick receipts.
- **`/profile`:** Session archive, career analytics, UPI subscription upgrades, and profile settings.
- **`/admin`:** Executive analytics funnel tracking signups, activation rates, and user revenue metrics.
- **`/referrals`:** Viral referral dashboard tracking invite links and reward credits.

---

## 9. Complete API Routes Reference

| Endpoint | Method | Key Request Payload | Functionality & Integration |
|---|---|---|---|
| `/api/interviewer` | `POST` | `{ message, context, mode }` | Live conversational turn handling with tag interception (`[MODE:CODE]`, `[MODE:DRAW]`). |
| `/api/evaluate-system-design`| `POST` | `{ diagramImageBase64, mimeType, notes }` | Gemini 2.5 Multimodal Vision grading of whiteboard architecture diagrams. |
| `/api/analyze-email` | `POST` | `{ emailText, company?, location? }` | Gemini extraction, offer verification, and anti-scam credibility scoring. |
| `/api/analyze-interview` | `POST` | `{ transcript, resumeText, portfolioRating }` | Calculates weighted final scorecard (35% portfolio + 65% interview). |
| `/api/analyze-portfolio` | `POST` | `{ githubUrl, linkedinUrl, files }` | Analyzes code repositories and resumes to establish baseline skill ratings. |
| `/api/generate-roadmap` | `POST` | `{ course, company, location, additionalInfo }` | Synthesizes an adaptive multi-week preparation roadmap. |
| `/api/generate-resume` | `POST` | `{ template, userInfo }` | AI-assisted structured resume generation. |
| `/api/sarvam/tts` | `POST` | `{ text, languageCode }` | Generates high-quality Indic voice streams via Sarvam AI. |
| `/api/coaches/book` | `POST` | `{ coachId, slot, currency }` | Initializes Razorpay payment order and generates unique Jitsi meeting room. |
| `/api/coaches/reminders` | `POST` | Gated by `CRON_SECRET` | Automated cron job sending upcoming coaching session reminders. |
| `/api/community/messages` | `GET/POST` | `{ channelId, message, sender }` | High-speed, zero-Mongo messaging reading/writing directly to AWS S3. |
| `/api/sync-prep` | `POST` | `{ localData, cloudData }` | Conflict-free CRDT-style merging of cross-device user study history. |
| `/api/admin/stats` | `GET` | Gated by `AdminSession` | Aggregates activation funnels, MRR, active users, and platform metrics. |

---

## 10. Security, Rate Limiting & Conflict-Free State Sync

### 1. Conflict-Free Cross-Device Synchronization (`sync-prep`)
To prevent data loss across mobile (PWA) and desktop devices, `/api/sync-prep` uses a pure, deterministic merge algorithm:
- **Last-Write-Wins (LWW):** Applied to individual scalar properties (`updatedAt` timestamp checks).
- **Max-Union Strategy:** Applied to numerical counters (e.g., total completed drills, referral credits, practice minutes).
- **Array Deduplication:** Applied to STAR history records and saved bookmarks.

### 2. Rate Limiting with Automatic Garbage Collection
- In-memory rate limiting buckets protect all Gemini endpoints (20 RPM free tier limits).
- Implements automated periodic garbage collection once key size exceeds 1,000 to prevent memory leaks in long-running Node.js processes.

### 3. Isolated Guest Sandbox Mode
- Unauthenticated users can access the Resume Builder and Public Labs locally.
- Backend API routes enforce strict JWT session verification (`getVerifiedSession`), preventing guest access to paid Gemini endpoints.

---

## 11. Test Suite & Verification Matrix

The repository contains **12 comprehensive Vitest test suites (76 passing unit tests)** with zero external network dependencies:

```bash
# Run the complete test suite
npm test
```

| Test Suite File | Coverage Scope |
|---|---|
| `tests/sync-prep.test.ts` | State merge logic (`mergePrepProgress`, `ensurePrepProgressShape`, `getPlanLimits`). |
| `tests/job-india.test.ts` | India city synonym heuristics (`Bangalore` $\leftrightarrow$ `Bengaluru`) & fallback job shape. |
| `tests/star-coach.test.ts` | STAR question bank normalization, randomization, and category routing. |
| `tests/system-design.test.ts`| System design canvas serializer and rating payload builders. |
| `tests/coaches-sarvam.test.ts`| Coach directory validity, pricing calculators, and Sarvam locale mappers. |
| `tests/auth-security.test.ts` | OTP hashing, rate-limiting algorithms, JWT issuance, and session verification. |
| `tests/api-error.test.ts` | Standardized API error payloads and rate-limit HTTP status handlers. |

---

## 12. Environment Setup & Windows Deployment Guide

### Required Environment Variables (`.env`)

```env
# AI & Core LLM Engines
GEMINI_API_KEY=your_gemini_api_key
SARVAM_API_KEY=your_sarvam_api_key_optional

# Security & Authentication
JWT_SECRET=your_jwt_secret_min_32_characters
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database & Cloud Storage
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/prointerview
S3_BUCKET=prointerview-storage
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Monetization & Jobs
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
ADZUNA_APP_ID=your_adzuna_id_optional
ADZUNA_APP_KEY=your_adzuna_key_optional
CRON_SECRET=your_cron_secret_key
NEXT_PUBLIC_MERCHANT_UPI_ID=merchant@upi
```

### Build & Run Commands

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Start development server
npm run dev

# 4. Production Build (Windows Workaround)
node node_modules/next/dist/bin/next build

# 5. Serve production build
npm start
```

---

*This report is maintained as the primary operational and investor documentation for ProInterview. For updates, ensure synchronization with active source files.*
