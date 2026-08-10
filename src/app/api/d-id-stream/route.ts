import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, streamId, sessionId, answer, candidate, sdpMid, sdpMLineIndex, text } = body;
        
        const apiKey = process.env.DID_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "D-ID API key is missing. Please configure DID_API_KEY in your .env file." },
                { status: 400 }
            );
        }

        const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`;

        const activeSessionId = sessionId || body.session_id;

        if (action === "create") {
            console.log("D-ID Stream: Creating new stream session...");
            // POST /talks/streams
            const res = await fetch("https://api.d-id.com/talks/streams", {
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source_url: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
                    stream_warmup: true
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`D-ID talks/streams POST returned status ${res.status}: ${errText}`);
            }

            const data = await res.json();
            console.log("D-ID Stream: Session created successfully:", data.id);
            return NextResponse.json(data);

        } else if (action === "sdp") {
            if (!streamId || !activeSessionId) {
                return NextResponse.json({ error: "Missing streamId or session_id for SDP answer" }, { status: 400 });
            }
            console.log(`D-ID Stream: Sending SDP answer for stream ${streamId}...`);
            // POST /talks/streams/{streamId}/sdp
            const res = await fetch(`https://api.d-id.com/talks/streams/${streamId}/sdp`, {
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    answer,
                    session_id: activeSessionId
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`D-ID sdp POST returned status ${res.status}: ${errText}`);
            }

            const data = await res.json();
            return NextResponse.json(data);

        } else if (action === "ice") {
            if (!streamId || !activeSessionId) {
                return NextResponse.json({ error: "Missing streamId or session_id for ICE candidate" }, { status: 400 });
            }
            console.log(`D-ID Stream: Sending ICE candidate for stream ${streamId}...`);
            // POST /talks/streams/{streamId}/ice
            const res = await fetch(`https://api.d-id.com/talks/streams/${streamId}/ice`, {
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    candidate,
                    sdpMid,
                    sdpMLineIndex,
                    session_id: activeSessionId
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`D-ID ice POST returned status ${res.status}: ${errText}`);
            }

            const data = await res.json();
            return NextResponse.json(data);

        } else if (action === "speak") {
            if (!streamId || !activeSessionId) {
                return NextResponse.json({ error: "Missing streamId or session_id for speak action" }, { status: 400 });
            }
            console.log(`D-ID Stream: Requesting speaking animation on stream ${streamId}...`);
            
            // Clean text: strip brackets and terminate tags
            const cleanText = text.replace(/\[MODE:[A-Z]+\]/g, "").replace(/\[TERMINATE\]/g, "").trim();

            if (!cleanText) {
                return NextResponse.json({ error: "Text is empty." }, { status: 400 });
            }

            // POST /talks/streams/{streamId}
            const res = await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    script: {
                        type: "text",
                        input: cleanText,
                        provider: {
                            type: "microsoft",
                            voice_id: "en-US-JennyNeural"
                        }
                    },
                    config: {
                        fluent: true,
                        pad_audio: 0.0
                    },
                    session_id: activeSessionId
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`D-ID speak POST returned status ${res.status}: ${errText}`);
            }

            const data = await res.json();
            return NextResponse.json(data);

        } else {
            return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
        }

    } catch (err: any) {
        console.error("Error in /api/d-id-stream:", err);
        return NextResponse.json(
            { error: err.message || "An error occurred while communicating with the D-ID Stream API." },
            { status: 500 }
        );
    }
}
