import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import ProfileData from "@/models/ProfileData";
import OrgAdmin from "@/models/OrgAdmin";

// Admin auth check helper
async function checkAdminAuth(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId") || req.headers.get("x-admin-id");
    if (!adminId) return false;
    const admin = await OrgAdmin.findOne({ identifier: adminId });
    return !!admin;
}

// POST — Verify an unverified user account
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, adminId } = await req.json();

        if (!identifier || !adminId) {
            return NextResponse.json({ error: "identifier and adminId are required." }, { status: 400 });
        }

        // Verify requester is indeed an admin
        const isAdmin = await OrgAdmin.findOne({ identifier: adminId });
        if (!isAdmin) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const user = await User.findOne({ identifier });
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        user.isVerified = true;
        await user.save();

        return NextResponse.json({
            success: true,
            message: `User account ${identifier} has been verified successfully.`
        });
    } catch (error: any) {
        console.error("Admin user verify error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE — Delete a user account and their profile data
export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const identifier = searchParams.get("identifier");
        const adminId = searchParams.get("adminId");

        if (!identifier || !adminId) {
            return NextResponse.json({ error: "identifier and adminId are required." }, { status: 400 });
        }

        // Verify requester is indeed an admin
        const isAdmin = await OrgAdmin.findOne({ identifier: adminId });
        if (!isAdmin) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const deletedUser = await User.findOneAndDelete({ identifier });
        if (!deletedUser) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // Also delete profile details if they exist
        await ProfileData.findOneAndDelete({ identifier });

        return NextResponse.json({
            success: true,
            message: `User account ${identifier} and all profile data deleted successfully.`
        });
    } catch (error: any) {
        console.error("Admin user delete error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
