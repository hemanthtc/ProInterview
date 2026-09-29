import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadBucketCommand,
    GetObjectCommand,
    CopyObjectCommand,
    ListObjectsV2Command,
    type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type S3Prefix = "resumes" | "profile-photos" | "resume_builder_resumes" | "profile_details" | "synthetic" | "uploads" | "scorecards" | "profiles" | "sessions" | "prep-packs";

function env(name: string): string | undefined {
    const v = process.env[name]?.replace(/^["']|["']$/g, "").trim();
    return v || undefined;
}

export function isS3Configured(): boolean {
    const bucket = env("S3_BUCKET") || env("AWS_S3_BUCKET");
    if (!bucket || bucket === "your-bucket-name" || bucket.startsWith("your-bucket")) {
        return false;
    }
    const accessKey = env("S3_ACCESS_KEY_ID") || env("AWS_ACCESS_KEY_ID");
    if (accessKey && (accessKey === "your_s3_access_key_id" || accessKey.startsWith("your_s3") || accessKey.startsWith("your_access_key"))) {
        return false;
    }
    const secretKey = env("S3_SECRET_ACCESS_KEY") || env("AWS_SECRET_ACCESS_KEY");
    if (secretKey && (secretKey === "your_s3_secret_access_key" || secretKey.startsWith("your_s3"))) {
        return false;
    }
    return true;
}

export function getS3Bucket(): string {
    const bucket = env("S3_BUCKET");
    if (!bucket) throw new Error("S3_BUCKET is not configured");
    return bucket;
}

export function getS3Region(): string {
    return env("S3_REGION") || "ap-south-1";
}

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
    if (cachedClient) return cachedClient;
    const region = getS3Region();
    const accessKeyId = env("S3_ACCESS_KEY_ID");
    const secretAccessKey = env("S3_SECRET_ACCESS_KEY");
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
        ContentDisposition: "attachment",
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

export async function copyObject(sourceKey: string, destKey: string): Promise<void> {
    const bucket = getS3Bucket();
    await getS3Client().send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
        Key: destKey,
    }));
}

export async function uploadJSON(key: string, data: any): Promise<void> {
    const bucket = getS3Bucket();
    const bodyStr = JSON.stringify(data);
    await getS3Client().send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bodyStr,
        ContentType: "application/json",
    }));
}

export async function deleteS3Object(key: string): Promise<void> {
    try {
        const bucket = getS3Bucket();
        await getS3Client().send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }));
    } catch (err) {
        console.error(`Failed to delete S3 object ${key}:`, err);
    }
}

export async function getJSON<T>(key: string): Promise<T> {
    const bucket = getS3Bucket();
    const response = await getS3Client().send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
    const bodyStr = await response.Body?.transformToString();
    if (!bodyStr) {
        throw new Error(`Empty response from S3 for key ${key}`);
    }
    return JSON.parse(bodyStr) as T;
}

export async function deleteObject(key: string): Promise<void> {
    const bucket = getS3Bucket();
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function pingS3(): Promise<{ ok: boolean; bucket: string; region: string; error?: string }> {
    if (!isS3Configured()) {
        return { ok: false, bucket: "", region: "", error: "S3 is not configured" };
    }
    const bucket = getS3Bucket();
    const region = getS3Region();
    try {
        const client = getS3Client();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
            await client.send(new HeadBucketCommand({ Bucket: bucket }), {
                abortSignal: controller.signal
            });
            return { ok: true, bucket, region };
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (e) {
        return {
            ok: false,
            bucket,
            region,
            error: e instanceof Error ? e.message : "S3 ping failed",
        };
    }
}

export function getS3ProfileKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `profiles/${safeUser}/profile_data.json`;
}

export function getLegacyS3ProfileKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `profile_details/${safeUser}/info.json`;
}

export function getS3ResumesKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `resumes/${safeUser}/saved_resumes.json`;
}

export function getLegacyS3ResumesKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `resume_builder_resumes/${safeUser}/saved_resumes.json`;
}

export function getS3SessionsKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `interview_history_and_performance_records/${safeUser}/session_data.json`;
}

export function getLegacyS3SessionsKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `sessions/${safeUser}/session_data.json`;
}

export function getS3FilmRoomKey(identifier: string, timestamp: number): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `interview_history_and_performance_records/${safeUser}/film_room_${timestamp}.json`;
}

export function getS3PrepPacksKey(identifier: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `prep-packs/${safeUser}/pack_data.json`;
}

export function getS3ScorecardKey(shareId: string): string {
    const safeId = shareId.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `scorecards/${safeId}.json`;
}

export function getS3SyntheticKey(identifier: string, fileId: string): string {
    const safeUser = identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    const safeFile = fileId.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `synthetic/${safeUser}/${safeFile}.json`;
}

export async function listS3Objects(prefix: string, delimiter?: string): Promise<{ contents: string[]; commonPrefixes: string[] }> {
    const bucket = getS3Bucket();
    const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: delimiter,
    });
    const response = await getS3Client().send(command);
    const contents = (response.Contents || []).map(obj => obj.Key).filter((key): key is string => !!key);
    const commonPrefixes = (response.CommonPrefixes || []).map(cp => cp.Prefix).filter((p): p is string => !!p);
    return { contents, commonPrefixes };
}

export async function createPresignedDownloadUrl(key: string, expiresInSec = 48 * 3600): Promise<string> {
    const bucket = getS3Bucket();
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSec });
}

export async function listS3ObjectsWithDetails(prefix: string): Promise<{ key: string; lastModified?: Date; size?: number }[]> {
    const bucket = getS3Bucket();
    const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
    });
    const response = await getS3Client().send(command);
    return (response.Contents || [])
        .map(obj => ({
            key: obj.Key || "",
            lastModified: obj.LastModified,
            size: obj.Size,
        }))
        .filter(obj => !!obj.key);
}

export async function deleteS3ObjectsBulk(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const bucket = getS3Bucket();
    const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
            Objects: keys.map(k => ({ Key: k })),
            Quiet: true,
        },
    });
    await getS3Client().send(command);
}

