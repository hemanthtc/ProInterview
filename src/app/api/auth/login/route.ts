import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import bcryptjs from "bcryptjs";
import { sendVerificationEmail } from "@/utils/mailer";
import { generateOtp, hashOtp, otpExpiry } from "@/utils/otp";
import { rateLimit } from "@/utils/rateLimit";
import type { AccountType, OtpSendResponse } from "@/types/auth";

// Seed default organization accounts into their dedicated collections
async function seedDefaultOrgAccounts() {
    try {
        const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
        const seedEmployeePassword = process.env.SEED_EMPLOYEE_PASSWORD;
        if (!seedAdminPassword || !seedEmployeePassword) {
            return;
        }

        const adminId = process.env.SEED_ADMIN_IDENTIFIER || "hemanthtchemu2003@gmail.com";
        const adminExists = await OrgAdmin.findOne({ identifier: adminId });
        if (!adminExists) {
            const adminHashed = await bcryptjs.hash(seedAdminPassword, 10);
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

        const employeeId = process.env.SEED_EMPLOYEE_IDENTIFIER || "emp123";
        const employeeExists = await OrgEmployee.findOne({ identifier: employeeId });
        if (!employeeExists) {
            const employeeHashed = await bcryptjs.hash(seedEmployeePassword, 10);
            await OrgEmployee.create({
                identifier: employeeId,
                password: employeeHashed,
                displayName: "Jane Doe",
                adminId,
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

        const { identifier, password, loginMode, orgSubMode } = await req.json() as {
            identifier?: string;
            password?: string;
            loginMode?: string;
            orgSubMode?: string;
        };

        if (!identifier || !password || !loginMode) {
            return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
        }

        const rl = rateLimit(`login:${identifier.toLowerCase()}`, { limit: 8, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many login attempts. Try again in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        let account: InstanceType<typeof User> | InstanceType<typeof OrgAdmin> | InstanceType<typeof OrgEmployee> | null = null;
        let resolvedOrgRole: AccountType = "user";

        const lookupFilter = { $or: [{ identifier }, { identifier: identifier.toLowerCase() }] };

        if (loginMode === "user") {
            if (!identifier.includes("@")) {
                return NextResponse.json({ error: "Only email logins are supported. Please log in using your email address." }, { status: 400 });
            }
            account = await User.findOne(lookupFilter);
            if (!account) {
                return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
            }
            resolvedOrgRole = "user";
        } else if (loginMode === "organization") {
            if (orgSubMode === "admin") {
                account = await OrgAdmin.findOne(lookupFilter);
                if (!account) {
                    return NextResponse.json(
                        { error: "Invalid credentials for organization Administration login." },
                        { status: 401 }
                    );
                }
                resolvedOrgRole = "admin";
            } else if (orgSubMode === "employee") {
                account = await OrgEmployee.findOne(lookupFilter);
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

        const isPasswordCorrect = await bcryptjs.compare(password, account.password || "");
        if (!isPasswordCorrect) {
            return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
        }

        const generatedOtp = generateOtp();
        const hashedOtp = await hashOtp(generatedOtp);
        account.otpCode = hashedOtp;
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
            message: "Verification code sent.",
            accountType: resolvedOrgRole
        };
        return NextResponse.json(responseData);
    } catch (error: unknown) {
        console.error("Login API error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json(
        { error: "Method Not Allowed. Please send a POST request with credentials to log in." },
        { status: 405 }
    );
}
