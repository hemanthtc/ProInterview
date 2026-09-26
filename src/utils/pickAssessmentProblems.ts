import { assessmentPool, type CodingProblem, type ProblemSource } from "@/data/codingProblems";

const SOURCES: ProblemSource[] = ["leetcode", "hackerrank", "codeforces", "codechef"];

function shuffle<T>(items: T[], rng: () => number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Mulberry32 — deterministic when a seed is provided (tests / reproducible sets). */
export function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function pickAssessmentProblems(
    count = 3,
    rng: () => number = Math.random,
    pool: CodingProblem[] = assessmentPool()
): CodingProblem[] {
    const size = Math.max(1, Math.min(count, pool.length));
    const picked: CodingProblem[] = [];
    const used = new Set<string>();

    const bySource = new Map<ProblemSource, CodingProblem[]>();
    for (const source of SOURCES) {
        bySource.set(
            source,
            shuffle(
                pool.filter((p) => p.source === source),
                rng
            )
        );
    }

    const sourceOrder = shuffle([...SOURCES], rng);
    for (const source of sourceOrder) {
        if (picked.length >= size) break;
        const next = (bySource.get(source) || []).find((p) => !used.has(p.id));
        if (!next) continue;
        picked.push(next);
        used.add(next.id);
    }

    const rest = shuffle(
        pool.filter((p) => !used.has(p.id)),
        rng
    );
    for (const p of rest) {
        if (picked.length >= size) break;
        picked.push(p);
        used.add(p.id);
    }

    return picked;
}
