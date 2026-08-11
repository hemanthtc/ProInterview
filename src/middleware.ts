import { NextRequest, NextResponse } from "next/server";

// Public paths that do not require login
const PUBLIC_PATHS = [
    "/",
    "/login",
    "/labs",
    "/coding-lab",
    "/community",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow static files, Next.js assets, and public routes
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/synthetic-data-generator") ||
        pathname.includes(".") || // static files like images, css, js
        PUBLIC_PATHS.includes(pathname)
    ) {
        return NextResponse.next();
    }

    // Check for HttpOnly session cookie or custom auth token header
    const sessionCookie = req.cookies.get("session")?.value;
    const authHeader = req.headers.get("authorization");

    const isAuthenticated = Boolean(sessionCookie || authHeader);

    // If attempting to access a protected feature route without a session, redirect to login
    if (!isAuthenticated) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (authentication endpoints)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
    ],
};
