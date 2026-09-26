import nodemailer from "nodemailer";

const EMAIL_USER = (process.env.GMAIL_USER || process.env.EMAIL_USER)?.replace(/^["']|["']$/g, "");
const EMAIL_PASS = (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS)?.replace(/^["']|["']$/g, "");

export async function sendVerificationEmail(toEmail: string, otpCode: string, name: string = "User") {
    // Fallback if credentials are not configured
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn("EMAIL_USER or EMAIL_PASS environment variables are not configured. Falling back to console/simulation mode.");
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"ProInterview Support" <${EMAIL_USER}>`,
            to: toEmail,
            subject: `${otpCode} is your ProInterview Verification Code`,
            html: `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #050505; color: #ffffff; padding: 40px; text-align: center; border-radius: 20px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <div style="margin-bottom: 30px;">
                        <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #4f46e5 0%, #a855f7 100%); border-radius: 12px; font-weight: bold; font-size: 20px; color: #ffffff;">
                            ProInterview
                        </div>
                    </div>
                    
                    <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; background: linear-gradient(to right, #a5b4fc, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Secure Verification</h2>
                    <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 30px; line-height: 1.5;">Hi ${name},<br>Verify your ProInterview session using the secure 6-digit passcode below. It is valid for 5 minutes.</p>
                    
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; margin: 30px 0; display: inline-block; min-width: 200px;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #818cf8; text-shadow: 0 0 15px rgba(129,140,248,0.25);">${otpCode}</span>
                    </div>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: rgba(255,255,255,0.4);">
                        This is an automated security code. Please do not share this passcode with anyone. ProInterview team members will never ask for your password or verification code.
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email verification sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Failed to send verification email:", error);
        return false;
    }
}

function coachEmailShell(title: string, bodyHtml: string): string {
    return `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #050505; color: #ffffff; padding: 40px; text-align: center; border-radius: 20px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="margin-bottom: 30px;">
                <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); border-radius: 12px; font-weight: bold; font-size: 20px; color: #ffffff;">
                    ProInterview
                </div>
            </div>
            <h2 style="font-size: 22px; font-weight: bold; margin-bottom: 10px; background: linear-gradient(to right, #f9a8d4, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${title}</h2>
            ${bodyHtml}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: rgba(255,255,255,0.4);">
                You are receiving this because you booked a coach session on ProInterview.
            </div>
        </div>
    `;
}

/** Sends a generic coach-marketplace email (booking confirmations, reminders, cancellations). */
export async function sendCoachEmail(toEmail: string, subject: string, html: string): Promise<boolean> {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn("EMAIL_USER or EMAIL_PASS environment variables are not configured. Skipping coach email send.");
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"ProInterview Coaches" <${EMAIL_USER}>`,
            to: toEmail,
            subject,
            html,
        });
        console.log("Coach email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Failed to send coach email:", error);
        return false;
    }
}

export function coachBookingEmailHtml(input: {
    coachName: string;
    slot: string;
    meetLink: string;
    googleCalendarLink?: string;
}): string {
    const body = `
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            Your session with <strong>${input.coachName}</strong> is confirmed for <strong>${input.slot}</strong>.
        </p>
        <div style="margin: 20px 0;">
            <a href="${input.meetLink}" style="display:inline-block; background:#ec4899; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-size:13px; margin: 4px;">Join video room</a>
            ${
                input.googleCalendarLink
                    ? `<a href="${input.googleCalendarLink}" style="display:inline-block; background:rgba(255,255,255,0.08); color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-size:13px; margin: 4px;">Add to Google Calendar</a>`
                    : ""
            }
        </div>
    `;
    return coachEmailShell("Coach session confirmed", body);
}

export function coachReminderEmailHtml(input: { coachName: string; slot: string; meetLink: string }): string {
    const body = `
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            Reminder: your session with <strong>${input.coachName}</strong> is coming up at <strong>${input.slot}</strong> — within the next 24 hours.
        </p>
        <div style="margin: 20px 0;">
            <a href="${input.meetLink}" style="display:inline-block; background:#ec4899; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-size:13px;">Join video room</a>
        </div>
    `;
    return coachEmailShell("Upcoming coach session", body);
}

/** Sends a digest email summarizing a user's unread in-app notifications. */
export async function sendDigestEmail(
    toEmail: string,
    notifications: { title: string; body: string; href?: string }[]
): Promise<boolean> {
    const rows = notifications
        .slice(0, 10)
        .map(
            (n) => `
        <div style="text-align:left; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
            <p style="margin:0; font-weight:bold; font-size: 13px; color:#fff;">${n.title}</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5;">${n.body}</p>
        </div>`
        )
        .join("");

    const body = `
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            You have <strong>${notifications.length}</strong> unread update${notifications.length === 1 ? "" : "s"} on ProInterview.
        </p>
        ${rows}
        <div style="margin: 24px 0;">
            <a href="#" style="display:inline-block; background:#4f46e5; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-size:13px;">Open ProInterview</a>
        </div>
    `;
    return sendCoachEmail(toEmail, "Your ProInterview digest", coachEmailShell("You have unread updates", body));
}

export function coachCancellationEmailHtml(input: { coachName: string; slot: string; refunded: boolean }): string {
    const body = `
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
            Your session with <strong>${input.coachName}</strong> at <strong>${input.slot}</strong> has been cancelled.
            ${input.refunded ? "A refund has been initiated and should reflect in a few business days." : ""}
        </p>
    `;
    return coachEmailShell("Coach session cancelled", body);
}
