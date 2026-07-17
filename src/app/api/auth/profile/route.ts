import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import ProfileData from "@/models/ProfileData";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { getVerifiedSession } from "@/utils/auth";

/**
 * Returns the correct Mongoose model based on accountType.
 * Individual users → User (also has ProfileData)
 * Org admins → OrgAdmin (no separate ProfileData)
 * Org employees → OrgEmployee (no separate ProfileData)
 */
function getModel(accountType: string): mongoose.Model<any> {
    switch (accountType) {
        case "admin":    return OrgAdmin;
        case "employee": return OrgEmployee;
        default:         return User;
    }
}

// User session check helper to prevent IDOR / privilege bypass
async function verifyUserAccess(req: NextRequest, targetIdentifier: string) {
    const session = await getVerifiedSession();
    if (!session) return false;
    return targetIdentifier.trim().toLowerCase() === session.identifier.trim().toLowerCase();
}

// GET profile details
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const identifier = searchParams.get("identifier");
        const accountType = searchParams.get("accountType") || "user";

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        // Verify request belongs to authenticated user session
        const isAuthorized = await verifyUserAccess(req, identifier);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });
        if (!account) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        // If organization account, refresh their active online state
        if (accountType === "admin" || accountType === "employee") {
            account.isOnline = true;
            account.lastActive = new Date();
            await account.save();
        }

        // Only individual users have a separate ProfileData document
        const profile = accountType === "user"
            ? await ProfileData.findOne({ identifier })
            : null;

        return NextResponse.json({
            success: true,
            user: {
                identifier: account.identifier,
                displayName: account.displayName,
                type: account.type,
                isOrganization: accountType !== "user",
                orgRole: accountType === "admin" ? "admin" : accountType === "employee" ? "employee" : "user",
                subscriptionPlan: account.subscriptionPlan,
                createdAt: account.createdAt,
                // Org-specific fields
                organizationName: (account as any).organizationName || "",
                department: (account as any).department || "",
                adminId: (account as any).adminId || "",
                // Profile fields (individual users only)
                profilePhoto: profile?.profilePhoto || "",
                additionalEmail: profile?.additionalEmail || "",
                github: profile?.github || "",
                linkedin: profile?.linkedin || "",
                portfolioUrl: profile?.portfolioUrl || "",
                resumeCvName: profile?.resumeCvName || "",
                resumeCvText: profile?.resumeCvText || "",
                phone: profile?.phone || "",
                educationData: profile?.educationData || {},
            }
        });
    } catch (error: any) {
        console.error("GET Profile API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// POST update profile details
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const {
            identifier,
            accountType = "user",
            displayName,
            subscriptionPlan,
            organizationName,
            department,
            profilePhoto,
            additionalEmail,
            github,
            linkedin,
            portfolioUrl,
            resumeCvName,
            resumeCvText,
            phone,
            educationData
        } = body;

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        // Verify request belongs to authenticated user session
        const isAuthorized = await verifyUserAccess(req, identifier);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });
        if (!account) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        // Prevent normal users from altering their subscription plan via profile updates
        const session = await getVerifiedSession();
        if (subscriptionPlan !== undefined && subscriptionPlan !== account.subscriptionPlan) {
            if (!session || session.role !== "admin") {
                return NextResponse.json({ error: "Cannot manually alter subscription plan." }, { status: 403 });
            }
        }

        // Update base credential fields
        if (displayName !== undefined) account.displayName = displayName;
        if (subscriptionPlan !== undefined) account.subscriptionPlan = subscriptionPlan;
        // Org-only fields
        if (organizationName !== undefined && accountType !== "user") (account as any).organizationName = organizationName;
        if (department !== undefined && accountType === "employee") (account as any).department = department;
        await account.save();

        // Individual users: also update ProfileData
        let updatedProfile: any = null;
        if (accountType === "user") {
            const profileUpdateFields: any = {};
            if (profilePhoto !== undefined)      profileUpdateFields.profilePhoto = profilePhoto;
            if (additionalEmail !== undefined)   profileUpdateFields.additionalEmail = additionalEmail;
            if (github !== undefined)            profileUpdateFields.github = github;
            if (linkedin !== undefined)          profileUpdateFields.linkedin = linkedin;
            if (portfolioUrl !== undefined)      profileUpdateFields.portfolioUrl = portfolioUrl;
            if (resumeCvName !== undefined)      profileUpdateFields.resumeCvName = resumeCvName;
            if (resumeCvText !== undefined)      profileUpdateFields.resumeCvText = resumeCvText;
            if (phone !== undefined)             profileUpdateFields.phone = phone;
            if (educationData !== undefined)     profileUpdateFields.educationData = educationData;

            updatedProfile = await ProfileData.findOneAndUpdate(
                { identifier },
                { $set: profileUpdateFields },
                { upsert: true, new: true }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                identifier: account.identifier,
                displayName: account.displayName,
                type: account.type,
                isOrganization: accountType !== "user",
                orgRole: accountType === "admin" ? "admin" : accountType === "employee" ? "employee" : "user",
                subscriptionPlan: account.subscriptionPlan,
                createdAt: account.createdAt,
                organizationName: (account as any).organizationName || "",
                department: (account as any).department || "",
                adminId: (account as any).adminId || "",
                profilePhoto: updatedProfile?.profilePhoto || "",
                additionalEmail: updatedProfile?.additionalEmail || "",
                github: updatedProfile?.github || "",
                linkedin: updatedProfile?.linkedin || "",
                portfolioUrl: updatedProfile?.portfolioUrl || "",
                resumeCvName: updatedProfile?.resumeCvName || "",
                resumeCvText: updatedProfile?.resumeCvText || "",
                phone: updatedProfile?.phone || "",
                educationData: updatedProfile?.educationData || {},
            }
        });
    } catch (error: any) {
        console.error("POST Profile API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE profile/account
export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const identifier = searchParams.get("identifier");
        const accountType = searchParams.get("accountType") || "user";
        const mode = searchParams.get("mode") || "account";
        const password = searchParams.get("password");

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        // Verify request belongs to authenticated user session
        const isAuthorized = await verifyUserAccess(req, identifier);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });
        if (!account) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        // Check password if it is set in the database
        if (account.password) {
            if (!password) {
                return NextResponse.json({ error: "Password is required for confirmation." }, { status: 400 });
            }
            const isMatch = await bcryptjs.compare(password, account.password);
            if (!isMatch) {
                return NextResponse.json({ error: "Incorrect password. Verification failed." }, { status: 401 });
            }
        }

        if (mode === "data_only") {
            // Delete ProfileData only for individual users
            if (accountType === "user") {
                await ProfileData.findOneAndDelete({ identifier });
            }
            return NextResponse.json({
                success: true,
                message: "All generated profile and resume data wiped successfully from the database."
            });
        } else {
            // Delete entire account
            await Model.findOneAndDelete({ identifier });
            if (accountType === "user") {
                await ProfileData.findOneAndDelete({ identifier });
            }
            if (accountType === "admin") {
                await OrgEmployee.deleteMany({ adminId: identifier });
            }
            return NextResponse.json({
                success: true,
                message: "Account and profile data deleted successfully from the database."
            });
        }
    } catch (error: any) {
        console.error("DELETE Profile API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
