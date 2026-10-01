import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import { clearSessionCookie, shouldSetSecureCookie } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        let identifier: string | undefined;
        let accountType: string | undefined;

        try {
            const body = await req.json();
            identifier = body?.identifier;
            accountType = body?.accountType;
        } catch {
            // Body is optional on logout
        }

        if (identifier && accountType) {
            try {
                await connectDB();
                const lookupFilter = { $or: [{ identifier }, { identifier: identifier.toLowerCase() }] };

                if (accountType === "admin") {
                    await OrgAdmin.findOneAndUpdate(lookupFilter, { isOnline: false });
                } else if (accountType === "employee") {
                    await OrgEmployee.findOneAndUpdate(lookupFilter, { isOnline: false });
                }
            } catch (dbErr) {
                console.warn("Non-critical DB update error on logout:", dbErr);
            }
        }

        // Clear secure HttpOnly session cookie in cookieStore
        try {
            await clearSessionCookie(req);
        } catch (cookieErr) {
            console.warn("clearSessionCookie warning:", cookieErr);
        }

        const isSecure = shouldSetSecureCookie(req);
        const response = NextResponse.json({ success: true, message: "Logged out successfully from server." });
        response.cookies.set("session", "", {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
            maxAge: 0
        });
        response.cookies.set("userLoggedIn", "", {
            httpOnly: false,
            secure: isSecure,
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
            maxAge: 0
        });
        return response;
    } catch (error: any) {
        console.error("Logout API error:", error);
        const isSecure = shouldSetSecureCookie(req);
        const fallbackRes = NextResponse.json({ success: true, message: "Logged out with fallback." });
        fallbackRes.cookies.set("session", "", { httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0), maxAge: 0 });
        fallbackRes.cookies.set("userLoggedIn", "", { httpOnly: false, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0), maxAge: 0 });
        return fallbackRes;
    }
}
