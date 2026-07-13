import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import bcryptjs from "bcryptjs";
import { sendVerificationEmail } from "@/utils/mailer";

// Seed default organization accounts into their dedicated collections
async function seedDefaultOrgAccounts() {
    try {
        // --- Seed real admin account ---
        const adminId = "hemanthtchemu2003@gmail.com";
        const adminExists = await OrgAdmin.findOne({ identifier: adminId });
        if (!adminExists) {
            const adminHashed = await bcryptjs.hash("H#m@nth!8286", 10);
            await OrgAdmin.create({
                identifier: adminId,
                password: adminHashed,
                displayName: "Hemanth TC",
                organizationName: "ProInterview Corp",
                type: "email",
                isVerified: true,
                subscriptionPlan: "Enterprise Tier"
            });
        }

        // --- Seed default employee ---
        const employeeId = "emp123";
        const employeeExists = await OrgEmployee.findOne({ identifier: employeeId });
        if (!employeeExists) {
            const employeeHashed = await bcryptjs.hash("Password123", 10);
            await OrgEmployee.create({
                identifier: employeeId,
                password: employeeHashed,
                displayName: "Jane Doe",
                adminId: "hemanthtchemu2003@gmail.com",
                organizationName: "ProInterview Corp",
                department: "Engineering",
                type: "email",
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

        let account: any = null;
        let resolvedOrgRole: "user" | "admin" | "employee" = "user";

        if (loginMode === "user") {
            // ── Individual user login ──────────────────────────────────────────
            account = await User.findOne({ identifier });
            if (!account) {
                return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
            }
            resolvedOrgRole = "user";

        } else if (loginMode === "organization") {
            // ── Organization login ─────────────────────────────────────────────
            if (orgSubMode === "admin") {
                account = await OrgAdmin.findOne({ identifier });
                if (!account) {
                    return NextResponse.json(
                        { error: "Invalid credentials for organization Administration login." },
                        { status: 401 }
                    );
                }
                resolvedOrgRole = "admin";

            } else if (orgSubMode === "employee") {
                account = await OrgEmployee.findOne({ identifier });
                if (!account) {
                    return NextResponse.json(
                        { error: "Invalid credentials for organization Employee login." },
                        { status: 401 }
                    );
                }
                resolvedOrgRole = "employee";

            } else {
                return NextResponse.json({ error: "Invalid organization sub-mode." }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: "Invalid login mode." }, { status: 400 });
        }

        // ── Verify password ────────────────────────────────────────────────────
        const isPasswordCorrect = await bcryptjs.compare(password, account.password || "");
        if (!isPasswordCorrect) {
            return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
        }

        // ── Generate OTP ───────────────────────────────────────────────────────
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        account.otpCode = generatedOtp;
        account.otpExpires = otpExpires;
        await account.save();

        // ── Send OTP email ─────────────────────────────────────────────────────
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
            message: "Verification code sent.",
            accountType: resolvedOrgRole  // helps the frontend pass accountType to verify-otp
        };
        if (account.type !== "email") {
            responseData.otpCode = generatedOtp;
        }

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("Login API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
