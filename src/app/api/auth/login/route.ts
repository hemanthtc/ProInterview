import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";
import { sendVerificationEmail } from "@/utils/mailer";

// Helper to seed default organization accounts in the database if they don't exist
async function seedDefaultOrgAccounts() {
    try {
        const adminId = "admin123";
        const adminExists = await User.findOne({ identifier: adminId });
        if (!adminExists) {
            const adminHashed = await bcryptjs.hash("Password123", 10);
            await User.create({
                identifier: adminId,
                password: adminHashed,
                displayName: "System Admin",
                type: "email",
                isOrganization: true,
                orgRole: "admin",
                isVerified: true,
                subscriptionPlan: "Enterprise Tier"
            });
        }

        const employeeId = "emp123";
        const employeeExists = await User.findOne({ identifier: employeeId });
        if (!employeeExists) {
            const employeeHashed = await bcryptjs.hash("Password123", 10);
            await User.create({
                identifier: employeeId,
                password: employeeHashed,
                displayName: "Jane Doe",
                type: "email",
                isOrganization: true,
                orgRole: "employee",
                isVerified: true,
                subscriptionPlan: "Enterprise Tier"
            });
        }
    } catch (err) {
        console.error("Failed to seed default organization credentials:", err);
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        await seedDefaultOrgAccounts();

        const { identifier, password, loginMode, orgSubMode } = await req.json();

        if (!identifier || !password || !loginMode) {
            return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
        }

        // Find user by identifier
        const user = await User.findOne({ identifier });

        if (!user) {
            return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
        }

        // Validate mode
        if (loginMode === "user") {
            if (user.isOrganization) {
                return NextResponse.json({ error: "Invalid credentials for User Login." }, { status: 401 });
            }
        } else {
            // Organization login
            if (!user.isOrganization || user.orgRole !== orgSubMode) {
                return NextResponse.json(
                    { error: `Invalid credentials for organization ${orgSubMode === "admin" ? "Administration" : "Employee"} login.` },
                    { status: 401 }
                );
            }
        }

        // Verify password
        const isPasswordCorrect = await bcryptjs.compare(password, user.password || "");
        if (!isPasswordCorrect) {
            return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
        }

        // Generate 6-digit OTP for verification
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
            message: "Verification code sent.",
            otpCode: generatedOtp
        });
    } catch (error: any) {
        console.error("Login API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
