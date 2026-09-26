import { NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getVerifiedSession } from "@/utils/auth";
import OrgEmployee from "@/models/OrgEmployee";
import OrgAdmin from "@/models/OrgAdmin";
import CloudSession from "@/models/CloudSession";

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await connectDB();

        const admin = await OrgAdmin.findOne({ identifier: session.identifier });
        const orgName = admin?.organizationName || "";
        const employees = await OrgEmployee.find(
            orgName ? { organizationName: orgName } : { adminId: session.identifier }
        ).lean();

        const rows = [];
        for (const emp of employees) {
            const blob = await CloudSession.findOne({ identifier: emp.identifier }).lean();
            const sessions = (blob as any)?.sessions || [];
            const scores = sessions
                .map((s: any) => Number(s.finalScore))
                .filter((n: number) => Number.isFinite(n));
            const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
            const best = scores.length ? Math.max(...scores) : 0;
            rows.push({
                identifier: emp.identifier,
                displayName: emp.displayName,
                department: emp.department || "",
                sessions: scores.length,
                avgScore: avg,
                bestScore: best,
                isOnline: (emp as any).isOnline || false,
            });
        }

        rows.sort((a, b) => b.bestScore - a.bestScore || b.avgScore - a.avgScore);

        return NextResponse.json({
            organizationName: orgName,
            leaderboard: rows,
            seatsUsed: employees.length,
            planHint: "College / team plans: share org login seats and track cohort averages here.",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
