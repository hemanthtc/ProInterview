import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getVerifiedSession } from "@/utils/auth";
import { rateLimit } from "@/utils/rateLimit";
import connectDB from "@/utils/db";
import Todo, { type TodoPriority } from "@/models/Todo";

export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Record<TodoPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
};

function getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * GET /api/todos
 * Retrieves all active tasks for the authenticated user.
 * Automatically rolls over any incomplete tasks from past dates to today.
 * Returns tasks strictly sorted by priority (High -> Medium -> Low).
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
        }

        const rl = rateLimit(`todos-get:${session.identifier}`, { limit: 120, windowMs: 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
        }

        await connectDB();
        const today = getTodayString();

        // Rollover: update any past uncompleted tasks to today and mark rolledOver = true
        await Todo.updateMany(
            {
                userIdentifier: session.identifier,
                targetDate: { $lt: today },
            },
            {
                $set: {
                    targetDate: today,
                    rolledOver: true,
                },
            }
        );

        // Fetch all active tasks for user
        const rawTodos = await Todo.find({
            userIdentifier: session.identifier,
        }).lean();

        // Sort: High -> Medium -> Low, then by createdAt descending
        const todos = rawTodos.sort((a, b) => {
            const weightA = PRIORITY_ORDER[a.priority as TodoPriority] || 2;
            const weightB = PRIORITY_ORDER[b.priority as TodoPriority] || 2;
            if (weightB !== weightA) return weightB - weightA;
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        return NextResponse.json({ todos, today });
    } catch (error: unknown) {
        console.error("GET /api/todos error:", error);
        const message = error instanceof Error ? error.message : "Failed to load todos";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/todos
 * Creates a new task assigned to today with chosen priority.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
        }

        const rl = rateLimit(`todos-post:${session.identifier}`, { limit: 60, windowMs: 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
        }

        const body = await req.json();
        const rawTitle = typeof body?.title === "string" ? body.title : "";
        // Sanitize: strip dangerous control/HTML characters and trim
        const title = rawTitle.replace(/[<>]/g, "").trim().slice(0, 300);
        if (!title) {
            return NextResponse.json({ error: "Task title is required." }, { status: 400 });
        }

        const rawPriority = typeof body?.priority === "string" ? body.priority.toLowerCase() : "medium";
        const priority: TodoPriority = ["high", "medium", "low"].includes(rawPriority)
            ? (rawPriority as TodoPriority)
            : "medium";

        const today = getTodayString();

        await connectDB();

        // Prevent unbounded growth: cap at 100 active tasks per user
        const existingCount = await Todo.countDocuments({ userIdentifier: session.identifier });
        if (existingCount >= 100) {
            return NextResponse.json(
                { error: "You have reached the maximum of 100 active tasks. Complete or delete some first." },
                { status: 400 }
            );
        }

        const newTodo = await Todo.create({
            userIdentifier: session.identifier,
            title,
            priority,
            targetDate: today,
            rolledOver: false,
        });

        return NextResponse.json({ success: true, todo: newTodo }, { status: 201 });
    } catch (error: unknown) {
        console.error("POST /api/todos error:", error);
        const message = error instanceof Error ? error.message : "Failed to create todo";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PATCH /api/todos
 * Updates task priority or title (e.g. reprioritizing carried-over tasks).
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
        }

        const rl = rateLimit(`todos-patch:${session.identifier}`, { limit: 60, windowMs: 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
        }

        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id.trim() : "";
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Valid task ID is required." }, { status: 400 });
        }

        const updateFields: Record<string, unknown> = {};

        if (typeof body?.priority === "string") {
            const p = body.priority.toLowerCase();
            if (["high", "medium", "low"].includes(p)) {
                updateFields.priority = p;
            }
        }

        if (typeof body?.title === "string") {
            const sanitizedTitle = body.title.replace(/[<>]/g, "").trim().slice(0, 300);
            if (sanitizedTitle) {
                updateFields.title = sanitizedTitle;
            }
        }

        if (Object.keys(updateFields).length === 0) {
            return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
        }

        await connectDB();
        const updated = await Todo.findOneAndUpdate(
            { _id: id, userIdentifier: session.identifier },
            { $set: updateFields },
            { returnDocument: 'after' }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, todo: updated });
    } catch (error: unknown) {
        console.error("PATCH /api/todos error:", error);
        const message = error instanceof Error ? error.message : "Failed to update todo";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/todos
 * Deletes a task immediately (when checked done or manually deleted).
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
        }

        const rl = rateLimit(`todos-delete:${session.identifier}`, { limit: 60, windowMs: 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
        }

        const id = req.nextUrl.searchParams.get("id");
        await connectDB();

        if (id) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return NextResponse.json({ error: "Invalid task ID format." }, { status: 400 });
            }
            await Todo.deleteOne({ _id: id, userIdentifier: session.identifier });
            return NextResponse.json({ success: true });
        }

        const deleteAll = req.nextUrl.searchParams.get("all") === "1";
        if (deleteAll) {
            await Todo.deleteMany({ userIdentifier: session.identifier });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Task ID or all=1 required." }, { status: 400 });
    } catch (error: unknown) {
        console.error("DELETE /api/todos error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete todo";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
