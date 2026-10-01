import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Coach from "@/models/Coach";
import { getVerifiedSession } from "@/utils/auth";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
    const session = await getVerifiedSession(req);
    if (!session || session.role !== "admin") return null;
    return session;
}

/** GET — list the full admin-editable coach catalog (active + inactive). */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAdmin(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        await connectDB();
        const coaches = await Coach.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json({ coaches });
    } catch (error: unknown) {
        console.error("coaches admin GET error:", error);
        const message = error instanceof Error ? error.message : "Failed to load coaches";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** POST — create or update (upsert by coachId) a coach catalog entry. */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAdmin(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const body = await req.json();
        const coachId = typeof body?.coachId === "string" ? body.coachId.trim() : "";
        if (!coachId) {
            return NextResponse.json({ error: "coachId required" }, { status: 400 });
        }
        if (!body?.name || !body?.headline) {
            return NextResponse.json({ error: "name and headline required" }, { status: 400 });
        }

        await connectDB();
        const update = {
            coachId,
            name: String(body.name),
            headline: String(body.headline),
            domains: Array.isArray(body.domains) ? body.domains.map(String) : [],
            companies: Array.isArray(body.companies) ? body.companies.map(String) : [],
            rateUsd: Number(body.rateUsd) || 0,
            rateInr: Number(body.rateInr) || 0,
            rating: Number(body.rating) || 4.5,
            slots: Array.isArray(body.slots) ? body.slots.map(String) : [],
            slotInventory:
                body.slotInventory && typeof body.slotInventory === "object" ? body.slotInventory : {},
            bio: typeof body.bio === "string" ? body.bio : "",
            durationMin: Number(body.durationMin) || 45,
            active: body.active !== false,
        };

        const coach = await Coach.findOneAndUpdate({ coachId }, update, {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
        });

        return NextResponse.json({ success: true, coach });
    } catch (error: unknown) {
        console.error("coaches admin POST error:", error);
        const message = error instanceof Error ? error.message : "Failed to save coach";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** DELETE — remove a coach catalog entry by coachId. */
export async function DELETE(req: NextRequest) {
    try {
        const session = await requireAdmin(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        const coachId = req.nextUrl.searchParams.get("coachId") || "";
        if (!coachId) {
            return NextResponse.json({ error: "coachId required" }, { status: 400 });
        }

        await connectDB();
        const deleted = await Coach.findOneAndDelete({ coachId });
        if (!deleted) {
            return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, coachId });
    } catch (error: unknown) {
        console.error("coaches admin DELETE error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete coach";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
