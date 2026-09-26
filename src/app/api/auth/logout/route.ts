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

        const lookupFilter = { $or: [{ identifier }, { identifier: identifier.toLowerCase() }] };

        if (accountType === "admin") {
            await OrgAdmin.findOneAndUpdate(lookupFilter, { isOnline: false });
        } else if (accountType === "employee") {
            await OrgEmployee.findOneAndUpdate(lookupFilter, { isOnline: false });
        }

        // Clear secure HttpOnly session cookie
        await clearSessionCookie();

        const response = NextResponse.json({ success: true, message: "Logged out successfully from server." });
        response.cookies.set("session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0)
        });
        response.cookies.set("userLoggedIn", "", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0)
        });
        return response;
    } catch (error: any) {
        console.error("Logout API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
