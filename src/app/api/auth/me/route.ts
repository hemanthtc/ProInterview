import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import { getVerifiedSession, createToken } from "@/utils/auth";
import type { AccountType } from "@/types/auth";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ authenticated: false, error: "No active session found" }, { status: 401 });
        }

        await connectDB();
        const { account, isOrganization, orgRole } = await findAccountByType(session.identifier, session.role);

        if (!account) {
            return NextResponse.json({ authenticated: false, error: "Account not found" }, { status: 404 });
        }

        const token = createToken({
            identifier: account.identifier,
            role: (orgRole || "user") as AccountType,
            isOrganization
        });

        return NextResponse.json({
            authenticated: true,
            success: true,
            token,
            user: {
                displayName: account.displayName || "",
                identifier: account.identifier,
                isOrganization,
                orgRole,
                subscriptionPlan: account.subscriptionPlan || "Free Tier",
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
    } catch (error: unknown) {
        console.error("Auth /api/auth/me error:", error);
        return NextResponse.json({ authenticated: false, error: "Failed to verify session" }, { status: 500 });
    }
}
