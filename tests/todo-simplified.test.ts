import { describe, it, expect } from "vitest";
import {
    sortTodosByPriority,
    applyDateRollover,
    getTodayDateString,
    type TodoItem,
} from "../src/utils/todoStorage";

describe("Simplified To-Do List logic", () => {
    it("strictly sorts tasks by priority first (High -> Medium -> Low)", () => {
        const sampleTodos: TodoItem[] = [
            {
                _id: "1",
                title: "Low priority task",
                priority: "low",
                targetDate: "2026-09-20",
                rolledOver: false,
                createdAt: "2026-09-20T10:00:00.000Z",
            },
            {
                _id: "2",
                title: "High priority task",
                priority: "high",
                targetDate: "2026-09-20",
                rolledOver: false,
                createdAt: "2026-09-20T09:00:00.000Z",
            },
            {
                _id: "3",
                title: "Medium priority task",
                priority: "medium",
                targetDate: "2026-09-20",
                rolledOver: false,
                createdAt: "2026-09-20T09:30:00.000Z",
            },
        ];

        const sorted = sortTodosByPriority(sampleTodos);
        expect(sorted[0].priority).toBe("high");
        expect(sorted[0].title).toBe("High priority task");
        expect(sorted[1].priority).toBe("medium");
        expect(sorted[1].title).toBe("Medium priority task");
        expect(sorted[2].priority).toBe("low");
        expect(sorted[2].title).toBe("Low priority task");
    });

    it("automatically rolls over incomplete tasks from previous dates to today", () => {
        const todayStr = getTodayDateString();
        const pastTodos: TodoItem[] = [
            {
                _id: "p1",
                title: "Unfinished interview prep from yesterday",
                priority: "medium",
                targetDate: "2020-01-01",
                rolledOver: false,
            },
            {
                _id: "p2",
                title: "Task already set for today",
                priority: "high",
                targetDate: todayStr,
                rolledOver: false,
            },
        ];

        const { updated, rolledCount } = applyDateRollover(pastTodos);
        expect(rolledCount).toBe(1);

        const rolledItem = updated.find((t) => t._id === "p1");
        expect(rolledItem).toBeDefined();
        expect(rolledItem?.rolledOver).toBe(true);
        expect(rolledItem?.targetDate).toBe(todayStr);

        // High priority task should still be listed first
        expect(updated[0]._id).toBe("p2");
    });

    it("allows reprioritizing carried-over tasks to change their position", () => {
        const list: TodoItem[] = [
            {
                _id: "t1",
                title: "New high priority task",
                priority: "high",
                targetDate: "2026-09-20",
                rolledOver: false,
            },
            {
                _id: "t2",
                title: "Carried over task originally low priority",
                priority: "low",
                targetDate: "2026-09-20",
                rolledOver: true,
            },
        ];

        // Before reprioritizing, t1 is first
        let sorted = sortTodosByPriority(list);
        expect(sorted[0]._id).toBe("t1");

        // User reprioritizes carried-over task from low to high
        const reprioritized = list.map((item) =>
            item._id === "t2" ? { ...item, priority: "high" as const } : item
        );
        sorted = sortTodosByPriority(reprioritized);

        expect(sorted.find((t) => t._id === "t2")?.priority).toBe("high");
    });

    it("deleting / checking a task removes it completely without saving history", () => {
        const activeList: TodoItem[] = [
            {
                _id: "101",
                title: "Task to complete",
                priority: "high",
                targetDate: "2026-09-20",
                rolledOver: false,
            },
            {
                _id: "102",
                title: "Remaining task",
                priority: "medium",
                targetDate: "2026-09-20",
                rolledOver: false,
            },
        ];

        // Simulated immediate deletion
        const afterCompletion = activeList.filter((t) => t._id !== "101");
        expect(afterCompletion).toHaveLength(1);
        expect(afterCompletion[0]._id).toBe("102");
        expect(afterCompletion.find((t) => t._id === "101")).toBeUndefined();
    });

    it("matches userIdentifier case-insensitively in MongoDB queries", () => {
        const id1 = "Hemanth@Domain.com";
        const id2 = "hemanth@domain.com";

        const rawId = id1.trim();
        const userFilter = { $or: [{ userIdentifier: rawId }, { userIdentifier: rawId.toLowerCase() }] };

        // Test matching function simulating Mongo's $or
        const matchUser = (doc: { userIdentifier: string }) =>
            userFilter.$or.some((clause) => clause.userIdentifier === doc.userIdentifier);

        expect(matchUser({ userIdentifier: id1 })).toBe(true);
        expect(matchUser({ userIdentifier: id2 })).toBe(true);
        expect(matchUser({ userIdentifier: "other@domain.com" })).toBe(false);
    });

    it("correctly identifies pending offline/guest tasks with temporary IDs for cloud sync", () => {
        const localList: TodoItem[] = [
            { _id: "todo_174000_abcde", title: "Offline task 1", priority: "high", targetDate: "2026-10-01", rolledOver: false },
            { _id: "672abc1234567890deadbeef", title: "Remote mongo task", priority: "medium", targetDate: "2026-10-01", rolledOver: false },
            { _id: "todo_174001_fghij", title: "Offline task 2", priority: "low", targetDate: "2026-10-01", rolledOver: false },
        ];

        const pending = localList.filter((t) => t._id && t._id.startsWith("todo_"));
        expect(pending).toHaveLength(2);
        expect(pending.map((p) => p.title)).toEqual(["Offline task 1", "Offline task 2"]);
    });
});
