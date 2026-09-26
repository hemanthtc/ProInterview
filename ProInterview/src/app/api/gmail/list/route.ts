import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Authorization token is required" }, { status: 401 });
        }

        const accessToken = authHeader.replace("Bearer ", "");

        // 1. Fetch message list from Gmail API matching keywords
        const query = encodeURIComponent('subject:(interview OR offer OR schedule OR invitation OR "assessment" OR "round") OR "offer letter" OR "job offer"');
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=8`;

        const listRes = await fetch(listUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!listRes.ok) {
            const errText = await listRes.text();
            console.error("Gmail list error:", errText);
            let parsedErr: any;
            try {
                parsedErr = JSON.parse(errText);
            } catch (e) {}
            const detailMsg = parsedErr?.error?.message || errText || "Failed to list emails from Gmail";
            return NextResponse.json({ error: `Gmail API Error: ${detailMsg}` }, { status: listRes.status });
        }

        const listData = await listRes.json();
        const messages = listData.messages || [];

        if (messages.length === 0) {
            return NextResponse.json({ emails: [] });
        }

        // 2. Fetch headers details for each message in parallel
        const emailDetails = await Promise.all(
            messages.map(async (msg: { id: string }) => {
                try {
                    const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
                    const detailRes = await fetch(detailUrl, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    });

                    if (!detailRes.ok) return null;
                    const detailData = await detailRes.json();

                    const headers = detailData.payload?.headers || [];
                    const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
                    const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
                    const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";

                    return {
                        id: msg.id,
                        subject,
                        from,
                        date,
                        snippet: detailData.snippet || ""
                    };
                } catch (e) {
                    console.error(`Failed to fetch detail for msg ID ${msg.id}:`, e);
                    return null;
                }
            })
        );

        const activeEmails = emailDetails.filter(Boolean);

        return NextResponse.json({ emails: activeEmails });

    } catch (error: any) {
        console.error("Gmail listing error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
