import { NextRequest, NextResponse } from "next/server";
import { connectDB, requireSession, SyntheticFile } from "@/lib/syntheticAccess";
import { uploadJSON, uploadBuffer, isS3Configured } from "@/utils/s3";
import ProfileData from "@/models/ProfileData";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    if (auth.session.role !== "admin") {
        return NextResponse.json(
            { error: "Forbidden. Admin access required." },
            { status: 403 }
        );
    }

    if (!isS3Configured()) {
        return NextResponse.json(
            { error: "AWS S3 is not configured in environment variables." },
            { status: 400 }
        );
    }

    try {
        await connectDB();
        
        // 1. Migrate Synthetic Files
        const files = await SyntheticFile.find({
            $or: [
                { s3Key: { $exists: false } },
                { s3Key: "" },
                { s3Key: null }
            ]
        });

        let migratedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const file of files) {
            try {
                const fileId = String(file._id);
                const s3Key = `synthetic/${file.userId}/${fileId}.json`;

                const payload = {
                    data: Array.isArray(file.data) ? file.data : [],
                    textContent: typeof file.textContent === "string" ? file.textContent : ""
                };

                // Upload payload to S3
                await uploadJSON(s3Key, payload);

                // Update document in MongoDB (clear payload to save space)
                file.s3Key = s3Key;
                file.data = [];
                file.textContent = "";
                await file.save();

                migratedCount++;
            } catch (err: any) {
                errorCount++;
                errors.push(`File ${file._id} (${file.filename}): ${err.message || err}`);
            }
        }

        // 2. Migrate Profile Photos (Base64 to S3)
        const profiles = await ProfileData.find({
            profilePhoto: { $exists: true, $ne: "" },
            $or: [
                { profilePhotoKey: { $exists: false } },
                { profilePhotoKey: "" },
                { profilePhotoKey: null }
            ]
        });

        let profileMigratedCount = 0;
        let profileErrorCount = 0;

        for (const profile of profiles) {
            try {
                const photoData = profile.profilePhoto;
                if (photoData && (photoData.startsWith("data:") || photoData.includes(";base64,"))) {
                    const match = photoData.match(/^data:(image\/[a-zA-Z+]+);base64,/);
                    const mimeType = match ? match[1] : "image/png";
                    const extension = mimeType.split("/")[1] || "png";
                    const cleanBase64 = photoData.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
                    const buffer = Buffer.from(cleanBase64, "base64");

                    const s3Key = `profile-photos/${profile.identifier}/avatar.${extension}`;
                    
                    const result = await uploadBuffer({
                        key: s3Key,
                        body: buffer,
                        contentType: mimeType
                    });

                    profile.profilePhotoKey = s3Key;
                    profile.profilePhotoUrl = result.url;
                    profile.profilePhoto = result.url; // Use S3 URL instead of Base64
                    await profile.save();
                    
                    profileMigratedCount++;
                }
            } catch (err: any) {
                profileErrorCount++;
                errors.push(`Profile ${profile.identifier}: ${err.message || err}`);
            }
        }

        return NextResponse.json({
            ok: true,
            syntheticFiles: {
                totalFound: files.length,
                migratedCount,
                errorCount
            },
            profilePhotos: {
                totalFound: profiles.length,
                migratedCount: profileMigratedCount,
                errorCount: profileErrorCount
            },
            errors
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Migration failed" },
            { status: 500 }
        );
    }
}
