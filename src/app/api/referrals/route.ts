import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import { getVerifiedSession } from "@/utils/auth";
import mongoose, { Schema, Document, Model } from "mongoose";

interface IReferral extends Document {
    code: string;
    ownerIdentifier: string;
    uses: number;
    invited: string[];
    createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
    {
        code: { type: String, required: true, unique: true, index: true },
        ownerIdentifier: { type: String, required: true, index: true },
        uses: { type: Number, default: 0 },
        invited: { type: [String], default: [] },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "referrals" }
);

const Referral: Model<IReferral> =
    mongoose.models.Referral || mongoose.model<IReferral>("Referral", ReferralSchema);

function makeCode() {
    return crypto.randomBytes(4).toString("hex");
}

export async function GET() {
    try {
        await connectDB();
        const session = await getVerifiedSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let ref = await Referral.findOne({ ownerIdentifier: session.identifier });
        if (!ref) {
            ref = await Referral.create({
                code: makeCode(),
                ownerIdentifier: session.identifier,
                uses: 0,
                invited: [],
            });
        }
        return NextResponse.json({
            code: ref.code,
            uses: ref.uses,
            invitedCount: ref.invited.length,
            sharePath: `/login?ref=${ref.code}`,
        });
    } catch (error: unknown) {
        // Fallback when DB/auth unavailable — still provide a local code
        const fallback = makeCode();
        return NextResponse.json({
            code: fallback,
            uses: 0,
            invitedCount: 0,
            sharePath: `/login?ref=${fallback}`,
            offline: true,
            error: error instanceof Error ? error.message : undefined,
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { code, inviteeIdentifier } = await req.json();
        if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
        const ref = await Referral.findOne({ code: String(code).toLowerCase() });
        if (!ref) {
            // accept case-sensitive too
            const ref2 = await Referral.findOne({ code: String(code) });
            if (!ref2) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
            if (inviteeIdentifier && !ref2.invited.includes(inviteeIdentifier)) {
                ref2.invited.push(inviteeIdentifier);
                ref2.uses += 1;
                await ref2.save();
            }
            return NextResponse.json({ success: true, owner: ref2.ownerIdentifier, uses: ref2.uses });
        }
        if (inviteeIdentifier && !ref.invited.includes(inviteeIdentifier)) {
            ref.invited.push(inviteeIdentifier);
            ref.uses += 1;
            await ref.save();
        }
        return NextResponse.json({ success: true, owner: ref.ownerIdentifier, uses: ref.uses });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
