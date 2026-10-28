import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";
import { sendVerificationEmail } from "@/utils/mailer";
import { generateOtp, hashOtp, otpExpiry } from "@/utils/otp";
import { rateLimit } from "@/utils/rateLimit";
import type { OtpSendResponse } from "@/types/auth";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, password, displayName, type } = await req.json() as {
            identifier?: string;
            password?: string;
            displayName?: string;
            type?: "email" | "phone";
        };

        if (!identifier || !password || !displayName || !type) {
            return NextResponse.json({ error: "Please fill in all registration fields." }, { status: 400 });
        }

        if (type !== "email" || !identifier.includes("@")) {
            return NextResponse.json({ error: "Registration via phone number is no longer supported. Please register using an email address." }, { status: 400 });
        }

        const rl = rateLimit(`register:${identifier.toLowerCase()}`, { limit: 5, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many registration attempts. Try again in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const existingUser = await User.findOne({ identifier });
        if (existingUser && existingUser.isVerified) {
            return NextResponse.json(
                { error: `An account with this ${type === "email" ? "email" : "phone number"} already exists.` },
                { status: 400 }
            );
        }

        const generatedOtp = generateOtp();
        const hashedOtp = await hashOtp(generatedOtp);
        const otpExpires = otpExpiry();
        const hashedPassword = await bcryptjs.hash(password, 10);

        await User.findOneAndUpdate(
            { identifier },
            {
                password: hashedPassword,
                displayName,
                type,
                otpCode: hashedOtp,
                otpExpires,
                isVerified: false,
            },
            { upsert: true, returnDocument: 'after' }
        );

        let isSimulation = false;
        if (type === "email") {
            const sent = await sendVerificationEmail(identifier, generatedOtp, displayName);
            if (!sent) {
                console.warn(`[Register] Email verification to ${identifier} failed or SMTP is not configured. Falling back to inline passcode mode for deployment resilience.`);
                isSimulation = true;
            }
        }

        const responseData: OtpSendResponse = {
            success: true,
            message: isSimulation
                ? "SMTP service not configured or failed to deliver. Verification code generated."
                : "Verification code sent.",
            ...(isSimulation ? { otpCode: generatedOtp } : {})
        };
        return NextResponse.json(responseData);
    } catch (error: unknown) {
        console.error("Registration API error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json(
        { error: "Method Not Allowed. Please send a POST request with registration details." },
        { status: 405 }
    );
}
