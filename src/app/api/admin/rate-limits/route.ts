import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getVerifiedSession } from "@/utils/auth";
import RateLimitConfig from "@/models/RateLimitConfig";
import { invalidateTierConfigCache } from "@/utils/rateLimit";

const DEFAULT_TIER_CONFIGS = [
    { tier: "free", tierLabel: "Free Tier", mode: "customized", maxRequests: 15, windowMinutes: 15, isEnabled: true },
    { tier: "pro_monthly", tierLabel: "Pro Monthly", mode: "customized", maxRequests: 50, windowMinutes: 15, isEnabled: true },
    { tier: "pro_yearly", tierLabel: "Pro Yearly", mode: "customized", maxRequests: 100, windowMinutes: 15, isEnabled: true },
    { tier: "elite", tierLabel: "Elite Tier", mode: "customized", maxRequests: 250, windowMinutes: 15, isEnabled: true },
    { tier: "enterprise", tierLabel: "Enterprise Tier", mode: "unlimited", maxRequests: 1000, windowMinutes: 15, isEnabled: false },
];

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as an Administrator." }, { status: 403 });
        }

        await connectDB();
        let configs = await RateLimitConfig.find({}).sort({ maxRequests: 1 }).lean();

        // Seed defaults if empty
        if (!configs || configs.length === 0) {
            await RateLimitConfig.insertMany(DEFAULT_TIER_CONFIGS);
            configs = await RateLimitConfig.find({}).sort({ maxRequests: 1 }).lean();
        }

        return NextResponse.json({ configs });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load rate limit configurations" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as an Administrator." }, { status: 403 });
        }

        await connectDB();
        const { tier, maxRequests, windowMinutes, isEnabled, mode, tierLabel } = await req.json();

        if (!tier) {
            return NextResponse.json({ error: "Tier identifier is required" }, { status: 400 });
        }

        const numMax = Math.max(1, Number(maxRequests) || 15);
        const numWindow = Math.max(1, Number(windowMinutes) || 15);
        const activeMode = mode === "unlimited" ? "unlimited" : "customized";
        const activeEnabled = activeMode === "unlimited" ? false : Boolean(isEnabled ?? true);

        const updated = await RateLimitConfig.findOneAndUpdate(
            { tier },
            {
                tier,
                tierLabel: tierLabel || tier,
                mode: activeMode,
                maxRequests: numMax,
                windowMinutes: numWindow,
                isEnabled: activeEnabled,
                updatedBy: session.identifier,
            },
            { upsert: true, returnDocument: 'after' }
        );

        // Invalidate the in-memory cache so new limits take effect immediately
        invalidateTierConfigCache();

        return NextResponse.json({ success: true, config: updated });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update rate limit configuration" },
            { status: 500 }
        );
    }
}
