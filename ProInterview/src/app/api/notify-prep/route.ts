import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeHttpsUrl(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    try {
        const u = new URL(raw.trim());
        if (u.protocol !== "https:") return null;
        return u.toString();
    } catch {
        return null;
    }
}

/** Send prep-pack reminder emails to the signed-in user only. */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { channel = "email", pack, reminder } = await req.json();
        if (!pack || !reminder) {
            return NextResponse.json({ error: "pack and reminder are required" }, { status: 400 });
        }

        // Always deliver to the authenticated account — never trust a client-supplied recipient.
        const email = session.identifier;
        if (!email.includes("@")) {
            return NextResponse.json(
                { error: "Reminders require an email-based account." },
                { status: 400 }
            );
        }

        const rl = rateLimit(`notify:${session.identifier}`, { limit: 10, windowMs: 60 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const when = new Date(reminder.at || Date.now()).toLocaleString();
        const subjectLine = `${String(reminder.label || "Interview reminder").slice(0, 80)} — ${String(pack.company || "your interview").slice(0, 80)}`;
        const meetUrl = safeHttpsUrl(pack.meetingUrl);

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

        const meetLine = meetUrl
            ? `<p><a href="${escapeHtml(meetUrl)}">Join meeting</a></p>`
            : "";

        await transporter.sendMail({
            from: `ProInterview <${user}>`,
            to: email,
            subject: subjectLine,
            html: `
              <div style="font-family:sans-serif;padding:20px">
                <h2>${escapeHtml(reminder.label || "Prep reminder")}</h2>
                <p>Company: <b>${escapeHtml(pack.company || "—")}</b></p>
                <p>Role: <b>${escapeHtml(pack.role || "—")}</b></p>
                <p>When: <b>${escapeHtml(when)}</b></p>
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
