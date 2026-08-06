import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { verifyOtp } from "@/utils/otp";
import { rateLimit } from "@/utils/rateLimit";
import type { AccountType } from "@/types/auth";

function getModel(accountType: string): mongoose.Model<mongoose.Document> {
    switch (accountType) {
        case "admin":    return OrgAdmin as unknown as mongoose.Model<mongoose.Document>;
        case "employee": return OrgEmployee as unknown as mongoose.Model<mongoose.Document>;
        default:         return User as unknown as mongoose.Model<mongoose.Document>;
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, otp, newPassword, accountType = "user" } = await req.json() as {
            identifier?: string;
            otp?: string;
            newPassword?: string;
            accountType?: AccountType;
        };

        if (!identifier || !otp || !newPassword) {
            return NextResponse.json({ error: "Missing required password reset fields." }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        }

        const rl = rateLimit(`reset:${identifier.toLowerCase()}`, { limit: 8, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many reset attempts. Try again in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier }) as {
            otpCode?: string;
            otpExpires?: Date;
            password?: string;
            isVerified?: boolean;
            save: () => Promise<unknown>;
        } | null;

        if (!account) {
            return NextResponse.json({ error: "No account found for this credential." }, { status: 404 });
        }

        const otpValid = await verifyOtp(otp, account.otpCode);
        if (!otpValid) {
            return NextResponse.json({ error: "Invalid verification code for password reset." }, { status: 400 });
        }

        if (!account.otpExpires || new Date() > account.otpExpires) {
            return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
        }

        account.password = await bcryptjs.hash(newPassword, 10);
        account.otpCode = undefined;
        account.otpExpires = undefined;
        account.isVerified = true;
        await account.save();

        return NextResponse.json({
            success: true,
            message: "Password reset successful. You can now log in with your new password."
        });

    } catch (error: unknown) {
        console.error("Reset password API error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
