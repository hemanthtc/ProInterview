import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        // Enforce active session
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const formData = await req.formData();
        const course = (formData.get("course") as string) || "";
        const company = (formData.get("company") as string) || "";
        const location = (formData.get("location") as string) || "";
        const additionalInfo = (formData.get("additionalInfo") as string) || "";
        const roadmapImages = formData.getAll("roadmapImages") as File[];
        const hasImages = roadmapImages.length > 0;

        const allowedImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
        const maxImages = 4;
        const maxImageSizeBytes = 5 * 1024 * 1024;

        if (roadmapImages.length > maxImages) {
            return NextResponse.json({ error: `Upload up to ${maxImages} images for roadmap generation.` }, { status: 400 });
        }

        const invalidImage = roadmapImages.find((file) => !allowedImageTypes.has(file.type) || file.size <= 0);
        if (invalidImage) {
            return NextResponse.json({ error: `Unsupported image type for "${invalidImage.name}". Use JPEG, PNG, WEBP, or GIF.` }, { status: 400 });
        }

        const validImages = roadmapImages.filter((file) => allowedImageTypes.has(file.type) && file.size > 0);

        const oversizedImage = roadmapImages.find((file) => file.size > maxImageSizeBytes);
        if (oversizedImage) {
            return NextResponse.json({ error: `Image "${oversizedImage.name}" is too large. Keep each image under 5 MB.` }, { status: 400 });
        }

        if (roadmapImages.length > 0 && validImages.length === 0) {
            return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or GIF images are supported for roadmap uploads." }, { status: 400 });
        }

        if (!hasImages && (!course.trim() || !company.trim() || !location.trim() || !additionalInfo.trim())) {
            return NextResponse.json({
                error: "Course, company, location, and additional requirements are required when no roadmap images are uploaded."
            }, { status: 400 });
        }

        const systemPrompt = `You are a world-class Technical Career Coach and Principal Curriculum Architect.
Your task is to generate an exhaustive, highly-structured, progressive interview preparation roadmap.

Inputs:
- Course / Target Role: ${course || "Not specified"}
- Target Company: ${company || "Not specified"}
- Location: ${location || "Not specified"}
- Additional Context / Skills / Brief: ${additionalInfo || "Not specified"}
${validImages.length > 0 ? `- Uploaded reference images: ${validImages.length} image(s). Extract role requirements, topics, notes, architecture diagrams, and constraints directly from the image content.` : "- Uploaded reference images: None."}

CRITICAL ARCHITECTURE & PEDAGOGICAL REQUIREMENTS:
1. "title": A clean, professional name for the entire roadmap / career track (e.g. "Frontend Engineer Career Roadmap", "Google Fullstack Preparation Path", "Java Backend Specialist Track"). NEVER use a phase name (like "Phase 1: ...") as the title.
2. STRICT "BASICS TO ADVANCED" HIERARCHY:
   Candidates often start with zero knowledge or need a solid refresher. You MUST structure the curriculum progressively from absolute fundamentals to production-grade advanced systems:
   - Phase 1 (Absolute Foundations & Baseline Syntax):
     * If Frontend / Web: Start with HTML5 Semantic Structure, CSS3 Fundamentals & Box Model, Baseline JavaScript syntax (Variables, Primitives, Loops, Functions, Scope, Basic Array/Object methods), Git CLI basics.
     * If Backend / General: Core Programming Language Fundamentals (Java / Python / Go / C++ syntax, Data Types, Control Flow, Functions, Basic OOP principles), Terminal & Command Line, basic Client-Server concepts.
     * If Data / AI / Cloud: Core Python/SQL syntax, Basic Math & Statistics, Terminal/OS environment basics.
   - Phase 2 (Intermediate Patterns, Data Structures & Engine Mechanics):
     * If Frontend: DOM Manipulation, Event Handling, CSS Flexbox & CSS Grid, ES6+ (Destructuring, Arrow Functions, Modules), Asynchronous JavaScript (Promises, async/await, Fetch API), Browser Storage, Basic HTTP/REST.
     * If Backend: OOP Deep Dive (Polymorphism, Interfaces, Abstract Classes), Core Data Structures (HashMaps, Linked Lists, Trees, Stacks, Queues), Relational Database Schemas (SQL CRUD, Basic Joins), RESTful API design.
   - Phase 3 (Modern Frameworks, State Management & System Architecture):
     * If Frontend: React/Next.js Core (Component Lifecycle, State & Props), Essential Hooks (useState, useEffect, custom hooks), State Management (Redux/Zustand), Responsive Styling (Tailwind CSS), Routing, Authentication handling, API Error Boundaries.
     * If Backend: Frameworks (Spring Boot / Express / Django / FastAPI), Database Transactions & Indexing, Auth (JWT, OAuth2, Session Security), ORM/Query Optimization, Middleware, Caching basics.
   - Phase 4 (Advanced Production Systems, Performance, Security & Mock Interview Mastery):
     * Performance Profiling, Memory Leaks, Web Security (CORS, XSS, CSRF, Rate Limiting, Sanitization), Microservices / Distributed System Trade-offs, Caching (Redis), CI/CD, Containerization (Docker), and live technical/behavioral mock interview drills.

Generate a JSON object with the following structure:
{
  "title": "Clean Role/Course Preparation Path Title",
  "overview": "A concise paragraph (under 100 words) summarizing the strategic preparation approach.",
  "timeline": [
    {
      "phase": "Phase 1: Absolute Foundations & Core Syntax",
      "duration": "Weeks 1-2",
      "description": "Establish absolute baseline fluency in core syntax, markup, styling, and fundamental runtime concepts.",
      "topics": ["HTML5 Semantics", "CSS3 Box Model", "JavaScript Primitives & Control Flow", "Functions & Scope", "Git Basics"],
      "resources": ["MDN Web Docs: Getting Started", "JavaScript.info First Steps", "Official Language Documentation"],
      "tasks": ["Build a static semantic webpage", "Write 10 basic algorithmic functions without libraries", "Initialize a local Git repository"]
    },
    {
      "phase": "Phase 2: Intermediate Data Structures, Layouts & Async Logic",
      "duration": "Weeks 3-4",
      "description": "Master responsive layouts, asynchronous mechanics, data structures, and client-server communication.",
      "topics": ["DOM Manipulation & Events", "CSS Flexbox & Grid", "ES6+ Modern Syntax", "Promises & Async/Await", "Basic Data Structures"],
      "resources": ["MDN CSS Layout Guide", "JavaScript Promises Deep Dive", "Data Structures Visualizer"],
      "tasks": ["Build an interactive dynamic dashboard", "Implement async data fetching with error handling", "Solve 10 LeetCode Easy/Medium problems"]
    },
    {
      "phase": "Phase 3: Modern Frameworks, State & Full-Stack Architecture",
      "duration": "Weeks 5-6",
      "description": "Develop production web applications using modern component ecosystems, state managers, and database models.",
      "topics": ["React / Next.js Core & Hooks", "Component State Management", "Tailwind CSS Responsive Design", "Database Schemas & Queries", "Auth & REST APIs"],
      "resources": ["Official React Documentation", "Next.js App Router Guide", "Database Design Best Practices"],
      "tasks": ["Build a full-stack project with authenticated routes", "Implement custom reusable hooks", "Optimize render cycles and state updates"]
    },
    {
      "phase": "Phase 4: Advanced Systems, Security, Optimization & Interview Mastery",
      "duration": "Weeks 7-8",
      "description": "Deep-dive into performance engineering, web security vulnerabilities, system scalability, and interview scenarios.",
      "topics": ["Web Security (CORS/XSS/CSRF)", "Performance Profiling & Caching", "System Design & Microservices", "CI/CD & Deployment", "Mock Interview Drills"],
      "resources": ["OWASP Top 10 Security Guide", "System Design Primer", "Tech Interview Handbooks"],
      "tasks": ["Conduct 3 full mock interviews under timed conditions", "Audit project for security vulnerabilities and memory leaks", "Draw end-to-end architecture diagrams for high-traffic scenarios"]
    }
  ],
  "interviewTips": [
    "Always clarify problem constraints and communicate trade-offs before writing code.",
    "Practice coding on a blank whiteboard or collaborative editor without autocompletion.",
    "Be prepared with STAR stories highlighting engineering challenges and team collaboration."
  ]
}

Respond ONLY with a valid JSON block matching this structure. Do not write any markdown code blocks or explanatory text outside of the JSON.`;

        const promptParts: any[] = [{ text: systemPrompt }];

        for (const image of validImages) {
            const arrayBuffer = await image.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            promptParts.push({
                inlineData: {
                    data: base64,
                    mimeType: image.type || "image/png",
                }
            });
        }

        const textResponse = await generateWithFallback(promptParts, {
            generationConfig: { temperature: 0.3 },
        });
        let parsedData;
        try {
            parsedData = parseJsonFromModel(textResponse);
        } catch {
            console.error("Failed to parse JSON response from Gemini for Roadmap:", textResponse);
            const fallbackTitle = course.trim() || (company.trim() ? `${company.trim()} Career Prep Roadmap` : "Software Engineer Career Roadmap");
            return NextResponse.json({
                title: fallbackTitle,
                overview: `A progressive preparation path custom-tailored for ${fallbackTitle} (${location || "Remote"}).`,
                timeline: [
                    {
                        phase: "Phase 1: Absolute Foundations & Core Syntax",
                        duration: "Weeks 1-2",
                        description: "Establish strong baseline fluency in fundamental programming concepts, syntax, and foundational tools.",
                        topics: ["Core Language Syntax", "Variables & Data Types", "Control Flow & Functions", "Basic Data Structures", "Git & CLI Basics"],
                        resources: ["Official Documentation", "Foundations Guide", "Interactive Coding Sandbox"],
                        tasks: ["Write 10 baseline algorithmic scripts", "Configure local development environment", "Initialize a version-controlled repository"]
                    },
                    {
                        phase: "Phase 2: Intermediate Logic, Patterns & Architecture",
                        duration: "Weeks 3-4",
                        description: "Master intermediate object-oriented / functional patterns, asynchronous operations, and core API interactions.",
                        topics: ["OOP & Design Patterns", "Asynchronous Operations", "API Design & HTTP", "Intermediate Algorithms", "Database Fundamentals"],
                        resources: ["Architecture Primer", "Language Deep Dive Guides", "API Documentation"],
                        tasks: ["Build a multi-tier interactive application", "Implement robust error handling and logging", "Solve 10 algorithm interview challenges"]
                    },
                    {
                        phase: "Phase 3: Frameworks, State Management & System Design",
                        duration: "Weeks 5-6",
                        description: "Build scalable production modules with modern framework ecosystems and database modeling.",
                        topics: ["Production Frameworks", "State Management & Lifecycle", "Database Schema & Indexing", "Authentication & Security", "Automated Testing"],
                        resources: ["Framework Official Guides", "Database Performance Handbook", "Security Best Practices"],
                        tasks: ["Create a production-ready application", "Write unit and integration tests", "Implement secure user authentication"]
                    },
                    {
                        phase: "Phase 4: Advanced Systems, Performance & Mock Interview Mastery",
                        duration: "Weeks 7-8",
                        description: "Prepare for high-stakes interviews with system design, performance profiling, and live coding simulations.",
                        topics: ["System Design Trade-offs", "Caching & Scalability", "Performance Profiling", "Security Auditing", "Live Mock Interview Drills"],
                        resources: ["System Design Primer", "Performance Checklist", "Interview Handbooks"],
                        tasks: ["Conduct 3 timed mock interview sessions", "Design a scalable architecture for 100k users", "Optimize application latency and bundle size"]
                    }
                ],
                interviewTips: [
                    "Clarify requirements and edge cases before writing implementation code.",
                    "Explain architectural trade-offs between speed, complexity, and scalability.",
                    "Practice answering behavioral questions using the STAR framework."
                ]
            });
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error("Roadmap Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate roadmap" }, { status: 500 });
    }
}
