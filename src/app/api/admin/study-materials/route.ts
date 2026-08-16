import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, listS3Objects, deleteObject } from "@/utils/s3";
import seedCatalog from "@/data/studyMaterialsSeed.json";

const CATALOG_KEY = "study-materials/index.json";

// Helper to delete all objects under a prefix
async function deleteS3Prefix(prefix: string): Promise<void> {
    if (!isS3Configured()) return;
    const { contents } = await listS3Objects(prefix);
    for (const key of contents) {
        await deleteObject(key);
    }
}

// GET — Retrieve catalog structure
export async function GET() {
    try {
        if (!isS3Configured()) {
            // Fallback to local seed when S3 is not configured
            return NextResponse.json({ catalog: seedCatalog, s3Configured: false });
        }

        try {
            const catalog = await getJSON<any[]>(CATALOG_KEY);
            return NextResponse.json({ catalog, s3Configured: true });
        } catch (err) {
            // If catalog doesn't exist on S3, seed it
            await uploadJSON(CATALOG_KEY, seedCatalog);
            return NextResponse.json({ catalog: seedCatalog, s3Configured: true, seeded: true });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to load study materials catalog" },
            { status: 500 }
        );
    }
}

// POST — Update catalog structure
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized access: Please sign in as an Administrator." },
                { status: 401 }
            );
        }

        const { catalog } = await req.json();
        if (!Array.isArray(catalog)) {
            return NextResponse.json({ error: "Invalid catalog format: must be an array." }, { status: 400 });
        }

        if (isS3Configured()) {
            await uploadJSON(CATALOG_KEY, catalog);
            return NextResponse.json({ success: true, catalog, s3Configured: true });
        } else {
            return NextResponse.json({ error: "S3 is not configured. Cannot save catalog." }, { status: 503 });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to update study materials catalog" },
            { status: 500 }
        );
    }
}

// DELETE — Delete a specific folder prefix in S3 (e.g. course, subject, or chapter)
export async function DELETE(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized access: Please sign in as an Administrator." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const prefix = searchParams.get("prefix");

        if (!prefix || !prefix.startsWith("study-materials/")) {
            return NextResponse.json({ error: "Invalid or missing prefix parameter." }, { status: 400 });
        }

        if (!isS3Configured()) {
            return NextResponse.json({ error: "S3 is not configured. Cannot delete prefix." }, { status: 503 });
        }

        // Recursively delete all objects under the prefix (e.g., study-materials/cs_engineering/dsa/arrays/)
        await deleteS3Prefix(prefix);

        return NextResponse.json({ success: true, prefix });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to delete S3 folder prefix" },
            { status: 500 }
        );
    }
}
