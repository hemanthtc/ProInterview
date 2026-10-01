import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import { setSessionCookie, createToken, shouldSetSecureCookie } from "@/utils/auth";
import { verifyOtp } from "@/utils/otp";
import { rateLimit } from "@/utils/rateLimit";
import type { AccountType, AuthFlowType } from "@/types/auth";

/**
 * Finds an account document across the correct collection based on accountType.
 */
async function findAccountByType(rawIdentifier: string, accountType: string) {
    const id = rawIdentifier.trim();
    const filter = { $or: [{ identifier: id }, { identifier: id.toLowerCase() }] };
    switch (accountType) {
        case "admin":
            return { account: await OrgAdmin.findOne(filter), isOrganization: true, orgRole: "admin" as AccountType };
        case "employee":
            return { account: await OrgEmployee.findOne(filter), isOrganization: true, orgRole: "employee" as AccountType };
        default:
            return { account: await User.findOne(filter), isOrganization: false, orgRole: "user" as AccountType };
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, otp, flowType, accountType = "user", isPwa } = await req.json() as {
            identifier?: string;
            otp?: string;
            flowType?: AuthFlowType;
            accountType?: AccountType;
            isPwa?: boolean;
        };

        if (!identifier || !otp || !flowType) {
            return NextResponse.json({ error: "Missing required verification fields." }, { status: 400 });
        }

        const rl = rateLimit(`verify-otp:${identifier.toLowerCase()}`, { limit: 10, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many verification attempts. Try again in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const { account, isOrganization, orgRole } = await findAccountByType(identifier, accountType);

        if (!account) {
            return NextResponse.json({ error: "No account found for this credential." }, { status: 404 });
        }

        // Check expiry FIRST — avoids confusing UX where correct-but-expired OTP
        // passes the hash check before failing on the expiry gate
        if (!account.otpExpires || new Date() > account.otpExpires) {
            return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
        }

        const otpValid = await verifyOtp(otp, account.otpCode);
        if (!otpValid) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        // If login or register flow, verify and clear OTP
        if (flowType === "register" || flowType === "login") {
            account.isVerified = true;
            account.otpCode = undefined;
            account.otpExpires = undefined;
            if (accountType === "admin" || accountType === "employee") {
                (account as { isOnline?: boolean; lastActive?: Date }).isOnline = true;
                (account as { isOnline?: boolean; lastActive?: Date }).lastActive = new Date();
            } else if (accountType === "user") {
                const { checkAndDegradeSubscription } = await import("@/utils/subscription");
                await checkAndDegradeSubscription(account as any);
            }
            await account.save();

            try {
                await setSessionCookie({
                    identifier: account.identifier,
                    role: accountType as AccountType,
                    isOrganization
                }, isPwa, req);
            } catch (cookieErr) {
                console.error("Failed to set session cookie:", cookieErr);
                return NextResponse.json(
                    { error: "Authentication succeeded but session could not be created. Please try again." },
                    { status: 500 }
                );
            }

            const token = createToken({
                identifier: account.identifier,
                role: accountType as AccountType,
                isOrganization
            }, isPwa);

            const durationSec = isPwa ? 365 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
            const isSecure = shouldSetSecureCookie(req);

            const response = NextResponse.json({
                success: true,
                message: "Authentication successful.",
                token,
                user: {
                    displayName: account.displayName,
                    identifier: account.identifier,
                    isOrganization,
                    orgRole,
                    subscriptionPlan: account.subscriptionPlan,
                    billingCycle: (account as any).billingCycle || null,
                    subscriptionStartedAt: (account as any).subscriptionStartedAt || null,
                    subscriptionExpiresAt: (account as any).subscriptionExpiresAt || null,
                    createdAt: account.createdAt,
                    organizationName: (account as { organizationName?: string }).organizationName || "",
                    department: (account as { department?: string }).department || "",
                    adminId: (account as { adminId?: string }).adminId || "",
                    profilePhoto: (account as any).profilePhoto || "",
                    additionalEmail: (account as any).additionalEmail || "",
                    github: (account as any).github || "",
                    linkedin: (account as any).linkedin || "",
                    portfolioUrl: (account as any).portfolioUrl || "",
                    resumeCvName: (account as any).resumeCvName || "",
                    resumeCvText: (account as any).resumeCvText || "",
                    phone: (account as any).phone || "",
                    educationData: (account as any).educationData || null,
                }
            });

            // Explicitly set both HttpOnly session cookie and client-readable userLoggedIn cookie
            response.cookies.set("session", token, {
                httpOnly: true,
                secure: isSecure,
                sameSite: "lax",
                path: "/",
                maxAge: durationSec
            });

            response.cookies.set("userLoggedIn", "true", {
                path: "/",
                maxAge: durationSec,
                sameSite: "lax",
                secure: isSecure
            });

            return response;
        }

        // For forgot-password flow: accept OTP but do not clear it yet
        return NextResponse.json({
            success: true,
            message: "Verification code accepted."
        });

    } catch (error: unknown) {
        console.error("Verify OTP API error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
