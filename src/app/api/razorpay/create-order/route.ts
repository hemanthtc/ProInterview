import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { planName, billingCycle, userIdentifier } = await req.json();

        if (!planName || !billingCycle || !userIdentifier) {
            return NextResponse.json(
                { error: "Plan name, billing cycle, and user identifier are required." },
                { status: 400 }
            );
        }

        // Verify user exists
        const user = await User.findOne({ identifier: userIdentifier });
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // Calculate amount in paise (1 INR = 100 Paise)
        let amountInPaise = 0;

        if (planName === "Pro Plan") {
            if (billingCycle === "yearly") {
                amountInPaise = 999 * 12 * 100; // ₹999/mo * 12 months = ₹11,988 = 1,198,800 paise
            } else {
                amountInPaise = 1299 * 100; // ₹1,299/mo = 129,900 paise
            }
        } else if (planName === "Elite Plan" || planName === "Enterprise Plan") {
            // Support both names for backward compatibility
            if (billingCycle === "yearly") {
                amountInPaise = 2999 * 12 * 100; // ₹2,999/mo * 12 months = ₹35,988 = 3,598,800 paise
            } else {
                amountInPaise = 3499 * 100; // ₹3,499/mo = 349,900 paise
            }
        } else {
            return NextResponse.json({ error: "Invalid subscription plan selected." }, { status: 400 });
        }

        // Apply proration discount if upgrading from Pro to Elite
        let prorationDiscount = 0;
        if ((planName === "Elite Plan" || planName === "Enterprise Plan") && user.subscriptionPlan === "Pro Plan") {
            const now = new Date();
            const lastUpdated = user.updatedAt || user.createdAt || now;
            const elapsedMs = now.getTime() - lastUpdated.getTime();
            const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
            
            const period = billingCycle === "yearly" ? 365 : 30;
            const proPrice = billingCycle === "yearly" ? (999 * 12) : 1299;
            
            if (elapsedDays < period) {
                const daysRemaining = period - elapsedDays;
                const dailyValue = proPrice / period;
                const remainingValue = dailyValue * daysRemaining;
                prorationDiscount = Math.floor(remainingValue * 100);
            }
        }

        // Subtract discount, but ensure a minimum of ₹1.00 (100 paise) for transactions
        amountInPaise = Math.max(100, amountInPaise - prorationDiscount);

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            console.error("Razorpay Environment variables (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing.");
            return NextResponse.json(
                { error: "Razorpay credentials are not configured on the server." },
                { status: 500 }
            );
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
            notes: {
                planName: planName === "Enterprise Plan" ? "Elite Plan" : planName,
                billingCycle,
                userIdentifier,
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error: any) {
        console.error("Razorpay order creation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create Razorpay order." },
            { status: 500 }
        );
    }
}
