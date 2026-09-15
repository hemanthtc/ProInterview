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
        const JWT_SECRET = getJwtSecret();
        const parts = token.split(".");
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
 * Sets the secure HttpOnly cookie containing the session token.
 */
export async function setSessionCookie(payload: SessionPayload, isPwa?: boolean) {
    const token = createToken(payload, isPwa);
    const cookieStore = await cookies();
    const durationSec = isPwa ? 365 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: durationSec
    });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0)
    });
    cookieStore.set("userLoggedIn", "", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0)
    });
}

/**
 * Helper to verify requests inside Next.js route handlers.
 * Verifies the HttpOnly session cookie first, and falls back to
 * Authorization: Bearer <token> or x-session-token headers for robust
 * cloud hosting (e.g. AWS Amplify / CloudFront edge proxies).
 */
export async function getVerifiedSession(req?: NextRequest): Promise<SessionPayload | null> {
    try {
        let token: string | undefined;

        // 1. Try to read from HttpOnly session cookie
        try {
            const cookieStore = await cookies();
            token = cookieStore.get("session")?.value;
        } catch {}

        // 2. If no cookie, try to read from Authorization header or custom header
        if (!token) {
            let authHeader: string | null = null;
            if (req) {
                authHeader = req.headers.get("authorization") || req.headers.get("x-session-token");
            }
            if (!authHeader) {
                try {
                    const headerStore = await headers();
                    authHeader = headerStore.get("authorization") || headerStore.get("x-session-token");
                } catch {}
            }

            if (authHeader) {
                if (authHeader.startsWith("Bearer ")) {
                    token = authHeader.slice(7).trim();
                } else {
                    token = authHeader.trim();
                }
            }
        }

        if (!token) return null;
        return verifyToken(token);
    } catch {
        return null;
    }
}
