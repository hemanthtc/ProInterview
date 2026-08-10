import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";
import {
    ensurePrepProgress,
    ensurePrepProgressShape,
    getPlanLimits,
} from "@/utils/usageMeter";
import type { PrepProgressBlob } from "@/models/CloudSession";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const [user, blob] = await Promise.all([
            User.findOne({ identifier: session.identifier }).select("subscriptionPlan").lean(),
            ensurePrepProgress(session.identifier),
        ]);

        const plan =
            (user as { subscriptionPlan?: string } | null)?.subscriptionPlan || "Free Tier";
        const limits = getPlanLimits(plan);
        const prep = ensurePrepProgressShape(blob.prepProgress as PrepProgressBlob | undefined);

        return NextResponse.json({
            plan,
            limits,
            usage: prep.usage,
            referralCredits: prep.referralCredits ?? 0,
        });
    } catch (error: unknown) {
        console.error("usage GET error:", error);
        const message = error instanceof Error ? error.message : "Failed to load usage";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
