import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import OrgEmployee from "@/models/OrgEmployee";
import OrgAdmin from "@/models/OrgAdmin";
import CloudSession from "@/models/CloudSession";
import CoachBooking from "@/models/CoachBooking";
import { getVerifiedSession } from "@/utils/auth";

/** Signup → activation funnel counts for the admin dashboard. */
async function buildFunnelStats(signups: number) {
    const [mocks, starDrills, coachBookings] = await Promise.all([
        CloudSession.countDocuments({ "sessions.0": { $exists: true } }),
        CloudSession.countDocuments({ "prepProgress.starHistory.0": { $exists: true } }),
        CoachBooking.countDocuments({ status: "confirmed" }),
    ]);
    return { signups, mocks, starDrills, coachBookings };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const adminId = searchParams.get("adminId");

        if (!adminId) {
            return NextResponse.json({ error: "adminId is required." }, { status: 400 });
        }

        // Verify request belongs to authenticated admin session
        const session = await getVerifiedSession(req);
        if (!session || session.role !== "admin" || adminId.trim().toLowerCase() !== session.identifier.trim().toLowerCase()) {
            return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
        }

        // Mark the requesting admin as online
        await OrgAdmin.findOneAndUpdate(
            { identifier: adminId },
            { isOnline: true, lastActive: new Date() }
        );

        // ── User totals (excluding any legacy/other organization accounts) ────
        const totalUsers = await User.countDocuments({ isVerified: true, isOrganization: { $ne: true } as any });
        const totalUnverified = await User.countDocuments({ isVerified: false, isOrganization: { $ne: true } as any });

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const lastWeek  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const lastYear  = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

        const signupsToday   = await User.countDocuments({ isVerified: true, isOrganization: { $ne: true } as any, createdAt: { $gte: yesterday } });
        const signupsWeekly  = await User.countDocuments({ isVerified: true, isOrganization: { $ne: true } as any, createdAt: { $gte: lastWeek } });
        const signupsMonthly = await User.countDocuments({ isVerified: true, isOrganization: { $ne: true } as any, createdAt: { $gte: lastMonth } });
        const signupsYearly  = await User.countDocuments({ isVerified: true, isOrganization: { $ne: true } as any, createdAt: { $gte: lastYear } });

        // ── Subscription breakdown by plan + billing cycle ────────────────────
        const subAgg = await User.aggregate([
            { $match: { isVerified: true, isOrganization: { $ne: true } } },
            {
                $group: {
                    _id: {
                        plan: "$subscriptionPlan",
                        cycle: { $ifNull: ["$billingCycle", "monthly"] }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // ── Recent users ──────────────────────────────────────────────────────
        const recentUsers = await User.find({ isVerified: true, isOrganization: { $ne: true } as any })
            .sort({ createdAt: -1 })
            .limit(8)
            .select("displayName identifier subscriptionPlan createdAt type");

        // ── Unverified users list ─────────────────────────────────────────────
        const unverifiedUsers = await User.find({ isVerified: false, isOrganization: { $ne: true } as any })
            .sort({ createdAt: -1 })
            .limit(100)
            .select("displayName identifier createdAt type");

        // ── All verified users ────────────────────────────────────────────────
        const allUsers = await User.find({ isVerified: true, isOrganization: { $ne: true } as any })
            .sort({ createdAt: -1 })
            .limit(100)
            .select("displayName identifier subscriptionPlan createdAt");

        // ── Monthly signups users ─────────────────────────────────────────────
        const monthlyUsers = await User.find({ isVerified: true, isOrganization: { $ne: true } as any, createdAt: { $gte: lastMonth } })
            .sort({ createdAt: -1 })
            .limit(100)
            .select("displayName identifier subscriptionPlan createdAt");

        // ── Employees under this admin ────────────────────────────────────────
        const employees = await OrgEmployee.find({ adminId })
            .select("identifier displayName department isVerified isOnline lastActive createdAt organizationName")
            .sort({ createdAt: -1 });

        const totalEmployees = employees.length;

        // ── Admin directory (restricted to root admin) ──────────────────────
        let admins: any[] = [];
        if (adminId.trim().toLowerCase() === "hemanthtchemu2003@gmail.com") {
            admins = await OrgAdmin.find({})
                .select("identifier displayName organizationName isVerified isOnline lastActive createdAt")
                .sort({ createdAt: -1 });
        }

        // ── Activation funnel: signups → mock sessions → STAR drills → coach bookings ──
        const funnel = await buildFunnelStats(totalUsers);

        return NextResponse.json({
            success: true,
            totalUsers,
            totalUnverified,
            signupsToday,
            signupsWeekly,
            signupsMonthly,
            signupsYearly,
            totalEmployees,
            subscriptions: subAgg,
            recentUsers,
            unverifiedUsers,
            employees,
            admins,
            funnel,
            allUsers,
            monthlyUsers,
        });
    } catch (error: any) {
        console.error("Admin stats error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
