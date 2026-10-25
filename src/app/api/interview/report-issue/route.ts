import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Feedback from "@/models/Feedback";
import { getVerifiedSession } from "@/utils/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        const body = await req.json();
        const {
            issueType = "whiteboard",
            userMessage = "",
            screenshot = "",
            diagnostics = {},
        } = body;

        let userIdentifier = session?.identifier?.toLowerCase() || "interview_candidate";
        let userName = "Interview Candidate";

        if (session?.identifier) {
            try {
                await connectDB();
                const userDoc = await User.findOne({ identifier: session.identifier }).lean();
                if ((userDoc as any)?.displayName) {
                    userName = (userDoc as any).displayName;
                }
            } catch {
                /* ignore */
            }
        }

        await connectDB();

        const diagStr = Object.entries(diagnostics)
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join("\n");

        const problemStatement = `[Interview ${String(issueType).toUpperCase()} Glitch] ${
            String(userMessage).slice(0, 80) || "Interface failure reported during interview"
        }`;
        const problemDescription = `Candidate reported a technical interface issue during a live interview.\n\nReported Message: "${userMessage}"\n\nIssue Category: ${issueType}\n\nTechnical Diagnostics:\n${diagStr}`;

        // Save directly to Feedback collection with screenshot so admin/developer can view it in the dashboard
        const newTicket = await Feedback.create({
            userIdentifier,
            userName,
            fieldOfStudy: "Technical Interview System",
            category: "Bug Report",
            problemStatement,
            problemDescription,
            domainSuggestions: "Auto-logged diagnostic ticket from live interview room.",
            rating: 1, // 1 star indicates critical technical glitch
            attachmentUrl: typeof screenshot === "string" && screenshot.length > 0 ? screenshot : "",
            status: "pending",
        });

        return NextResponse.json({
            success: true,
            ticketId: String(newTicket._id),
            message: "Diagnostic snapshot logged successfully for the development team.",
        });
    } catch (err: any) {
        console.error("POST /api/interview/report-issue error:", err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || "Failed to log diagnostic issue.",
            },
            { status: 500 }
        );
    }
}
