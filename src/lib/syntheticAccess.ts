import connectDB from "@/utils/db";
import { getVerifiedSession, SessionPayload } from "@/utils/auth";
import User from "@/models/User";
import SyntheticFile, { ISyntheticFile } from "@/models/SyntheticFile";
import SyntheticFolder, { ISyntheticFolder } from "@/models/SyntheticFolder";
import { NextResponse } from "next/server";
import { getJSON, isS3Configured } from "@/utils/s3";

export async function requireSession(): Promise<
    { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse }
> {
    const session = await getVerifiedSession();
    if (!session) {
        return {
            error: NextResponse.json(
                { error: "Unauthorized. Please sign in to use Synthetic Data storage." },
                { status: 401 }
            ),
        };
    }
    return { session };
}

export async function getOwnerName(userId: string): Promise<string> {
    try {
        await connectDB();
        const user = await User.findOne({ identifier: userId }).select("displayName identifier").lean();
        if (user?.displayName) return user.displayName;
        return userId.split("@")[0] || userId;
    } catch {
        return userId.split("@")[0] || userId;
    }
}

export function canReadFile(file: Pick<ISyntheticFile, "userId" | "visibility">, userId: string): boolean {
    return file.userId === userId || file.visibility === "public";
}

export function canWriteFile(file: Pick<ISyntheticFile, "userId">, userId: string): boolean {
    return file.userId === userId;
}

export function canReadFolder(folder: Pick<ISyntheticFolder, "userId">, userId: string): boolean {
    // Folders are never publicly shared — only the owner can browse folder structure.
    return folder.userId === userId;
}

export function canWriteFolder(folder: Pick<ISyntheticFolder, "userId">, userId: string): boolean {
    return folder.userId === userId;
}

/** Case-insensitive sibling uniqueness within the same type tree. */
export async function findSiblingFolderConflict(opts: {
    userId: string;
    parentId: string | null;
    type: "tabular" | "document";
    name: string;
    excludeId?: string;
}) {
    const name = opts.name.trim();
    if (!name) return null;

    const siblings = await SyntheticFolder.find({
        userId: opts.userId,
        parentId: opts.parentId || null,
        type: opts.type,
        ...(opts.excludeId ? { _id: { $ne: opts.excludeId } } : {}),
    }).lean();

    return (
        siblings.find((f) => String(f.name || "").trim().toLowerCase() === name.toLowerCase()) ||
        null
    );
}

export function siblingFolderConflictMessage(
    type: "tabular" | "document",
    name: string
): string {
    const label = type === "document" ? "Document" : "Tabular";
    return `A "${label}" folder named "${name}" already exists here.`;
}

function estimateSize(file: {
    sizeBytes?: number;
    textContent?: string;
    data?: any;
}): number {
    if (typeof file.sizeBytes === "number" && file.sizeBytes > 0) return file.sizeBytes;
    const payload =
        typeof file.textContent === "string" && file.textContent.length > 0
            ? file.textContent
            : (file.data ?? "");
    try {
        return Buffer.byteLength(
            typeof payload === "string" ? payload : JSON.stringify(payload),
            "utf8"
        );
    } catch {
        return 0;
    }
}

export async function hydrateFilePayload(file: any) {
    if (file && file.s3Key && isS3Configured()) {
        try {
            const s3Payload = await getJSON<{ data: any[]; textContent: string }>(file.s3Key);
            file.data = s3Payload.data;
            file.textContent = s3Payload.textContent;
        } catch (err) {
            console.error(`Failed to hydrate S3 payload for file ${file._id}:`, err);
        }
    }
    return file;
}

export function serializeFile(doc: any, currentUserId: string) {
    const obj = typeof doc.toObject === "function" ? doc.toObject({ virtuals: false }) : doc;
    const id = String(obj._id || obj.id);
    const isOwner = obj.userId === currentUserId;
    const schemaFields = Array.isArray(obj.schemaFields)
        ? obj.schemaFields
        : Array.isArray(obj.schema)
          ? obj.schema
          : [];
    // Public file isolation: never expose another user's private folder structure.
    // Non-owners see the file flat in All Files (no parent folder id/path).
    const folderId = isOwner ? obj.folderId || null : null;
    return {
        id,
        userId: obj.userId,
        ownerName: obj.ownerName || "",
        visibility: obj.visibility || "private",
        isOwner,
        readOnly: !isOwner,
        filename: obj.filename,
        topic: obj.topic || obj.title || "",
        timestamp:
            obj.timestamp ||
            (obj.createdAt
                ? new Date(obj.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : ""),
        format: obj.format || "json",
        rowCount: Number(obj.rowCount || (Array.isArray(obj.data) ? obj.data.length : 0)),
        data: Array.isArray(obj.data) ? obj.data : [],
        schema: schemaFields,
        title: obj.title || obj.topic || obj.filename || "Untitled",
        language: obj.language || "JSON",
        folderId,
        fileType: obj.fileType || "json",
        createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : undefined,
        modifiedAt: obj.modifiedAt ? new Date(obj.modifiedAt).toISOString() : undefined,
        description: obj.description || "",
        tags: Array.isArray(obj.tags) ? obj.tags : [],
        favorite: Boolean(obj.favorite),
        pinned: Boolean(obj.pinned),
        originalPrompt: obj.originalPrompt || "",
        aiModel: obj.aiModel || "gemini-flash-latest",
        source: obj.source || "generated",
        parentId: obj.parentId || null,
        textContent: typeof obj.textContent === "string" ? obj.textContent : "",
        sizeBytes: Number(obj.sizeBytes || 0),
        contentType: obj.contentType || "tabular",
    };
}

export function serializeFolder(doc: any, currentUserId: string, extras?: { totalFiles?: number; totalSize?: number; childFolders?: number }) {
    const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
    const id = String(obj._id || obj.id);
    const isOwner = obj.userId === currentUserId;
    return {
        id,
        userId: obj.userId,
        ownerName: obj.ownerName || "",
        visibility: obj.visibility || "private",
        isOwner,
        readOnly: !isOwner,
        name: obj.name,
        parentId: obj.parentId || null,
        type: obj.type === "document" ? "document" : "tabular",
        createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : undefined,
        modifiedAt: obj.modifiedAt ? new Date(obj.modifiedAt).toISOString() : undefined,
        favorite: Boolean(obj.favorite),
        isSystem: false,
        description: obj.description || "",
        totalFiles: extras?.totalFiles ?? 0,
        totalSize: extras?.totalSize ?? 0,
        childFolders: extras?.childFolders ?? 0,
    };
}

export function buildFilePayload(input: any, userId: string, ownerName: string) {
    const now = new Date();
    const fileType = String(input.fileType || input.format || "json").replace(/^\./, "").toLowerCase();
    const contentType =
        input.contentType ||
        (input.format === "markdown" ? "document" : input.textContent ? "code" : "tabular");
    const title = input.title || input.topic || input.filename || "Untitled";
    const data = Array.isArray(input.data) ? input.data : [];
    const schemaFields = Array.isArray(input.schemaFields)
        ? input.schemaFields
        : Array.isArray(input.schema)
          ? input.schema
          : [];
    const tags = Array.isArray(input.tags) ? input.tags.filter((t: any) => typeof t === "string") : [];

    const payload: Record<string, any> = {
        userId,
        ownerName,
        visibility: input.visibility === "public" ? "public" : "private",
        folderId: input.folderId || null,
        title: String(title).slice(0, 200),
        filename: String(input.filename || `${title}.${fileType === "markdown" ? "md" : fileType}`).slice(0, 240),
        topic: input.topic || title,
        fileType,
        language: input.language || (contentType === "document" ? "Markdown" : contentType === "code" ? "Text" : "JSON"),
        contentType,
        format: input.format || (contentType === "document" ? "markdown" : contentType === "code" ? fileType : "json"),
        data,
        schemaFields,
        textContent: typeof input.textContent === "string" ? input.textContent : "",
        favorite: Boolean(input.favorite),
        pinned: Boolean(input.pinned),
        tags,
        description: input.description || "",
        originalPrompt: input.originalPrompt || input.topic || "",
        aiModel: input.aiModel || "gemini-flash-latest",
        source: input.source || "generated",
        parentId: input.parentId || null,
        rowCount: Number(input.rowCount || data.length || 0),
        timestamp: input.timestamp || now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modifiedAt: now,
    };
    payload.sizeBytes = estimateSize({
        sizeBytes: input.sizeBytes,
        textContent: payload.textContent,
        data: payload.data,
    });
    return payload;
}

export { connectDB, SyntheticFile, SyntheticFolder };
