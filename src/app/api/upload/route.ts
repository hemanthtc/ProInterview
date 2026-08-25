import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";
import { isSafeUrl } from "@/utils/ssrf";
import { getVerifiedSession } from "@/utils/auth";
import { buildObjectKey, isS3Configured, uploadBuffer } from "@/utils/s3";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES = 5;

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.match(/\.(png|jpg|jpeg|webp)$/i) || file.type.startsWith("image/")) {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey && apiKey !== "dummy") {
                const genAI = new GoogleGenerativeAI(apiKey);
                const modelsToTry = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"];
                let mimeType = file.type || "image/png";
                if (name.endsWith(".jpg") || name.endsWith(".jpeg") || mimeType === "image/jpg") {
                    mimeType = "image/jpeg";
                } else if (name.endsWith(".png")) {
                    mimeType = "image/png";
                } else if (name.endsWith(".webp")) {
                    mimeType = "image/webp";
                }

                let text = "";
                for (const modelName of modelsToTry) {
                    try {
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const arrayBuffer = await file.arrayBuffer();
                        const base64Data = Buffer.from(arrayBuffer).toString("base64");
                        const result = await model.generateContent([
                            {
                                inlineData: {
                                    data: base64Data,
                                    mimeType
                                }
                            },
                            "Extract and transcribe all text from this job description / document screenshot verbatim. Return only the extracted text without conversational wrapper."
                        ]);
                        text = result.response.text() || "";
                        if (text.trim()) break;
                    } catch (mErr) {
                        console.warn(`OCR model ${modelName} failed for ${file.name}:`, mErr);
                    }
                }
                if (text.trim()) {
                    return `--- [Image OCR: ${file.name}] ---\n${text.trim()}\n`;
                }
            }
        } catch (e) {
            console.error("Image OCR text extraction failed for " + file.name + ":", e);
        }
        return "";
    }

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        let extractedText = "";
        let pdfParseFailed = false;

        // 1. Try local pdf-parse first (instant for text-based PDFs)
        try {
            // @ts-expect-error pdf-parse does not have default type definitions
            const pdfParseModule = await import("pdf-parse");
            const pdfParse = pdfParseModule.default ?? pdfParseModule;
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            extractedText = (data.text || "").trim();
        } catch (e) {
            console.warn("Local PDF extraction failed for " + file.name + ", will try Gemini:", e);
            pdfParseFailed = true;
        }

        // 2. If it is a scanned PDF (little to no text extracted, less than 350 chars) or pdf-parse failed, use Gemini multimodal OCR
        if (pdfParseFailed || extractedText.length < 350) {
            try {
                const apiKey = process.env.GEMINI_API_KEY;
                if (apiKey && apiKey !== "dummy") {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
                    const arrayBuffer = await file.arrayBuffer();
                    const base64Data = Buffer.from(arrayBuffer).toString("base64");
                    
                    let text = "";
                    for (const modelName of modelsToTry) {
                        try {
                            const model = genAI.getGenerativeModel({ model: modelName }, { timeout: 30000 });
                            const result = await model.generateContent([
                                {
                                    inlineData: {
                                        data: base64Data,
                                        mimeType: "application/pdf"
                                    }
                                },
                                "Extract and transcribe all text from this PDF document verbatim. Keep all details, work history, education, skills, and contact info. Return only the extracted text without conversational wrapper."
                            ]);
                            text = result.response.text() || "";
                            if (text.trim()) break;
                        } catch (mErr) {
                            console.warn(`Gemini PDF parse model ${modelName} failed for ${file.name}:`, mErr);
                        }
                    }
                    if (text.trim()) {
                        extractedText = text.trim();
                    }
                }
            } catch (e) {
                console.error("Gemini PDF extraction fallback failed for " + file.name + ":", e);
            }
        }

        return `--- [File: ${file.name}] ---\n${extractedText}\n`;
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
                return `--- [File: ${file.name}] ---\n${cleanText}\n`;
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
        return `--- [File: ${file.name}] ---\n${text.substring(0, 3000)}\n`;
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
        const session = await getVerifiedSession();
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
        const stored: { name: string; key: string; url: string }[] = [];

        for (const f of files) {
            const arrayBuffer = await f.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Re-parse from buffer for text extraction (File stream may be consumed)
            const blob = new File([buffer], f.name, { type: f.type });
            combinedText += await extractTextFromFile(blob);

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
            combinedText += await fetchUrlText(portfolioUrl);
        }

        if (!combinedText || !combinedText.trim()) {
            return NextResponse.json(
                { error: "Image OCR failed: Could not transcribe text from file. Please re-upload a clearer screenshot or document file." },
                { status: 422 }
            );
        }

        return NextResponse.json({
            text: combinedText,
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
