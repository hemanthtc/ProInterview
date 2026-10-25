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
        let isGlobal = false;

        try {
            const body = await req.json();
            identifier = body?.identifier;
            accountType = body?.accountType;
            tabOnly = Boolean(body?.tabOnly);
            isGlobal = Boolean(body?.global);
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

        // Tab-specific logout must NOT delete shared domain cookies if another tab might be using them
        // Only clear cookies if global logout was explicitly requested, or if the cookie belongs to this user and not tab-scoped
        if (isGlobal || !tabOnly) {
            let shouldClearCookies = isGlobal;
            if (!shouldClearCookies) {
                const sessionCookie = req.cookies.get("session")?.value;
                if (!sessionCookie) {
                    shouldClearCookies = true;
                } else if (identifier) {
                    const cookiePayload = verifyToken(sessionCookie);
                    // Only clear if the shared cookie actually belongs to the user logging out
                    if (!cookiePayload || cookiePayload.identifier.toLowerCase() === identifier.toLowerCase()) {
                        shouldClearCookies = true;
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
        }

        return response;
    } catch (error: any) {
        console.error("Logout API error:", error);
        return NextResponse.json({ success: true, message: "Logged out with fallback." });
    }
}
