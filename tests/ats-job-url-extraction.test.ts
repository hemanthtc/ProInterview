import { describe, expect, it, vi } from "vitest";
import { isSafeUrl } from "../src/utils/ssrf";
import { formatAndAlignJobDescription, htmlToCleanText } from "../src/utils/formatJobDescription";

describe("ATS Job URL Extraction & Validation", () => {
    it("identifies unsafe / private URLs to prevent SSRF", async () => {
        expect(await isSafeUrl("http://localhost:3000/job")).toBe(false);
        expect(await isSafeUrl("http://127.0.0.1:8080")).toBe(false);
        expect(await isSafeUrl("http://192.168.1.1/careers")).toBe(false);
        expect(await isSafeUrl("http://10.0.0.1/jobs/123")).toBe(false);
        expect(await isSafeUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    });

    it("allows valid public HTTPS job board domains", async () => {
        expect(await isSafeUrl("https://example.com/careers/software-engineer")).toBe(true);
    });

    it("extracts schema.org JobPosting JSON-LD when present", () => {
        const sampleHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Senior Frontend Engineer at Stripe - Careers</title>
                <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "JobPosting",
                    "title": "Senior Frontend Engineer",
                    "hiringOrganization": {
                        "@type": "Organization",
                        "name": "Stripe"
                    },
                    "description": "<p>We are looking for a <strong>Senior Frontend Engineer</strong> to build reliable dashboards.</p><ul><li>5+ years React & TypeScript</li><li>Deep knowledge of CSS and web performance</li></ul>"
                }
                </script>
            </head>
            <body><h1>Stripe Careers</h1></body>
            </html>
        `;

        const jsonLdMatch = sampleHtml.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
        expect(jsonLdMatch).not.toBeNull();
        const parsed = JSON.parse(jsonLdMatch![1]);
        expect(parsed["@type"]).toBe("JobPosting");
        expect(parsed.title).toBe("Senior Frontend Engineer");
        expect(parsed.hiringOrganization.name).toBe("Stripe");
        expect(parsed.description).toContain("React & TypeScript");
    });

    it("sanitizes HTML tags into clean readable text for ATS matching", () => {
        const rawHtml = `
            <header><nav><a href="/">Home</a><a href="/login">Login</a></nav></header>
            <main>
                <h1>Staff Software Engineer - Infrastructure</h1>
                <p>Acme Corp is hiring a Staff Engineer to lead distributed systems.</p>
                <h2>Responsibilities</h2>
                <ul>
                    <li>Architect scalable microservices on Kubernetes</li>
                    <li>Optimize database latency and throughput</li>
                </ul>
                <h2>Qualifications</h2>
                <ul>
                    <li>7+ years experience with Go or Java</li>
                    <li>Experience with Kafka, Redis, PostgreSQL</li>
                </ul>
            </main>
            <footer><p>&copy; 2026 Acme Corp. All rights reserved. <a href="/privacy">Privacy</a></p></footer>
        `;

        // Strip nav, header, footer
        const stripped = rawHtml
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
            .replace(/<li[^>]*>/gi, "\n• ")
            .replace(/<\/(h[1-6]|p|div|section|article)>/gi, "\n\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/[ \t]+/g, " ")
            .trim();

        expect(stripped).toContain("Staff Software Engineer");
        expect(stripped).toContain("• Architect scalable microservices on Kubernetes");
        expect(stripped).toContain("• 7+ years experience with Go or Java");
        expect(stripped).not.toContain("Privacy");
        expect(stripped).not.toContain("Home");
    });

    it("converts escaped HTML entities in JSON-LD description into clean bullets and breaks", () => {
        const encodedHtml = "&lt;p&gt;We are seeking a Backend Engineer.&lt;/p&gt;&lt;p&gt;Responsibilities:&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Build REST APIs&lt;/li&gt;&lt;li&gt;Optimize PostgreSQL queries&lt;/li&gt;&lt;/ul&gt;";

        const clean = htmlToCleanText(encodedHtml);
        expect(clean).toContain("We are seeking a Backend Engineer.");
        expect(clean).toContain("Responsibilities:");
        expect(clean).toContain("* Build REST APIs");
        expect(clean).toContain("* Optimize PostgreSQL queries");
        expect(clean).not.toContain("&lt;");
        expect(clean).not.toContain("<p>");
    });

    it("aligns squashed single-sentence JD text into structured sections and bullets", () => {
        const squashedText =
            "About the Role: We are seeking a Staff Engineer to lead cloud infrastructure. Key Responsibilities: - Discovery & Scoping: Build resilient Kubernetes clusters - Observability: Improve observability across microservices - Mentor junior engineers. Required Qualifications: 7+ years of backend engineering. Strong expertise in Go and Docker. Deep understanding of distributed databases.";

        const aligned = formatAndAlignJobDescription(squashedText, "Staff Engineer", "Netflix", "San Francisco, CA");

        expect(aligned).toContain("# **Staff Engineer**");
        expect(aligned).toContain("**Company:** Netflix");
        expect(aligned).toContain("**Location:** San Francisco, CA");
        expect(aligned).toContain("---");
        expect(aligned).toContain("### **Role & Team Overview**");
        expect(aligned).toContain("We are seeking a Staff Engineer to lead cloud infrastructure.");
        expect(aligned).toContain("### **Key Responsibilities**");
        expect(aligned).toContain("* **Discovery & Scoping:** Build resilient Kubernetes clusters");
        expect(aligned).toContain("* **Observability:** Improve observability across microservices");
        expect(aligned).toContain("* Mentor junior engineers.");
        expect(aligned).toContain("### **Basic / Minimum Qualifications**");
        expect(aligned).toContain("* 7+ years of backend engineering.");
        expect(aligned).toContain("* Strong expertise in Go and Docker.");
        expect(aligned).toContain("* Deep understanding of distributed databases.");

        // Must not be a single line and must contain divider lines
        const lines = aligned.split("\n").filter((l: string) => l.trim().length > 0);
        expect(lines.length).toBeGreaterThan(6);
        expect(aligned).toContain("\n\n---\n\n");
    });

    it("splits inline numbered lists into distinct bullet points", () => {
        const numberedText =
            "Key Responsibilities: 1. Develop scalable web applications 2. Write unit and integration tests 3. Deploy services to AWS";

        const aligned = formatAndAlignJobDescription(numberedText);
        expect(aligned).toContain("### **Key Responsibilities**");
        expect(aligned).toContain("* Develop scalable web applications");
        expect(aligned).toContain("* Write unit and integration tests");
        expect(aligned).toContain("* Deploy services to AWS");
    });

    it("formats job description matching user's executive layout with category labels and dividers", () => {
        const rawFdeJd = `
Forward Deployed Engineer
Company: Cursor (via Jobfound)
Location: Bengaluru, New Delhi, and Mumbai (with Remote context mentioned in source)

Role & Team Overview:
As a Forward Deployed Engineer at Cursor, you will embed directly with customer engineering teams to ship production-grade Cursor workflows.

Key Responsibilities:
Discovery & Scoping: Lead discovery sessions with customer engineers to identify real bottlenecks and define clear success metrics.
Workflow Design & Development: Design and build Cursor-powered workflows.
Product Feedback Loop: Translate custom builds into reusable patterns.

Basic / Minimum Qualifications:
Technical Skills: Strong proficiency in Python, TypeScript, and JavaScript.
Ability to ramp up quickly on new technology stacks.

Preferred Qualifications:
Backend Development
Frontend Development

About Company:
Cursor develops advanced AI-powered software development tools.
        `;

        const formatted = formatAndAlignJobDescription(
            rawFdeJd,
            "Forward Deployed Engineer",
            "Cursor (via Jobfound)",
            "Bengaluru, New Delhi, and Mumbai (with Remote context mentioned in source)"
        );

        expect(formatted).toContain("# **Forward Deployed Engineer**");
        expect(formatted).toContain("**Company:** Cursor (via Jobfound)");
        expect(formatted).toContain("**Location:** Bengaluru, New Delhi, and Mumbai (with Remote context mentioned in source)");
        expect(formatted).toContain("---");
        expect(formatted).toContain("### **Role & Team Overview**");
        expect(formatted).toContain("### **Key Responsibilities**");
        expect(formatted).toContain("* **Discovery & Scoping:** Lead discovery sessions with customer engineers to identify real bottlenecks and define clear success metrics.");
        expect(formatted).toContain("* **Workflow Design & Development:** Design and build Cursor-powered workflows.");
        expect(formatted).toContain("### **Basic / Minimum Qualifications**");
        expect(formatted).toContain("* **Technical Skills:** Strong proficiency in Python, TypeScript, and JavaScript.");
        expect(formatted).toContain("### **Preferred Qualifications**");
        expect(formatted).toContain("### **About Company (Brief)**");
    });

    it("correctly un-squashes and aligns the exact pasted Cursor Forward Deployed Engineer text", () => {
        const userPasted = `# **Forward Deployed Engineer**
* *Company:** Cursor
* *Location:** Bengaluru, New Delhi, Mumbai, IN
About the roleForward Deployed Engineers embed directly with customer engineering teams to ship production-grade Cursor workflows that measurably improve how they build software. You’ll figure out what’s actually slowing a team down, design a practical solution, and own it end-to-end, from first discovery call through launch, iteration, and post-production support. This is not a demo role. You are responsible for systems that work in the real world. This role will be based in all 3 cities: Bengaluru, New Delhi and Mumbai.What you’ll doLead discovery with customer engineers to identify the real bottleneck and define clear success metricsDesign and build Cursor-powered workflows (e.g., large-scale refactors, migrations, PR review loops, incident → fix pipelines, spec → implementation systems)Ship a fast first version in days, then harden it into something reliable over weeks with proper rollout plans, monitoring, and iteration based on real usageOwn production quality: tracing, evals, metrics, debugging model behavior, latency/cost tradeoffs, and failure modesWork directly with Staff+/Platform/Eng leaders
* going deep in code while also communicating clearly about tradeoffs and resultsTurn what you build into reusable patterns and push improvements back into the core Cursor productYou may be a fit ifYou thrive in ambiguity and can turn fuzzy problems into clear scopes and shipped systemsYou’ve built and owned AI-native workflows in production, not just prototypes, and have debugged real-world model failuresYou’re comfortable leading discovery conversations and being accountable for customer outcomesYou build end-to-end
* if it needs frontend, backend, infra, or prompt iteration, you’ll own itYou’ve handled production reliability before (metrics, alerts, safe rollouts, incident response)You’re strong in Python and TypeScript/JavaScript and can ramp quickly on new stacks`;

        const aligned = formatAndAlignJobDescription(userPasted);

        expect(aligned).toContain("# **Forward Deployed Engineer**");
        expect(aligned).toContain("**Company:** Cursor");
        expect(aligned).toContain("**Location:** Bengaluru, New Delhi, Mumbai, IN");
        expect(aligned).not.toContain("* *Company:**");
        expect(aligned).not.toContain("* *Location:**");
        expect(aligned).toContain("### **Role & Team Overview**");
        expect(aligned).toContain("Forward Deployed Engineers embed directly with customer engineering teams");
        expect(aligned).toContain("### **Key Responsibilities**");
        expect(aligned).toContain("Lead discovery with customer engineers");
        expect(aligned).toContain("Design and build Cursor-powered workflows");
        expect(aligned).toContain("Ship a fast first version in days");
        expect(aligned).toContain("Own production quality");
        expect(aligned).toContain("* **Discovery & Scoping:** Lead discovery");
        expect(aligned).toContain("* **Workflow Design & Development:** Design and build");
        expect(aligned).toContain("### **Basic / Minimum Qualifications**");
        expect(aligned).toContain("* **Experience & Mindset:**");
        expect(aligned).toContain("* **Technical Skills:**");
        expect(aligned).toContain("Python and TypeScript/JavaScript");
        expect(aligned).toContain("---");
    });

    it("is strictly idempotent (f(f(x)) === f(x)) across multiple formatting passes", () => {
        const userPasted = `# **Forward Deployed Engineer**
* *Company:** Cursor
* *Location:** Bengaluru, New Delhi, Mumbai, IN
About the roleForward Deployed Engineers embed directly with customer engineering teams to ship production-grade Cursor workflows that measurably improve how they build software. You’ll figure out what’s actually slowing a team down, design a practical solution, and own it end-to-end, from first discovery call through launch, iteration, and post-production support. This is not a demo role. You are responsible for systems that work in the real world. This role will be based in all 3 cities: Bengaluru, New Delhi and Mumbai.What you’ll doLead discovery with customer engineers to identify the real bottleneck and define clear success metricsDesign and build Cursor-powered workflows (e.g., large-scale refactors, migrations, PR review loops, incident → fix pipelines, spec → implementation systems)Ship a fast first version in days, then harden it into something reliable over weeks with proper rollout plans, monitoring, and iteration based on real usageOwn production quality: tracing, evals, metrics, debugging model behavior, latency/cost tradeoffs, and failure modesWork directly with Staff+/Platform/Eng leaders
* going deep in code while also communicating clearly about tradeoffs and resultsTurn what you build into reusable patterns and push improvements back into the core Cursor productYou may be a fit ifYou thrive in ambiguity and can turn fuzzy problems into clear scopes and shipped systemsYou’ve built and owned AI-native workflows in production, not just prototypes, and have debugged real-world model failuresYou’re comfortable leading discovery conversations and being accountable for customer outcomesYou build end-to-end
* if it needs frontend, backend, infra, or prompt iteration, you’ll own itYou’ve handled production reliability before (metrics, alerts, safe rollouts, incident response)You’re strong in Python and TypeScript/JavaScript and can ramp quickly on new stacks`;

        const pass1 = formatAndAlignJobDescription(userPasted);
        const pass2 = formatAndAlignJobDescription(pass1);
        const pass3 = formatAndAlignJobDescription(pass2);

        expect(pass1).toBe(pass2);
        expect(pass2).toBe(pass3);
        expect(pass1).not.toContain("* **Workflow\n");
        expect(pass1).not.toContain("Design & Development:** Design & Development:**");
        expect(pass1).toContain("* **Production Quality & Observability:** Own production quality: tracing");
        expect(pass1).not.toContain("  * Technical Skills:**");
    });

    it("recovers and cleans corrupted job description input with broken bullets and duplicate labels", () => {
        const corrupted = `# **Forward Deployed Engineer**
**Company:** Cursor
**Location:** Bengaluru, New Delhi, Mumbai, IN

---

### **Key Responsibilities**

* **Discovery & Scoping:** Lead discovery with customer engineers to identify the real bottleneck and define clear success metrics
* **Workflow
* **Workflow Design & Development:** Design & Development:** Design and build Cursor-powered workflows
* **Rapid Prototyping & Iteration:** Ship a fast first version in days
* **Own production quality:** tracing, evals, metrics
* **Leadership & Collaboration:** Work directly with Staff+/Platform/Eng leaders
* **Product Feedback Loop:** Turn what you build into reusable patterns

---

### **Basic / Minimum Qualifications**

* **Experience & Mindset:**
  * Experience & Mindset:**
  * You thrive in ambiguity
  * Technical Skills:**
* **Technical Skills:**
  * You’re strong in Python from the JD what u noticed this is fetched form the url`;

        const recovered = formatAndAlignJobDescription(corrupted);

        expect(recovered).not.toContain("* **Workflow\n");
        expect(recovered).toContain("* **Workflow Design & Development:** Design and build Cursor-powered workflows");
        expect(recovered).not.toContain("Design & Development:** Design & Development:**");
        expect(recovered).toContain("* **Production Quality & Observability:** Own production quality: tracing");
        expect(recovered).not.toContain("  * Experience & Mindset:**");
        expect(recovered).not.toContain("  * Technical Skills:**");
        expect(recovered).not.toContain("from the JD what u noticed this is fetched form the url");
    });
});

