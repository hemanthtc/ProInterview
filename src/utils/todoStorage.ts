import { getStorageItem, setStorageItem } from "./storage";
import { authFetch } from "./authExpiry";

export type TodoPriority = "high" | "medium" | "low";

export interface TodoItem {
    _id: string;
    title: string;
    priority: TodoPriority;
    targetDate: string; // YYYY-MM-DD
    rolledOver: boolean;
    createdAt?: string | Date;
}

const STORAGE_KEY = "prointerview_todos";

export const PRIORITY_WEIGHTS: Record<TodoPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
};

export function isUserLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    const userLoggedVal = getStorageItem("userLoggedIn");
    const hasSessionToken = !!getStorageItem("sessionToken");
    return userLoggedVal === "true" || (hasSessionToken && userLoggedVal !== "guest");
}

export function getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function sortTodosByPriority(todos: TodoItem[]): TodoItem[] {
    return [...todos].sort((a, b) => {
        const weightA = PRIORITY_WEIGHTS[a.priority] || 2;
        const weightB = PRIORITY_WEIGHTS[b.priority] || 2;
        if (weightB !== weightA) return weightB - weightA;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
    });
}

/**
 * Checks all tasks and rolls over any unfinished tasks from previous dates to today.
 * Marks them with rolledOver = true so the user can easily see and reprioritize them.
 */
export function applyDateRollover(todos: TodoItem[]): { updated: TodoItem[]; rolledCount: number } {
    const today = getTodayDateString();
    let rolledCount = 0;

    const updated = todos.map((item) => {
        if (item.targetDate && item.targetDate < today) {
            rolledCount++;
            return {
                ...item,
                targetDate: today,
                rolledOver: true,
            };
        }
        return item;
    });

    return { updated: sortTodosByPriority(updated), rolledCount };
}

export function getLocalTodos(): TodoItem[] {
    if (typeof window === "undefined") return [];
    try {
        const data = getStorageItem(STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            const { updated } = applyDateRollover(parsed);
            return updated;
        }
        return [];
    } catch {
        return [];
    }
}

function saveLocalTodos(todos: TodoItem[], notify: boolean = true): void {
    if (typeof window === "undefined") return;
    const sorted = sortTodosByPriority(todos);
    setStorageItem(STORAGE_KEY, JSON.stringify(sorted));
    if (notify) {
        window.dispatchEvent(new CustomEvent("todo-storage-change"));
    }
}

/**
 * Fetch todos. If authenticated, calls /api/todos with fallback to localStorage.
 * Automatically synchronizes any offline/guest tasks to MongoDB on login.
 */
export async function fetchTodos(isLoggedIn?: boolean): Promise<TodoItem[]> {
    const userIsAuth = typeof isLoggedIn === "boolean" ? (isLoggedIn || isUserLoggedIn()) : isUserLoggedIn();
    if (!userIsAuth) {
        return getLocalTodos();
    }

    try {
        // Sync any pending local items created while offline or in guest mode
        const localTodos = getLocalTodos();
        const pendingLocal = localTodos.filter((t) => t._id && t._id.startsWith("todo_"));
        if (pendingLocal.length > 0) {
            for (const item of pendingLocal) {
                try {
                    await authFetch("/api/todos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ title: item.title, priority: item.priority }),
                    });
                } catch {}
            }
        }

        const res = await authFetch("/api/todos", { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.todos)) {
                const sorted = sortTodosByPriority(data.todos);
                // Mirror to local storage silently for offline fallback without triggering re-fetch loop
                saveLocalTodos(sorted, false);
                return sorted;
            }
        }
    } catch (err) {
        console.warn("Failed to fetch /api/todos, using local fallback", err);
    }

    return getLocalTodos();
}

/**
 * Creates a new task and persists it directly to MongoDB for authenticated users.
 */
export async function createTodo(
    title: string,
    priority: TodoPriority,
    isLoggedIn?: boolean
): Promise<TodoItem> {
    const today = getTodayDateString();
    const tempId = `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newLocalItem: TodoItem = {
        _id: tempId,
        title: title.trim(),
        priority,
        targetDate: today,
        rolledOver: false,
        createdAt: new Date().toISOString(),
    };

    const userIsAuth = typeof isLoggedIn === "boolean" ? (isLoggedIn || isUserLoggedIn()) : isUserLoggedIn();

    if (userIsAuth) {
        try {
            const res = await authFetch("/api/todos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title, priority }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.todo) {
                    const current = getLocalTodos().filter((t) => t._id !== tempId);
                    saveLocalTodos([...current, data.todo]);
                    return data.todo;
                }
            }
        } catch (err) {
            console.warn("Failed to POST /api/todos, saved locally", err);
        }
    }

    const current = getLocalTodos();
    saveLocalTodos([...current, newLocalItem]);
    return newLocalItem;
}

/**
 * Updates priority of a task (e.g. reprioritizing carried-over tasks).
 */
export async function reprioritizeTodo(
    id: string,
    priority: TodoPriority,
    isLoggedIn?: boolean
): Promise<void> {
    const current = getLocalTodos();
    const updated = current.map((item) => (item._id === id ? { ...item, priority } : item));
    saveLocalTodos(updated);

    const userIsAuth = typeof isLoggedIn === "boolean" ? (isLoggedIn || isUserLoggedIn()) : isUserLoggedIn();

    if (userIsAuth && !id.startsWith("todo_")) {
        try {
            await authFetch("/api/todos", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, priority }),
            });
        } catch (err) {
            console.warn("Failed to PATCH /api/todos", err);
        }
    }
}

/**
 * Completes and immediately deletes a task (no history stored).
 */
export async function deleteOrCompleteTodo(id: string, isLoggedIn?: boolean): Promise<void> {
    const current = getLocalTodos();
    const updated = current.filter((item) => item._id !== id);
    saveLocalTodos(updated);

    const userIsAuth = typeof isLoggedIn === "boolean" ? (isLoggedIn || isUserLoggedIn()) : isUserLoggedIn();

    if (userIsAuth && !id.startsWith("todo_")) {
        try {
            await authFetch(`/api/todos?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
                credentials: "include",
            });
        } catch (err) {
            console.warn("Failed to DELETE /api/todos", err);
        }
    }
}
