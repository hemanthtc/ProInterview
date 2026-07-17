import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

/**
 * GET /api/init-db
 *
 * One-time initialization endpoint — ensures the org_admin and org_employee
 * MongoDB collections exist by seeding the default accounts if not already present.
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // Security Check: Deny access in production unless a valid initialization key is provided
        const initKey = new URL(req.url).searchParams.get("key") || req.headers.get("x-init-key");
        const configuredKey = process.env.INIT_DB_KEY;
        if (process.env.NODE_ENV === "production") {
            if (!configuredKey || initKey !== configuredKey) {
                return NextResponse.json({ error: "Unauthorized access. Database initialization is locked." }, { status: 403 });
            }
        }

        const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || "H#m@nth!8286";
        const seedEmployeePassword = process.env.SEED_EMPLOYEE_PASSWORD || "Password123";

        const results: Record<string, string> = {};

        // ── Seed OrgAdmin ─────────────────────────────────────────────────────
        const adminId = "hemanthtchemu2003@gmail.com";
        const existingAdmin = await OrgAdmin.findOne({ identifier: adminId });
        if (existingAdmin) {
            results.org_admin = `Already exists — collection ready (identifier: ${adminId})`;
        } else {
            const hashed = await bcryptjs.hash(seedAdminPassword, 10);
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
            const hashed = await bcryptjs.hash(seedEmployeePassword, 10);
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
