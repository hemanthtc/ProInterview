import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import bcryptjs from "bcryptjs";
import { getVerifiedSession } from "@/utils/auth";
import { sendVerificationEmail } from "@/utils/mailer";
import { ADMIN_OTP_TTL_MS, generateOtp, hashOtp, otpExpiry } from "@/utils/otp";

// POST — Create a new administrator account (Restricted to seed admin sessions)
export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const session = await getVerifiedSession(req);
        const privilegedAdmin = (process.env.SEED_ADMIN_IDENTIFIER || "hemanthtchemu2003@gmail.com").trim().toLowerCase();
        if (!session || session.role !== "admin" || session.identifier.trim().toLowerCase() !== privilegedAdmin) {
            return NextResponse.json({ error: "Unauthorized access: Admin creation is restricted." }, { status: 403 });
        }

        const { identifier, password, displayName, organizationName } = await req.json() as {
            identifier?: string;
            password?: string;
            displayName?: string;
            organizationName?: string;
        };

        if (!identifier || !password || !displayName) {
            return NextResponse.json({ error: "Missing required admin creation fields." }, { status: 400 });
        }

        const existingAdmin = await OrgAdmin.findOne({ identifier: identifier.trim().toLowerCase() });
        if (existingAdmin) {
            return NextResponse.json({ error: "An administrator with this Email / ID already exists." }, { status: 400 });
        }

        const generatedOtp = generateOtp();
        const hashedOtp = await hashOtp(generatedOtp);
        const hashedPassword = await bcryptjs.hash(password, 10);

        const newAdmin = await OrgAdmin.create({
            identifier: identifier.trim().toLowerCase(),
            password: hashedPassword,
            displayName: displayName.trim(),
            organizationName: (organizationName || "ProInterview Corp").trim(),
            type: "email",
            isVerified: false,
            subscriptionPlan: "Enterprise Tier",
            otpCode: hashedOtp,
            otpExpires: otpExpiry(ADMIN_OTP_TTL_MS)
        });

        const sent = await sendVerificationEmail(identifier.trim().toLowerCase(), generatedOtp, displayName.trim());
        if (!sent) {
            return NextResponse.json({ error: "Failed to send activation email. Please check mailer settings." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `New administrator "${newAdmin.displayName}" created successfully. Verification email sent.`
        });
    } catch (error: unknown) {
        console.error("Create admin error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
