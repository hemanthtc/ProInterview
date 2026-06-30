import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { sendVerificationEmail } from "@/utils/mailer";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier } = await req.json();

        if (!identifier) {
            return NextResponse.json({ error: "Please enter your email or phone number." }, { status: 400 });
        }

        // Find user by identifier
        const user = await User.findOne({ identifier });
        if (!user || !user.isVerified) {
            return NextResponse.json({ error: "No account found with this credential." }, { status: 404 });
        }

        if (user.isOrganization) {
            return NextResponse.json({ error: "Organization accounts must contact system administration to recover password." }, { status: 403 });
        }

        // Generate 6-digit OTP for recovery
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

        // Save OTP code to user document
        user.otpCode = generatedOtp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send email if user type is email
        if (user.type === "email") {
            const sent = await sendVerificationEmail(user.identifier, generatedOtp, user.displayName);
            if (!sent) {
                return NextResponse.json(
                    { error: "Failed to send verification email. Please check your GMAIL_USER and GMAIL_APP_PASSWORD configurations." },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Recovery code sent.",
            otpCode: generatedOtp
        });
    } catch (error: any) {
        console.error("Forgot password API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
