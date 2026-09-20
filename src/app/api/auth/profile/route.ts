import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgAdmin from "@/models/OrgAdmin";
import OrgEmployee from "@/models/OrgEmployee";
import ProfileData from "@/models/ProfileData";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, deleteObject, pingS3, getS3ProfileKey, getLegacyS3ProfileKey } from "@/utils/s3";
import { redactLogIdentifier } from "@/utils/pii";
import { jsonError } from "@/utils/http";
import { wipeUserOwnedData, deleteAccountRecord } from "@/utils/userDataWipe";

function getModel(accountType: string): mongoose.Model<any> {
    switch (accountType) {
        case "admin":    return OrgAdmin;
        case "employee": return OrgEmployee;
        default:         return User;
    }
}

async function verifyUserAccess(req: NextRequest, targetIdentifier: string) {
    const session = await getVerifiedSession();
    if (!session) return false;
    return targetIdentifier.trim().toLowerCase() === session.identifier.trim().toLowerCase();
}


// Auto-migration helper: reconciles offline MongoDB profile cache into S3 and deletes it from MongoDB
async function migrateMongoProfileToS3(userIdentifier: string, key: string, s3Profile: any): Promise<any> {
    try {
        await connectDB();
        const profile = await ProfileData.findOne({ identifier: userIdentifier });
        if (profile) {
            console.log(`Migrating MongoDB profile details to S3 for ${redactLogIdentifier(userIdentifier)}...`);
            const merged = {
                ...s3Profile,
                profilePhoto: profile.profilePhotoUrl || profile.profilePhoto || s3Profile.profilePhoto || "",
                profilePhotoKey: profile.profilePhotoKey || s3Profile.profilePhotoKey || "",
                profilePhotoUrl: profile.profilePhotoUrl || s3Profile.profilePhotoUrl || "",
                additionalEmail: profile.additionalEmail || s3Profile.additionalEmail || "",
                github: profile.github || s3Profile.github || "",
                linkedin: profile.linkedin || s3Profile.linkedin || "",
                portfolioUrl: profile.portfolioUrl || s3Profile.portfolioUrl || "",
                resumeCvName: profile.resumeCvName || s3Profile.resumeCvName || "",
                resumeCvText: profile.resumeCvText || s3Profile.resumeCvText || "",
                resumeCvKey: profile.resumeCvKey || s3Profile.resumeCvKey || "",
                resumeCvUrl: profile.resumeCvUrl || s3Profile.resumeCvUrl || "",
                phone: profile.phone || s3Profile.phone || "",
                educationData: profile.educationData || s3Profile.educationData || {},
            };
            await uploadJSON(key, merged);
            await ProfileData.findOneAndDelete({ identifier: userIdentifier });
            console.log("Successfully migrated profile to S3 and deleted temporary MongoDB record.");
            return merged;
        }
    } catch (err) {
        console.error("Failed to migrate MongoDB profile to S3:", err);
    }
    return s3Profile;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const session = await getVerifiedSession();
        const identifier = searchParams.get("identifier") || session?.identifier;
        const accountType = searchParams.get("accountType") || (session as any)?.accountType || "user";

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        const isAuthorized = await verifyUserAccess(req, identifier);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier }).select("-password");
        if (!account) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        if (accountType === "admin" || accountType === "employee") {
            account.isOnline = true;
            account.lastActive = new Date();
            await account.save();
        } else if (accountType === "user") {
            const { checkAndDegradeSubscription } = await import("@/utils/subscription");
            await checkAndDegradeSubscription(account);
        }

        let profile: any = null;
        if (accountType === "user") {
            if (isS3Configured()) {
                const ping = await pingS3();
                if (ping.ok) {
                    const key = getS3ProfileKey(identifier);
                    let s3Profile: any = {};
                    let keyUsed = key;
                    try {
                        s3Profile = await getJSON<any>(key);
                    } catch (err: any) {
                        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
                            // Try legacy profile key
                            const legacyKey = getLegacyS3ProfileKey(identifier);
                            try {
                                s3Profile = await getJSON<any>(legacyKey);
                                // Migrate legacy to new key
                                await uploadJSON(key, s3Profile);
                                await deleteObject(legacyKey).catch(() => {});
                                keyUsed = key;
                            } catch (legacyErr) {
                                // Profile JSON does not exist yet in S3
                            }
                        } else {
                            throw err;
                        }
                    }

                    profile = await migrateMongoProfileToS3(identifier, keyUsed, s3Profile);
                }
            }

            if (!profile) {
                profile = await ProfileData.findOne({ identifier });
            }
        }

        return NextResponse.json({
            success: true,
            user: {
                identifier: account.identifier,
                displayName: account.displayName,
                type: account.type,
                isOrganization: accountType !== "user",
                orgRole: accountType === "admin" ? "admin" : accountType === "employee" ? "employee" : "user",
                subscriptionPlan: account.subscriptionPlan,
                billingCycle: account.billingCycle,
                subscriptionStartedAt: account.subscriptionStartedAt,
                subscriptionExpiresAt: account.subscriptionExpiresAt,
                createdAt: account.createdAt,
                organizationName: (account as any).organizationName || "",
                department: (account as any).department || "",
                adminId: (account as any).adminId || "",
                profilePhoto: profile?.profilePhotoUrl || profile?.profilePhoto || "",
                profilePhotoKey: profile?.profilePhotoKey || "",
                profilePhotoUrl: profile?.profilePhotoUrl || "",
                additionalEmail: profile?.additionalEmail || "",
                github: profile?.github || "",
                linkedin: profile?.linkedin || "",
                portfolioUrl: profile?.portfolioUrl || "",
                resumeCvName: profile?.resumeCvName || "",
                resumeCvText: profile?.resumeCvText || "",
                resumeCvKey: profile?.resumeCvKey || "",
                resumeCvUrl: profile?.resumeCvUrl || "",
                phone: profile?.phone || "",
                educationData: profile?.educationData || {},
            }
        });
    } catch (error: any) {
        console.error("GET Profile API error:", error);
        const sanitizedMessage = process.env.NODE_ENV === "production" ? "Internal server error." : (error.message || "Internal server error");
        return NextResponse.json({ error: sanitizedMessage }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const {
            identifier,
            accountType = "user",
            displayName,
            subscriptionPlan,
            organizationName,
            department,
            profilePhoto,
            profilePhotoKey,
            profilePhotoUrl,
            additionalEmail,
            github,
            linkedin,
            portfolioUrl,
            resumeCvName,
            resumeCvText,
            resumeCvKey,
            resumeCvUrl,
            phone,
            educationData
        } = body;

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        const isAuthorized = await verifyUserAccess(req, identifier);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });
        if (!account) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        const session = await getVerifiedSession();
        if (subscriptionPlan !== undefined && subscriptionPlan !== account.subscriptionPlan) {
            if (!session || session.role !== "admin") {
                return NextResponse.json({ error: "Cannot manually alter subscription plan." }, { status: 403 });
            }
        }

        if (displayName !== undefined) account.displayName = displayName;
        if (subscriptionPlan !== undefined) {
            account.subscriptionPlan = subscriptionPlan;
            if (subscriptionPlan === "Free Tier") {
                account.subscriptionStartedAt = null;
                account.subscriptionExpiresAt = null;
                account.billingCycle = null;
            } else {
                const now = new Date();
                account.subscriptionStartedAt = now;
                const expiresAt = new Date(now);
                if (account.billingCycle === "yearly") {
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                } else {
                    expiresAt.setDate(expiresAt.getDate() + 30);
                }
                account.subscriptionExpiresAt = expiresAt;
            }
        } else if (accountType === "user") {
            const { checkAndDegradeSubscription } = await import("@/utils/subscription");
            await checkAndDegradeSubscription(account);
        }
        if (organizationName !== undefined && accountType !== "user") (account as any).organizationName = organizationName;
        if (department !== undefined && accountType === "employee") (account as any).department = department;
        await account.save();

        let updatedProfile: any = null;
        if (accountType === "user") {
            if (isS3Configured()) {
                const ping = await pingS3();
                if (ping.ok) {
                    const key = getS3ProfileKey(identifier);
                    let s3Profile: any = {};
                    let isLegacyPresent = false;
                    const legacyKey = getLegacyS3ProfileKey(identifier);
                    try {
                        s3Profile = await getJSON<any>(key);
                    } catch (err: any) {
                        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
                            try {
                                s3Profile = await getJSON<any>(legacyKey);
                                isLegacyPresent = true;
                            } catch (legacyErr) {
                                // Not present
                            }
                        } else {
                            throw err;
                        }
                    }

                    // Migrate MongoDB lingering temporary data first if present
                    s3Profile = await migrateMongoProfileToS3(identifier, key, s3Profile);

                    // Apply incoming updates
                    updatedProfile = {
                        ...s3Profile,
                        ...(profilePhoto !== undefined ? { profilePhoto } : {}),
                        ...(profilePhotoKey !== undefined ? { profilePhotoKey } : {}),
                        ...(profilePhotoUrl !== undefined ? { profilePhotoUrl } : {}),
                        ...(additionalEmail !== undefined ? { additionalEmail } : {}),
                        ...(github !== undefined ? { github } : {}),
                        ...(linkedin !== undefined ? { linkedin } : {}),
                        ...(portfolioUrl !== undefined ? { portfolioUrl } : {}),
                        ...(resumeCvName !== undefined ? { resumeCvName } : {}),
                        ...(resumeCvText !== undefined ? { resumeCvText } : {}),
                        ...(resumeCvKey !== undefined ? { resumeCvKey } : {}),
                        ...(resumeCvUrl !== undefined ? { resumeCvUrl } : {}),
                        ...(phone !== undefined ? { phone } : {}),
                        ...(educationData !== undefined ? { educationData } : {}),
                    };

                    await uploadJSON(key, updatedProfile);
                    if (isLegacyPresent) {
                        await deleteObject(legacyKey).catch(() => {});
                    }

                    // Ensure temporary Mongo collection remains empty
                    await ProfileData.findOneAndDelete({ identifier });
                }
            }

            if (!updatedProfile) {
                // S3 Offline: fallback to saving in MongoDB ProfileData
                const profileUpdateFields: Record<string, unknown> = {};
                if (profilePhoto !== undefined)      profileUpdateFields.profilePhoto = profilePhoto;
                if (profilePhotoKey !== undefined)   profileUpdateFields.profilePhotoKey = profilePhotoKey;
                if (profilePhotoUrl !== undefined)   profileUpdateFields.profilePhotoUrl = profilePhotoUrl;
                if (additionalEmail !== undefined)   profileUpdateFields.additionalEmail = additionalEmail;
                if (github !== undefined)            profileUpdateFields.github = github;
                if (linkedin !== undefined)          profileUpdateFields.linkedin = linkedin;
                if (portfolioUrl !== undefined)      profileUpdateFields.portfolioUrl = portfolioUrl;
                if (resumeCvName !== undefined)      profileUpdateFields.resumeCvName = resumeCvName;
                if (resumeCvText !== undefined)      profileUpdateFields.resumeCvText = resumeCvText;
                if (resumeCvKey !== undefined)       profileUpdateFields.resumeCvKey = resumeCvKey;
                if (resumeCvUrl !== undefined)       profileUpdateFields.resumeCvUrl = resumeCvUrl;
                if (phone !== undefined)             profileUpdateFields.phone = phone;
                if (educationData !== undefined)     profileUpdateFields.educationData = educationData;

                updatedProfile = await ProfileData.findOneAndUpdate(
                    { identifier },
                    { $set: profileUpdateFields },
                    { upsert: true, returnDocument: 'after' }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                identifier: account.identifier,
                displayName: account.displayName,
                type: account.type,
                isOrganization: accountType !== "user",
                orgRole: accountType === "admin" ? "admin" : accountType === "employee" ? "employee" : "user",
                subscriptionPlan: account.subscriptionPlan,
                billingCycle: account.billingCycle,
                subscriptionStartedAt: account.subscriptionStartedAt,
                subscriptionExpiresAt: account.subscriptionExpiresAt,
                createdAt: account.createdAt,
                organizationName: (account as any).organizationName || "",
                department: (account as any).department || "",
                adminId: (account as any).adminId || "",
                profilePhoto: updatedProfile?.profilePhotoUrl || updatedProfile?.profilePhoto || "",
                profilePhotoKey: updatedProfile?.profilePhotoKey || "",
                profilePhotoUrl: updatedProfile?.profilePhotoUrl || "",
                additionalEmail: updatedProfile?.additionalEmail || "",
                github: updatedProfile?.github || "",
                linkedin: updatedProfile?.linkedin || "",
                portfolioUrl: updatedProfile?.portfolioUrl || "",
                resumeCvName: updatedProfile?.resumeCvName || "",
                resumeCvText: updatedProfile?.resumeCvText || "",
                resumeCvKey: updatedProfile?.resumeCvKey || "",
                resumeCvUrl: updatedProfile?.resumeCvUrl || "",
                phone: updatedProfile?.phone || "",
                educationData: updatedProfile?.educationData || {},
            }
        });
    } catch (error: any) {
        console.error("POST Profile API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        let identifier = searchParams.get("identifier") || "";
        let accountType = searchParams.get("accountType") || "user";
        let mode = searchParams.get("mode") || "account";
        let password = searchParams.get("password") || "";

        try {
            const body = await req.json();
            if (body && typeof body === "object") {
                if (body.identifier) identifier = String(body.identifier);
                if (body.accountType) accountType = String(body.accountType);
                if (body.mode) mode = String(body.mode);
                if (body.password) password = String(body.password);
            }
        } catch {}

        if (!identifier) {
            return NextResponse.json({ error: "User identifier is required." }, { status: 400 });
        }

        const isAuthorized = await verifyUserAccess(req, identifier);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const Model = getModel(accountType);
        const account = await Model.findOne({ identifier });
        if (!account) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        if (account.password) {
            if (!password) {
                return NextResponse.json({ error: "Password is required for confirmation." }, { status: 400 });
            }
            const isMatch = await bcryptjs.compare(password, account.password);
            if (!isMatch) {
                return NextResponse.json({ error: "Incorrect password. Verification failed." }, { status: 401 });
            }
        }

        await wipeUserOwnedData(identifier);

        if (mode === "data_only") {
            return NextResponse.json({
                success: true,
                message: "All generated profile and resume data wiped successfully from the database and S3."
            });
        }

        await deleteAccountRecord(identifier, accountType);
        return NextResponse.json({
            success: true,
            message: "Account and profile data deleted successfully from the database and S3."
        });
    } catch (error: unknown) {
        console.error("DELETE Profile API error:", error);
        return jsonError(error, 500, "Internal server error");
    }
}
