/**
 * Shared interview scoring used by the live interview end screen / scorecard path.
 * final = 35% portfolio baseline + 65% live interview performance
 */
export function computeFinalInterviewScore(portfolioRating: number, interviewScore: number): number {
    const portfolio = clampScore(portfolioRating);
    const interview = clampScore(interviewScore);
    return Math.round(portfolio * 0.35 + interview * 0.65);
}

export function clampScore(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
}
