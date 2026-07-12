import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import bcryptjs from "bcryptjs";

// POST — Create a new administrator account (Restricted to hemanthtchemu2003@gmail.com)
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { adminId, identifier, password, displayName, organizationName } = await req.json();

        if (!adminId || !identifier || !password || !displayName) {
            return NextResponse.json({ error: "Missing required admin creation fields." }, { status: 400 });
        }

        // Hard restriction: only this specific administrator is allowed to create other admins
        if (adminId.trim().toLowerCase() !== "hemanthtchemu2003@gmail.com") {
            return NextResponse.json({ error: "Unauthorized access: Admin creation is restricted." }, { status: 403 });
        }

        // Validate the new admin identifier is unique
        const existingAdmin = await OrgAdmin.findOne({ identifier: identifier.trim().toLowerCase() });
        if (existingAdmin) {
            return NextResponse.json({ error: "An administrator with this Email / ID already exists." }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Create new Admin record
        const newAdmin = await OrgAdmin.create({
            identifier: identifier.trim().toLowerCase(),
            password: hashedPassword,
            displayName: displayName.trim(),
            organizationName: (organizationName || "ProInterview Corp").trim(),
            type: "email",
            isVerified: true, // Auto-verified on creation by root admin
            subscriptionPlan: "Enterprise Tier"
        });

        return NextResponse.json({
            success: true,
            message: `New administrator "${newAdmin.displayName}" created successfully.`
        });
    } catch (error: any) {
        console.error("Create admin error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
