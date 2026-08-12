import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { isSafeUrl } from "@/utils/ssrf";
import { getVerifiedSession } from "@/utils/auth";
import { buildObjectKey, isS3Configured, uploadBuffer } from "@/utils/s3";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES = 5;

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
            const pdfParseModule = await import("pdf-parse");
            const pdfParse = pdfParseModule.default ?? pdfParseModule;
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            const textContent = data.text || "";
            return `--- [File: ${file.name}] ---\n${textContent}\n`;
        } catch (e) {
            console.error("PDF extraction failed for " + file.name + ":", e);
            return "";
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
