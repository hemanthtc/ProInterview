import { NextResponse } from "next/server";

interface CfProblem {
    contestId: number;
    index: string;
    name: string;
    rating?: number;
    tags?: string[];
}

export async function GET() {
    try {
        const res = await fetch("https://codeforces.com/api/problemset.problems", { next: { revalidate: 3600 } });
        if (!res.ok) {
            return NextResponse.json({ error: "Codeforces is unreachable." }, { status: 502 });
        }
        const data = (await res.json()) as { result?: { problems?: CfProblem[] } };
        const pool = (data.result?.problems || []).filter((p) => (p.rating || 0) >= 800 && (p.rating || 0) <= 1400);
        const pick = pool[Math.floor(Math.random() * Math.max(1, pool.length))];
        if (!pick) return NextResponse.json({ error: "No problems returned." }, { status: 502 });
        const url = `https://codeforces.com/problemset/problem/${pick.contestId}/${pick.index}`;
        return NextResponse.json({
            title: pick.name,
            rating: pick.rating,
            tags: pick.tags || [],
            url,
            prompt: `${pick.name} (${pick.contestId}${pick.index}, rating ${pick.rating || "?"}). Solve on Codeforces, then practice a similar stdin/stdout problem in this assessment.`,
        });
    } catch {
        return NextResponse.json({ error: "Codeforces fetch failed." }, { status: 502 });
    }
}
