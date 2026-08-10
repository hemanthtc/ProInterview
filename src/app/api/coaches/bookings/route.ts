import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import connectDB from "@/utils/db";
import CoachBooking from "@/models/CoachBooking";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import { restoreSlotInventory } from "@/utils/coachCatalog";
import { pushNotification } from "@/utils/usageMeter";
import { sendCoachEmail, coachCancellationEmailHtml } from "@/utils/mailer";

export const dynamic = "force-dynamic";

/** GET — list the signed-in user's own coach bookings, newest first. */
export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const bookings = await CoachBooking.find({ userIdentifier: session.identifier })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json({ bookings });
    } catch (error: unknown) {
        console.error("coach bookings GET error:", error);
        const message = error instanceof Error ? error.message : "Failed to load bookings";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

async function cancelOwnBooking(req: NextRequest): Promise<NextResponse> {
    const session = await getVerifiedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
    }

    const rl = rateLimit(`coach-cancel:${session.identifier}`, { limit: 20, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
        return NextResponse.json(
            { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        );
    }

    let bookingId = "";
    if (req.method === "DELETE") {
        bookingId = req.nextUrl.searchParams.get("bookingId") || "";
    } else {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
    }
    if (!bookingId) {
        return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    await connectDB();
    const booking = await CoachBooking.findOne({ bookingId });
    if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    // Authz: users may only cancel their own bookings.
    if (booking.userIdentifier !== session.identifier) {
        return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }
    if (booking.status === "cancelled") {
        return NextResponse.json({ success: true, bookingId, message: "Booking already cancelled." });
    }

    let refundId: string | undefined;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (booking.razorpayPaymentId && keyId && keySecret) {
        try {
            const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
            const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
                amount: booking.amountPaise,
                notes: { reason: "coach_booking_cancelled", bookingId },
            });
            refundId = refund.id;
            console.log(`Refund initiated for coach booking ${bookingId}: ${refund.id}`);
        } catch (refundErr) {
            // Non-fatal: the booking still gets cancelled even if the refund call fails; refundId stays unset.
            console.warn("Coach booking refund stub failed", refundErr);
        }
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    if (refundId) booking.refundId = refundId;
    await booking.save();

    await restoreSlotInventory(booking.coachId, booking.slot);

    await pushNotification({
        userIdentifier: session.identifier,
        kind: "coach",
        title: "Coach session cancelled",
        body: `Your session with ${booking.coachName} at ${booking.slot} has been cancelled.${
            refundId ? " A refund has been initiated." : ""
        }`,
    });

    if (session.identifier.includes("@")) {
        await sendCoachEmail(
            session.identifier,
            `Cancelled: session with ${booking.coachName}`,
            coachCancellationEmailHtml({
                coachName: booking.coachName,
                slot: booking.slot,
                refunded: Boolean(refundId),
            })
        );
    }

    return NextResponse.json({ success: true, bookingId, refundId, message: "Booking cancelled." });
}

/** PATCH — cancel the caller's own booking (authz enforced by userIdentifier match). */
export async function PATCH(req: NextRequest) {
    try {
        return await cancelOwnBooking(req);
    } catch (error: unknown) {
        console.error("coach bookings PATCH error:", error);
        const message = error instanceof Error ? error.message : "Failed to cancel booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** DELETE — same cancellation flow as PATCH, accepting bookingId as a query param. */
export async function DELETE(req: NextRequest) {
    try {
        return await cancelOwnBooking(req);
    } catch (error: unknown) {
        console.error("coach bookings DELETE error:", error);
        const message = error instanceof Error ? error.message : "Failed to cancel booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
