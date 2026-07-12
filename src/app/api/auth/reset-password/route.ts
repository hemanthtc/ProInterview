import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

function getModel(accountType: string): mongoose.Model<any> {
    switch (accountType) {
        case "admin":    return OrgAdmin;
        case "employee": return OrgEmployee;
        default:         return User;
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, otp, newPassword, accountType = "user" } = await req.json();

        if (!identifier || !otp || !newPassword) {
            return NextResponse.json({ error: "Missing required password reset fields." }, { status: 400 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });

        if (!account) {
            return NextResponse.json({ error: "No account found for this credential." }, { status: 404 });
        }

        // Validate OTP and expiration
        if (!account.otpCode || account.otpCode !== otp) {
            return NextResponse.json({ error: "Invalid verification code for password reset." }, { status: 400 });
        }

        if (!account.otpExpires || new Date() > account.otpExpires) {
            return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
        }

        // Hash and save new password
        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        account.password = hashedPassword;
        account.otpCode = undefined;
        account.otpExpires = undefined;
        account.isVerified = true;
        await account.save();

        return NextResponse.json({
            success: true,
            message: "Password reset successful. You can now log in with your new password."
        });

    } catch (error: any) {
        console.error("Reset password API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
