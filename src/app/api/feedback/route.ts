import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Feedback from "@/models/Feedback";
import { getVerifiedSession } from "@/utils/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Please sign in to submit feedback." }, { status: 401 });
        }

        const body = await req.json();
        const {
            fieldOfStudy,
            category,
            problemStatement,
            problemDescription,
            domainSuggestions,
            rating,
            attachmentUrl,
        } = body;

        if (!fieldOfStudy || !fieldOfStudy.trim()) {
            return NextResponse.json({ error: "Field of study is required." }, { status: 400 });
        }
        if (!problemStatement || !problemStatement.trim()) {
            return NextResponse.json({ error: "Problem statement is required." }, { status: 400 });
        }
        if (!problemDescription || !problemDescription.trim()) {
            return NextResponse.json({ error: "Problem description is required." }, { status: 400 });
        }

        const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

        await connectDB();

        // Get user displayName
        let displayName = session.identifier.split("@")[0];
        try {
            const userDoc = await User.findOne({ identifier: session.identifier });
            if (userDoc?.displayName) {
                displayName = userDoc.displayName;
            }
        } catch { /* ignore */ }

        const newFeedback = await Feedback.create({
            userIdentifier: session.identifier.toLowerCase(),
            userName: displayName,
            fieldOfStudy: fieldOfStudy.trim(),
            category: category || "General Feedback",
            problemStatement: problemStatement.trim(),
            problemDescription: problemDescription.trim(),
            domainSuggestions: domainSuggestions ? domainSuggestions.trim() : "",
            rating: numericRating,
            attachmentUrl: attachmentUrl || "",
            status: "pending",
        });

        return NextResponse.json({
            success: true,
            feedback: newFeedback,
            message: "Feedback submitted successfully. Thank you for helping us improve!",
        }, { status: 201 });
    } catch (err: any) {
        console.error("POST /api/feedback error:", err);
        return NextResponse.json({ error: err.message || "Failed to submit feedback." }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const url = new URL(req.url);
        const field = url.searchParams.get("fieldOfStudy");
        const category = url.searchParams.get("category");
        const status = url.searchParams.get("status");
        const rating = url.searchParams.get("rating");
        const search = url.searchParams.get("search");

        const isAdmin = session.role === "admin" || (session as any).isAdmin === true;

        const filter: any = {};

        if (!isAdmin) {
            // Regular user only sees their own submissions
            filter.userIdentifier = session.identifier.toLowerCase();
        } else {
            // Admin query filters
            if (field && field !== "all") {
                filter.fieldOfStudy = new RegExp(`^${field}$`, "i");
            }
            if (category && category !== "all") {
                filter.category = category;
            }
            if (status && status !== "all") {
                filter.status = status;
            }
            if (rating && rating !== "all") {
                filter.rating = Number(rating);
            }
            if (search && search.trim()) {
                const s = search.trim();
                filter.$or = [
                    { problemStatement: { $regex: s, $options: "i" } },
                    { problemDescription: { $regex: s, $options: "i" } },
                    { domainSuggestions: { $regex: s, $options: "i" } },
                    { userIdentifier: { $regex: s, $options: "i" } },
                    { userName: { $regex: s, $options: "i" } },
                ];
            }
        }

        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 }).limit(150);

        // Also calculate admin stats if admin
        let stats = null;
        if (isAdmin) {
            const allItems = await Feedback.find({});
            const total = allItems.length;
            const pending = allItems.filter(f => f.status === "pending").length;
            const resolved = allItems.filter(f => f.status === "resolved" || f.status === "replied").length;
            const avgRating = total > 0
                ? Number((allItems.reduce((acc, f) => acc + (f.rating || 5), 0) / total).toFixed(1))
                : 5.0;

            stats = {
                total,
                pending,
                resolved,
                avgRating,
            };
        }

        return NextResponse.json({
            success: true,
            feedbacks,
            stats,
            isAdmin,
        });
    } catch (err: any) {
        console.error("GET /api/feedback error:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch feedback." }, { status: 500 });
    }
}
