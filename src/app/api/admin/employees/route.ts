import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import bcryptjs from "bcryptjs";

// GET — list all employees under an admin
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const adminId = searchParams.get("adminId");

        if (!adminId) {
            return NextResponse.json({ error: "adminId is required." }, { status: 400 });
        }

        const employees = await OrgEmployee.find({ adminId })
            .select("identifier displayName department isVerified createdAt organizationName")
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, employees });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST — add a new employee under this admin
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { adminId, identifier, password, displayName, department } = await req.json();

        if (!adminId || !identifier || !password || !displayName) {
            return NextResponse.json({ error: "adminId, identifier, displayName and password are required." }, { status: 400 });
        }

        // Verify admin exists
        const admin = await OrgAdmin.findOne({ identifier: adminId });
        if (!admin) {
            return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
        }

        // Check uniqueness
        const existing = await OrgEmployee.findOne({ identifier });
        if (existing) {
            return NextResponse.json({ error: "An employee with this ID already exists." }, { status: 400 });
        }

        const hashed = await bcryptjs.hash(password, 10);
        const employee = await OrgEmployee.create({
            identifier,
            password: hashed,
            displayName,
            adminId,
            organizationName: admin.organizationName,
            department: department || "General",
            type: "email",
            isVerified: true,
            subscriptionPlan: "Enterprise Tier",
        });

        return NextResponse.json({
            success: true,
            message: "Employee added successfully.",
            employee: {
                identifier: employee.identifier,
                displayName: employee.displayName,
                department: employee.department,
                organizationName: employee.organizationName,
                createdAt: employee.createdAt,
            }
        });
    } catch (error: any) {
        console.error("Add employee error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE — remove an employee
export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const identifier = searchParams.get("identifier");
        const adminId = searchParams.get("adminId");

        if (!identifier || !adminId) {
            return NextResponse.json({ error: "identifier and adminId are required." }, { status: 400 });
        }

        const deleted = await OrgEmployee.findOneAndDelete({ identifier, adminId });
        if (!deleted) {
            return NextResponse.json({ error: "Employee not found or not under this admin." }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Employee removed successfully." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
