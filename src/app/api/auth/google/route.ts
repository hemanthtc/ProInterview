import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { setSessionCookie } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { accessToken: rawAccessToken, code, isPwa } = body;

        let accessToken = rawAccessToken;

        // 1. If an authorization code is supplied, exchange it with Google for tokens server-side
        if (!accessToken && code) {
            const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
            if (clientId && clientSecret) {
                const tokenExchangeRes = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: "postmessage",
                        grant_type: "authorization_code",
                    }),
                });
                if (tokenExchangeRes.ok) {
                    const tokenExchangeData = await tokenExchangeRes.json();
                    accessToken = tokenExchangeData.access_token;
                }
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: "Access token or authorization code is required" }, { status: 400 });
        }

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rl = rateLimit(`google-auth:${ip}`, { limit: 15, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many authentication attempts. Try again in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        // 2. Verify the access token with Google's tokeninfo API
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);

        if (!tokenInfoRes.ok) {
            return NextResponse.json({ error: "Invalid or expired access token" }, { status: 400 });
        }

        const tokenInfo = await tokenInfoRes.json();

        // 3. Validate that the token was generated for our Client ID
        const configuredClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
        if (configuredClientId && configuredClientId !== "YOUR_GOOGLE_CLIENT_ID" && configuredClientId !== "dummy-client-id") {
            const tokenAud = tokenInfo.aud?.trim();
            const tokenAzp = tokenInfo.azp?.trim();
            if (tokenAzp !== configuredClientId && tokenAud !== configuredClientId) {
                return NextResponse.json({ error: "Access token client ID mismatch" }, { status: 403 });
            }
        }

        // 4. Fetch user info from Google's userinfo API
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!userInfoRes.ok) {
            return NextResponse.json({ error: "Failed to fetch user profile from Google" }, { status: 500 });
        }

        const userInfo = await userInfoRes.json();
        if (userInfo.email_verified === false) {
            return NextResponse.json({ error: "Google email address is not verified." }, { status: 403 });
        }

        const email: string = userInfo.email;
        const name: string = userInfo.name || email;

        // 4. Upsert user in MongoDB so all downstream routes (profile, payments)
        //    can find them by identifier (email). Google users have no password.
        await connectDB();
        const user = await User.findOneAndUpdate(
            { identifier: email },
            {
                $setOnInsert: {
                    identifier: email,
                    displayName: name,
                    type: "email",
                    isOrganization: false,
                    orgRole: "user",
                    isVerified: true,
                    subscriptionPlan: "Free Tier",
                },
            },
            { upsert: true, new: true }
        );

        const { checkAndDegradeSubscription } = await import("@/utils/subscription");
        await checkAndDegradeSubscription(user);

        // Set secure HttpOnly session cookie
        try {
            await setSessionCookie({
                identifier: user.identifier,
                role: "user",
                isOrganization: false
            }, isPwa);
        } catch (cookieErr) {
            console.error("Failed to set session cookie for Google login:", cookieErr);
            return NextResponse.json(
                { error: "Authentication succeeded but session could not be created. Please try again." },
                { status: 500 }
            );
        }

        // Return user credentials to the client and set userLoggedIn cookie on response
        const response = NextResponse.json({
            success: true,
            name: user.displayName,
            email: user.identifier,
            picture: userInfo.picture,
            subscriptionPlan: user.subscriptionPlan,
            billingCycle: user.billingCycle,
            subscriptionStartedAt: user.subscriptionStartedAt,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
        });

        // Set readable userLoggedIn cookie on the HTTP response for cross-browser synchronization
        response.cookies.set("userLoggedIn", "true", {
            path: "/",
            maxAge: 604800,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });

        return response;

    } catch (error: any) {
        console.error("Google authentication API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

