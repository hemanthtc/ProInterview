import { NextResponse } from "next/server";
import { productionEnvStatus } from "@/utils/runtimeEnv";
import connectDB from "@/utils/db";

export const dynamic = "force-dynamic";

export async function GET() {
    const env = productionEnvStatus();
    let mongo = false;
    if (env.mongoConfigured) {
        try {
            await Promise.race([
                connectDB(),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error("mongo timeout")), 4000);
                }),
            ]);
            mongo = true;
        } catch {
            mongo = false;
        }
    }
    const ok = env.jwtConfigured && (process.env.NODE_ENV !== "production" || mongo);
    return NextResponse.json(
        {
            ok,
            service: "prointerview",
            env: {
                jwt: env.jwtConfigured,
                gemini: env.geminiConfigured,
                mongoConfigured: env.mongoConfigured,
                mongoUp: mongo,
            },
        },
        { status: ok ? 200 : 503 }
    );
}
