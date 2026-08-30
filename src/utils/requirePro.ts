import connectDB from "@/utils/db";
import User from "@/models/User";
import { getPlanLimits } from "@/utils/usageMeter";
import type { SessionPayload } from "@/utils/auth";
import { isProPlan } from "@/utils/planFlags";

export { isProPlan };

export async function resolveSessionPlan(session: SessionPayload): Promise<string> {
    if (session.role === "admin" || session.isOrganization) return "Enterprise Tier";
    try {
        await connectDB();
        const user = await User.findOne({ identifier: session.identifier }).select("subscriptionPlan").lean();
        return (user as { subscriptionPlan?: string } | null)?.subscriptionPlan || "Free Tier";
    } catch {
        return "Free Tier";
    }
}

export async function assertProOrLimit(
    session: SessionPayload,
    used: number,
    freeCap: number
): Promise<{ ok: true; plan: string } | { ok: false; plan: string; error: string }> {
    const plan = await resolveSessionPlan(session);
    if (isProPlan(plan) || session.role === "admin") return { ok: true, plan };
    const limits = getPlanLimits(plan);
    if (used < freeCap) return { ok: true, plan };
    return {
        ok: false,
        plan,
        error: `Free plan limit reached (${freeCap}). Upgrade to Pro for unlimited faculty exams and premium labs. Gemini monthly cap: ${limits.gemini}.`,
    };
}
