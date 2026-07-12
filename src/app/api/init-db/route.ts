import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import bcryptjs from "bcryptjs";

/**
 * GET /api/init-db
 *
 * One-time initialization endpoint — ensures the org_admin and org_employee
 * MongoDB collections exist by seeding the default accounts if not already present.
 *
 * Call this once from your browser or Postman after deploying to make the
 * collections visible in MongoDB Atlas.
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const results: Record<string, string> = {};

        // ── Seed OrgAdmin ─────────────────────────────────────────────────────
        const adminId = "hemanthtchemu2003@gmail.com";
        const existingAdmin = await OrgAdmin.findOne({ identifier: adminId });
        if (existingAdmin) {
            results.org_admin = `Already exists — collection ready (identifier: ${adminId})`;
        } else {
            const hashed = await bcryptjs.hash("H#m@nth!8286", 10);
            await OrgAdmin.create({
                identifier: adminId,
                password: hashed,
                displayName: "Hemanth TC",
                organizationName: "ProInterview Corp",
                type: "email",
                isVerified: true,
                subscriptionPlan: "Enterprise Tier",
            });
            results.org_admin = `Created admin account — collection initialized (identifier: ${adminId})`;
        }

        // ── Seed OrgEmployee ──────────────────────────────────────────────────
        const employeeId = "emp123";
        const existingEmployee = await OrgEmployee.findOne({ identifier: employeeId });
        if (existingEmployee) {
            results.org_employee = `Already exists — collection ready (identifier: ${employeeId})`;
        } else {
            const hashed = await bcryptjs.hash("Password123", 10);
            await OrgEmployee.create({
                identifier: employeeId,
                password: hashed,
                displayName: "Jane Doe",
                adminId: "hemanthtchemu2003@gmail.com",
                organizationName: "ProInterview Corp",
                department: "Engineering",
                type: "email",
                isVerified: true,
                subscriptionPlan: "Enterprise Tier",
            });
            results.org_employee = `Created default employee — collection initialized (identifier: ${employeeId})`;
        }

        return NextResponse.json({
            success: true,
            message: "Database collections initialized successfully.",
            collections: results,
        });
    } catch (error: any) {
        console.error("DB init error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
