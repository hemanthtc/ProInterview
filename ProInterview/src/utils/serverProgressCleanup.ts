import connectDB from "@/utils/db";
import CloudSession from "@/models/CloudSession";
import { isS3Configured, deleteObject, getS3FilmRoomKey } from "@/utils/s3";

export const DEFAULT_PROGRESS_RETENTION_DAYS = 30;

/**
 * Server-side auto-cleanup for interview sessions, mock assessments, and S3 Film Room files.
 * Prunes records older than retentionDays (default 30 days).
 */
export async function runProgressAutoCleanup(identifier: string, retentionDays = DEFAULT_PROGRESS_RETENTION_DAYS) {
    if (!identifier || retentionDays <= 0) return { prunedSessions: 0, prunedMocks: 0, prunedS3: 0 };
    
    try {
        await connectDB();
        const doc = await CloudSession.findOne({ identifier });
        if (!doc) return { prunedSessions: 0, prunedMocks: 0, prunedS3: 0 };

        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        let prunedSessions = 0;
        let prunedMocks = 0;
        let prunedS3 = 0;

        // 1. Filter out expired interview sessions & delete associated S3 Film Room records
        const validSessions = (doc.sessions || []).filter((s: any) => {
            const timestamp = s?.timestamp ? Number(s.timestamp) : 0;
            if (timestamp > 0 && timestamp < cutoffTime) {
                prunedSessions++;
                if (isS3Configured()) {
                    const s3Key = getS3FilmRoomKey(identifier, timestamp);
                    deleteObject(s3Key).catch(() => {});
                    prunedS3++;
                }
                return false;
            }
            return true;
        });

        // 2. Filter out expired mock aptitude sessions
        const validMocks = (doc.mockAptitudeSessions || []).filter((m: any) => {
            const timestamp = m?.timestamp ? Number(m.timestamp) : 0;
            if (timestamp > 0 && timestamp < cutoffTime) {
                prunedMocks++;
                return false;
            }
            return true;
        });

        if (prunedSessions > 0 || prunedMocks > 0) {
            doc.sessions = validSessions;
            doc.mockAptitudeSessions = validMocks;
            await doc.save();
        }

        return { prunedSessions, prunedMocks, prunedS3 };
    } catch (err) {
        console.error("runProgressAutoCleanup error:", err);
        return { prunedSessions: 0, prunedMocks: 0, prunedS3: 0 };
    }
}
