import JSZip from "jszip";
import { DocumentExtractionResult, ExtractionWarning } from "./types";

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_DOCX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_TEXT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Inspect magic bytes of ArrayBuffer to safely detect binary file type.
 */
function detectMagicType(buffer: ArrayBuffer): "pdf" | "zip-or-docx" | "ole-doc" | "png" | "jpeg" | "webp" | "unknown" {
    if (buffer.byteLength < 4) return "unknown";
    const bytes = new Uint8Array(buffer.slice(0, 8));

    // PDF: %PDF- (0x25, 0x50, 0x44, 0x46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return "pdf";
    }

    // ZIP / DOCX: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
        return "zip-or-docx";
    }

    // OLE2 Compound Document: 0xD0, 0xCF, 0x11, 0xE0 (Legacy .doc)
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
        return "ole-doc";
    }

    // PNG: 0x89, 0x50, 0x4E, 0x47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return "png";
    }

    // JPEG: 0xFF, 0xD8, 0xFF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return "jpeg";
    }

    // WEBP: RIFF....WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return "webp";
    }

    return "unknown";
}

/**
 * Normalizes multi-column and dense PDF text while preserving line and paragraph breaks.
 */
export function normalizePdfText(text: string): string {
    if (!text) return "";

    return text
        // Normalize line endings
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Separate glued URLs from other text
        .replace(/([a-zA-Z0-9_\-\.\)])(https?:\/\/)/g, "$1 $2")
        .replace(/(https?:\/\/[^\s]+)(https?:\/\/)/g, "$1\n$2")
        // Separate glued dates: "01/202404/2024" -> "01/2024 - 04/2024"
        .replace(/(\d{1,2}\/\d{4})\s*(\d{1,2}\/\d{4})/g, "$1 - $2")
        .replace(/(\d{4})\s*[-–—]\s*(\d{4})/g, "$1 - $2")
        .replace(/(\d{1,2}\/\d{4})\s*(Present|Current)/gi, "$1 - $2")
        .replace(/([a-zA-Z\)])(20\d\d|19\d\d)\b/g, "$1 $2")
        // Separate company / institution suffixes glued to next word
        .replace(/\b(Ltd|Pvt|Inc|LLC|Corp|GmbH|Solutions|Technologies|Polytechnic|Institute|University|College|Collage)([A-Z][a-z]+)/g, "$1 $2")
        // Separate glued phone numbers or emails
        .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})([A-Z0-9+])/g, "$1\n$2")
        // Unglue common uppercase section headings if directly glued to preceding lowercase text or punctuation with no newline
        .replace(/([a-z0-9_\-\.\)])(?=(?:EDUCATION|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EXPERIENCE|PROJECTS|KEY PROJECTS|TECHNICAL SKILLS|SKILLS|CERTIFICATIONS|LANGUAGES|PUBLICATIONS|ACHIEVEMENTS|AWARDS|VOLUNTEER EXPERIENCE|SUMMARY|PROFILE)\b)/g, "$1\n\n")
        // Collapse excess blank lines
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * Parses DOCX XML preserving tables, cell dividers, paragraphs, runs, tabs, and line breaks.
 */
export function extractDocxXmlContent(xmlString: string): string {
    if (!xmlString) return "";

    // 1. Convert tables: replace rows and cells with structured text
    // Replace <w:tc...> with space or tab and closing </w:tc> with " | "
    let processed = xmlString.replace(/<w:tbl[\s\S]*?<\/w:tbl>/g, (tableMatch) => {
        const rows: string[] = [];
        const rowRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableMatch)) !== null) {
            const cells: string[] = [];
            const cellRegex = /<w:tc[\s\S]*?<\/w:tc>/g;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowMatch[0])) !== null) {
                // Extract text inside this cell
                const cellText = extractParagraphsFromXml(cellMatch[0]);
                if (cellText.trim()) {
                    cells.push(cellText.trim().replace(/\n/g, " "));
                }
            }
            if (cells.length > 0) {
                rows.push(cells.join(" | "));
            }
        }
        return rows.length > 0 ? "\n" + rows.join("\n") + "\n" : "";
    });

    // 2. Extract remaining paragraphs
    return extractParagraphsFromXml(processed);
}

function extractParagraphsFromXml(xml: string): string {
    return xml
        // Handle explicit line breaks & tabs
        .replace(/<w:br[^>]*>/g, "\n")
        .replace(/<w:tab[^>]*>/g, "\t")
        // Replace paragraph tags with newlines
        .replace(/<w:p[^>]*>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        // Extract text runs: <w:t ...>text</w:t> without requiring ES2018 dotAll s flag
        .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, "$1")
        // Remove all other XML tags without adding spurious spaces inside words
        .replace(/<[^>]+>/g, "")
        // Decode common XML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        // Normalize whitespace per line
        .split("\n")
        .map(line => line.replace(/[ \t]+/g, " ").trim())
        .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0))
        .join("\n")
        .trim();
}

/**
 * Securely ingests and extracts normalized text and multimodal data from a resume file.
 */
export async function extractResumeDocument(file: File | Blob, fileName = ""): Promise<DocumentExtractionResult> {
    const name = (fileName || (file as File).name || "resume").toLowerCase();
    const size = file.size || 0;
    const warnings: ExtractionWarning[] = [];

    const arrayBuffer = await file.arrayBuffer();
    const magicType = detectMagicType(arrayBuffer);

    // 1. Check for legacy .doc binary format
    if (magicType === "ole-doc" || (name.endsWith(".doc") && magicType !== "zip-or-docx")) {
        throw new Error(
            "Legacy Microsoft Word (.doc binary) format is not supported. Please open the file in Microsoft Word or Google Docs and save/download it as .docx or .pdf before uploading."
        );
    }

    // 2. Handle PDF
    if (magicType === "pdf" || name.endsWith(".pdf") || file.type === "application/pdf") {
        if (size > MAX_PDF_SIZE_BYTES) {
            throw new Error(`PDF file size (${(size / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit of 20 MB.`);
        }

        let pdfText = "";
        let isScanned = false;
        let pageCount = 1;

        try {
            // @ts-expect-error pdf-parse lacks default type definitions
            const pdfParseModule = await import("pdf-parse");
            const pdfParse = pdfParseModule.default ?? pdfParseModule;

            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            pdfText = (data.text || "").trim();
            pageCount = data.numpages || 1;
        } catch (pdfErr: any) {
            warnings.push({
                code: "PDF_PARSE_WARNING",
                message: `Standard PDF text layer parsing failed: ${pdfErr?.message || "Unknown error"}. Proceeding with multimodal analysis.`,
                severity: "warning"
            });
        }

        const normalizedText = normalizePdfText(pdfText);

        // Detect scanned / image-based PDF
        if (normalizedText.length < 60 && size > 30 * 1024) {
            isScanned = true;
            warnings.push({
                code: "SCANNED_PDF_DETECTED",
                message: "Document appears to be a scanned or image-based PDF with minimal text layer. Gemini multimodal visual extraction will be used.",
                severity: "info"
            });
        }

        // Attach binary part for multimodal Gemini (handles scanned PDFs, tables, visual multi-column layouts)
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const binaryPart = {
            inlineData: {
                data: base64,
                mimeType: "application/pdf"
            }
        };

        return {
            rawText: normalizedText,
            sourceFormat: "pdf",
            extractionMethod: isScanned ? "pdf-multimodal" : (normalizedText ? "pdf-text" : "pdf-multimodal"),
            isScanned,
            pageCount,
            binaryPart,
            warnings
        };
    }

    // 3. Handle DOCX
    if (magicType === "zip-or-docx" || name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
        if (size > MAX_DOCX_SIZE_BYTES) {
            throw new Error(`DOCX file size (${(size / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit of 15 MB.`);
        }

        try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            let combinedText = "";

            // Check headers for contact details / candidate name
            for (const path in zip.files) {
                if (/word\/header\d*\.xml/i.test(path)) {
                    const headerXml = await zip.files[path].async("string");
                    const headerText = extractDocxXmlContent(headerXml);
                    if (headerText.trim()) {
                        combinedText += headerText.trim() + "\n";
                    }
                }
            }

            // Main document
            const docXml = await zip.file("word/document.xml")?.async("string");
            if (docXml) {
                const docText = extractDocxXmlContent(docXml);
                combinedText += (combinedText ? "\n" : "") + docText;
            }

            // Check footers
            for (const path in zip.files) {
                if (/word\/footer\d*\.xml/i.test(path)) {
                    const footerXml = await zip.files[path].async("string");
                    const footerText = extractDocxXmlContent(footerXml);
                    if (footerText.trim()) {
                        combinedText += "\n" + footerText.trim();
                    }
                }
            }

            if (!combinedText.trim()) {
                warnings.push({
                    code: "DOCX_EMPTY_TEXT",
                    message: "The Word document did not contain any readable text in the main body or headers.",
                    severity: "warning"
                });
            }

            return {
                rawText: combinedText.trim(),
                sourceFormat: "docx",
                extractionMethod: "docx-xml",
                isScanned: false,
                warnings
            };
        } catch (docxErr: any) {
            throw new Error(`Failed to parse DOCX file: ${docxErr?.message || "Invalid or corrupt archive"}`);
        }
    }

    // 4. Handle Images (PNG, JPG, JPEG, WEBP)
    if (
        magicType === "png" ||
        magicType === "jpeg" ||
        magicType === "webp" ||
        name.match(/\.(png|jpg|jpeg|webp)$/i) ||
        file.type.startsWith("image/")
    ) {
        if (size > MAX_IMAGE_SIZE_BYTES) {
            throw new Error(`Image size (${(size / 1024 / 1024).toFixed(1)} MB) exceeds limit of 15 MB.`);
        }

        const base64 = Buffer.from(arrayBuffer).toString("base64");
        let mimeType = "image/png";
        if (magicType === "jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            mimeType = "image/jpeg";
        } else if (magicType === "webp" || name.endsWith(".webp")) {
            mimeType = "image/webp";
        }

        return {
            rawText: "",
            sourceFormat: "image",
            extractionMethod: "vision",
            isScanned: true,
            binaryPart: {
                inlineData: {
                    data: base64,
                    mimeType
                }
            },
            warnings: [
                {
                    code: "IMAGE_RESUME",
                    message: "Image resume detected. Content will be extracted via Gemini Vision OCR.",
                    severity: "info"
                }
            ]
        };
    }

    // 5. Handle Plain Text / Markdown
    if (size > MAX_TEXT_SIZE_BYTES) {
        throw new Error(`Text file size exceeds maximum allowed limit of 10 MB.`);
    }

    const textDecoder = new TextDecoder("utf-8");
    const rawText = textDecoder.decode(arrayBuffer).trim();

    return {
        rawText,
        sourceFormat: "txt",
        extractionMethod: "plain-text",
        isScanned: false,
        warnings
    };
}
