"use client";

import type { S3Prefix } from "@/utils/s3";

/**
 * Browser helper: ask the API for a presigned PUT URL, then upload the File to S3.
 * Returns null when S3 is not configured (503) so callers can fall back to base64/local.
 */
export async function uploadFileToS3(
    file: File,
    prefix: S3Prefix
): Promise<{ key: string; publicUrl: string } | null> {
    const meta = await fetch("/api/s3/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prefix,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
        }),
    });

    if (meta.status === 503) return null;
    const data = await meta.json();
    if (!meta.ok) throw new Error(data.error || "Failed to get S3 upload URL");

    const put = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
    });
    if (!put.ok) throw new Error(`S3 upload failed (${put.status})`);

    return { key: data.key as string, publicUrl: data.publicUrl as string };
}

export async function isS3Available(): Promise<boolean> {
    try {
        const res = await fetch("/api/s3/presign");
        const data = await res.json();
        return Boolean(data.configured);
    } catch {
        return false;
    }
}
