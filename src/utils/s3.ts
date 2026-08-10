import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type S3Prefix = "resumes" | "profile-photos" | "synthetic" | "uploads" | "scorecards";

function env(name: string): string | undefined {
    const v = process.env[name]?.replace(/^["']|["']$/g, "").trim();
    return v || undefined;
}

export function isS3Configured(): boolean {
    return Boolean(env("S3_BUCKET") || env("AWS_S3_BUCKET"));
}

export function getS3Bucket(): string {
    const bucket = env("S3_BUCKET") || env("AWS_S3_BUCKET");
    if (!bucket) throw new Error("S3_BUCKET (or AWS_S3_BUCKET) is not configured");
    return bucket;
}

export function getS3Region(): string {
    return env("AWS_REGION") || env("S3_REGION") || "ap-south-1";
}

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
    if (cachedClient) return cachedClient;
    const region = getS3Region();
    const accessKeyId = env("AWS_ACCESS_KEY_ID");
    const secretAccessKey = env("AWS_SECRET_ACCESS_KEY");
    cachedClient = new S3Client({
        region,
        ...(accessKeyId && secretAccessKey
            ? { credentials: { accessKeyId, secretAccessKey } }
            : {}),
    });
    return cachedClient;
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export function buildObjectKey(
    prefix: S3Prefix,
    userIdentifier: string,
    filename: string
): string {
    const safeUser = sanitizeFilename(userIdentifier).slice(0, 80);
    const safeName = sanitizeFilename(filename);
    const stamp = Date.now();
    return `${prefix}/${safeUser}/${stamp}-${safeName}`;
}

export function publicObjectUrl(key: string): string {
    const custom = env("S3_PUBLIC_BASE_URL");
    if (custom) return `${custom.replace(/\/$/, "")}/${key}`;
    const bucket = getS3Bucket();
    const region = getS3Region();
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadBuffer(opts: {
    key: string;
    body: Buffer | Uint8Array;
    contentType?: string;
    metadata?: Record<string, string>;
}): Promise<{ key: string; bucket: string; url: string }> {
    const bucket = getS3Bucket();
    const input: PutObjectCommandInput = {
        Bucket: bucket,
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType || "application/octet-stream",
        Metadata: opts.metadata,
    };
    await getS3Client().send(new PutObjectCommand(input));
    return { key: opts.key, bucket, url: publicObjectUrl(opts.key) };
}

export async function createPresignedUploadUrl(opts: {
    key: string;
    contentType: string;
    expiresInSec?: number;
}): Promise<{ uploadUrl: string; key: string; bucket: string; publicUrl: string; expiresIn: number }> {
    const bucket = getS3Bucket();
    const expiresIn = opts.expiresInSec ?? 300;
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: opts.key,
        ContentType: opts.contentType,
    });
    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });
    return {
        uploadUrl,
        key: opts.key,
        bucket,
        publicUrl: publicObjectUrl(opts.key),
        expiresIn,
    };
}

export async function deleteObject(key: string): Promise<void> {
    const bucket = getS3Bucket();
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function pingS3(): Promise<{ ok: boolean; bucket: string; region: string; error?: string }> {
    const bucket = getS3Bucket();
    const region = getS3Region();
    try {
        await getS3Client().send(new HeadBucketCommand({ Bucket: bucket }));
        return { ok: true, bucket, region };
    } catch (e) {
        return {
            ok: false,
            bucket,
            region,
            error: e instanceof Error ? e.message : "S3 ping failed",
        };
    }
}
