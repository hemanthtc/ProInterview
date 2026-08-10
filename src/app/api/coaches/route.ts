import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import connectDB from "@/utils/db";
import CoachBooking from "@/models/CoachBooking";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import { buildMeetLink, COACHES, getCoach } from "@/data/coaches";

export async function GET() {
    return NextResponse.json({
        coaches: COACHES,
        paymentsConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    });
}

/** Create a coach booking — paid via Razorpay when configured, otherwise instant Jitsi confirm. */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const rl = rateLimit(`coach-book:${session.identifier}`, { limit: 20, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const body = await req.json();
        const coach = getCoach(body.coachId);
        if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        const slot = typeof body.slot === "string" && body.slot ? body.slot : coach.slots[0];
        const mode = body.mode === "create_order" ? "create_order" : body.mode === "confirm" ? "confirm" : "book";

        const bookingId = `cb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const meetLink = buildMeetLink(bookingId);
        const amountPaise = coach.rateInr * 100;
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const paymentsConfigured = Boolean(keyId && keySecret);

        if (mode === "create_order") {
            if (!paymentsConfigured) {
                return NextResponse.json({
                    success: true,
                    paymentsConfigured: false,
                    bookingId,
                    amountPaise,
                    currency: "INR",
                    message: "Razorpay not configured — use free confirm to get a Meet link.",
                });
            }

            const razorpay = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
            const order = await razorpay.orders.create({
                amount: amountPaise,
                currency: "INR",
                receipt: bookingId.slice(0, 40),
                notes: {
                    kind: "coach",
                    coachId: coach.id,
                    slot,
                    userIdentifier: session.identifier,
                    bookingId,
                },
            });

            try {
                await connectDB();
                await CoachBooking.create({
                    bookingId,
                    userIdentifier: session.identifier,
                    coachId: coach.id,
                    coachName: coach.name,
                    slot,
                    amountPaise,
                    currency: "INR",
                    razorpayOrderId: order.id,
                    meetLink,
                    status: "pending",
                });
            } catch (dbErr) {
                console.warn("CoachBooking persist skipped", dbErr);
            }

            return NextResponse.json({
                success: true,
                paymentsConfigured: true,
                bookingId,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
                coach: coach.name,
                slot,
                meetLink,
            });
        }

        if (mode === "confirm") {
            const {
                bookingId: existingId,
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
            } = body;

            if (paymentsConfigured && razorpay_payment_id && razorpay_order_id && razorpay_signature) {
                const expected = crypto
                    .createHmac("sha256", keySecret!)
                    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                    .digest("hex");
                if (expected !== razorpay_signature) {
                    return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
                }

                let meet = meetLink;
                let finalId = existingId || bookingId;
                try {
                    await connectDB();
                    const updated = await CoachBooking.findOneAndUpdate(
                        { razorpayOrderId: razorpay_order_id },
                        {
                            status: "confirmed",
                            razorpayPaymentId: razorpay_payment_id,
                        },
                        { new: true }
                    );
                    if (updated) {
                        meet = updated.meetLink;
                        finalId = updated.bookingId;
                    }
                } catch (dbErr) {
                    console.warn("CoachBooking confirm persist skipped", dbErr);
                }

                return NextResponse.json({
                    success: true,
                    paid: true,
                    bookingId: finalId,
                    coach: coach.name,
                    slot,
                    meetLink: meet,
                    message: `Booked ${coach.name} at ${slot}. Join the video room at session time.`,
                });
            }

            // Free / demo confirm when Razorpay is not configured
            const freeId = existingId || bookingId;
            const freeMeet = buildMeetLink(freeId);
            try {
                await connectDB();
                await CoachBooking.create({
                    bookingId: freeId,
                    userIdentifier: session.identifier,
                    coachId: coach.id,
                    coachName: coach.name,
                    slot,
                    amountPaise: 0,
                    currency: "INR",
                    meetLink: freeMeet,
                    status: "confirmed",
                });
            } catch (dbErr) {
                console.warn("CoachBooking free persist skipped", dbErr);
            }

            return NextResponse.json({
                success: true,
                demo: !paymentsConfigured,
                paid: false,
                bookingId: freeId,
                coach: coach.name,
                slot,
                meetLink: freeMeet,
                message: paymentsConfigured
                    ? `Hold created with ${coach.name}. Complete payment to confirm.`
                    : `Session reserved with ${coach.name} at ${slot}. Video room ready (Razorpay not configured — free confirm).`,
            });
        }

        // Default book = free confirm path (backward compatible)
        const freeMeet = meetLink;
        try {
            await connectDB();
            await CoachBooking.create({
                bookingId,
                userIdentifier: session.identifier,
                coachId: coach.id,
                coachName: coach.name,
                slot,
                amountPaise: paymentsConfigured ? amountPaise : 0,
                currency: "INR",
                meetLink: freeMeet,
                status: paymentsConfigured ? "pending" : "confirmed",
            });
        } catch (dbErr) {
            console.warn("CoachBooking book persist skipped", dbErr);
        }

        return NextResponse.json({
            success: true,
            demo: !paymentsConfigured,
            bookingId,
            coach: coach.name,
            slot,
            meetLink: freeMeet,
            paymentsConfigured,
            amountPaise,
            message: paymentsConfigured
                ? `Ready to pay ₹${coach.rateInr} for ${coach.name} at ${slot}.`
                : `Session reserved with ${coach.name} at ${slot}. Join via Meet link.`,
        });
    } catch (error: unknown) {
        console.error("coaches", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
