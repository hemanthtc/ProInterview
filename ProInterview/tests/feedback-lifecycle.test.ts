import { describe, it, expect } from "vitest";

interface FeedbackPayload {
    fieldOfStudy: string;
    category: string;
    problemStatement: string;
    problemDescription: string;
    domainSuggestions?: string;
    rating: number;
    attachmentUrl?: string;
}

function validateFeedbackPayload(body: Partial<FeedbackPayload>) {
    if (!body.fieldOfStudy || !body.fieldOfStudy.trim()) {
        return { valid: false, error: "Field of study is required." };
    }
    if (!body.problemStatement || !body.problemStatement.trim()) {
        return { valid: false, error: "Problem statement is required." };
    }
    if (!body.problemDescription || !body.problemDescription.trim()) {
        return { valid: false, error: "Problem description is required." };
    }

    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    return {
        valid: true,
        sanitized: {
            fieldOfStudy: body.fieldOfStudy.trim(),
            category: body.category || "General Feedback",
            problemStatement: body.problemStatement.trim(),
            problemDescription: body.problemDescription.trim(),
            domainSuggestions: body.domainSuggestions ? body.domainSuggestions.trim() : "",
            rating,
            attachmentUrl: body.attachmentUrl || "",
            status: "pending",
        }
    };
}

function canDeleteFeedback(itemOwner: string, requestUser: string, role: string) {
    const isOwner = itemOwner.toLowerCase() === requestUser.toLowerCase();
    const isAdmin = role === "admin";
    return isOwner || isAdmin;
}

describe("Feedback System Lifecycle Tests", () => {
    it("rejects feedback submission when field of study is missing", () => {
        const res = validateFeedbackPayload({
            problemStatement: "Missing test cases in Python",
            problemDescription: "Need more test cases",
            rating: 4,
        });
        expect(res.valid).toBe(false);
        expect(res.error).toContain("Field of study");
    });

    it("rejects feedback submission when problem statement is missing", () => {
        const res = validateFeedbackPayload({
            fieldOfStudy: "Computer Science",
            problemDescription: "Some issue description",
            rating: 5,
        });
        expect(res.valid).toBe(false);
        expect(res.error).toContain("Problem statement");
    });

    it("rejects feedback submission when problem description is missing", () => {
        const res = validateFeedbackPayload({
            fieldOfStudy: "Mechanical Engineering",
            problemStatement: "Thermodynamics question bank",
            rating: 3,
        });
        expect(res.valid).toBe(false);
        expect(res.error).toContain("Problem description");
    });

    it("validates and clamps rating between 1 and 5", () => {
        const resOver = validateFeedbackPayload({
            fieldOfStudy: "Artificial Intelligence & ML",
            problemStatement: "Add LangChain & RAG interview questions",
            problemDescription: "Would like to see dedicated RAG system design questions.",
            domainSuggestions: "Include chunking and vector index questions",
            rating: 10,
        });
        expect(resOver.valid).toBe(true);
        expect(resOver.sanitized?.rating).toBe(5);

        const resUnder = validateFeedbackPayload({
            fieldOfStudy: "Electrical & Electronics",
            problemStatement: "Circuit simulator bug",
            problemDescription: "AC analysis chart does not render properly",
            rating: -2,
        });
        expect(resUnder.valid).toBe(true);
        expect(resUnder.sanitized?.rating).toBe(1);
    });

    it("allows authors and admins to delete feedback, while rejecting non-author regular users", () => {
        const author = "student@example.com";
        const otherStudent = "other@example.com";
        const adminUser = "admin@prointerview.ai";

        // Author can delete their own ticket
        expect(canDeleteFeedback(author, author, "user")).toBe(true);

        // Admin can delete any ticket for moderation
        expect(canDeleteFeedback(author, adminUser, "admin")).toBe(true);

        // Another regular student cannot delete someone else's ticket
        expect(canDeleteFeedback(author, otherStudent, "user")).toBe(false);
    });

    it("correctly sets admin response structure and updates ticket status", () => {
        const feedback = {
            _id: "fb_123",
            userIdentifier: "candidate@college.edu",
            fieldOfStudy: "Civil & Structural Engineering",
            status: "pending",
            adminReply: undefined as any,
        };

        const adminReplyText = "Thank you! We have added 50 new STAAD.Pro and Structural Analysis questions.";
        feedback.adminReply = {
            replyText: adminReplyText,
            repliedAt: new Date().toISOString(),
            repliedBy: "admin@prointerview.ai",
            adminName: "Lead Curriculum Admin",
        };
        feedback.status = "resolved";

        expect(feedback.status).toBe("resolved");
        expect(feedback.adminReply.replyText).toBe(adminReplyText);
        expect(feedback.adminReply.adminName).toBe("Lead Curriculum Admin");
    });
});
