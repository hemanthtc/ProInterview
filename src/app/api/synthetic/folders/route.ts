import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import SyntheticFolder from "@/models/SyntheticFolder";
import { getVerifiedSession } from "@/utils/auth";

function getUserId(req: NextRequest, session: any): string {
    if (session?.identifier) return session.identifier;
    const headerId = req.headers.get("x-user-identifier");
    return headerId || "guest_user";
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);

        const folders = await SyntheticFolder.find({ userId }).sort({ createdAt: -1 });
        return NextResponse.json(folders);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch folders" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const session = await getVerifiedSession();
        const userId = getUserId(req, session);
        const body = await req.json();

        if (!body.name || typeof body.name !== "string") {
            return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        const newFolder = await SyntheticFolder.create({
            userId,
            name: body.name.trim(),
            parentId: body.parentId || null,
            type: body.type === "document" ? "document" : "tabular",
            favorite: Boolean(body.favorite),
            description: body.description || "",
        });

        return NextResponse.json(newFolder, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to create folder" }, { status: 500 });
    }
}
