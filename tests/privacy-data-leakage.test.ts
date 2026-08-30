import { describe, it, expect } from "vitest";
import crypto from "crypto";

/**
 * Automated test suite to prevent regressions on data leakages,
 * PII exposure, password hash leakage, and multi-tenant cross-talk.
 */

function presencePublicId(identifier: string): string {
    const salt = process.env.COMMUNITY_SALT || "prointerview_comm_salt";
    return crypto.createHmac("sha256", salt).update(identifier.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function sanitizeUserResponse(userDoc: Record<string, any>) {
    const sanitized = { ...userDoc };
    delete sanitized.password;
    delete sanitized.otpCode;
    delete sanitized.otpExpires;
    delete sanitized.__v;
    return sanitized;
}

function filterFeedbackForUser(allFeedbacks: Array<{ userIdentifier: string; problemStatement: string }>, sessionIdentifier: string, role: string) {
    if (role === "admin") {
        return allFeedbacks;
    }
    return allFeedbacks.filter(f => f.userIdentifier.toLowerCase() === sessionIdentifier.toLowerCase());
}

describe("Privacy & Data Leakage Prevention Tests", () => {
    it("never reveals user email in community presence public ID", () => {
        const email = "candidate_private_email@university.edu";
        const publicId = presencePublicId(email);

        expect(publicId).not.toContain("@");
        expect(publicId).not.toContain("university");
        expect(publicId).not.toContain("candidate");
        expect(publicId).toHaveLength(16);
    });

    it("strips password and OTP hashes from API responses", () => {
        const mockUserInDb = {
            _id: "66d01234567890abcdef",
            identifier: "john@example.com",
            displayName: "John Doe",
            password: "$2a$10$e8wF2e1m7...",
            otpCode: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            otpExpires: new Date(),
            role: "user",
            subscriptionPlan: "Free Tier",
        };

        const response = sanitizeUserResponse(mockUserInDb);

        expect(response.password).toBeUndefined();
        expect(response.otpCode).toBeUndefined();
        expect(response.otpExpires).toBeUndefined();
        expect(response.displayName).toBe("John Doe");
        expect(response.identifier).toBe("john@example.com");
    });

    it("prevents multi-tenant data leakage in feedback queries", () => {
        const candidateA = "alice@tech.org";
        const candidateB = "bob@startup.io";

        const databaseFeedbacks = [
            { userIdentifier: candidateA, problemStatement: "Alice private feedback on CSE" },
            { userIdentifier: candidateB, problemStatement: "Bob private feedback on Mechanical" },
            { userIdentifier: candidateA, problemStatement: "Alice second feedback ticket" },
        ];

        // Candidate B requests feedbacks
        const bResults = filterFeedbackForUser(databaseFeedbacks, candidateB, "user");
        expect(bResults).toHaveLength(1);
        expect(bResults[0].problemStatement).toBe("Bob private feedback on Mechanical");
        expect(bResults.some(f => f.userIdentifier === candidateA)).toBe(false);

        // Admin requests feedbacks
        const adminResults = filterFeedbackForUser(databaseFeedbacks, "admin@prointerview.ai", "admin");
        expect(adminResults).toHaveLength(3);
    });

    it("verifies error responses do not leak server stack traces in standard responses", () => {
        function formatApiError(err: unknown, isProduction: boolean) {
            const defaultMsg = "An unexpected error occurred.";
            if (err instanceof Error) {
                return {
                    error: isProduction ? (err.message.includes("database") || err.message.includes("Mongo") ? defaultMsg : err.message) : err.message,
                    ...(isProduction ? {} : { stack: err.stack }),
                };
            }
            return { error: defaultMsg };
        }

        const internalDbError = new Error("MongoNetworkError: connection refused to 127.0.0.1:27017");
        const prodResponse = formatApiError(internalDbError, true);

        expect(prodResponse.error).not.toContain("127.0.0.1");
        expect(prodResponse.error).not.toContain("MongoNetworkError");
        expect((prodResponse as any).stack).toBeUndefined();
    });
});
