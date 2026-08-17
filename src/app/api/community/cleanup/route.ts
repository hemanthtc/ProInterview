import { NextRequest, NextResponse } from "next/server";
import { isS3Configured, deleteObject, uploadJSON } from "@/utils/s3";
import connectDB from "@/utils/db";
import CommunityMessage from "@/models/CommunityMessage";
import { s3GetMessages } from "@/utils/s3Community";
import { DEFAULT_COMMUNITY_CHANNELS } from "@/utils/community";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get("secret") || req.headers.get("x-cron-secret");
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = Date.now();
        const rooms = ["feedback", ...DEFAULT_COMMUNITY_CHANNELS.map(c => c.slug)];
        const report: Record<string, number> = {};

        for (const roomSlug of rooms) {
            const limitHours = roomSlug === "general" ? 24 : 48;
            const limitMs = limitHours * 60 * 60 * 1000;
            let prunedCount = 0;

            // 1. S3 cleanup
            if (isS3Configured()) {
                const rawMessages = await s3GetMessages(roomSlug);
                let changed = false;
                for (const m of rawMessages) {
                    if (m.attachmentUrl && now - Date.parse(m.createdAt) > limitMs) {
                        const url = m.attachmentUrl;
                        const keyIndex = url.indexOf("community/") !== -1 ? url.indexOf("community/") : url.indexOf("feedback/");
                        if (keyIndex !== -1) {
                            const key = url.substring(keyIndex);
                            try {
                                await deleteObject(key);
                            } catch (s3Err) {
                                console.warn(`S3 cleanup failed for key ${key}:`, s3Err);
                            }
                        }
                        m.attachmentUrl = undefined;
                        m.attachmentType = undefined;
                        changed = true;
                        prunedCount++;
                    }
                }
                if (changed) {
                    const key = `community/messages/${roomSlug}.json`;
                    await uploadJSON(key, rawMessages);
                }
            }

            // 2. MongoDB cleanup
            try {
                await connectDB();
                const expiredDate = new Date(now - limitMs);
                const expiredMsgs = await CommunityMessage.find({
                    roomSlug,
                    attachmentUrl: { $ne: null },
                    createdAt: { $lt: expiredDate },
                }).lean();

                if (expiredMsgs.length > 0) {
                    for (const m of expiredMsgs) {
                        if (m.attachmentUrl) {
                            const url = m.attachmentUrl;
                            const keyIndex = url.indexOf("community/") !== -1 ? url.indexOf("community/") : url.indexOf("feedback/");
                            if (keyIndex !== -1) {
                                const key = url.substring(keyIndex);
                                try {
                                    await deleteObject(key);
                                } catch (s3Err) {
                                    console.warn(`S3 cleanup failed for key ${key}:`, s3Err);
                                }
                            }
                        }
                        prunedCount++;
                    }
                    await CommunityMessage.updateMany(
                        {
                            roomSlug,
                            attachmentUrl: { $ne: null },
                            createdAt: { $lt: expiredDate },
                        },
                        {
                            $unset: { attachmentUrl: "", attachmentType: "" },
                        }
                    );
                }
            } catch (mongoErr) {
                console.error("MongoDB cleanup failed:", mongoErr);
            }

            report[roomSlug] = prunedCount;
        }

        return NextResponse.json({ success: true, report });
    } catch (error: unknown) {
        console.error("Cleanup cron failed:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to run cleanup" }, { status: 500 });
    }
}
