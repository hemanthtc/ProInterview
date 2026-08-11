import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import crypto from "crypto";
import { getVerifiedSession } from "@/utils/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();

        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            planName,
            billingCycle,   // "monthly" | "yearly"
            userIdentifier,
        } = await req.json();

        const targetIdentifier = session.identifier || userIdentifier;

        if (
            !razorpay_payment_id ||
            !razorpay_order_id ||
            !razorpay_signature ||
            !planName ||
            !targetIdentifier
        ) {
            return NextResponse.json(
                { error: "Payment verification details and user identifier are required." },
                { status: 400 }
            );
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
            console.error("Razorpay Environment variable RAZORPAY_KEY_SECRET is missing.");
            return NextResponse.json(
                { error: "Razorpay credentials are not configured on the server." },
                { status: 500 }
            );
        }

        // Verify the payment signature
        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json(
                { error: "Invalid payment signature. Verification failed." },
                { status: 400 }
            );
        }

        // Signature is valid. Find and update the user's plan + billing cycle.
        const finalPlanName = planName === "Enterprise Plan" ? "Elite Plan" : planName;
        const finalCycle: "monthly" | "yearly" | null =
            billingCycle === "yearly" ? "yearly" : billingCycle === "monthly" ? "monthly" : null;

        const user = await User.findOneAndUpdate(
            { identifier: userIdentifier },
            { subscriptionPlan: finalPlanName, billingCycle: finalCycle },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: "User not found. Plan could not be updated." }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully.",
            subscriptionPlan: user.subscriptionPlan,
        });
    } catch (error: any) {
        console.error("Razorpay verification error:", error);
        return NextResponse.json(
            { error: error.message || "Payment verification failed." },
            { status: 500 }
        );
    }
}
