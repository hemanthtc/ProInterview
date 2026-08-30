export function isProPlan(plan?: string): boolean {
    return /pro|elite|enterprise/i.test(plan || "");
}
