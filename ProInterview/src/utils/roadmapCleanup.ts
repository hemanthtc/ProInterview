import connectDB from "@/utils/db";
import Roadmap from "@/models/Roadmap";
import { pushNotification } from "@/utils/usageMeter";

/**
 * Scans roadmaps and cleans up/notifies.
 * - Deletes roadmaps that have passed their expiresAt date.
 * - Sends a notification if a roadmap is expiring in 3 days or less (and hasn't notified yet).
 * If userIdentifier is specified, runs cleanup only for that user.
 */
export async function runRoadmapCleanup(userIdentifier?: string): Promise<{ deletedCount: number; notifiedCount: number }> {
    try {
        await connectDB();
        const now = new Date();
        const queryFilter: Record<string, any> = {};
        if (userIdentifier) {
            queryFilter.userIdentifier = userIdentifier;
        }

        // 1. Delete expired roadmaps
        const deleteFilter = { ...queryFilter, expiresAt: { $lt: now } };
        const deleteResult = await Roadmap.deleteMany(deleteFilter);
        const deletedCount = deleteResult.deletedCount || 0;

        // 2. Identify roadmaps expiring within 3 days (72 hours) that haven't been notified
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const expiryThreshold = new Date(now.getTime() + threeDaysMs);
        
        const notifyFilter = {
            ...queryFilter,
            expiresAt: { $gt: now, $lte: expiryThreshold },
            notifiedNearExpiry: false,
        };

        const soonExpiringRoadmaps = await Roadmap.find(notifyFilter);
        let notifiedCount = 0;

        for (const roadmap of soonExpiringRoadmaps) {
            const timeDiff = roadmap.expiresAt.getTime() - now.getTime();
            const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
            
            // Push warning notification to user notification bell
            await pushNotification({
                userIdentifier: roadmap.userIdentifier,
                kind: "system",
                title: "Learning Roadmap Expiring",
                body: `Your roadmap for "${roadmap.course}" at ${roadmap.company} will auto-delete in ${daysLeft} days. Click to view and extend it.`,
                href: "/features?tool=roadmap_generator",
            });

            roadmap.notifiedNearExpiry = true;
            await roadmap.save();
            notifiedCount++;
        }

        return { deletedCount, notifiedCount };
    } catch (error) {
        console.error("roadmapCleanup error:", error);
        return { deletedCount: 0, notifiedCount: 0 };
    }
}
