import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import { clearSessionCookie } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { identifier, accountType } = await req.json();

        if (!identifier || !accountType) {
            return NextResponse.json({ error: "identifier and accountType are required." }, { status: 400 });
        }

        if (accountType === "admin") {
            await OrgAdmin.findOneAndUpdate({ identifier }, { isOnline: false });
        } else if (accountType === "employee") {
            await OrgEmployee.findOneAndUpdate({ identifier }, { isOnline: false });
        }

        // Clear secure HttpOnly session cookie
        await clearSessionCookie();

        return NextResponse.json({ success: true, message: "Logged out successfully from server." });
    } catch (error: any) {
        console.error("Logout API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
