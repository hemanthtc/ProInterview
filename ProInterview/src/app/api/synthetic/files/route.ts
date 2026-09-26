import { NextRequest, NextResponse } from "next/server";
import {
    connectDB,
    requireSession,
    getOwnerName,
    buildFilePayload,
    serializeFile,
    SyntheticFile,
    hydrateFilePayload,
} from "@/lib/syntheticAccess";
import { uploadJSON, isS3Configured, pingS3 } from "@/utils/s3";

export async function GET(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const userId = auth.session.identifier;
        const { searchParams } = new URL(req.url);
        const parentId = searchParams.get("parentId") || null;
        const folderId = searchParams.get("folderId") || null;
        const type = searchParams.get("type") || null;
        const scope = searchParams.get("scope"); // "my" | "public" | "all"
        const search = searchParams.get("search");
        const favorite = searchParams.get("favorite");

        const targetFolder = folderId || (parentId && parentId !== "all" && parentId !== "root" ? parentId : null);

        let query: any = {};

        if (targetFolder) {
            // Specific user folder
            query = { userId, folderId: targetFolder };
        } else if (parentId === "root") {
            if (scope === "my" || scope === "private") {
                query = { userId, folderId: { $in: [null, ""] } };
            } else if (scope === "public") {
                query = { visibility: "public" };
            } else {
                query = {
                    $or: [
                        { userId, folderId: { $in: [null, ""] } },
                        { visibility: "public" },
                    ],
                };
            }
        } else {
            // General / All Files view
            if (scope === "my" || scope === "private") {
                query = { userId };
            } else if (scope === "public") {
                query = { visibility: "public" };
            } else {
                // Default: Include user's own files + all public files created by others
                query = {
                    $or: [
                        { userId },
                        { visibility: "public" },
                    ],
                };
            }
        }

        if (type) {
            query.contentType = type;
        }

        if (favorite === "true") {
            query.userId = userId;
            query.favorite = true;
            delete query.$or;
            delete query.visibility;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            const searchClause = {
                $or: [
                    { title: regex },
                    { filename: regex },
                    { topic: regex },
                    { tags: regex },
                ],
            };
            if (query.$or) {
                query = {
                    $and: [
                        { $or: query.$or },
                        searchClause,
                    ],
                };
                if (type) query.$and.push({ contentType: type });
            } else {
                query.$and = [searchClause];
                if (type) query.$and.push({ contentType: type });
            }
        }

        const files = await SyntheticFile.find(query).sort({ modifiedAt: -1 });

        return NextResponse.json(files.map((f) => serializeFile(f, userId)));
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to list files" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    try {
        await connectDB();
        const body = await req.json();
        const userId = auth.session.identifier;
        const ownerName = await getOwnerName(userId);
        const payload = buildFilePayload(body || {}, userId, ownerName);
        
        const created = await SyntheticFile.create(payload);

        let savedInS3 = false;
        if (isS3Configured()) {
            const ping = await pingS3().catch(() => ({ ok: false }));
            if (ping.ok) {
                const fileId = String(created._id);
                const s3Key = `synthetic/${userId}/${fileId}.json`;
                const s3Payload = {
                    data: Array.isArray(created.data) ? created.data : [],
                    textContent: typeof created.textContent === "string" ? created.textContent : ""
                };
                // Upload actual content to S3
                await uploadJSON(s3Key, s3Payload);

                // Clear MongoDB values and set the S3 key reference
                created.s3Key = s3Key;
                created.data = [];
                created.textContent = "";
                await created.save();
                savedInS3 = true;
            }
        }

        if (!savedInS3) {
            // S3 Offline: save content locally in MongoDB. Ensure s3Key is empty.
            created.s3Key = "";
            await created.save();
        }

        const responseObj = await hydrateFilePayload(created);
        return NextResponse.json(serializeFile(responseObj, userId), { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to create file" },
            { status: 400 }
        );
    }
}
