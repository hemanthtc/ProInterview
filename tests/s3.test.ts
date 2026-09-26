import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildObjectKey, isS3Configured, publicObjectUrl } from "@/utils/s3";

describe("s3 helpers", () => {
    const prev = { ...process.env };

    beforeEach(() => {
        delete process.env.S3_BUCKET;
        delete process.env.AWS_S3_BUCKET;
        delete process.env.AWS_REGION;
        delete process.env.S3_REGION;
        delete process.env.S3_PUBLIC_BASE_URL;
    });

    afterEach(() => {
        process.env = { ...prev };
    });

    it("isS3Configured is false without bucket", () => {
        expect(isS3Configured()).toBe(false);
    });

    it("isS3Configured is true with S3_BUCKET", () => {
        process.env.S3_BUCKET = "my-bucket";
        expect(isS3Configured()).toBe(true);
    });

    it("buildObjectKey sanitizes user and filename", () => {
        const key = buildObjectKey("resumes", "user@mail.com", "My Resume (final).pdf");
        expect(key).toMatch(/^resumes\/user_mail\.com\/\d+-My_Resume_final_\.pdf$/);
    });

    it("publicObjectUrl uses regional S3 URL by default", () => {
        process.env.S3_BUCKET = "pi-files";
        process.env.AWS_REGION = "ap-south-1";
        expect(publicObjectUrl("resumes/a/1.pdf")).toBe(
            "https://pi-files.s3.ap-south-1.amazonaws.com/resumes/a/1.pdf"
        );
    });

    it("publicObjectUrl prefers S3_PUBLIC_BASE_URL (CDN)", () => {
        process.env.S3_BUCKET = "pi-files";
        process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/";
        expect(publicObjectUrl("profile-photos/x.png")).toBe(
            "https://cdn.example.com/profile-photos/x.png"
        );
    });
});
