import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import SyntheticFile from "@/models/SyntheticFile";
import { getVerifiedSession } from "@/utils/auth";

function getUserId(req: NextRequest, session: any): { userId: string; ownerName: string } {
    const userId = session?.identifier || req.headers.get("x-user-identifier") || "guest_user";
    const ownerName = req.headers.get("x-user-name") || session?.identifier?.split("@")[0] || "Anonymous";
    return { userId, ownerName };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const session = await getVerifiedSession();
        const { userId } = getUserId(req, session);
        const { searchParams } = new URL(req.url);
        const scope = searchParams.get("scope") || "mine"; // "mine" | "all"

        let query: any = {};
        if (scope === "mine") {
            query = { userId };
        } else {
            // "all" view: user's own files + all public files
            query = {
                $or: [
                    { userId },
                    { visibility: "public" }
                ]
            };
        }

        const files = await SyntheticFile.find(query).sort({ createdAt: -1 });
        return NextResponse.json(files);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch files" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const session = await getVerifiedSession();
        const { userId, ownerName } = getUserId(req, session);
        const body = await req.json();

        if (!body.title || typeof body.title !== "string") {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const newFile = await SyntheticFile.create({
            userId,
            ownerName: body.ownerName || ownerName,
            visibility: body.visibility === "public" ? "public" : "private",
            folderId: body.folderId || null,
            parentId: body.parentId || null,
            title: body.title.trim(),
            filename: body.filename || `${body.title.trim().toLowerCase().replace(/\s+/g, '_')}.${body.fileType || 'json'}`,
            language: body.language || "JSON",
            fileType: body.fileType || "json",
            contentType: body.contentType || "tabular",
            format: body.format || "json",
            rowCount: Number(body.rowCount || 0),
            data: body.data || [],
            schema: body.schema || [],
            textContent: typeof body.textContent === "string" ? body.textContent : "",
            topic: body.topic || body.title,
            originalPrompt: body.originalPrompt || "",
            aiModel: body.aiModel || "gemini-2.5-flash",
            source: body.source || "generated",
            favorite: Boolean(body.favorite),
            pinned: Boolean(body.pinned),
            description: body.description || "",
            tags: Array.isArray(body.tags) ? body.tags : [],
            timestamp: body.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sizeBytes: Number(body.sizeBytes || 0),
        });

        return NextResponse.json(newFile, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to create file" }, { status: 500 });
    }
}
