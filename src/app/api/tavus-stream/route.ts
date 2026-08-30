import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";

async function endActiveConversations(apiKey: string) {
    try {
        console.log("Cleaning up active Tavus conversations...");
        const listRes = await fetch("https://tavusapi.com/v2/conversations", {
            method: "GET",
            headers: { "x-api-key": apiKey }
        });
        if (!listRes.ok) return;
        const listData = await listRes.json();
        const conversations = listData.data || listData.conversations || [];
        for (const item of conversations) {
            const id = item.conversation_id || item.id;
            const status = item.status;
            if (id && status !== "ended" && status !== "failed") {
                console.log(`Ending active Tavus conversation ${id}...`);
                await fetch(`https://tavusapi.com/v2/conversations/${id}/end`, {
                    method: "POST",
                    headers: { "x-api-key": apiKey }
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.warn("Failed to cleanup active Tavus conversations:", e);
    }
}

async function endTavusConversation(apiKey: string, conversationId: string) {
    console.log(`Explicitly ending Tavus conversation ${conversationId}...`);
    await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, {
        method: "POST",
        headers: { "x-api-key": apiKey }
    }).catch(() => {});
}

export const ALLOWED_TAVUS_REPLICAS = [
    "r67d1c9cac37", // Alex - Senior Tech Lead
    "r9d30b0e55ac", // Luna - Engineering Director
    "re6220ec0195", // Marcus - Principal Architect
] as const;

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { action = "create", conversation_id } = body;
        
        const apiKey = process.env.TAVUS_API_KEY;
        if (!apiKey || apiKey === "dummy") {
            return NextResponse.json(
                { error: "Tavus API key is missing. Please configure TAVUS_API_KEY in your .env file." },
                { status: 400 }
            );
        }

        if (action === "end") {
            if (conversation_id) {
                await endTavusConversation(apiKey, conversation_id);
            } else {
                await endActiveConversations(apiKey);
            }
            return NextResponse.json({ success: true });
        }

        if (action === "create") {
            console.log("Tavus Stream: Creating new conversation session...");
            
            const requestedReplica = body.replica_id || body.face_id;
            let faceId: string;

            if (requestedReplica && ALLOWED_TAVUS_REPLICAS.includes(requestedReplica as any)) {
                faceId = requestedReplica;
                console.log(`Using client-selected whitelisted replica: ${faceId}`);
            } else if (process.env.TAVUS_FACE_ID && ALLOWED_TAVUS_REPLICAS.includes(process.env.TAVUS_FACE_ID as any)) {
                faceId = process.env.TAVUS_FACE_ID;
                console.log(`Using .env configured whitelisted replica: ${faceId}`);
            } else {
                faceId = ALLOWED_TAVUS_REPLICAS[0];
                console.log(`Using default whitelisted replica: ${faceId}`);
            }

            let palId = process.env.TAVUS_PAL_ID;

            if (!palId) {
                console.log("TAVUS_PAL_ID not set, dynamically creating an Expressive Echo PAL...");
                const createPalRes = await fetch("https://tavusapi.com/v2/pals", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        pal_name: "ProInterview Echo PAL",
                        default_replica_id: faceId,
                        pipeline_mode: "echo"
                    })
                });

                if (createPalRes.ok) {
                    const palData = await createPalRes.json();
                    palId = palData.pal_id;
                    console.log(`Successfully created Expressive Echo PAL with ID: ${palId}`);
                } else {
                    const errText = await createPalRes.text();
                    console.warn(`Failed to dynamically create Tavus PAL: ${createPalRes.status} - ${errText}`);
                }
            }

            const payload: Record<string, any> = {
                replica_id: faceId,
                conversation_name: "ProInterview Live Session",
                conversational_context: "You are an executive technical interviewer conducting a mock interview. Expressively engage with the candidate using natural hand gestures, open hand movements when asking questions, head nods to show active listening, and warm, dynamic eye contact while speaking."
            };
            if (palId) {
                payload.pal_id = palId;
            }

            let res = await fetch("https://tavusapi.com/v2/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                },
                body: JSON.stringify(payload)
            });

            // If maximum concurrent conversations limit hit, end active conversations and retry
            if (!res.ok) {
                let errText = await res.text();
                if (errText.includes("maximum concurrent conversations") || res.status === 400) {
                    console.warn("Max concurrent conversations reached. Cleaning up previous sessions and retrying...");
                    await endActiveConversations(apiKey);
                    await new Promise(resolve => setTimeout(resolve, 800));

                    res = await fetch("https://tavusapi.com/v2/conversations", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": apiKey,
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        errText = await res.text();
                    }
                }
                
                if (!res.ok) {
                    if (res.status === 402 || errText.includes("out of conversational credits") || errText.includes("credits")) {
                        return NextResponse.json({
                            error: "Your Tavus account is out of conversational credits. Please top up your Tavus credits at tavus.io or use the built-in SVG avatar."
                        }, { status: 402 });
                    }
                    throw new Error(`Tavus conversations POST returned status ${res.status}: ${errText}`);
                }
            }

            const data = await res.json();
            console.log("Tavus Stream: Session created successfully with conversation ID:", data.conversation_id);
            return NextResponse.json({
                conversation_url: data.conversation_url,
                conversation_id: data.conversation_id
            });
        } else {
            return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
        }

    } catch (err: any) {
        console.error("Error in /api/tavus-stream:", err);
        return NextResponse.json(
            { error: err.message || "An error occurred while communicating with the Tavus Stream API." },
            { status: 500 }
        );
    }
}
