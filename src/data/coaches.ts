export interface CoachProfile {
    id: string;
    name: string;
    headline: string;
    domains: string[];
    companies: string[];
    rateUsd: number;
    /** Session price in INR (used for Razorpay). */
    rateInr: number;
    rating: number;
    slots: string[];
    bio: string;
    durationMin: number;
}

export const COACHES: CoachProfile[] = [
    {
        id: "coach_priya",
        name: "Priya Nair",
        headline: "Ex-Google SWE · System design specialist",
        domains: ["backend", "system-design"],
        companies: ["Google", "Flipkart"],
        rateUsd: 89,
        rateInr: 4999,
        rating: 4.9,
        slots: ["Tue 18:00 IST", "Thu 20:00 IST", "Sat 11:00 IST"],
        bio: "Warm up with AI mocks, then book a 45-min human loop focused on design tradeoffs.",
        durationMin: 45,
    },
    {
        id: "coach_marcus",
        name: "Marcus Webb",
        headline: "Ex-Meta EM · Behavioral + leadership",
        domains: ["behavioral", "frontend"],
        companies: ["Meta", "Airbnb"],
        rateUsd: 120,
        rateInr: 6999,
        rating: 4.8,
        slots: ["Mon 09:00 PT", "Wed 17:00 PT"],
        bio: "STAR storytelling, leveling narratives, and bar-raiser style pressure drills.",
        durationMin: 45,
    },
    {
        id: "coach_aisha",
        name: "Aisha Rahman",
        headline: "ML infra · FAANG loop coach",
        domains: ["ml", "devops"],
        companies: ["Amazon", "NVIDIA"],
        rateUsd: 99,
        rateInr: 5499,
        rating: 4.7,
        slots: ["Fri 19:00 IST", "Sun 10:00 IST"],
        bio: "Pairs AI film-room gaps with human retakes on ML system design and production metrics.",
        durationMin: 45,
    },
    {
        id: "coach_elena",
        name: "Elena Rostova",
        headline: "Principal Hardware Architect · Silicon & Embedded",
        domains: ["vlsi", "hardware", "embedded"],
        companies: ["Intel", "Qualcomm"],
        rateUsd: 105,
        rateInr: 5999,
        rating: 4.9,
        slots: ["Mon 17:00 CET", "Thu 19:00 CET"],
        bio: "Specializes in digital architecture, RTL verification, timing closure, and silicon bring-up mock interviews.",
        durationMin: 45,
    },
    {
        id: "coach_rohit",
        name: "Rohit Sharma",
        headline: "VP of Product & Strategy · Ex-McKinsey & Stripe",
        domains: ["product", "business", "behavioral"],
        companies: ["Stripe", "McKinsey"],
        rateUsd: 115,
        rateInr: 6499,
        rating: 4.8,
        slots: ["Wed 18:30 IST", "Sat 15:00 IST"],
        bio: "Prepares candidates for PM execution, product sense, unit economics, and executive bar-raiser rounds.",
        durationMin: 45,
    },
];

export function getCoach(id: string): CoachProfile | undefined {
    return COACHES.find((c) => c.id === id);
}

export function buildMeetLink(bookingId: string): string {
    const room = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
    return `https://meet.jit.si/ProInterview-${room}`;
}
