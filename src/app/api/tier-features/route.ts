import { NextResponse } from "next/server";
import connectDB from "@/utils/db";
import TierFeatureConfig from "@/models/TierFeatureConfig";

export async function GET() {
    try {
        await connectDB();
        const configs = await TierFeatureConfig.find({}).lean();
        
        const map: Record<string, string[]> = {};
        for (const config of configs) {
            map[config.tier] = config.features || [];
        }
        
        return NextResponse.json({ features: map });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load public tier feature mappings" },
            { status: 500 }
        );
    }
}
export const dynamic = 'force-dynamic';
