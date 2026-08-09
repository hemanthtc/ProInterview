import { NextRequest, NextResponse } from "next/server";

export interface JobListing {
    id: string;
    company: string;
    role: string;
    location: string;
    type: "full-time" | "intern" | "contract";
    remote: boolean;
    tags: string[];
    salaryRange?: string;
    description: string;
    applyUrl?: string;
    postedAt: string;
}

const JOBS: JobListing[] = [
    {
        id: "job_stripe_be",
        company: "Stripe",
        role: "Backend Engineer",
        location: "Remote / SF",
        type: "full-time",
        remote: true,
        tags: ["API", "Payments", "Ruby/Go"],
        salaryRange: "$170k–$240k",
        description: "Build reliable payment infrastructure used by millions of businesses.",
        applyUrl: "https://stripe.com/jobs",
        postedAt: "2026-07-20",
    },
    {
        id: "job_meta_fe",
        company: "Meta",
        role: "Frontend Engineer",
        location: "Menlo Park, CA",
        type: "full-time",
        remote: false,
        tags: ["React", "Performance", "Product"],
        salaryRange: "$160k–$230k",
        description: "Ship product surfaces used by billions with a focus on performance and accessibility.",
        applyUrl: "https://www.metacareers.com/",
        postedAt: "2026-07-18",
    },
    {
        id: "job_google_ml",
        company: "Google",
        role: "ML Engineer",
        location: "Bangalore / Hybrid",
        type: "full-time",
        remote: false,
        tags: ["ML", "Python", "Serving"],
        salaryRange: "₹35L–₹65L",
        description: "Productionize ranking and recommendation models with strong evaluation discipline.",
        applyUrl: "https://careers.google.com/",
        postedAt: "2026-07-22",
    },
    {
        id: "job_amazon_sde_intern",
        company: "Amazon",
        role: "SDE Intern",
        location: "Hyderabad",
        type: "intern",
        remote: false,
        tags: ["Java", "DSA", "Leadership Principles"],
        salaryRange: "Stipend competitive",
        description: "Work on large-scale distributed systems with mentorship from senior engineers.",
        applyUrl: "https://www.amazon.jobs/",
        postedAt: "2026-07-15",
    },
    {
        id: "job_notion_full",
        company: "Notion",
        role: "Full-Stack Engineer",
        location: "Remote",
        type: "full-time",
        remote: true,
        tags: ["TypeScript", "Postgres", "Product"],
        salaryRange: "$150k–$220k",
        description: "Own features end-to-end across collaborative editor infrastructure.",
        applyUrl: "https://www.notion.so/careers",
        postedAt: "2026-07-25",
    },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();
    const tag = (searchParams.get("tag") || "").toLowerCase();
    let list = JOBS;
    if (q) {
        list = list.filter(
            (j) =>
                j.company.toLowerCase().includes(q) ||
                j.role.toLowerCase().includes(q) ||
                j.location.toLowerCase().includes(q)
        );
    }
    if (tag) {
        list = list.filter((j) => j.tags.some((t) => t.toLowerCase().includes(tag)));
    }
    return NextResponse.json({ jobs: list });
}
