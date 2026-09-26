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
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const initKey = new URL(req.url).searchParams.get("key") || req.headers.get("x-init-key");
        const configuredKey = process.env.INIT_DB_KEY;
        if (configuredKey) {
            if (!initKey || initKey !== configuredKey) {
                return NextResponse.json({ error: "Unauthorized access. Database initialization is locked." }, { status: 403 });
            }
        } else if (process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "Unauthorized access. INIT_DB_KEY is required in production." }, { status: 403 });
        }

        const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
        const seedEmployeePassword = process.env.SEED_EMPLOYEE_PASSWORD;
        if (!seedAdminPassword || !seedEmployeePassword) {
            return NextResponse.json(
                { error: "Set SEED_ADMIN_PASSWORD and SEED_EMPLOYEE_PASSWORD to initialize seed accounts." },
                { status: 400 }
            );
        }

        const adminId = process.env.SEED_ADMIN_IDENTIFIER || "hemanthtchemu2003@gmail.com";
        const employeeId = process.env.SEED_EMPLOYEE_IDENTIFIER || "emp123";
        const results: Record<string, string> = {};

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

        const existingEmployee = await OrgEmployee.findOne({ identifier: employeeId });
        if (existingEmployee) {
            results.org_employee = `Already exists — collection ready (identifier: ${employeeId})`;
        } else {
            const hashed = await bcryptjs.hash(seedEmployeePassword, 10);
            await OrgEmployee.create({
                identifier: employeeId,
                password: hashed,
                displayName: "Jane Doe",
                adminId,
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
    } catch (error: unknown) {
        console.error("DB init error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
