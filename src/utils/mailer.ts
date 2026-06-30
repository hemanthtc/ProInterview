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
