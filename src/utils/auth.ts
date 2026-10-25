import crypto from "crypto";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { AccountType } from "@/types/auth";

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
        throw new Error(
            "JWT_SECRET is not set. Add a strong secret to your environment (see .env.example)."
        );
    }
    if (secret.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters.");
    }
    return secret;
}

export interface SessionPayload {
    identifier: string;
    role: AccountType;
    isOrganization: boolean;
}

/**
 * Creates a signed JWT using native Node.js crypto (HMAC-SHA256).
 */
export function createToken(payload: SessionPayload, isPwa?: boolean): string {
    const JWT_SECRET = getJwtSecret();
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const duration = isPwa ? 365 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + duration })).toString("base64url");
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    return `${header}.${data}.${signature}`;
}

/**
 * Verifies a signed JWT and returns the payload if valid.
 */
export function verifyToken(token: string): SessionPayload | null {
    try {
        if (!token || typeof token !== "string") return null;
        let cleanToken = token.trim().replace(/^["']|["']$/g, "");
        if (cleanToken.includes("%")) {
            try { cleanToken = decodeURIComponent(cleanToken); } catch {}
        }

        const JWT_SECRET = getJwtSecret();
        const parts = cleanToken.split(".");
        if (parts.length !== 3) return null;
        const [header, data, signature] = parts;
        const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);
        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
        if (payload.exp && Date.now() > payload.exp) return null;
        return {
            identifier: payload.identifier,
            role: payload.role,
            isOrganization: !!payload.isOrganization,
        };
    } catch {
        return null;
    }
}

/**
 * Helper to determine whether the secure flag should be set for cookies.
 * Prevents dropping cookies on localhost or HTTP deployments.
 */
export function shouldSetSecureCookie(req?: NextRequest | Request): boolean {
    if (process.env.COOKIE_INSECURE === "true") return false;
    if (process.env.NODE_ENV !== "production") return false;
    if (req) {
        const proto = req.headers.get("x-forwarded-proto");
        if (proto === "http") return false;
        if (proto === "https") return true;
        const urlProto = (req as any).nextUrl?.protocol || (req.url ? new URL(req.url).protocol : "");
        if (urlProto === "http:") return false;
        const host = req.headers.get("host") || "";
        if (host.includes("localhost") || host.includes("127.0.0.1") || host.endsWith(".local")) return false;
    }
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || "";
    if (publicUrl.startsWith("http://localhost") || publicUrl.startsWith("http://127.0.0.1")) return false;
    return true;
}

/**
 * Sets the secure HttpOnly cookie containing the session token.
 */
export async function setSessionCookie(payload: SessionPayload, isPwa?: boolean, req?: NextRequest | Request) {
    const token = createToken(payload, isPwa);
    const cookieStore = await cookies();
    const durationSec = isPwa ? 365 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const isSecure = shouldSetSecureCookie(req);
    cookieStore.set("session", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: durationSec
    });
    cookieStore.set("userLoggedIn", "true", {
        httpOnly: false,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: durationSec
    });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(req?: NextRequest | Request) {
    const cookieStore = await cookies();
    const isSecure = shouldSetSecureCookie(req);
    cookieStore.set("session", "", {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        expires: new Date(0)
    });
    cookieStore.set("userLoggedIn", "", {
        httpOnly: false,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        expires: new Date(0)
    });
}

/**
 * Helper to verify requests inside Next.js route handlers.
 * Verifies tab-specific Authorization: Bearer <token> or x-session-token headers FIRST,
 * preventing a shared browser cookie from overriding an independent tab's session.
 * Falls back to HttpOnly session cookie only when no tab-scoped header is provided.
 */
export async function getVerifiedSession(req?: NextRequest | Request): Promise<SessionPayload | null> {
    try {
        // 1. PRIORITY 1: Check Authorization: Bearer <token> or x-session-token headers
        let authHeader: string | null = null;
        if (req?.headers) {
            authHeader = req.headers.get("authorization") || req.headers.get("x-session-token");
        }
        if (!authHeader) {
            try {
                const headerStore = await headers();
                authHeader = headerStore.get("authorization") || headerStore.get("x-session-token");
            } catch {}
        }

        if (authHeader) {
            let token = authHeader.trim();
            if (token.startsWith("Bearer ")) {
                token = token.slice(7).trim();
            }
            if (token) {
                const verified = verifyToken(token);
                if (verified) return verified;
                // An explicit tab token was provided but failed verification (e.g., expired or revoked).
                // Do NOT fall back to a shared cookie from another user/tab!
                return null;
            }
        }

        // 2. PRIORITY 2: Fallback to HttpOnly session cookie when no tab-specific header was sent
        try {
            const cookieStore = await cookies();
            const cookieToken = cookieStore.get("session")?.value;
            if (cookieToken) {
                const verified = verifyToken(cookieToken);
                if (verified) return verified;
            }
        } catch {}

        // Also check req.cookies directly if NextRequest was provided
        if (req && "cookies" in req && typeof (req as any).cookies?.get === "function") {
            const reqCookieToken = (req as any).cookies.get("session")?.value;
            if (reqCookieToken) {
                const verified = verifyToken(reqCookieToken);
                if (verified) return verified;
            }
        }

        // Fallback: Parse raw "cookie" header directly (crucial for proxies, Edge, and standard Request)
        const rawCookie = req?.headers?.get("cookie");
        if (rawCookie) {
            const match = rawCookie.match(/(?:^|;\s*)session=([^;]+)/);
            if (match) {
                const verified = verifyToken(match[1]);
                if (verified) return verified;
            }
        }

        return null;
    } catch {
        return null;
    }
}

