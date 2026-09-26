import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import Scorecard from "@/models/Scorecard";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, pingS3, getS3ScorecardKey } from "@/utils/s3";
import { jsonError, enforceRateLimit } from "@/utils/http";

function normalizePortfolio(value: unknown): number | string {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") return value;
    return "N/A";
}

function toHighlights(raw: unknown, summary: string): string[] {
    if (Array.isArray(raw)) {
        return raw.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 12);
    }
    if (typeof raw === "string" && raw.trim()) {
        return raw
            .split(/\n|•|- /)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 12);
    }
    if (summary) {
        return summary
            .split(/\n/)
            .map((s) => s.replace(/^[-*•]\s*/, "").trim())
            .filter(Boolean)
            .slice(0, 6);
    }
    return [];
}

// Auto-migration helper: reconciles offline MongoDB scorecard cache into S3 and deletes it from MongoDB
async function migrateMongoScorecardToS3(shareId: string, key: string, s3Data: any): Promise<any> {
    try {
        await connectDB();
        const doc = await Scorecard.findOne({ shareId }).lean();
        if (doc) {
            console.log(`Migrating MongoDB scorecard ${shareId} to S3...`);
            const payload = {
                shareId: doc.shareId,
                ownerIdentifier: doc.ownerIdentifier,
                candidateName: doc.candidateName,
                company: doc.company,
                role: doc.role,
                finalScore: doc.finalScore,
                technicalRating: doc.technicalRating,
                behavioralRating: doc.behavioralRating,
                communicationRating: doc.communicationRating,
                portfolioRating: doc.portfolioRating,
                summary: doc.summary,
                highlights: doc.highlights || [],
                createdAt: doc.createdAt,
            };
            await uploadJSON(key, payload);
            await Scorecard.findOneAndDelete({ shareId });
            console.log("Successfully migrated scorecard to S3 and deleted MongoDB record.");
            return payload;
        }
    } catch (err) {
        console.error("Failed to migrate MongoDB scorecard to S3:", err);
    }
    return s3Data;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        const shareId = crypto.randomBytes(9).toString("base64url");
        const summary = typeof body.summary === "string" ? body.summary : "";

        const docPayload = {
            shareId,
            ownerIdentifier: session.identifier,
            candidateName: String(body.candidateName || body.userName || "Candidate").slice(0, 120),
            company: String(body.company || "").slice(0, 120),
            role: String(body.role || "").slice(0, 120),
            finalScore: Math.max(0, Math.min(100, Number(body.finalScore) || 0)),
            technicalRating: Math.max(0, Math.min(100, Number(body.technicalRating) || 0)),
            behavioralRating: Math.max(0, Math.min(100, Number(body.behavioralRating) || 0)),
            communicationRating: Math.max(0, Math.min(100, Number(body.communicationRating) || 0)),
            portfolioRating: normalizePortfolio(body.portfolioRating),
            summary,
            highlights: toHighlights(body.highlights, summary),
            createdAt: new Date(),
        };

        let savedInS3 = false;
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3ScorecardKey(shareId);
                await uploadJSON(key, docPayload);
                savedInS3 = true;
            }
        }

        if (!savedInS3) {
            // S3 Offline: save in MongoDB scorecard
            await Scorecard.create(docPayload);
        }

        return NextResponse.json({
            success: true,
            shareId: docPayload.shareId,
            url: `/scorecard/${docPayload.shareId}`,
            scorecard: docPayload,
        });
    } catch (error: any) {
        console.error("Scorecard POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to create scorecard" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
        const blocked = enforceRateLimit(`scorecard-get:${ip}`, { limit: 60, windowMs: 15 * 60 * 1000 }, "scorecard lookups");
        if (blocked) return blocked;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });
        }

        await connectDB();

        let scorecardData: any = null;
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3ScorecardKey(id);
                try {
                    scorecardData = await getJSON<any>(key);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                scorecardData = await migrateMongoScorecardToS3(id, key, scorecardData);
            }
        }

        if (!scorecardData) {
            const doc = await Scorecard.findOne({ shareId: id }).lean();
            if (!doc) {
                return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
            }
            scorecardData = doc;
        }

        // Validate expiration (30 days limit)
        if (scorecardData.createdAt) {
            const created = new Date(scorecardData.createdAt).getTime();
            const ageMs = Date.now() - created;
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            if (ageMs > THIRTY_DAYS_MS) {
                return NextResponse.json(
                    { error: "This scorecard has expired. Shareable links are valid for 30 days only." },
                    { status: 410 }
                );
            }
        }

        return NextResponse.json({
            shareId: scorecardData.shareId,
            candidateName: scorecardData.candidateName,
            company: scorecardData.company,
            role: scorecardData.role,
            finalScore: scorecardData.finalScore,
            technicalRating: scorecardData.technicalRating,
            behavioralRating: scorecardData.behavioralRating,
            communicationRating: scorecardData.communicationRating,
            portfolioRating: scorecardData.portfolioRating,
            summary: scorecardData.summary,
            highlights: scorecardData.highlights || [],
            createdAt: scorecardData.createdAt,
        });
    } catch (error: any) {
        console.error("Scorecard GET error:", error);
        return jsonError(error, 500, "Failed to fetch scorecard");
    }
}
