import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import { clearSessionCookie, shouldSetSecureCookie, verifyToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        let identifier: string | undefined;
        let accountType: string | undefined;
        let tabOnly = false;
        let isGlobal = true;

        try {
            const body = await req.json();
            identifier = body?.identifier;
            accountType = body?.accountType;
            if (typeof body?.tabOnly === "boolean") {
                tabOnly = body.tabOnly;
            }
            if (typeof body?.global === "boolean") {
                isGlobal = body.global;
            }
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

        const isSecure = shouldSetSecureCookie(req);
        const response = NextResponse.json({ success: true, message: "Logged out successfully from session." });

        // Tab-specific logout must NOT delete shared domain cookies ONLY IF:
        // tabOnly is explicitly true AND isGlobal is false AND the cookie belongs to a DIFFERENT user than the one logging out.
        // In all other cases (default logout, global logout, same user logout, or anonymous logout), ALWAYS clear cookies.
        let shouldClearCookies = true;
        if (tabOnly && !isGlobal) {
            const sessionCookie = req.cookies.get("session")?.value;
            if (sessionCookie && identifier) {
                const cookiePayload = verifyToken(sessionCookie);
                if (cookiePayload && cookiePayload.identifier.toLowerCase() !== identifier.toLowerCase()) {
                    shouldClearCookies = false;
                }
            }
        }

        if (shouldClearCookies) {
            try {
                await clearSessionCookie(req);
            } catch (cookieErr) {
                console.warn("clearSessionCookie warning:", cookieErr);
            }

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
        }

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
