export function normalizeCode(code: string): string {
    return String(code || "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/#.*$/gm, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function trigrams(text: string): Set<string> {
    const grams = new Set<string>();
    const padded = `  ${text}  `;
    for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
    return grams;
}

/** Dice coefficient on character trigrams. 1 = identical. */
export function codeSimilarity(a: string, b: string): number {
    const left = trigrams(normalizeCode(a));
    const right = trigrams(normalizeCode(b));
    if (!left.size || !right.size) return 0;
    let inter = 0;
    for (const g of left) {
        if (right.has(g)) inter++;
    }
    return (2 * inter) / (left.size + right.size);
}

export function plagiarismHits(
    candidateCode: string,
    others: { identifier: string; code: string }[],
    threshold = 0.82
): { identifier: string; score: number }[] {
    return others
        .map((o) => ({ identifier: o.identifier, score: codeSimilarity(candidateCode, o.code) }))
        .filter((h) => h.score >= threshold)
        .sort((a, b) => b.score - a.score);
}
