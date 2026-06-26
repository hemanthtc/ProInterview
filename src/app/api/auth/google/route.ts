import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { accessToken } = await req.json();

        if (!accessToken) {
            return NextResponse.json({ error: "Access token is required" }, { status: 400 });
        }

        // 1. Verify the access token with Google's tokeninfo API
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);

        if (!tokenInfoRes.ok) {
            return NextResponse.json({ error: "Invalid or expired access token" }, { status: 400 });
        }

        const tokenInfo = await tokenInfoRes.json();

        // 2. Validate that the token was generated for our Client ID
        const configuredClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (configuredClientId && tokenInfo.azp !== configuredClientId) {
            return NextResponse.json({ error: "Access token client ID mismatch" }, { status: 403 });
        }

        // 3. Fetch user info from Google's userinfo API
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!userInfoRes.ok) {
            return NextResponse.json({ error: "Failed to fetch user profile from Google" }, { status: 500 });
        }

        const userInfo = await userInfoRes.json();

        // Return user credentials to the client
        return NextResponse.json({
            success: true,
            name: userInfo.name || userInfo.email,
            email: userInfo.email,
            picture: userInfo.picture
        });

    } catch (error: any) {
        console.error("Google authentication API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
