import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/utils/rateLimit";

/** Send prep-pack reminder emails (WhatsApp via email gateway placeholder). */
export async function POST(req: NextRequest) {
    try {
        const { email, channel = "email", pack, reminder } = await req.json();
        if (!email || !pack || !reminder) {
            return NextResponse.json({ error: "email, pack, and reminder are required" }, { status: 400 });
        }

        const rl = rateLimit(`notify:${email}`, { limit: 10, windowMs: 60 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const when = new Date(reminder.at || Date.now()).toLocaleString();
        const subjectLine = `${reminder.label || "Interview reminder"} — ${pack.company || "your interview"}`;

        const nodemailer = await import("nodemailer");
        const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
        const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
        if (!user || !pass) {
            return NextResponse.json({
                success: false,
                queued: true,
                channel,
                message: "Email credentials missing — reminder queued locally only.",
                preview: { to: email, subject: subjectLine, when },
            });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
        });

        const meetLine = pack.meetingUrl ? `<p><a href="${pack.meetingUrl}">Join meeting</a></p>` : "";
        await transporter.sendMail({
            from: `ProInterview <${user}>`,
            to: email,
            subject: subjectLine,
            html: `
              <div style="font-family:sans-serif;padding:20px">
                <h2>${reminder.label || "Prep reminder"}</h2>
                <p>Company: <b>${pack.company || "—"}</b></p>
                <p>Role: <b>${pack.role || "—"}</b></p>
                <p>When: <b>${when}</b></p>
                ${meetLine}
                <p>Open ProInterview → Features → Prep Packs to continue checklist.</p>
                ${channel === "whatsapp" ? "<p>(WhatsApp channel requested — email fallback used.)</p>" : ""}
              </div>
            `,
        });

        return NextResponse.json({ success: true, channel: channel === "whatsapp" ? "email-fallback" : "email" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
