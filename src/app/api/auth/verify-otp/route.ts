import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, otp, flowType } = await req.json();

        if (!identifier || !otp || !flowType) {
            return NextResponse.json({ error: "Missing required verification fields." }, { status: 400 });
        }

        // Find user by identifier
        const user = await User.findOne({ identifier });
        if (!user) {
            return NextResponse.json({ error: "No account found for this credential." }, { status: 404 });
        }

        // Validate OTP and expiration
        if (!user.otpCode || user.otpCode !== otp) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        if (!user.otpExpires || new Date() > user.otpExpires) {
            return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
        }

        // If login or register flow, verify the user account and clear OTP
        if (flowType === "register" || flowType === "login") {
            user.isVerified = true;
            user.otpCode = undefined;
            user.otpExpires = undefined;
            await user.save();

            return NextResponse.json({
                success: true,
                message: "Authentication successful.",
                user: {
                    displayName: user.displayName,
                    identifier: user.identifier,
                    isOrganization: user.isOrganization,
                    orgRole: user.orgRole,
                    subscriptionPlan: user.subscriptionPlan,
                    createdAt: user.createdAt
                }
            });
        }

        // For forgot password flow, we do not clear the OTP code just yet,
        // it will be validated and cleared in the reset-password endpoint.
        return NextResponse.json({
            success: true,
            message: "Verification code accepted."
        });

    } catch (error: any) {
        console.error("Verify OTP API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
