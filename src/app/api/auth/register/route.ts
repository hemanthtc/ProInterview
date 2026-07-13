import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";
import { sendVerificationEmail } from "@/utils/mailer";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, password, displayName, type } = await req.json();

        if (!identifier || !password || !displayName || !type) {
            return NextResponse.json({ error: "Please fill in all registration fields." }, { status: 400 });
        }

        // Check if user already exists and is verified
        const existingUser = await User.findOne({ identifier });
        if (existingUser && existingUser.isVerified) {
            return NextResponse.json(
                { error: `An account with this ${type === "email" ? "email" : "phone number"} already exists.` },
                { status: 400 }
            );
        }

        // Generate 6-digit OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Upsert user (updates existing pending account or creates a new one)
        await User.findOneAndUpdate(
            { identifier },
            {
                password: hashedPassword,
                displayName,
                type,
                otpCode: generatedOtp,
                otpExpires,
                isVerified: false,
            },
            { upsert: true, new: true }
        );

        // Send email if type is email
        if (type === "email") {
            const sent = await sendVerificationEmail(identifier, generatedOtp, displayName);
            if (!sent) {
                return NextResponse.json(
                    { error: "Failed to send verification email. Please check your GMAIL_USER and GMAIL_APP_PASSWORD configurations." },
                    { status: 500 }
                );
            }
        }

        const responseData: any = {
            success: true,
            message: "Verification code sent.",
        };
        if (type !== "email") {
            responseData.otpCode = generatedOtp;
        }

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("Registration API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
