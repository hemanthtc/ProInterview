import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { isSafeUrl } from "@/utils/ssrf";
import { getVerifiedSession } from "@/utils/auth";
import { buildObjectKey, isS3Configured, uploadBuffer } from "@/utils/s3";
import { generateWithFallback } from "@/utils/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES = 5;

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.match(/\.(png|jpg|jpeg|webp|jfif|bmp|tif|tiff)$/i) || file.type.startsWith("image/")) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString("base64");
            let mimeType = file.type || "image/png";
            if (/\.(jpe?g|jfif)$/i.test(name) || mimeType === "image/jpg") {
                mimeType = "image/jpeg";
            } else if (name.endsWith(".png")) {
                mimeType = "image/png";
            } else if (name.endsWith(".webp")) {
                mimeType = "image/webp";
            } else if (!mimeType.startsWith("image/")) {
                mimeType = "image/png";
            }

            const promptParts = [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType
                    }
                },
                "Extract and transcribe all text from this job description / document screenshot verbatim. Keep all details, responsibilities, requirements, qualifications, and company information. Return only the extracted text without conversational wrapper."
            ];

            const text = (await generateWithFallback(promptParts, {
                model: "gemini-3.8-flash",
                timeout: 30000
            })).trim();

            if (text) {
                return text;
            }
        } catch (e: any) {
            console.error("Image OCR text extraction failed for " + file.name + ":", e?.message || e);
            throw e;
        }
        return "";
    }

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        let extractedText = "";
        let pdfParseFailed = false;

        // 1. Try local pdf-parse first (instant for text-based PDFs)
        try {
            // @ts-expect-error pdf-parse lacks default type definitions; import lib directly to bypass index.js debug file ENOENT bug
            const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
            const pdfParse = pdfParseModule.default ?? pdfParseModule;
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            extractedText = (data.text || "").trim();
        } catch (e) {
            console.warn("Local PDF extraction failed for " + file.name + ", will try Gemini:", e);
            pdfParseFailed = true;
        }

        // 2. If it is a scanned PDF (little to no text extracted, less than 50 chars) or pdf-parse failed, use Gemini multimodal OCR
        if (pdfParseFailed || extractedText.length < 50) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const base64Data = Buffer.from(arrayBuffer).toString("base64");
                const promptParts = [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: "application/pdf"
                        }
                    },
                    "Extract and transcribe all text from this PDF document verbatim. Keep all details, work history, education, skills, and contact info. Return only the extracted text without conversational wrapper."
                ];
                const text = (await generateWithFallback(promptParts, {
                    timeout: 45000
                })).trim();
                if (text && text.length > 20) {
                    extractedText = text;
                }
            } catch (e: any) {
                console.error("Gemini PDF extraction fallback failed for " + file.name + ":", e?.message || e);
                const msg = e?.message || String(e);
                if (msg.includes("rate-limited") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
                    throw new Error(`The uploaded PDF ("${file.name}") has no text layer (it is an image-based/scanned printout), and AI visual OCR is currently rate-limited by Google. Please upload your original document with text (e.g. Deekshith_BC_Resume.pdf) or paste the text directly.`);
                }
            }
        }

        if (!extractedText || !extractedText.trim()) {
            throw new Error(`Could not extract readable text from PDF "${file.name}". The document appears to have no text layer and visual OCR could not transcribe it.`);
        }

        return extractedText.trim();
    }

    if (name.endsWith(".docx") || file.type.includes("wordprocessingml") || name.endsWith(".doc")) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const docXml = await zip.file("word/document.xml")?.async("string");
            if (docXml) {
                const cleanText = docXml
                    .replace(/<w:p[^>]*>/g, "\n")
                    .replace(/<w:tab[^>]*>/g, "\t")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/[ \t]+/g, " ")
                    .replace(/\n\s*\n/g, "\n")
                    .trim();
                return cleanText;
            }
        } catch (e) {
            console.error("DOCX extraction failed for " + file.name + ":", e);
        }
    }

    if (name.endsWith(".zip") || file.type.includes("zip")) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            let extracted = "";
            for (const relativePath in zip.files) {
                const zipEntry = zip.files[relativePath];
                if (
                    zipEntry.dir ||
                    relativePath.includes("node_modules") ||
                    relativePath.includes(".git") ||
                    relativePath.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|mp4|mp3|exe|dll)$/i)
                )
                    continue;

                const content = await zipEntry.async("string");
                extracted += `--- [File in ZIP: ${relativePath}] ---\n${content.substring(0, 3000)}\n`;
            }
            return extracted;
        } catch {
            return "";
        }
    }

    if (file.size > 2000000) return "";
    try {
        const text = await file.text();
        return text.substring(0, 5000).trim();
    } catch {
        return "";
    }
}

async function fetchUrlText(url: string) {
    if (!url) return "";
    try {
        if (!url.startsWith("http")) url = "https://" + url;

        const safe = await isSafeUrl(url);
        if (!safe) {
            return `\n--- [Failed to fetch website: ${url} (Unsafe/Local URL blocked)] ---\n`;
        }

        const res = await fetch(url);
        const html = await res.text();
        const cleanText = html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return `\n--- [Website: ${url}] ---\n${cleanText.substring(0, 10000)}\n`;
    } catch {
        return `\n--- [Failed to fetch website: ${url}] ---\n`;
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const data = await req.formData();
        const files = data.getAll("file") as File[];
        const portfolioUrl = data.get("portfolioUrl") as string;
        const storeInS3 = data.get("storeInS3") === "1" || data.get("storeInS3") === "true";

        if (!files.length && !portfolioUrl) {
            return NextResponse.json({ error: "No file or URL provided" }, { status: 400 });
        }

        if (files.length > MAX_FILES) {
            return NextResponse.json(
                { error: `Too many files. Maximum ${MAX_FILES} files per upload.` },
                { status: 400 }
            );
        }

        // Reject dangerous executable extensions
        const DANGEROUS_EXTENSIONS = /\.(exe|bat|sh|cmd|ps1|dll|msi|com|scr|pif|vbs|wsf)$/i;
        const dangerousFile = files.find((f) => DANGEROUS_EXTENSIONS.test(f.name));
        if (dangerousFile) {
            return NextResponse.json(
                { error: `File type not allowed: "${dangerousFile.name}". Executable files are blocked for security.` },
                { status: 400 }
            );
        }

        const oversized = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
        if (oversized) {
            return NextResponse.json(
                { error: `File "${oversized.name}" exceeds the 5MB size limit.` },
                { status: 413 }
            );
        }

        let combinedText = "";
        let lastError = "";
        const stored: { name: string; key: string; url: string }[] = [];
        const isMultiple = files.length > 1;

        for (const f of files) {
            const arrayBuffer = await f.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Re-parse from buffer for text extraction (File stream may be consumed)
            const blob = new File([buffer], f.name, { type: f.type });
            try {
                const text = await extractTextFromFile(blob);
                if (text && text.trim()) {
                    if (isMultiple) {
                        combinedText += `--- [File: ${f.name}] ---\n${text.trim()}\n\n`;
                    } else {
                        combinedText = text.trim();
                    }
                }
            } catch (err: any) {
                lastError = err?.message || String(err);
            }

            if (storeInS3 && isS3Configured()) {
                try {
                    const key = buildObjectKey("uploads", session.identifier, f.name);
                    const result = await uploadBuffer({
                        key,
                        body: buffer,
                        contentType: f.type || "application/octet-stream",
                        metadata: {
                            uploader: session.identifier.slice(0, 100),
                            originalName: f.name.slice(0, 100),
                        },
                    });
                    stored.push({ name: f.name, key: result.key, url: result.url });
                } catch (s3Err) {
                    console.warn("S3 store skipped for", f.name, s3Err);
                }
            }
        }

        if (portfolioUrl) {
            const urlText = await fetchUrlText(portfolioUrl);
            if (urlText && urlText.trim()) {
                combinedText += (combinedText ? "\n\n" : "") + urlText.trim();
            }
        }

        if (!combinedText || !combinedText.trim()) {
            if (lastError && (lastError.includes("rate-limited") || lastError.includes("quota") || lastError.includes("RESOURCE_EXHAUSTED") || lastError.includes("429"))) {
                return NextResponse.json(
                    { error: lastError },
                    { status: 429 }
                );
            }
            if (lastError && (lastError.includes("timeout") || lastError.includes("timed out") || lastError.includes("504"))) {
                return NextResponse.json(
                    { error: "Document transcription timed out. Please upload a standard text PDF or paste the text directly." },
                    { status: 504 }
                );
            }
            return NextResponse.json(
                { error: lastError || "Failed to extract text from document. Please ensure the file has a readable text layer or paste the text directly." },
                { status: 422 }
            );
        }

        return NextResponse.json({
            text: combinedText.trim(),
            s3Configured: isS3Configured(),
            stored: stored.length ? stored : undefined,
        });
    } catch (error: unknown) {
        console.error("Error parsing file:", error);
        return NextResponse.json(
            { error: (error as Error).message || "Failed to parse file" },
            { status: 500 }
        );
    }
}
