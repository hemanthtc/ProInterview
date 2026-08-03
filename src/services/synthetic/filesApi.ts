import { getStorageItem } from "@/utils/storage";

export interface CustomFolder {
    _id?: string;
    id?: string;
    name: string;
    parentId?: string | null;
    type?: "tabular" | "document";
    createdAt?: string;
    modifiedAt?: string;
    favorite?: boolean;
    isSystem?: boolean;
    description?: string;
}

export interface GeneratedFile {
    _id?: string;
    id?: string;
    userId?: string;
    ownerName?: string;
    visibility?: "private" | "public";
    title: string;
    filename: string;
    language?: string;
    fileType: string;
    createdAt?: string;
    modifiedAt?: string;
    description?: string;
    tags?: string[];
    favorite?: boolean;
    pinned?: boolean;
    originalPrompt?: string;
    aiModel?: string;
    source?: string;
    parentId?: string | null;
    folderId?: string | null;
    contentType?: string;
    format?: string;
    rowCount?: number;
    data?: any[];
    schema?: any[];
    textContent?: string;
    topic?: string;
    timestamp?: string;
    sizeBytes?: number;
}

const API_BASE = "/api/synthetic";

function getUserHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const userId = getStorageItem("userIdentifier") || localStorage.getItem("userIdentifier") || "guest_user";
    const userName = getStorageItem("userName") || localStorage.getItem("userName") || "Anonymous";
    return {
        "x-user-identifier": userId,
        "x-user-name": userName,
    };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            headers: {
                ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
                ...getUserHeaders(),
                ...init?.headers,
            },
            ...init,
        });
    } catch {
        throw new Error("Synthetic Storage API unreachable.");
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `Request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
}

export async function checkStorageHealth(): Promise<boolean> {
    try {
        const data = await request<{ ok: boolean }>("/health");
        return Boolean(data.ok);
    } catch {
        return false;
    }
}

// Folders API
export async function listFolders(): Promise<CustomFolder[]> {
    const data = await request<any[]>("/folders");
    return data.map(f => ({ ...f, id: f._id || f.id }));
}

export async function createFolder(folder: Partial<CustomFolder>): Promise<CustomFolder> {
    const data = await request<any>("/folders", {
        method: "POST",
        body: JSON.stringify(folder),
    });
    return { ...data, id: data._id || data.id };
}

export async function updateFolder(id: string, patch: Partial<CustomFolder>): Promise<CustomFolder> {
    const data = await request<any>(`/folders/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(patch),
    });
    return { ...data, id: data._id || data.id };
}

export async function deleteFolder(id: string): Promise<void> {
    await request(`/folders/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Files API
export async function listFiles(scope: "mine" | "all" = "mine"): Promise<GeneratedFile[]> {
    const data = await request<any[]>(`/files?scope=${scope}`);
    return data.map(f => ({ ...f, id: f._id || f.id }));
}

export async function getFile(id: string): Promise<GeneratedFile> {
    const data = await request<any>(`/files/${encodeURIComponent(id)}`);
    return { ...data, id: data._id || data.id };
}

export async function createFile(file: Partial<GeneratedFile>): Promise<GeneratedFile> {
    const data = await request<any>("/files", {
        method: "POST",
        body: JSON.stringify(file),
    });
    return { ...data, id: data._id || data.id };
}

export async function updateFile(id: string, patch: Partial<GeneratedFile>): Promise<GeneratedFile> {
    const data = await request<any>(`/files/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(patch),
    });
    return { ...data, id: data._id || data.id };
}

export async function toggleFileVisibility(id: string, visibility: "private" | "public"): Promise<GeneratedFile> {
    const data = await request<any>(`/files/${encodeURIComponent(id)}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ visibility }),
    });
    return { ...data, id: data._id || data.id };
}

export async function deleteFile(id: string): Promise<void> {
    await request(`/files/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function duplicateFile(id: string, folderId?: string | null): Promise<GeneratedFile> {
    const data = await request<any>(`/files/${encodeURIComponent(id)}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ folderId }),
    });
    return { ...data, id: data._id || data.id };
}

export function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
