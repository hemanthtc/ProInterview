import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { text } = await req.json();
        
        const apiKey = process.env.DID_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "D-ID API key is missing. Please configure DID_API_KEY in your .env file." },
                { status: 400 }
            );
        }

        // Clean the text: D-ID API might fail or behave weirdly if we send tags or brackets like [MODE:CHAT]
        // Although the route.ts removes them before page.tsx sees them, sometimes they are present.
        // Let's strip brackets just in case.
        const cleanText = text.replace(/\[MODE:[A-Z]+\]/g, "").replace(/\[TERMINATE\]/g, "").trim();

        if (!cleanText) {
            return NextResponse.json({ error: "Text is empty." }, { status: 400 });
        }

        const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`;

        console.log("Sending text to D-ID API talks:", cleanText);

        const createRes = await fetch("https://api.d-id.com/talks", {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                source_url: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
                script: {
                    type: "text",
                    subtitles: "false",
                    provider: {
                        type: "microsoft",
                        voice_id: "en-US-JennyNeural"
                    },
                    input: cleanText
                },
                config: {
                    fluent: "true",
                    pad_audio: "0.0"
                }
            })
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`D-ID API POST /talks returned ${createRes.status}: ${errText}`);
        }

        const createData = await createRes.json();
        const talkId = createData.id;

        if (!talkId) {
            throw new Error("D-ID response did not return a talk ID.");
        }

        console.log(`D-ID talk created successfully with ID: ${talkId}. Polling for completion...`);

        // Poll for completion (max 60 attempts, 1 second intervals)
        const maxAttempts = 60;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const pollRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                method: "GET",
                headers: {
                    "Authorization": authHeader
                }
            });

            if (!pollRes.ok) {
                const errText = await pollRes.text();
                throw new Error(`D-ID API GET /talks/${talkId} returned ${pollRes.status}: ${errText}`);
            }

            const pollData = await pollRes.json();
            console.log(`D-ID poll attempt ${attempt + 1}: status = ${pollData.status}`);

            if (pollData.status === "done") {
                if (pollData.result_url) {
                    return NextResponse.json({ result_url: pollData.result_url });
                } else {
                    throw new Error("D-ID talk completed but result_url is missing.");
                }
            } else if (pollData.status === "error") {
                throw new Error(`D-ID talk ended with error: ${JSON.stringify(pollData.error || pollData)}`);
            }
        }

        throw new Error("D-ID talk generation timed out (exceeded 25 seconds).");
    } catch (err: any) {
        console.error("Error in /api/d-id-talk:", err);
        return NextResponse.json(
            { error: err.message || "An unexpected error occurred during video generation." },
            { status: 500 }
        );
    }
}
