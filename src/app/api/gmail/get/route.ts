import { NextRequest, NextResponse } from "next/server";

function cleanHtmlEntities(text: string): string {
    return text
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#8199;/g, "")
        .replace(/&#65279;/g, "")
        .replace(/&#847;/g, "")
        .replace(/&#8203;/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/&#(\d+);/g, (match, dec) => {
            const code = parseInt(dec, 10);
            return (code === 160 || code === 8199) ? " " : String.fromCharCode(code);
        })
        .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
            const code = parseInt(hex, 16);
            return String.fromCharCode(code);
        });
}

function cleanTextBody(text: string): string {
    let cleaned = cleanHtmlEntities(text);

    cleaned = cleaned
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .join("\n");

    const footerMarkers = [
        "© unstop",
        "all rights reserved",
        "unsubscribe",
        "privacy policy",
        "terms of service",
        "fee payments user warranty",
        "disclaimer of warranties",
        "if you'd prefer not to receive these emails"
    ];

    const lowerText = cleaned.toLowerCase();
    let earliestIndex = cleaned.length;

    for (const marker of footerMarkers) {
        const idx = lowerText.indexOf(marker);
        if (idx !== -1 && idx < earliestIndex) {
            earliestIndex = idx;
        }
    }

    if (earliestIndex < cleaned.length) {
        cleaned = cleaned.substring(0, earliestIndex).trim();
    }

    return cleaned;
}

function cleanHtmlBody(htmlText: string): string {
    const stripped = htmlText
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ");

    return cleanTextBody(stripped);
}

function getDecodedBody(payload: any): string {
    if (!payload) return "";
    
    const findPart = (part: any, mimeType: string): string => {
        if (part.mimeType === mimeType && part.body?.data) {
            return part.body.data;
        }
        if (part.parts) {
            for (const subPart of part.parts) {
                const data = findPart(subPart, mimeType);
                if (data) return data;
            }
        }
        return "";
    };

    // Prefer text/plain, fallback to text/html
    let base64Data = findPart(payload, "text/plain");
    let isHtml = false;
    
    if (!base64Data) {
        base64Data = findPart(payload, "text/html");
        isHtml = true;
    }

    if (!base64Data) {
        if (payload.body?.data) {
            base64Data = payload.body.data;
        }
    }

    if (!base64Data) return "";

    // Base64url decode
    const cleaned = base64Data.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(cleaned, "base64").toString("utf-8");

    if (isHtml) {
        return cleanHtmlBody(decoded);
    }

    return cleanTextBody(decoded);
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Email message ID is required" }, { status: 400 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Authorization token is required" }, { status: 401 });
        }

        const accessToken = authHeader.replace("Bearer ", "");

        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
        const detailRes = await fetch(detailUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!detailRes.ok) {
            const errText = await detailRes.text();
            console.error("Gmail fetch error:", errText);
            let parsedErr: any;
            try {
                parsedErr = JSON.parse(errText);
            } catch (e) {}
            const detailMsg = parsedErr?.error?.message || errText || "Failed to fetch email details from Gmail";
            return NextResponse.json({ error: `Gmail API Error: ${detailMsg}` }, { status: detailRes.status });
        }

        const detailData = await detailRes.json();
        const textContent = getDecodedBody(detailData.payload);

        if (!textContent.trim()) {
            return NextResponse.json({ error: "Failed to parse content or email body is empty" }, { status: 422 });
        }

        return NextResponse.json({ body: textContent });

    } catch (error: any) {
        console.error("Gmail detail retrieval error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
