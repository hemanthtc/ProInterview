import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CoachBooking from "@/models/CoachBooking";
import { getVerifiedSession } from "@/utils/auth";
import { pushNotification } from "@/utils/usageMeter";
import { sendCoachEmail, coachReminderEmailHtml } from "@/utils/mailer";
import { nextSlotDate } from "@/utils/googleCalendar";

export const dynamic = "force-dynamic";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

async function isAuthorized(req: NextRequest): Promise<boolean> {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get("x-cron-secret");
    if (cronSecret && headerSecret && headerSecret === cronSecret) return true;

    const session = await getVerifiedSession();
    return Boolean(session && session.role === "admin");
}

/**
 * POST — scans confirmed bookings for sessions within the next 24h that haven't had a
 * reminder sent yet, emails + notifies the user, and marks reminderSentAt.
 * Callable by an admin session or a cron job presenting the shared CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
    try {
        if (!(await isAuthorized(req))) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        await connectDB();
        const candidates = await CoachBooking.find({
            status: "confirmed",
            reminderSentAt: { $exists: false },
        }).limit(500);

        const now = Date.now();
        let remindersSent = 0;

        for (const booking of candidates) {
            const slotDate = nextSlotDate(booking.slot);
            const msUntilSession = slotDate.getTime() - now;
            if (msUntilSession < 0 || msUntilSession > REMINDER_WINDOW_MS) continue;

            if (booking.userIdentifier.includes("@")) {
                await sendCoachEmail(
                    booking.userIdentifier,
                    `Reminder: session with ${booking.coachName} coming up`,
                    coachReminderEmailHtml({
                        coachName: booking.coachName,
                        slot: booking.slot,
                        meetLink: booking.meetLink,
                    })
                );
            }

            await pushNotification({
                userIdentifier: booking.userIdentifier,
                kind: "coach",
                title: "Upcoming coach session",
                body: `Your session with ${booking.coachName} is at ${booking.slot}. Join via the video room when it's time.`,
                href: booking.meetLink,
            });

            booking.reminderSentAt = new Date();
            await booking.save();
            remindersSent += 1;
        }

        return NextResponse.json({ success: true, scanned: candidates.length, remindersSent });
    } catch (error: unknown) {
        console.error("coaches reminders POST error:", error);
        const message = error instanceof Error ? error.message : "Failed to send reminders";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
