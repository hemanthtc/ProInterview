import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, otp, newPassword } = await req.json();

        if (!identifier || !otp || !newPassword) {
            return NextResponse.json({ error: "Missing required password reset fields." }, { status: 400 });
        }

        // Find user by identifier
        const user = await User.findOne({ identifier });
        if (!user) {
            return NextResponse.json({ error: "No account found for this credential." }, { status: 404 });
        }

        // Validate OTP and expiration
        if (!user.otpCode || user.otpCode !== otp) {
            return NextResponse.json({ error: "Invalid verification code for password reset." }, { status: 400 });
        }

        if (!user.otpExpires || new Date() > user.otpExpires) {
            return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
        }

        // Hash the new password
        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        // Update password and clear OTP fields
        user.password = hashedPassword;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        user.isVerified = true; // Ensure user is marked verified
        await user.save();

        return NextResponse.json({
            success: true,
            message: "Password reset successful. You can now log in with your new password."
        });

    } catch (error: any) {
        console.error("Reset password API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
