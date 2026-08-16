import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getVerifiedSession } from "@/utils/auth";
import TierFeatureConfig from "@/models/TierFeatureConfig";

const DEFAULT_TIER_FEATURES = [
    {
        tier: "free",
        features: [
            "synthetic_data",
            "study_materials",
            "coding_lab",
            "system_design",
            "star_coach",
            "coaches",
            "aptitude",
            "roadmap",
            "company_research",
            "domains",
            "community"
        ]
    },
    {
        tier: "pro",
        features: [
            "resume_ai",
            "ats_match",
            "synthetic_data_pro",
            "study_materials",
            "prointerviewer",
            "coding_lab",
            "system_design",
            "star_coach",
            "coaches",
            "negotiate",
            "aptitude",
            "roadmap",
            "company_research",
            "email_portfolio",
            "domains",
            "community"
        ]
    },
    {
        tier: "elite",
        features: [
            "resume_ai",
            "ats_match",
            "synthetic_data_pro",
            "study_materials",
            "study_materials_interview",
            "prointerviewer",
            "did_avatar",
            "coding_lab",
            "system_design",
            "star_coach",
            "coaches",
            "negotiate",
            "aptitude",
            "roadmap",
            "company_research",
            "email_portfolio",
            "domains",
            "community"
        ]
    }
];

export async function GET() {
    try {
        await connectDB();
        let configs = await TierFeatureConfig.find({}).lean();

        // Seed defaults if empty
        if (!configs || configs.length === 0) {
            await TierFeatureConfig.insertMany(DEFAULT_TIER_FEATURES);
            configs = await TierFeatureConfig.find({}).lean();
        }

        return NextResponse.json({ configs });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load tier feature configurations" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as an Administrator." }, { status: 401 });
        }

        await connectDB();
        const { configs } = await req.json();

        if (!configs || !Array.isArray(configs)) {
            return NextResponse.json({ error: "Invalid payload format. Expected configs array." }, { status: 400 });
        }

        for (const config of configs) {
            const { tier, features } = config;
            if (!tier || !Array.isArray(features)) continue;
            await TierFeatureConfig.findOneAndUpdate(
                { tier },
                {
                    tier,
                    features,
                    updatedBy: session.identifier
                },
                { upsert: true, new: true }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update tier feature configurations" },
            { status: 500 }
        );
    }
}
