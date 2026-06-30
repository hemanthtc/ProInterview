import { NextRequest, NextResponse } from "next/server";

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
        // Strip HTML tags to return clean text
        return decoded
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    return decoded;
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
            return NextResponse.json({ error: "Failed to fetch email details from Gmail" }, { status: detailRes.status });
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
