import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import { setSessionCookie } from "@/utils/auth";

/**
 * Finds an account document across the correct collection based on accountType.
 * accountType: "user" → User collection
 * accountType: "admin" → OrgAdmin collection
 * accountType: "employee" → OrgEmployee collection
 */
async function findAccountByType(identifier: string, accountType: string) {
    switch (accountType) {
        case "admin":
            return { account: await OrgAdmin.findOne({ identifier }), isOrganization: true, orgRole: "admin" };
        case "employee":
            return { account: await OrgEmployee.findOne({ identifier }), isOrganization: true, orgRole: "employee" };
        default:
            return { account: await User.findOne({ identifier }), isOrganization: false, orgRole: "user" };
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, otp, flowType, accountType = "user" } = await req.json();

        if (!identifier || !otp || !flowType) {
            return NextResponse.json({ error: "Missing required verification fields." }, { status: 400 });
        }

        const { account, isOrganization, orgRole } = await findAccountByType(identifier, accountType);

        if (!account) {
            return NextResponse.json({ error: "No account found for this credential." }, { status: 404 });
        }

        // Validate OTP and expiration
        if (!account.otpCode || account.otpCode !== otp) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        if (!account.otpExpires || new Date() > account.otpExpires) {
            return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
        }

        // If login or register flow, verify and clear OTP
        if (flowType === "register" || flowType === "login") {
            // Mark online status if this is an organization account
            if (accountType === "admin" || accountType === "employee") {
                (account as any).isOnline = true;
                (account as any).lastActive = new Date();
            }
            await account.save();

            // Set secure HttpOnly session cookie
            await setSessionCookie({
                identifier: account.identifier,
                role: accountType as any,
                isOrganization
            });

            return NextResponse.json({
                success: true,
                message: "Authentication successful.",
                user: {
                    displayName: account.displayName,
                    identifier: account.identifier,
                    isOrganization,
                    orgRole,
                    subscriptionPlan: account.subscriptionPlan,
                    createdAt: account.createdAt,
                    // Include org-specific fields where available
                    organizationName: (account as any).organizationName || "",
                    department: (account as any).department || "",
                    adminId: (account as any).adminId || "",
                }
            });
        }

        // For forgot-password flow: accept OTP but do not clear it yet
        // (reset-password route will clear it after the password update)
        return NextResponse.json({
            success: true,
            message: "Verification code accepted."
        });

    } catch (error: any) {
        console.error("Verify OTP API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
