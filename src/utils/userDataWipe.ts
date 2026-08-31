import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import ProfileData from "@/models/ProfileData";
import CloudSession from "@/models/CloudSession";
import Scorecard from "@/models/Scorecard";
import Roadmap from "@/models/Roadmap";
import JobApplication from "@/models/JobApplication";
import Notification from "@/models/Notification";
import CoachBooking from "@/models/CoachBooking";
import CommunityMessage from "@/models/CommunityMessage";
import Feedback from "@/models/Feedback";
import SyntheticFile from "@/models/SyntheticFile";
import SyntheticFolder from "@/models/SyntheticFolder";
import {
    isS3Configured,
    pingS3,
    deleteObject,
    deleteS3ObjectsBulk,
    listS3Objects,
    getS3ProfileKey,
    getLegacyS3ProfileKey,
    getS3ResumesKey,
    getLegacyS3ResumesKey,
    getS3SessionsKey,
    getLegacyS3SessionsKey,
    getS3PrepPacksKey,
} from "@/utils/s3";
import { redactLogIdentifier } from "@/utils/pii";

function safeUserSegment(identifier: string): string {
    return identifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

async function deleteS3Prefix(prefix: string): Promise<void> {
    try {
        const { contents } = await listS3Objects(prefix);
        if (contents.length > 0) {
            await deleteS3ObjectsBulk(contents);
        }
    } catch (err) {
        console.warn("S3 prefix delete skipped for", prefix, err);
    }
}

/**
 * Removes user-owned Mongo + S3 artifacts. Does not delete the account document itself.
 */
export async function wipeUserOwnedData(identifier: string): Promise<void> {
    await connectDB();

    await Promise.allSettled([
        ProfileData.findOneAndDelete({ identifier }),
        CloudSession.findOneAndDelete({ identifier }),
        Scorecard.deleteMany({ ownerIdentifier: identifier }),
        Roadmap.deleteMany({ userIdentifier: identifier }),
        JobApplication.deleteMany({ identifier }),
        Notification.deleteMany({ userIdentifier: identifier }),
        CoachBooking.deleteMany({ userIdentifier: identifier }),
        CommunityMessage.deleteMany({ senderId: identifier }),
        Feedback.deleteMany({ userIdentifier: identifier }),
        SyntheticFile.deleteMany({ userId: identifier }),
        SyntheticFolder.deleteMany({ userId: identifier }),
    ]);

    if (!isS3Configured()) return;
    const ping = await pingS3();
    if (!ping.ok) {
        console.warn("S3 wipe skipped; ping failed for", redactLogIdentifier(identifier));
        return;
    }

    const safe = safeUserSegment(identifier);
    const keys = [
        getS3ProfileKey(identifier),
        getLegacyS3ProfileKey(identifier),
        getS3ResumesKey(identifier),
        getLegacyS3ResumesKey(identifier),
        getS3SessionsKey(identifier),
        getLegacyS3SessionsKey(identifier),
        getS3PrepPacksKey(identifier),
    ];
    await Promise.allSettled(keys.map((k) => deleteObject(k).catch(() => undefined)));

    const prefixes = [
        `profiles/${safe}/`,
        `profile_details/${safe}/`,
        `resumes/${safe}/`,
        `resume_builder_resumes/${safe}/`,
        `interview_history_and_performance_records/${safe}/`,
        `sessions/${safe}/`,
        `prep-packs/${safe}/`,
        `uploads/${safe}/`,
        `profile-photos/${safe}/`,
        `synthetic/${safe}/`,
        `job_applications/${safe}/`,
    ];
    for (const prefix of prefixes) {
        await deleteS3Prefix(prefix);
    }
}

export async function deleteAccountRecord(
    identifier: string,
    accountType: string
): Promise<void> {
    await connectDB();
    if (accountType === "admin") {
        await OrgAdmin.findOneAndDelete({ identifier });
        await OrgEmployee.deleteMany({ adminId: identifier });
        return;
    }
    if (accountType === "employee") {
        await OrgEmployee.findOneAndDelete({ identifier });
        return;
    }
    await User.findOneAndDelete({ identifier });
}
