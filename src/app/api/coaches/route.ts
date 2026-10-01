import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import connectDB from "@/utils/db";
import CoachBooking from "@/models/CoachBooking";
import User from "@/models/User";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import { buildMeetLink } from "@/data/coaches";
import { decrementSlotInventory, resolveCoach, resolveCoaches, type ResolvedCoach } from "@/utils/coachCatalog";
import { checkAndIncrementUsage, pushNotification } from "@/utils/usageMeter";
import { sendCoachEmail, coachBookingEmailHtml } from "@/utils/mailer";
import { buildGoogleCalendarUrl, nextSlotDate } from "@/utils/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET() {
    const coaches = await resolveCoaches();
    return NextResponse.json({
        coaches,
        paymentsConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    });
}

function buildCalendarLink(coach: ResolvedCoach, slot: string, meetLink: string): string {
    const slotDate = nextSlotDate(slot);
    return buildGoogleCalendarUrl({
        title: `ProInterview session with ${coach.name}`,
        details: `Join via video room: ${meetLink}`,
        startIso: slotDate.toISOString(),
        durationMin: coach.durationMin,
    });
}

/** Fires the post-confirm side-effects: in-app notification + email with the meet/calendar links. */
async function notifyBookingConfirmed(input: {
    userIdentifier: string;
    coachName: string;
    slot: string;
    meetLink: string;
    calendarLink: string;
}) {
    await pushNotification({
        userIdentifier: input.userIdentifier,
        kind: "coach",
        title: "Coach booking confirmed",
        body: `Your session with ${input.coachName} at ${input.slot} is confirmed.`,
        href: input.meetLink,
    });
    if (input.userIdentifier.includes("@")) {
        await sendCoachEmail(
            input.userIdentifier,
            `Confirmed: session with ${input.coachName}`,
            coachBookingEmailHtml({
                coachName: input.coachName,
                slot: input.slot,
                meetLink: input.meetLink,
                googleCalendarLink: input.calendarLink,
            })
        );
    }
}

/** Create a coach booking — paid via Razorpay when configured, otherwise instant Jitsi confirm. */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
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
        const coach = await resolveCoach(body.coachId);
        if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        const slot = typeof body.slot === "string" && body.slot ? body.slot : coach.slots[0];
        const mode = body.mode === "create_order" ? "create_order" : body.mode === "confirm" ? "confirm" : "book";

        const bookingId = `cb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const meetLink = buildMeetLink(bookingId);
        const amountPaise = coach.rateInr * 100;
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const paymentsConfigured = Boolean(keyId && keySecret);

        let userPlan = "Free Tier";
        try {
            await connectDB();
            const user = await User.findOne({ identifier: session.identifier }).select("subscriptionPlan").lean();
            userPlan = (user as { subscriptionPlan?: string } | null)?.subscriptionPlan || "Free Tier";
        } catch (planErr) {
            console.warn("coach booking: plan lookup skipped", planErr);
        }

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

                // Paid bookings are not gated by the free-tier usage meter — the user is already paying.
                let meet = meetLink;
                let finalId = existingId || bookingId;
                let finalSlot = slot;
                let calendarLink = "";
                try {
                    await connectDB();
                    await decrementSlotInventory(coach.id, slot);
                    calendarLink = buildCalendarLink(coach, slot, meetLink);
                    const updated = await CoachBooking.findOneAndUpdate(
                        { razorpayOrderId: razorpay_order_id },
                        {
                            status: "confirmed",
                            razorpayPaymentId: razorpay_payment_id,
                            googleCalendarLink: calendarLink,
                        },
                        { returnDocument: 'after' }
                    );
                    if (updated) {
                        meet = updated.meetLink;
                        finalId = updated.bookingId;
                        finalSlot = updated.slot;
                    }
                    await notifyBookingConfirmed({
                        userIdentifier: session.identifier,
                        coachName: coach.name,
                        slot: finalSlot,
                        meetLink: meet,
                        calendarLink,
                    });
                } catch (dbErr) {
                    console.warn("CoachBooking confirm persist skipped", dbErr);
                }

                return NextResponse.json({
                    success: true,
                    paid: true,
                    bookingId: finalId,
                    coach: coach.name,
                    slot: finalSlot,
                    meetLink: meet,
                    googleCalendarLink: calendarLink || undefined,
                    message: `Booked ${coach.name} at ${finalSlot}. Join the video room at session time.`,
                });
            }

            // Free / demo confirm when Razorpay is not configured — gated by the monthly coach usage meter.
            const usage = await checkAndIncrementUsage(session.identifier, "coach", userPlan);
            if (!usage.allowed) {
                return NextResponse.json(
                    { error: `Free coach session limit reached (${usage.limit}/month). Upgrade to Pro for more sessions.` },
                    {
                        status: 429,
                        headers: usage.retryAfterSec ? { "Retry-After": String(usage.retryAfterSec) } : undefined,
                    }
                );
            }

            const freeId = existingId || bookingId;
            const freeMeet = buildMeetLink(freeId);
            const calendarLink = buildCalendarLink(coach, slot, freeMeet);
            try {
                await connectDB();
                await decrementSlotInventory(coach.id, slot);
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
                    googleCalendarLink: calendarLink,
                });
                await notifyBookingConfirmed({
                    userIdentifier: session.identifier,
                    coachName: coach.name,
                    slot,
                    meetLink: freeMeet,
                    calendarLink,
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
                googleCalendarLink: calendarLink,
                message: paymentsConfigured
                    ? `Hold created with ${coach.name}. Complete payment to confirm.`
                    : `Session reserved with ${coach.name} at ${slot}. Video room ready (Razorpay not configured — free confirm).`,
            });
        }

        // Default book = free confirm path (backward compatible)
        let calendarLink = "";
        if (!paymentsConfigured) {
            const usage = await checkAndIncrementUsage(session.identifier, "coach", userPlan);
            if (!usage.allowed) {
                return NextResponse.json(
                    { error: `Free coach session limit reached (${usage.limit}/month). Upgrade to Pro for more sessions.` },
                    {
                        status: 429,
                        headers: usage.retryAfterSec ? { "Retry-After": String(usage.retryAfterSec) } : undefined,
                    }
                );
            }
            calendarLink = buildCalendarLink(coach, slot, meetLink);
        }

        try {
            await connectDB();
            if (!paymentsConfigured) await decrementSlotInventory(coach.id, slot);
            await CoachBooking.create({
                bookingId,
                userIdentifier: session.identifier,
                coachId: coach.id,
                coachName: coach.name,
                slot,
                amountPaise: paymentsConfigured ? amountPaise : 0,
                currency: "INR",
                meetLink,
                status: paymentsConfigured ? "pending" : "confirmed",
                googleCalendarLink: calendarLink || undefined,
            });
            if (!paymentsConfigured) {
                await notifyBookingConfirmed({
                    userIdentifier: session.identifier,
                    coachName: coach.name,
                    slot,
                    meetLink,
                    calendarLink,
                });
            }
        } catch (dbErr) {
            console.warn("CoachBooking book persist skipped", dbErr);
        }

        return NextResponse.json({
            success: true,
            demo: !paymentsConfigured,
            bookingId,
            coach: coach.name,
            slot,
            meetLink,
            googleCalendarLink: calendarLink || undefined,
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
