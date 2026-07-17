import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "default-fallback-super-secure-key-123456-prointerview";

export interface SessionPayload {
    identifier: string;
    role: "user" | "admin" | "employee";
    isOrganization: boolean;
}

/**
 * Creates a signed JWT using native Node.js crypto.
 */
export function createToken(payload: SessionPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    return `${header}.${data}.${signature}`;
}

/**
 * Verifies a signed JWT and returns the payload if valid.
 */
export function verifyToken(token: string): SessionPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const [header, data, signature] = parts;
        const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
        if (signature !== expectedSignature) return null;
        
        const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
        if (payload.exp && Date.now() > payload.exp) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Sets the secure HttpOnly cookie containing the session token.
 */
export async function setSessionCookie(payload: SessionPayload) {
    const token = createToken(payload);
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 // 1 day
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
}

/**
 * Helper to verify requests inside Next.js route handlers.
 * Verifies the HttpOnly session cookie.
 */
export async function getVerifiedSession(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return null;
        return verifyToken(token);
    } catch (e) {
        return null;
    }
}
