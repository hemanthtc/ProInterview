import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";

const PANELISTS = [
    { id: "tech_lead", name: "Alex Chen", role: "Tech Lead", style: "Deep technical probes, edge cases, code quality" },
    { id: "em", name: "Jordan Lee", role: "Engineering Manager", style: "Behavioral ownership, collaboration, prioritization" },
    { id: "bar_raiser", name: "Sam Okonkwo", role: "Bar Raiser", style: "Cross-functional rigor, clarity under pressure" },
];

export async function GET() {
    return NextResponse.json({ panelists: PANELISTS });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            history = [],
            message,
            resume = "",
            company = "a tech company",
            role = "Software Engineer",
            activePanelistId,
            level = "intermediate",
        } = body;

        const rl = rateLimit(`panel:${(body.sessionId || "anon").toString()}`, { limit: 40, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const panelist = PANELISTS.find((p) => p.id === activePanelistId) || PANELISTS[0];
        const nextPanelist = PANELISTS[(PANELISTS.findIndex((p) => p.id === panelist.id) + 1) % PANELISTS.length];

        const transcript = (history as { role: string; content: string; panelist?: string }[])
            .slice(-12)
            .map((h) => `${h.panelist || h.role}: ${h.content}`)
            .join("\n");

        const prompt = `You are running a PANEL interview at ${company} for ${role} (${level}).
Current interviewer: ${panelist.name} (${panelist.role}) — style: ${panelist.style}.
Other panelists listening: ${PANELISTS.filter((p) => p.id !== panelist.id)
            .map((p) => p.name)
            .join(", ")}.

Candidate resume excerpt:
${(resume || "").slice(0, 4000) || "Not provided"}

Recent transcript:
${transcript || "(start)"}

Candidate just said:
${message || "(opening — greet and ask first question)"}

Rules:
- Speak ONLY as ${panelist.name}.
- Ask ONE focused question or give a short follow-up.
- Occasionally reference what another panelist might care about.
- If the candidate is ready to move on, end with token [PASS_TO:${nextPanelist.id}]
- If interview should end, end with [TERMINATE]
- Keep under 120 words.

Return JSON:
{
  "speakerId": "${panelist.id}",
  "speakerName": "${panelist.name}",
  "speakerRole": "${panelist.role}",
  "reply": "...",
  "passTo": "${nextPanelist.id}" | null,
  "terminate": false
}`;

        const raw = await cachedGenerate(`panel:${panelist.id}:${message}:${history.length}`, prompt, 2 * 60 * 1000);
        let parsed: any;
        try {
            parsed = parseJsonFromModel(raw);
        } catch {
            parsed = {
                speakerId: panelist.id,
                speakerName: panelist.name,
                speakerRole: panelist.role,
                reply: raw.replace(/\[PASS_TO:[^\]]+\]/g, "").replace("[TERMINATE]", "").trim(),
                passTo: raw.includes("[PASS_TO:") ? nextPanelist.id : null,
                terminate: raw.includes("[TERMINATE]"),
            };
        }

        return NextResponse.json({
            ...parsed,
            panelists: PANELISTS,
        });
    } catch (error: unknown) {
        console.error("panel-interviewer error", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
