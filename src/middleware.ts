import { NextRequest, NextResponse } from "next/server";

// Public paths that do not require login
const PUBLIC_PATHS = [
    "/",
    "/login",
    "/labs",
    "/coding-lab",
    "/community",
    "/domains",
    "/prep",
    "/ats-match",
    "/scorecard",
    "/film-room",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow static files, Next.js assets, API routes, and public routes
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/synthetic-data-generator") ||
        pathname.includes(".") || // static files like images, css, js, icons
        PUBLIC_PATHS.includes(pathname) ||
        PUBLIC_PATHS.some(p => p !== "/" && pathname.startsWith(p))
    ) {
        return NextResponse.next();
    }

    // Check for HttpOnly session cookie, userLoggedIn cookie, or custom auth token header
    const sessionCookie = req.cookies.get("session")?.value;
    const userLoggedInValue = req.cookies.get("userLoggedIn")?.value;
    const authHeader = req.headers.get("authorization");

    const isUser = userLoggedInValue === "true";
    const isGuest = userLoggedInValue === "guest";
    const isAuthenticated = Boolean(sessionCookie || isUser || isGuest || authHeader);

    // If attempting to access a protected feature route without a session, redirect to login
    if (!isAuthenticated) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Securely restrict Guest Mode to a sandbox bubble (block sensitive/online pages)
    if (isGuest) {
        const blockedForGuest = [
            "/admin",
            "/profile",
            "/realistic-interview",
            "/interview",
            "/setup"
        ];
        if (blockedForGuest.some(path => pathname.startsWith(path))) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
