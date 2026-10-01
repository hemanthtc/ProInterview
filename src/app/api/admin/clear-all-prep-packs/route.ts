import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CloudSession from "@/models/CloudSession";
import { isS3Configured, listS3Objects, deleteS3Object, getJSON, uploadJSON } from "@/utils/s3";
import { getVerifiedSession } from "@/utils/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as an Administrator." }, { status: 403 });
        }

        await connectDB();
        
        // 1. Inspect all MongoDB documents
        const mongoDocs = await CloudSession.find({}).lean();
        const mongoResults: any[] = [];
        
        for (const doc of mongoDocs) {
            if (doc.prepPacks && Array.isArray(doc.prepPacks) && doc.prepPacks.length > 0) {
                mongoResults.push({
                    identifier: doc.identifier,
                    count: doc.prepPacks.length,
                    packs: doc.prepPacks,
                });
            }
        }

        // 2. Inspect S3 objects
        const s3Results: any[] = [];
        if (isS3Configured()) {
            try {
                const prepPackFiles = await listS3Objects("prep-packs/");
                for (const key of prepPackFiles.contents) {
                    try {
                        const content = await getJSON<any>(key);
                        if (content && Array.isArray(content) && content.length > 0) {
                            s3Results.push({ key, count: content.length, packs: content });
                        }
                    } catch (e: any) {
                        s3Results.push({ key, error: e.message });
                    }
                }

                const sessionFiles = await listS3Objects("sessions/");
                for (const key of sessionFiles.contents) {
                    try {
                        const content = await getJSON<any>(key);
                        if (content && content.prepPacks && Array.isArray(content.prepPacks) && content.prepPacks.length > 0) {
                            s3Results.push({ key, count: content.prepPacks.length, packs: content.prepPacks });
                        }
                    } catch (e: any) {
                        // ignore error
                    }
                }
            } catch (s3Err: any) {
                console.error("S3 listing error:", s3Err);
            }
        }

        return NextResponse.json({
            ok: true,
            mongoCount: mongoResults.length,
            mongoResults,
            s3Results,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized access: Please sign in as an Administrator." }, { status: 403 });
        }

        await connectDB();
        
        // 1. Purge ALL MongoDB prepPacks across ALL documents
        const mongoResult = await CloudSession.updateMany(
            {},
            { $set: { prepPacks: [] } }
        );

        // 2. Purge ALL S3 prep-packs objects & legacy prepPacks in sessions
        const s3PurgedKeys: string[] = [];
        if (isS3Configured()) {
            const prepPackFiles = await listS3Objects("prep-packs/");
            for (const key of prepPackFiles.contents) {
                await deleteS3Object(key);
                s3PurgedKeys.push(key);
            }

            const sessionFiles = await listS3Objects("sessions/");
            for (const key of sessionFiles.contents) {
                try {
                    const content = await getJSON<any>(key);
                    if (content && content.prepPacks && content.prepPacks.length > 0) {
                        content.prepPacks = [];
                        await uploadJSON(key, content);
                        s3PurgedKeys.push(`cleared legacy key in ${key}`);
                    }
                } catch (e) {
                    // ignore
                }
            }
        }

        return NextResponse.json({
            ok: true,
            message: "Purged all prep packs from MongoDB and S3 completely.",
            mongoModifiedCount: mongoResult.modifiedCount,
            s3PurgedKeys,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
