import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import ProfileData from "@/models/ProfileData";

// GET profile details
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const identifier = searchParams.get("identifier");

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        // 1. Fetch User credentials
        const user = await User.findOne({ identifier });
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // 2. Fetch User profile details (or default to empty if not created yet)
        const profile = await ProfileData.findOne({ identifier });

        // Combined response payload matching existing frontend contract
        return NextResponse.json({
            success: true,
            user: {
                identifier: user.identifier,
                displayName: user.displayName,
                type: user.type,
                isOrganization: user.isOrganization,
                orgRole: user.orgRole,
                subscriptionPlan: user.subscriptionPlan,
                createdAt: user.createdAt,
                // Profile details retrieved from the ProfileData collection
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
            displayName,
            subscriptionPlan,
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

        // 1. Find and update User credentials/status if provided
        const user = await User.findOne({ identifier });
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        if (displayName !== undefined) user.displayName = displayName;
        if (subscriptionPlan !== undefined) user.subscriptionPlan = subscriptionPlan;
        await user.save();

        // 2. Find and update (or upsert) ProfileData collection details
        const profileUpdateFields: any = {};
        if (profilePhoto !== undefined) profileUpdateFields.profilePhoto = profilePhoto;
        if (additionalEmail !== undefined) profileUpdateFields.additionalEmail = additionalEmail;
        if (github !== undefined) profileUpdateFields.github = github;
        if (linkedin !== undefined) profileUpdateFields.linkedin = linkedin;
        if (portfolioUrl !== undefined) profileUpdateFields.portfolioUrl = portfolioUrl;
        if (resumeCvName !== undefined) profileUpdateFields.resumeCvName = resumeCvName;
        if (resumeCvText !== undefined) profileUpdateFields.resumeCvText = resumeCvText;
        if (phone !== undefined) profileUpdateFields.phone = phone;
        if (educationData !== undefined) profileUpdateFields.educationData = educationData;

        const updatedProfile = await ProfileData.findOneAndUpdate(
            { identifier },
            { $set: profileUpdateFields },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                identifier: user.identifier,
                displayName: user.displayName,
                type: user.type,
                isOrganization: user.isOrganization,
                orgRole: user.orgRole,
                subscriptionPlan: user.subscriptionPlan,
                createdAt: user.createdAt,
                // Merged profile details
                profilePhoto: updatedProfile.profilePhoto,
                additionalEmail: updatedProfile.additionalEmail,
                github: updatedProfile.github,
                linkedin: updatedProfile.linkedin,
                portfolioUrl: updatedProfile.portfolioUrl,
                resumeCvName: updatedProfile.resumeCvName,
                resumeCvText: updatedProfile.resumeCvText,
                phone: updatedProfile.phone,
                educationData: updatedProfile.educationData,
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

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        // 1. Delete credentials User document
        const deletedUser = await User.findOneAndDelete({ identifier });
        if (!deletedUser) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // 2. Delete corresponding ProfileData document
        await ProfileData.findOneAndDelete({ identifier });

        return NextResponse.json({
            success: true,
            message: "User account and profile data deleted successfully from Cloud database."
        });
    } catch (error: any) {
        console.error("DELETE Profile API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
