import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import bcryptjs from "bcryptjs";
import { getVerifiedSession } from "@/utils/auth";
import { sendVerificationEmail } from "@/utils/mailer";

// POST — Create a new administrator account (Restricted to hemanthtchemu2003@gmail.com admin sessions)
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        
        // Secure access control validation
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin" || session.identifier.trim().toLowerCase() !== "hemanthtchemu2003@gmail.com") {
            return NextResponse.json({ error: "Unauthorized access: Admin creation is restricted." }, { status: 403 });
        }

        const { identifier, password, displayName, organizationName } = await req.json();

        if (!identifier || !password || !displayName) {
            return NextResponse.json({ error: "Missing required admin creation fields." }, { status: 400 });
        }

        // Validate the new admin identifier is unique
        const existingAdmin = await OrgAdmin.findOne({ identifier: identifier.trim().toLowerCase() });
        if (existingAdmin) {
            return NextResponse.json({ error: "An administrator with this Email / ID already exists." }, { status: 400 });
        }

        // Generate 6-digit activation OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Create new Admin record (unverified, requires OTP validation)
        const newAdmin = await OrgAdmin.create({
            identifier: identifier.trim().toLowerCase(),
            password: hashedPassword,
            displayName: displayName.trim(),
            organizationName: (organizationName || "ProInterview Corp").trim(),
            type: "email",
            isVerified: false,
            subscriptionPlan: "Enterprise Tier",
            otpCode: generatedOtp,
            otpExpires: otpExpires
        });

        // Email activation OTP to new administrator
        const sent = await sendVerificationEmail(identifier.trim().toLowerCase(), generatedOtp, displayName.trim());
        if (!sent) {
            return NextResponse.json({ error: "Failed to send activation email. Please check mailer settings." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `New administrator "${newAdmin.displayName}" created successfully. Verification email sent.`
        });
    } catch (error: any) {
        console.error("Create admin error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
