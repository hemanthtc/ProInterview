import { NextResponse } from "next/server";

export interface CoachProfile {
    id: string;
    name: string;
    headline: string;
    domains: string[];
    companies: string[];
    rateUsd: number;
    rating: number;
    slots: string[];
    bio: string;
}

const COACHES: CoachProfile[] = [
    {
        id: "coach_priya",
        name: "Priya Nair",
        headline: "Ex-Google SWE · System design specialist",
        domains: ["backend", "system-design"],
        companies: ["Google", "Flipkart"],
        rateUsd: 89,
        rating: 4.9,
        slots: ["Tue 18:00 IST", "Thu 20:00 IST", "Sat 11:00 IST"],
        bio: "Warm up with AI mocks, then book a 45-min human loop focused on design tradeoffs.",
    },
    {
        id: "coach_marcus",
        name: "Marcus Webb",
        headline: "Ex-Meta EM · Behavioral + leadership",
        domains: ["behavioral", "frontend"],
        companies: ["Meta", "Airbnb"],
        rateUsd: 120,
        rating: 4.8,
        slots: ["Mon 09:00 PT", "Wed 17:00 PT"],
        bio: "STAR storytelling, leveling narratives, and bar-raiser style pressure drills.",
    },
    {
        id: "coach_aisha",
        name: "Aisha Rahman",
        headline: "ML infra · FAANG loop coach",
        domains: ["ml", "devops"],
        companies: ["Amazon", "NVIDIA"],
        rateUsd: 99,
        rating: 4.7,
        slots: ["Fri 19:00 IST", "Sun 10:00 IST"],
        bio: "Pairs AI film-room gaps with human retakes on ML system design and production metrics.",
    },
];

export async function GET() {
    return NextResponse.json({ coaches: COACHES });
}

export async function POST(req: Request) {
    const body = await req.json();
    const coach = COACHES.find((c) => c.id === body.coachId);
    if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    const slot = body.slot || coach.slots[0];
    return NextResponse.json({
        success: true,
        bookingId: `bk_${Date.now()}`,
        coach: coach.name,
        slot,
        message: `Booked mock session with ${coach.name} at ${slot}. Confirmation email coming soon.`,
        meetLink: `https://meet.google.com/lookup/prointerview-${coach.id}`,
    });
}
