import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isSafeUrl } from "@/utils/ssrf";
import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";
import {
    decodeHtmlEntities,
    htmlToCleanText,
    formatAndAlignJobDescription,
} from "@/utils/formatJobDescription";

export const maxDuration = 45;
export const dynamic = "force-dynamic";


/**
 * Checks for Schema.org JobPosting JSON-LD embedded in the HTML document.
 */
function extractJobPostingJsonLd(html: string): { title?: string; company?: string; location?: string; description?: string } | null {
    const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const rawContent = match[1].trim();
            const parsed = JSON.parse(rawContent);

            const findJobPosting = (obj: any): any => {
                if (!obj || typeof obj !== "object") return null;
                if (obj["@type"] === "JobPosting") return obj;
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const found = findJobPosting(item);
                        if (found) return found;
                    }
                }
                if (Array.isArray(obj["@graph"])) {
                    return findJobPosting(obj["@graph"]);
                }
                return null;
            };

            const jobPosting = findJobPosting(parsed);
            if (jobPosting && jobPosting.description) {
                const title = typeof jobPosting.title === "string" ? jobPosting.title.trim() : undefined;
                let company: string | undefined;
                if (jobPosting.hiringOrganization) {
                    if (typeof jobPosting.hiringOrganization === "string") {
                        company = jobPosting.hiringOrganization.trim();
                    } else if (typeof jobPosting.hiringOrganization.name === "string") {
                        company = jobPosting.hiringOrganization.name.trim();
                    }
                }

                let location: string | undefined;
                if (jobPosting.jobLocation) {
                    if (typeof jobPosting.jobLocation === "string") {
                        location = jobPosting.jobLocation.trim();
                    } else if (jobPosting.jobLocation.address) {
                        const addr = jobPosting.jobLocation.address;
                        const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
                        if (parts.length > 0) location = parts.join(", ");
                    }
                }
                if (!location && (jobPosting.jobLocationType === "TELECOMMUTE" || jobPosting.applicantLocationRequirements)) {
                    location = "Remote";
                }

                const description = htmlToCleanText(String(jobPosting.description));
                if (description && description.length > 50) {
                    return { title, company, location, description };
                }
            }
        } catch {
            // Ignore JSON parse errors in individual script tags
        }
    }

    return null;
}

/**
 * Extracts meta title and description for fallback signals.
 */
function extractMetaSignals(html: string): { title?: string; company?: string } {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["']\s+[^>]*content=["']([^"']+)["']/i);
    const ogSiteName = html.match(/<meta\s+[^>]*property=["']og:site_name["']\s+[^>]*content=["']([^"']+)["']/i);

    const rawTitle = decodeHtmlEntities(ogTitleMatch?.[1] || titleMatch?.[1] || "").trim();
    let company = decodeHtmlEntities(ogSiteName?.[1] || "").trim();

    let role = rawTitle;
    if (rawTitle.includes(" at ")) {
        const parts = rawTitle.split(" at ");
        role = parts[0].trim();
        if (!company) company = parts[1].replace(/[-|•].*$/, "").trim();
    } else if (rawTitle.includes(" - ")) {
        const parts = rawTitle.split(" - ");
        role = parts[0].trim();
        if (!company && parts[1]) company = parts[1].trim();
    } else if (rawTitle.includes(" | ")) {
        const parts = rawTitle.split(" | ");
        role = parts[0].trim();
        if (!company && parts[1]) company = parts[1].trim();
    }

    return { title: role, company };
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        let rawUrl = (body.url || "").trim();

        if (!rawUrl) {
            return NextResponse.json({ error: "Please enter a valid job posting URL." }, { status: 400 });
        }

        // Auto-prepend https:// if protocol was omitted
        if (!/^https?:\/\//i.test(rawUrl)) {
            rawUrl = "https://" + rawUrl;
        }

        // Validate URL syntax
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(rawUrl);
        } catch {
            return NextResponse.json({ error: "Invalid URL format. Please enter a valid web address." }, { status: 400 });
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return NextResponse.json({ error: "Only HTTP and HTTPS URLs are supported." }, { status: 400 });
        }

        // SSRF validation against private/loopback networks
        const isSafe = await isSafeUrl(rawUrl);
        if (!isSafe) {
            return NextResponse.json(
                { error: "URL cannot be accessed for security reasons (private or local network address blocked)." },
                { status: 400 }
            );
        }

        // Fetch page content with realistic browser headers and 12-second timeout
        let html = "";
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const res = await fetch(rawUrl, {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
                redirect: "follow",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 403 || res.status === 401) {
                    return NextResponse.json(
                        {
                            error:
                                "This job posting requires login or blocked automated access. Please copy and paste the job description text directly.",
                        },
                        { status: 422 }
                    );
                }
                if (res.status === 404) {
                    return NextResponse.json(
                        { error: "Job posting not found (HTTP 404). Please verify the link is active." },
                        { status: 404 }
                    );
                }
                return NextResponse.json(
                    { error: `Website returned error status ${res.status}. Please copy and paste the job description text directly.` },
                    { status: 422 }
                );
            }

            html = await res.text();
        } catch (fetchErr: any) {
            if (fetchErr?.name === "AbortError") {
                return NextResponse.json(
                    { error: "Connection timed out while fetching the job URL. Please check the link or paste the text directly." },
                    { status: 504 }
                );
            }
            return NextResponse.json(
                { error: `Could not connect to URL: ${fetchErr?.message || "Network error"}. Please check the link or paste text directly.` },
                { status: 502 }
            );
        }

        if (!html || html.trim().length < 50) {
            return NextResponse.json(
                { error: "The webpage returned empty content. Please copy and paste the job description directly." },
                { status: 422 }
            );
        }

        // Extract meta title & company signals
        const metaSignals = extractMetaSignals(html);

        // Step 1: Check for Schema.org JobPosting JSON-LD (purest structured source)
        const jsonLdJob = extractJobPostingJsonLd(html);
        if (jsonLdJob && jsonLdJob.description && jsonLdJob.description.length > 200) {
            const role = jsonLdJob.title || metaSignals.title || "";
            const company = jsonLdJob.company || metaSignals.company || "";
            const location = jsonLdJob.location || "";
            const alignedJd = formatAndAlignJobDescription(jsonLdJob.description, role, company, location);

            return NextResponse.json({
                success: true,
                role,
                company,
                location,
                jobDescription: alignedJd,
                sourceUrl: rawUrl,
                extractedVia: "structured_data",
            });
        }

        // Step 2: Clean and extract visible text from HTML
        const cleanPageText = htmlToCleanText(html);
        if (!cleanPageText || cleanPageText.length < 80) {
            return NextResponse.json(
                { error: "No readable job description text could be extracted from this page. Please paste the text manually." },
                { status: 422 }
            );
        }

        // Step 3: Use Gemini AI to isolate and align the job description details
        const textSlice = cleanPageText.slice(0, 14000);

        const extractionPrompt = `You are a specialized ATS job document extractor and formatting engine.
Below is the raw text extracted from a job posting webpage (${rawUrl}).

TASK:
Extract the job posting details and format the "jobDescription" in this EXACT Markdown layout:

# **[Job Title]**
**Company:** [Company Name]
**Location:** [City, Country / Remote / Hybrid context]

---

### **Role & Team Overview**
[A 2-4 sentence narrative describing what the role does, why it matters, and who the candidate works with]

---

### **Key Responsibilities**
* **[Category or Action]:** [Specific duty or responsibility]
* **[Category or Action]:** [Specific duty or responsibility]

---

### **Basic / Minimum Qualifications**
* **Experience & Mindset:**
  * [Key requirement or experience item]
  * [Key requirement or experience item]
* **Technical Skills:**
  * [Required technologies, programming languages, and tools]

---

### **Preferred Qualifications**
* [Nice-to-have qualification, tool, or specialization]
* [Nice-to-have qualification, tool, or specialization]

---

### **About Company (Brief)**
[1-2 sentence overview of the company, product, or mission]

CRITICAL FORMATTING INSTRUCTIONS:
1. Every section heading MUST use level 3 markdown bold: ### **Section Name**
2. Use horizontal dividers (---) between the top header block and every section.
3. Every bullet point MUST start with '* ' (or '  * ' for sub-bullets).
4. Bold any category label before the colon (e.g. '* **Discovery & Scoping:** Lead discovery sessions...').
5. EXCLUDE website navigation, copyright footers, cookie banners, and social share buttons.

Return ONLY a JSON object in this exact schema:
{
  "role": "string",
  "company": "string",
  "location": "string",
  "jobDescription": "string"
}

RAW WEBPAGE TEXT:
${textSlice}`;

        try {
            const aiRaw = await generateWithFallback(extractionPrompt, { timeout: 16000 });
            const parsed = parseJsonFromModel(aiRaw) as {
                role?: string;
                company?: string;
                location?: string;
                jobDescription?: string;
            };

            if (parsed && typeof parsed.jobDescription === "string" && parsed.jobDescription.trim().length > 100) {
                const finalRole = parsed.role || metaSignals.title || "";
                const finalCompany = parsed.company || metaSignals.company || "";
                const finalLocation = parsed.location || "";
                const alignedJd = formatAndAlignJobDescription(
                    parsed.jobDescription,
                    finalRole,
                    finalCompany,
                    finalLocation
                );

                return NextResponse.json({
                    success: true,
                    role: finalRole,
                    company: finalCompany,
                    location: finalLocation,
                    jobDescription: alignedJd,
                    sourceUrl: rawUrl,
                    extractedVia: "ai_parser",
                });
            }
        } catch (aiErr) {
            console.warn("[Job URL Extractor] AI extraction failed, falling back to deterministic cleaned text:", aiErr);
        }

        // Deterministic Fallback if AI was unavailable
        const detectedRole = metaSignals.title || "";
        const detectedCompany = metaSignals.company || "";
        const alignedFallbackJd = formatAndAlignJobDescription(
            cleanPageText.slice(0, 5000),
            detectedRole,
            detectedCompany
        );

        return NextResponse.json({
            success: true,
            role: detectedRole,
            company: detectedCompany,
            location: "",
            jobDescription: alignedFallbackJd,
            sourceUrl: rawUrl,
            extractedVia: "clean_html_fallback",
        });
    } catch (err: any) {
        console.error("[Job URL Extractor] Unexpected error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to process job posting URL. Please paste the text manually." },
            { status: 500 }
        );
    }
}
