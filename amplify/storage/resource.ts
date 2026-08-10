import { defineStorage } from "@aws-amplify/backend";

/**
 * Amplify Gen2 S3 storage for ProInterview.
 * Deployed via `npx ampx` / Amplify pipeline.
 *
 * Paths:
 * - public/*     — readable by guests; writable by authenticated Cognito users
 * - protected/{entity_id}/* — owner write; authenticated read
 * - private/{entity_id}/* — owner-only (resumes, profile photos when using Amplify Auth)
 *
 * Note: The Next.js app's primary auth is still custom JWT + Mongo.
 * Runtime uploads from API routes use src/utils/s3.ts with AWS_* / S3_* env vars.
 * Amplify storage is available when Cognito + amplify_outputs are configured.
 */
export const storage = defineStorage({
    name: "prointerviewFiles",
    isDefault: true,
    access: (allow) => ({
        "public/*": [
            allow.guest.to(["read"]),
            allow.authenticated.to(["read", "write", "delete"]),
        ],
        "protected/{entity_id}/*": [
            allow.authenticated.to(["read"]),
            allow.entity("identity").to(["read", "write", "delete"]),
        ],
        "private/{entity_id}/*": [allow.entity("identity").to(["read", "write", "delete"])],
    }),
});
