import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import mongoose from "mongoose";
import { sendVerificationEmail } from "@/utils/mailer";
import { generateOtp, hashOtp, otpExpiry } from "@/utils/otp";
import { rateLimit } from "@/utils/rateLimit";
import type { AccountType, OtpSendResponse } from "@/types/auth";

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
        const { identifier, accountType = "user" } = await req.json() as {
            identifier?: string;
            accountType?: AccountType;
        };

        if (!identifier) {
            return NextResponse.json({ error: "Please enter your email or phone number." }, { status: 400 });
        }

        const rl = rateLimit(`forgot:${identifier.toLowerCase()}`, { limit: 5, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many recovery attempts. Try again in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier }) as {
            isVerified?: boolean;
            type?: string;
            identifier: string;
            displayName: string;
            otpCode?: string;
            otpExpires?: Date;
            save: () => Promise<unknown>;
        } | null;

        if (!account || !account.isVerified) {
            return NextResponse.json({ error: "No verified account found with this credential." }, { status: 404 });
        }

        const generatedOtp = generateOtp();
        account.otpCode = await hashOtp(generatedOtp);
        account.otpExpires = otpExpiry();
        await account.save();

        if (account.type === "email") {
            const sent = await sendVerificationEmail(account.identifier, generatedOtp, account.displayName);
            if (!sent) {
                return NextResponse.json(
                    { error: "Failed to send verification email. Please check your GMAIL_USER and GMAIL_APP_PASSWORD configurations." },
                    { status: 500 }
                );
            }
        }

        const responseData: OtpSendResponse = {
            success: true,
            message: "Recovery code sent.",
        };
        if (accountType !== "admin" && accountType !== "employee" && account.type !== "email") {
            responseData.otpCode = generatedOtp;
        }

        return NextResponse.json(responseData);
    } catch (error: unknown) {
        console.error("Forgot password API error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
