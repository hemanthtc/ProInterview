import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { text } = await req.json();
        
        const apiKey = process.env.TAVUS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Tavus API key is missing. Please configure TAVUS_API_KEY in your .env file." },
                { status: 400 }
            );
        }

        // Clean the text: remove system tags or brackets like [MODE:CHAT]
        const cleanText = text.replace(/\[MODE:[A-Z]+\]/g, "").replace(/\[TERMINATE\]/g, "").trim();

        if (!cleanText) {
            return NextResponse.json({ error: "Text is empty." }, { status: 400 });
        }

        const replicaId = process.env.TAVUS_FACE_ID || process.env.TAVUS_REPLICA_ID || "r90bbd427f71";

        console.log("Sending text to Tavus API /v2/videos:", cleanText);

        const createRes = await fetch("https://tavusapi.com/v2/videos", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                replica_id: replicaId,
                script: cleanText,
                video_name: `Interview Response ${Date.now()}`
            })
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Tavus API POST /v2/videos returned ${createRes.status}: ${errText}`);
        }

        const createData = await createRes.json();
        const videoId = createData.video_id;

        if (!videoId) {
            throw new Error("Tavus response did not return a video ID.");
        }

        console.log(`Tavus video created successfully with ID: ${videoId}. Polling for completion...`);

        // Poll for completion (max 120 attempts, 1 second intervals)
        const maxAttempts = 120;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (req.signal?.aborted) {
                console.log("Client aborted request. Stopping Tavus video polling.");
                return NextResponse.json({ error: "Polling aborted by client." }, { status: 499 });
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));

            if (req.signal?.aborted) {
                console.log("Client aborted request. Stopping Tavus video polling.");
                return NextResponse.json({ error: "Polling aborted by client." }, { status: 499 });
            }

            const pollRes = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
                method: "GET",
                headers: {
                    "x-api-key": apiKey
                }
            });

            if (!pollRes.ok) {
                const errText = await pollRes.text();
                throw new Error(`Tavus API GET /v2/videos/${videoId} returned ${pollRes.status}: ${errText}`);
            }

            const pollData = await pollRes.json();
            console.log(`Tavus poll attempt ${attempt + 1}: status = ${pollData.status}`);

            if (pollData.status === "ready") {
                const resultUrl = pollData.download_url || pollData.hosted_url;
                if (resultUrl) {
                    return NextResponse.json({ result_url: resultUrl });
                } else {
                    throw new Error("Tavus video completed but result_url is missing.");
                }
            } else if (pollData.status === "failed" || pollData.status === "error") {
                throw new Error(`Tavus video generation ended with status ${pollData.status}: ${JSON.stringify(pollData.error || pollData)}`);
            }
        }

        throw new Error("Tavus video generation timed out (exceeded 120 seconds).");
    } catch (err: any) {
        console.error("Error in /api/tavus-talk:", err);
        return NextResponse.json(
            { error: err.message || "An unexpected error occurred during Tavus video generation." },
            { status: 500 }
        );
    }
}
