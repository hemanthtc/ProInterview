import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { isSafeUrl } from "@/utils/ssrf";

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();
    
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
            const pdfParse = require("pdf-parse").PDFParse ?? require("pdf-parse");
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            const textContent = data.text || "";
            return `--- [File: ${file.name}] ---\n${textContent}\n`;
        } catch(e) {
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
                if (zipEntry.dir || relativePath.includes("node_modules") || relativePath.includes(".git") || relativePath.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|mp4|mp3|exe|dll)$/i)) continue;
                
                const content = await zipEntry.async("string");
                extracted += `--- [File in ZIP: ${relativePath}] ---\n${content.substring(0, 3000)}\n`;
            }
            return extracted;
        } catch(e) { return ""; }
    }
    
    if (file.size > 2000000) return ""; 
    try {
        const text = await file.text();
        return `--- [File: ${file.name}] ---\n${text.substring(0, 3000)}\n`;
    } catch(e) { return ""; }
}

async function fetchUrlText(url: string) {
    if (!url) return "";
    try {
        if (!url.startsWith("http")) url = "https://" + url;
        
        // Verify URL is safe from SSRF before fetching
        const safe = await isSafeUrl(url);
        if (!safe) {
            return `\n--- [Failed to fetch website: ${url} (Unsafe/Local URL blocked)] ---\n`;
        }

        const res = await fetch(url);
        const html = await res.text();
        const cleanText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                              .replace(/<[^>]+>/g, ' ')
                              .replace(/\s+/g, ' ').trim();
        return `\n--- [Website: ${url}] ---\n${cleanText.substring(0, 10000)}\n`;
    } catch(e) { return `\n--- [Failed to fetch website: ${url}] ---\n`; }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const files = data.getAll("file") as File[];
        const portfolioUrl = data.get("portfolioUrl") as string;

        if (!files.length && !portfolioUrl) {
            return NextResponse.json({ error: "No file or URL provided" }, { status: 400 });
        }

        let combinedText = "";
        for (const f of files) {
            combinedText += await extractTextFromFile(f);
        }
        if (portfolioUrl) {
            combinedText += await fetchUrlText(portfolioUrl);
        }

        return NextResponse.json({ text: combinedText });
    } catch (error: unknown) {
        console.error("Error parsing file:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to parse file" }, { status: 500 });
    }
}
