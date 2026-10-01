import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import JobApplication from "@/models/JobApplication";
import { isS3Configured, getJSON, uploadJSON, pingS3 } from "@/utils/s3";

function getS3ApplicationsKey(userIdentifier: string): string {
    const safeUser = userIdentifier.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    return `job_applications/${safeUser}/tracked_jobs.json`;
}

// Auto-migration helper: reconciles offline MongoDB cache into S3 and deletes it from MongoDB
async function migrateMongoToS3(userIdentifier: string, key: string, s3List: any[]): Promise<any[]> {
    try {
        await connectDB();
        const mongoRecords = await JobApplication.find({ identifier: userIdentifier });
        if (mongoRecords.length > 0) {
            console.log(`Migrating ${mongoRecords.length} offline records from MongoDB to S3...`);
            const merged = [...s3List];
            for (const record of mongoRecords) {
                const recordObj = {
                    jobId: record.jobId,
                    company: record.company,
                    role: record.role,
                    location: record.location,
                    applyUrl: record.applyUrl,
                    status: record.status,
                    appliedAt: record.appliedAt.toISOString(),
                    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : record.appliedAt.toISOString()
                };
                const idx = merged.findIndex((j) => j.jobId === record.jobId);
                if (idx >= 0) {
                    const s3Date = new Date(merged[idx].updatedAt || merged[idx].appliedAt).getTime();
                    const dbDate = new Date(record.updatedAt || record.appliedAt).getTime();
                    if (dbDate > s3Date) {
                        merged[idx] = recordObj;
                    }
                } else {
                    merged.unshift(recordObj);
                }
            }
            // Save reconciled list to S3
            await uploadJSON(key, merged);
            // Delete temporary cache records from MongoDB
            await JobApplication.deleteMany({ identifier: userIdentifier });
            console.log("Successfully migrated S3 records and cleaned MongoDB temporary cache.");
            return merged;
        }
    } catch (err) {
        console.error("Failed to migrate MongoDB records to S3:", err);
    }
    return s3List;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3ApplicationsKey(session.identifier);
                let s3List: any[] = [];
                try {
                    s3List = await getJSON<any[]>(key);
                } catch (err: any) {
                    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
                        // S3 file does not exist yet
                    } else {
                        throw err;
                    }
                }

                // Check and migrate offline database cache to S3
                s3List = await migrateMongoToS3(session.identifier, key, s3List);

                return NextResponse.json(s3List);
            }
        }

        // MongoDB fallback (capped at 200 applications)
        await connectDB();
        const apps = await JobApplication.find({ identifier: session.identifier }).sort({ appliedAt: -1 }).limit(200);
        return NextResponse.json(apps);
    } catch (error: any) {
        console.error("GET /api/jobs/applications error:", error);
        return NextResponse.json({ error: error.message || "Failed to load tracked jobs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { jobId, company, role, location, applyUrl, status } = body;

        if (!jobId || !company || !role || !location || !applyUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newApp = {
            jobId,
            company,
            role,
            location,
            applyUrl,
            status: status || "pending",
            appliedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3ApplicationsKey(session.identifier);
                let list: any[] = [];
                try {
                    list = await getJSON<any[]>(key);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }

                // Merge and migrate any offline MongoDB entries first
                list = await migrateMongoToS3(session.identifier, key, list);

                const idx = list.findIndex((j) => j.jobId === jobId);
                if (idx >= 0) {
                    list[idx] = {
                        ...list[idx],
                        status: newApp.status,
                        updatedAt: newApp.updatedAt
                    };
                } else {
                    list.unshift(newApp);
                }

                await uploadJSON(key, list);
                return NextResponse.json({ success: true, app: newApp });
            }
        }

        // MongoDB fallback (S3 offline)
        await connectDB();
        const app = await JobApplication.findOneAndUpdate(
            { identifier: session.identifier, jobId },
            {
                company,
                role,
                location,
                applyUrl,
                status: newApp.status,
                updatedAt: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );

        return NextResponse.json({ success: true, app });
    } catch (error: any) {
        console.error("POST /api/jobs/applications error:", error);
        return NextResponse.json({ error: error.message || "Failed to update tracked job" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
        }

        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3ApplicationsKey(session.identifier);
                let list: any[] = [];
                try {
                    list = await getJSON<any[]>(key);
                    const filtered = list.filter((j) => j.jobId !== jobId);
                    await uploadJSON(key, filtered);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                return NextResponse.json({ success: true });
            }
        }

        // MongoDB fallback (S3 offline)
        await connectDB();
        await JobApplication.findOneAndDelete({ identifier: session.identifier, jobId });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/jobs/applications error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete tracked job" }, { status: 500 });
    }
}
