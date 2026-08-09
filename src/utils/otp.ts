import crypto from "crypto";
import bcryptjs from "bcryptjs";

const OTP_BCRYPT_ROUNDS = 10;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const ADMIN_OTP_TTL_MS = 15 * 60 * 1000;

/**
 * Cryptographically secure 6-digit OTP (100000–999999).
 */
export function generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP for at-rest storage. Never persist the plaintext code.
 */
export async function hashOtp(otp: string): Promise<string> {
    return bcryptjs.hash(otp, OTP_BCRYPT_ROUNDS);
}

/**
 * Constant-time-ish verification via bcrypt.compare.
 * Supports legacy plaintext OTPs briefly so in-flight codes still work after deploy.
 */
export async function verifyOtp(plainOtp: string, stored: string | undefined | null): Promise<boolean> {
    if (!stored || !plainOtp) return false;

    // Legacy plaintext OTP (pre-hashing deploy) — compare in constant time when possible
    if (!stored.startsWith("$2")) {
        try {
            const a = Buffer.from(stored);
            const b = Buffer.from(plainOtp);
            if (a.length !== b.length) return false;
            return crypto.timingSafeEqual(a, b);
        } catch {
            return stored === plainOtp;
        }
    }

    return bcryptjs.compare(plainOtp, stored);
}

export function otpExpiry(ttlMs: number = OTP_TTL_MS): Date {
    return new Date(Date.now() + ttlMs);
}
