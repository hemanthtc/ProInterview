import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import { getVerifiedSession } from "@/utils/auth";
import mongoose, { Schema, Document, Model } from "mongoose";
import { addReferralCredits, pushNotification } from "@/utils/usageMeter";

const OWNER_CREDIT = 2;
const INVITEE_CREDIT = 1;

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

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();

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
        // Fail closed — never invent offline codes that look real but are not persisted.
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 503 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const { code } = await req.json();
        if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

        const inviteeIdentifier = session.identifier;
        let ref = await Referral.findOne({ code: String(code).toLowerCase() });
        if (!ref) {
            ref = await Referral.findOne({ code: String(code) });
        }
        if (!ref) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });

        if (ref.ownerIdentifier === inviteeIdentifier) {
            return NextResponse.json({ error: "Cannot redeem your own referral code" }, { status: 400 });
        }

        let creditsAwarded = 0;
        if (!ref.invited.includes(inviteeIdentifier)) {
            ref.invited.push(inviteeIdentifier);
            ref.uses += 1;
            await ref.save();

            // First-time redemption — reward both the referrer and the new invitee.
            const [ownerCredits, inviteeCredits] = await Promise.all([
                addReferralCredits(ref.ownerIdentifier, OWNER_CREDIT),
                addReferralCredits(inviteeIdentifier, INVITEE_CREDIT),
            ]);
            creditsAwarded = INVITEE_CREDIT;

            await Promise.all([
                pushNotification({
                    userIdentifier: ref.ownerIdentifier,
                    kind: "referral",
                    title: "Referral reward earned",
                    body: `Someone joined using your invite code — you earned ${OWNER_CREDIT} credits (${ownerCredits} total).`,
                    href: "/referrals",
                }),
                pushNotification({
                    userIdentifier: inviteeIdentifier,
                    kind: "referral",
                    title: "Welcome bonus applied",
                    body: `You earned ${INVITEE_CREDIT} credit for joining via an invite link (${inviteeCredits} total).`,
                    href: "/referrals",
                }),
            ]);
        }
        // Do not leak ownerIdentifier (PII) to redeemers.
        return NextResponse.json({ success: true, uses: ref.uses, creditsAwarded });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
