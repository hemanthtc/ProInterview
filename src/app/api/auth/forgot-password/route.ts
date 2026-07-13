import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import mongoose from "mongoose";
import { sendVerificationEmail } from "@/utils/mailer";

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
        const { identifier, accountType = "user" } = await req.json();

        if (!identifier) {
            return NextResponse.json({ error: "Please enter your email or phone number." }, { status: 400 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });

        if (!account || !account.isVerified) {
            return NextResponse.json({ error: "No verified account found with this credential." }, { status: 404 });
        }

        // Generate 6-digit OTP for recovery
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        account.otpCode = generatedOtp;
        account.otpExpires = otpExpires;
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

        const responseData: any = {
            success: true,
            message: "Recovery code sent.",
        };
        if (account.type !== "email") {
            responseData.otpCode = generatedOtp;
        }

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("Forgot password API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
