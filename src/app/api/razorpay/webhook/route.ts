import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import CoachBooking from "@/models/CoachBooking";
import { pushNotification } from "@/utils/usageMeter";
import { sendCoachEmail, coachBookingEmailHtml } from "@/utils/mailer";
import { buildGoogleCalendarUrl, nextSlotDate } from "@/utils/googleCalendar";
import User from "@/models/User";

export const dynamic = "force-dynamic";

interface RazorpayPaymentEntity {
    id: string;
    order_id?: string;
    notes?: Record<string, string>;
}

/**
 * POST — verifies the Razorpay webhook signature and, for payment.captured events tagged
 * notes.kind === "coach", confirms the matching booking (idempotent via the status filter).
 */
export async function POST(req: NextRequest) {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            return NextResponse.json({ error: "Webhook not configured." }, { status: 501 });
        }

        // Signature must be computed over the raw request body, before any JSON parsing.
        const rawBody = await req.text();
        const signature = req.headers.get("x-razorpay-signature") || "";
        const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

        if (!signature || expected !== signature) {
            return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
        }

        const event = JSON.parse(rawBody) as {
            event?: string;
            payload?: { payment?: { entity?: RazorpayPaymentEntity } };
        };

        if (event.event !== "payment.captured") {
            return NextResponse.json({ success: true, ignored: true });
        }

        const payment = event.payload?.payment?.entity;
        if (!payment) {
            return NextResponse.json({ success: true, ignored: true });
        }

        if (payment.notes?.kind === "subscription") {
            await connectDB();
            const identifier = payment.notes.identifier;
            const plan = payment.notes.plan || "Pro Plan";
            if (identifier) {
                await User.updateOne({ identifier }, { subscriptionPlan: plan });
            }
            return NextResponse.json({ success: true, kind: "subscription" });
        }

        if (payment.notes?.kind !== "coach") {
            return NextResponse.json({ success: true, ignored: true });
        }

        await connectDB();
        const bookingId = payment.notes?.bookingId;
        const query = bookingId
            ? { bookingId, status: { $ne: "confirmed" as const } }
            : { razorpayOrderId: payment.order_id, status: { $ne: "confirmed" as const } };

        const booking = await CoachBooking.findOneAndUpdate(
            query,
            { status: "confirmed", razorpayPaymentId: payment.id },
            { new: true }
        );

        if (booking) {
            const slotDate = nextSlotDate(booking.slot);
            const calendarLink = buildGoogleCalendarUrl({
                title: `ProInterview session with ${booking.coachName}`,
                details: `Join via video room: ${booking.meetLink}`,
                startIso: slotDate.toISOString(),
            });
            booking.googleCalendarLink = calendarLink;
            await booking.save();

            await pushNotification({
                userIdentifier: booking.userIdentifier,
                kind: "coach",
                title: "Coach booking confirmed",
                body: `Payment received. Your session with ${booking.coachName} at ${booking.slot} is confirmed.`,
                href: booking.meetLink,
            });

            if (booking.userIdentifier.includes("@")) {
                await sendCoachEmail(
                    booking.userIdentifier,
                    `Confirmed: session with ${booking.coachName}`,
                    coachBookingEmailHtml({
                        coachName: booking.coachName,
                        slot: booking.slot,
                        meetLink: booking.meetLink,
                        googleCalendarLink: calendarLink,
                    })
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("razorpay webhook error:", error);
        const message = error instanceof Error ? error.message : "Webhook processing failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
