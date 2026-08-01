# AI Interviewer Platform Architecture & Methodology

This document outlines the core technologies, libraries, mathematical grading logic, and design patterns driving the AI Interviewer platform. 

---

## 1. Technology Stack & Core Libraries

The project is built as a modern full-stack web application using React and serverless API routes.

* **Framework:** **Next.js (App Router)** & **React 19**
  * *Why:* Provides robust server-side API rendering, fast client-side routing, and seamless deployment.
* **Styling & UI:** **Tailwind CSS v4** & **Framer Motion**
  * *Why:* Tailwind allows for rapid inline styling and aesthetic consistency (the sleek, dark cyber-theme). Framer Motion handles smooth loading animations and component transitions.
* **Icons:** **Lucide React** (Clean, lightweight SVG icons).
* **AI Model Integration:** **@google/generative-ai**
  * *Why:* Google's Gemini Models (specifically Gemini-2.5-flash) are used for high-speed, cost-effective multimodal text processing, scoring, and conversation generation.
* **Local Parsing Tools:**
  * **`pdf-parse`**: Used on the backend to crack open candidate PDF resumes and extract plain text.
  * **`jszip`**: Allows candidates to upload entire project folders or code repositories as `.zip` files, which the backend opens and analyzes for technical grading.
* **Markdown Rendering:** **`marked`** library is used to take the AI's markdown outputs (like the final interview summary reports) and cleanly convert them into readable HTML.

---

## 2. Core Methodology & System Workflow

The platform operates as a multi-step sequential pipeline: **Pre-Analysis → Configuration → Execution → Post-Analysis**.

### Phase A: Candidate Pre-Analysis
**Endpoint:** `/api/analyze-portfolio`
* The candidate begins by providing context (GitHub URL, LinkedIn URL, Portfolio link, or uploading raw project ZIPs).
* A specialized AI prompt evaluates these links/files, simulating a technical recruiter doing background research.
* **Methodology:** It guarantees a strict mathematical baseline score (0–100) based on the presence of professional presence and the quality of any uploaded files. This is cached in the browser's `localStorage` as `portfolioRating`.

### Phase B: Interview Configuration
**Component:** `src/app/setup/page.tsx`
* The candidate uploads their resume (which is parsed via `pdf-parse` in `/api/upload`).
* They select their desired context:
  * **Type:** *Realistic* (mix of behavioral & technical) vs *Strict Technical* (pure coding).
  * **Difficulty:** Basic, Intermediate, Advanced.
  * **AI Provider:** Gemini or Sarvam AI.

### Phase C: The Live Interview Engine
**Component:** `src/app/interview/page.tsx` | **Endpoint:** `/api/interviewer`
* **Voice Synthesis:** The app utilizes native browser bindings (`webkitSpeechRecognition` for listening to the user, and `window.speechSynthesis` for the AI speaking back).
* **Pause/Resume Integrity:** A specific snapshotting system allows the user to safely hit `Pause`. The system stores the active transcript, resume, and portfolio grade into a serialized JSON blob in local storage, allowing perfect reconstruction of the interview state later.

### Phase D: Post-Interview Grading
**Endpoint:** `/api/analyze-interview`
* Once the interview hits the `[TERMINATE]` token, the entire raw transcript is shuttled to the backend grading AI.
* **Scoring Methodology:** The model separates the grade into multiple vectors:
  1. **Technical Depth**
  2. **Communication Skills**
  3. **Behavioral/Cultural Fit**
* It generates a highly detailed markdown string (using the STAR method) highlighting the candidate's gaps. This is merged heavily with the `portfolioRating` to generate a cohesive final `1-100` score.

### Phase E: Career Coaching
**Endpoint:** `/api/profile-guidance`
* An overarching AI analyzes your *entire* history of interviews sitting in `pastSessions`. It maps out skill growth trajectories and tells you what common areas you repeatedly fail across multiple interviews.

---

## 3. Deep Dive: Mathematical Scoring Pipeline

The final `1-100` interview score is a careful algorithmic blend of two entirely separate data sources. Here is the exact calculation flow:

### Vector A: Portfolio Baseline (Max 100 points)
When a user hits "Analyze & Continue" on the homepage, the `/api/analyze-portfolio` route fires. 
- It sets a strict baseline logic: Providing valid professional links (GitHub/LinkedIn) guarantees a `50-75` baseline. 
- If raw `.zip` files are dragged and dropped into the uploader, `jszip` unzips them in browser memory and ships the raw code to Gemini. Gemini grades architecture and documentation to map this score upwards to `100`.
- This creates the `portfolioRating` variable, softly cached until the end of the session.

### Vector B: The Conversational Post-Mortem (Max 100 points)
When the interview concludes, the *entire* transcript of the chat operates through `/api/analyze-interview`.
- The AI runs its sub-evaluations (Technical, Communication, Behavioral Fit).
- It mathematically flattens these insights to generate a raw standalone interview score (`iScore`).

### The Final Merge Operation
In `src/app/interview/page.tsx`, the renderer applies a strict weighted math calculation prior to finalizing the artifact:
```javascript
// Example formula calculation
finalScore = Math.round((portfolioRating * 0.35) + (iScore * 0.65))
```
This forces the final grade to respect the candidate's historical/practical background (35% weight) while keeping the dominant focus tightly on their real-time pressure handling (65% weight) during the active chat loop.

---

## 4. Deep Dive: The Interaction State Machine (Tag Interception)

To construct dynamic UI components that shift layout boundaries without crashing, the platform uses an architectural pattern called **"Tag Interception"**.

Typically, generative models output basic conversational string data. To bypass this, the backend `/api/interviewer` forces the AI into a strict command terminal context. The prompt-engineering mandates that the AI must prepend special unseen brackets to its responses based on situational necessity.

**How the routing works natively:**
When the Next.js frontend (`src/app/interview/page.tsx`) receives a fetched block of text from the API, an interceptor scans the payload before it visually mounts to the screen:
- **`[MODE:CODE]`** → If intercepted, the React state alters `interactionMode` to `"code"`. The invisible tag is stripped. The UI instantly swaps its bottom input region for a multi-line HTML `<textarea>` code block, pausing natural conversation until submission.
- **`[MODE:DRAW]`** → Triggers `"draw"` mode, unmounting the code editor and sliding in a clean HTML5 `<canvas>` element containing highly configured 2D coordinate listeners for manual sketching. 
- **`[MODE:CHAT]`** → Triggers a reset to `"chat"` mode, hiding extended canvases and returning strictly to string conversation.

By embedding logic within string vectors, the AI essentially possesses direct operational control over the active interface structure, maintaining a constantly engaging, multi-modal coding environment.

---

## 5. Realistic Interview Engine & D-ID Avatar Stream Pipeline

For a highly realistic video call simulation, the platform introduces the [RealisticInterviewRoom](file:///d:/Project%20repo/Ai-interviewer-main/src/app/realistic-interview/page.tsx) powered by an integrated **D-ID Talking Head Avatar**.

### Avatar Generation Methodologies

The application supports two modes of interaction with the talking avatar depending on the configuration and availability of the D-ID API key:

#### A. Dynamic Video Generation (REST API)
* **Endpoint:** [/api/d-id-talk](file:///d:/Project%20repo/Ai-interviewer-main/src/app/api/d-id-talk/route.ts)
* **Flow:** 
  1. The interviewer text response is generated by Gemini.
  2. The backend cleans the text (removing any UI mode tags like `[MODE:CODE]` or `[TERMINATE]`).
  3. A POST request is made to `https://api.d-id.com/talks` specifying the script, voice provider (`en-US-JennyNeural` via Microsoft), and a source image URL.
  4. The generated talk video URL is returned to the frontend and rendered in the client avatar video player.

#### B. Real-Time WebRTC Streaming (Zero-Latency)
* **Endpoint:** [/api/d-id-stream](file:///d:/Project%20repo/Ai-interviewer-main/src/app/api/d-id-stream/route.ts)
* **Workflow:**
  1. **Session Setup:** The client initiates a stream by requesting a new session connection (`action: "create"`). The backend contacts D-ID's stream endpoint `https://api.d-id.com/talks/streams` to create a stream, returning the `streamId`, `session_id`, and WebRTC `offer` (SDP format).
  2. **Peer Connection:** The client constructs a new `RTCPeerConnection` instance using the ICE servers provided by D-ID. It sets the remote description using the received SDP offer.
  3. **SDP Answer:** The client creates a local SDP answer, sets it locally, and sends it to the backend via `action: "sdp"`.
  4. **ICE Candidate Exchange:** Connection health is maintained via candidate exchange payloads using `action: "candidate"`.
  5. **Stream Processing:** Audio and video tracks are played back directly via the `MediaStream` from the peer connection. When the AI speaks, text is pushed via a `talk` action, triggering real-time mouth movement and speech synthesis on the stream with minimal latency.

---

## 6. Supplemental Career Tools (Features Suite)

The platform provides a suite of extra modules inside [FeaturesPage](file:///d:/Project%20repo/Ai-interviewer-main/src/app/features/page.tsx) for end-to-end career preparation:

### A. AI Resume Builder
Allows candidates to enter professional details (Summary, Skills, Experience, Education, Projects, and Certifications). It binds these states into printable Resume Templates with configurable theme highlights, font sizes, and downloads them.

### B. Job Invitation & Offer Letter Analyser
* **Endpoint:** [/api/analyze-email](src/app/api/analyze-email/route.ts)
* **Logic:** The user pastes a recruiter's email. An AI agent parses the text to determine the email classification (`job_invite` vs `offer_letter`). It extracts key fields: company name, location, role, required skills, meeting platform (Zoom, Google Meet, HackerRank), salary packages, base pay, and benefits.

### B2. Happenstance HR / Interviewer Intel
* **Endpoint:** [/api/research-hr](src/app/api/research-hr/route.ts)
* **Trigger:** After email analysis, if `hrName` is present (or via "Research on Happenstance"), the Features Email Analyser starts a Happenstance people-research job.
* **Flow:**
  1. `POST /api/research-hr` creates a Happenstance research request for `{hrName} at {company}` (recruiter/HR/hiring manager).
  2. The client polls `GET /api/research-hr?id=…` until status is `COMPLETED` (or fails / times out).
  3. Gemini turns the Happenstance profile (career, writings, public signals) into interview prep: **mood/energy**, **communication tone**, **how the candidate should speak**, **likely questions**, focus areas, rapport tips, and watch-outs.
* **Fallback:** If `HAPPENSTANCE_API_KEY` is missing or research fails/ambiguous, Gemini still returns role-aware guidance from name + company with lower confidence.

### C. Custom Interactive Roadmaps
* **Endpoint:** [/api/generate-roadmap](src/app/api/generate-roadmap/route.ts)
* **Logic:** Users supply a role title, target company, location, and additional study focus. The backend prompts Gemini to generate a multi-week technical prep timeline consisting of actionable tasks, resource links, and study recommendations. The frontend allows candidates to save these roadmaps and check off completed tasks.

### D. Goated Interview Prep Loop
1. **Mock as this HR** — Email Analyser → Happenstance intel → `activeHrIntel` → `/setup` → `/api/interviewer` persona mode.
2. **Live Voice Coach** — filler/WPM/confidence during `/interview`; end screen habits + waveform.
3. **Company Clone** — `src/data/companyBanks.ts` injects FAANG-style banks into the interviewer prompt.
4. **Film Room** — `/film-room` + `/api/film-room` with rewrites/retakes.
5. **Prep Packs** — invite emails auto-create checklist + 48h/24h/1h reminders.
6. **Offer Negotiation** — `/api/negotiate` + Features simulator.
7. **Code Runner** — `/api/run-code` (Piston) + grade/submit in `[MODE:CODE]`.
8. **Shareable Scorecard** — `/api/scorecard` + public `/scorecard/[id]`.
9. **Spaced Drills** — weak-score topics resurfaced on a schedule.
10. **Cloud Sync** — `/api/sync-sessions` merges interview history across devices.


