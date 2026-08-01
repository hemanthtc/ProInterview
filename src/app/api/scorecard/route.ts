import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import Scorecard from "@/models/Scorecard";
import { getVerifiedSession } from "@/utils/auth";

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

        const doc = await Scorecard.create({
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
        });

        return NextResponse.json({
            success: true,
            shareId: doc.shareId,
            url: `/scorecard/${doc.shareId}`,
            scorecard: {
                shareId: doc.shareId,
                candidateName: doc.candidateName,
                company: doc.company,
                role: doc.role,
                finalScore: doc.finalScore,
                technicalRating: doc.technicalRating,
                behavioralRating: doc.behavioralRating,
                communicationRating: doc.communicationRating,
                portfolioRating: doc.portfolioRating,
                summary: doc.summary,
                highlights: doc.highlights,
                createdAt: doc.createdAt,
            },
        });
    } catch (error: any) {
        console.error("Scorecard POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to create scorecard" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });
        }

        await connectDB();
        const doc = await Scorecard.findOne({ shareId: id }).lean();
        if (!doc) {
            return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
        }

        return NextResponse.json({
            shareId: doc.shareId,
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
        });
    } catch (error: any) {
        console.error("Scorecard GET error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch scorecard" }, { status: 500 });
    }
}
