"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
    CheckCircle2, Circle, Trash2, Plus, Sparkles, 
    ArrowUpCircle, MinusCircle, ArrowDownCircle, RefreshCw
} from "lucide-react";
import {
    TodoItem,
    TodoPriority,
    getLocalTodos,
    fetchTodos,
    createTodo,
    reprioritizeTodo,
    deleteOrCompleteTodo,
} from "@/utils/todoStorage";

interface HomeTodoWidgetProps {
    theme?: "dark" | "light" | "eyeprotect";
    isLoggedIn?: boolean;
}


export default function HomeTodoWidget({
    theme = "dark",
    isLoggedIn = false,
}: HomeTodoWidgetProps) {
    const [todos, setTodos] = useState<TodoItem[]>(() => {
        if (typeof window !== "undefined") return getLocalTodos();
        return [];
    });
    const [todayFormatted, setTodayFormatted] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [selectedPriority, setSelectedPriority] = useState<TodoPriority>("high");
    const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isFetchingRef = useRef(false);

    const loadData = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const list = await fetchTodos(isLoggedIn);
            setTodos(list);
        } finally {
            isFetchingRef.current = false;
        }
    }, [isLoggedIn]);

    useEffect(() => {
        loadData();

        const handleStorageChange = () => {
            loadData();
        };

        window.addEventListener("todo-storage-change", handleStorageChange);
        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("todo-storage-change", handleStorageChange);
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [loadData]);

    const handleAdd = async (titleToAdd?: string, priorityToAdd?: TodoPriority) => {
        const title = (titleToAdd || newTitle).trim();
        if (!title) return;
        const priority = priorityToAdd || selectedPriority;

        setIsSubmitting(true);
        try {
            await createTodo(title, priority, isLoggedIn);
            if (!titleToAdd) setNewTitle("");
            await loadData();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Checking off a task triggers an instant completion animation, then deletes it immediately
    const handleCheck = (id: string) => {
        setCompletingIds((prev) => new Set(prev).add(id));
        setTimeout(async () => {
            await deleteOrCompleteTodo(id, isLoggedIn);
            setCompletingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            // loadData triggered automatically via todo-storage-change event
        }, 380);
    };

    const handleDelete = async (id: string) => {
        await deleteOrCompleteTodo(id, isLoggedIn);
        // loadData triggered automatically via todo-storage-change event
    };

    const handleReprioritize = async (id: string, newPriority: TodoPriority) => {
        await reprioritizeTodo(id, newPriority, isLoggedIn);
        // loadData triggered automatically via todo-storage-change event
    };

    // Calculate priority counts
    const highCount = todos.filter((t) => t.priority === "high").length;
    const medCount = todos.filter((t) => t.priority === "medium").length;
    const lowCount = todos.filter((t) => t.priority === "low").length;
    const carriedOverCount = todos.filter((t) => t.rolledOver).length;

    useEffect(() => {
        setTodayFormatted(
            new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
            })
        );
    }, []);

    const isLight = theme === "light";
    const isEye = theme === "eyeprotect";

    return (
        <div
            className={`w-full rounded-3xl border p-4 sm:p-5 transition-all duration-300 shadow-xl ${
                isLight
                    ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/50"
                    : isEye
                    ? "bg-[#fffcf5] border-[#8c8578]/30 text-[#1c1917] shadow-stone-200/20"
                    : "bg-[#0b0c15] border-white/10 text-white shadow-[0_0_25px_rgba(0,0,0,0.4)]"
            }`}
        >
            {/* Header: Title, Date & Priority Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-black tracking-tight">
                            Today&apos;s To-Do
                        </h2>
                        <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                                isLight
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : isEye
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                            }`}
                        >
                            {todayFormatted}
                        </span>
                    </div>
                </div>

                {/* Priority Breakdown Pills */}
                <div className="flex items-center gap-1 text-[9.5px] font-black">
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {highCount} High
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {medCount} Med
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {lowCount} Low
                    </span>
                    {carriedOverCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                            {carriedOverCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Quick Add Bar - Fully Responsive, Never Overflows */}
            <div className="mt-3 space-y-2">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAdd();
                    }}
                    className="flex flex-col gap-2"
                >
                    {/* Row 1: Task Input + Add Button */}
                    <div className="flex items-center gap-1.5 w-full">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Add a new task..."
                            className={`flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                                isLight
                                    ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500"
                                    : isEye
                                    ? "bg-[#f4eae1]/60 border-[#8c8578]/30 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-600"
                                    : "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-indigo-500"
                            }`}
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting || !newTitle.trim()}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                        </button>
                    </div>

                    {/* Row 2: Priority Selection Pills */}
                    <div className="flex items-center gap-1.5 w-full">
                        <span
                            className={`text-[9.5px] font-bold uppercase tracking-wider shrink-0 mr-0.5 ${
                                isLight ? "text-slate-400" : isEye ? "text-stone-400" : "text-white/40"
                            }`}
                        >
                            Priority:
                        </span>

                        <button
                            type="button"
                            onClick={() => setSelectedPriority("high")}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                selectedPriority === "high"
                                    ? "bg-rose-500 text-white border-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.35)]"
                                    : isLight
                                    ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                    : isEye
                                    ? "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                            }`}
                            title="High Priority (Shown first)"
                        >
                            <ArrowUpCircle className="w-3 h-3 text-rose-400" />
                            High
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedPriority("medium")}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                selectedPriority === "medium"
                                    ? "bg-amber-500 text-slate-950 border-amber-600 font-black shadow-[0_0_10px_rgba(245,158,11,0.35)]"
                                    : isLight
                                    ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                    : isEye
                                    ? "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                            }`}
                            title="Medium Priority"
                        >
                            <MinusCircle className="w-3 h-3 text-amber-400" />
                            Med
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedPriority("low")}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                                selectedPriority === "low"
                                    ? "bg-blue-600 text-white border-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.35)]"
                                    : isLight
                                    ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                    : isEye
                                    ? "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                            }`}
                            title="Low Priority"
                        >
                            <ArrowDownCircle className="w-3 h-3 text-blue-400" />
                            Low
                        </button>
                    </div>
                </form>
            </div>

            {/* Tasks List - Strictly Sorted by Priority */}
            <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
                {todos.length === 0 ? (
                    <div
                        className={`py-5 px-3 text-center rounded-xl border border-dashed flex flex-col items-center justify-center gap-1.5 ${
                            isLight
                                ? "border-slate-200 bg-slate-50/50 text-slate-500"
                                : isEye
                                ? "border-stone-300 bg-stone-50/50 text-stone-500"
                                : "border-white/10 bg-white/[0.02] text-white/40"
                        }`}
                    >
                        <CheckCircle2 className="w-6 h-6 opacity-40 text-emerald-400" />
                        <p className="text-xs font-semibold">
                            All caught up for today!
                        </p>
                    </div>
                ) : (
                    todos.map((todo) => {
                        const isCompleting = completingIds.has(todo._id);
                        const isHigh = todo.priority === "high";
                        const isMed = todo.priority === "medium";

                        return (
                            <div
                                key={todo._id}
                                className={`group p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                                    isCompleting
                                        ? "opacity-30 scale-95 line-through bg-emerald-500/10 border-emerald-500/30"
                                        : isLight
                                        ? "bg-slate-50/80 hover:bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
                                        : isEye
                                        ? "bg-stone-50/80 hover:bg-[#fffcf5] border-[#8c8578]/25 hover:border-amber-400"
                                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/15"
                                }`}
                            >
                                {/* Checkbox & Title */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => handleCheck(todo._id)}
                                        className="shrink-0 transition-transform active:scale-90 cursor-pointer text-white/40 hover:text-emerald-400"
                                        title="Mark as done (deletes immediately)"
                                    >
                                        {isCompleting ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-in zoom-in" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                                        )}
                                    </button>

                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`text-xs font-semibold leading-snug break-words transition-all ${
                                                    isCompleting
                                                        ? "line-through opacity-50"
                                                        : isLight
                                                        ? "text-slate-800"
                                                        : isEye
                                                        ? "text-stone-900"
                                                        : "text-white/90"
                                                }`}
                                            >
                                                {todo.title}
                                            </span>

                                            {/* Priority Badge */}
                                            <span
                                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                                                    isHigh
                                                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                                        : isMed
                                                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                                        : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                                }`}
                                            >
                                                {todo.priority}
                                            </span>

                                            {/* Rollover Indicator & Reprioritize Prompt */}
                                            {todo.rolledOver && (
                                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 animate-pulse">
                                                    <RefreshCw className="w-2.5 h-2.5" />
                                                    Carried Over
                                                </span>
                                            )}
                                        </div>

                                        {/* Reprioritize Controls: Especially handy for Carried Over tasks! */}
                                        {todo.rolledOver && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span
                                                    className={`text-[8.5px] font-bold uppercase tracking-wider ${
                                                        isLight
                                                            ? "text-slate-400"
                                                            : isEye
                                                            ? "text-stone-400"
                                                            : "text-white/40"
                                                    }`}
                                                >
                                                    Prioritize for today:
                                                </span>
                                                <div className="inline-flex rounded-lg border border-white/10 p-0.5 bg-black/20 text-[8.5px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReprioritize(todo._id, "high")}
                                                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                                                            todo.priority === "high"
                                                                ? "bg-rose-500 text-white"
                                                                : "text-white/60 hover:text-white"
                                                        }`}
                                                    >
                                                        High
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReprioritize(todo._id, "medium")}
                                                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                                                            todo.priority === "medium"
                                                                ? "bg-amber-500 text-slate-950"
                                                                : "text-white/60 hover:text-white"
                                                        }`}
                                                    >
                                                        Med
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReprioritize(todo._id, "low")}
                                                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                                                            todo.priority === "low"
                                                                ? "bg-blue-500 text-white"
                                                                : "text-white/60 hover:text-white"
                                                        }`}
                                                    >
                                                        Low
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Manual Delete Button */}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(todo._id)}
                                    className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                                        isLight
                                            ? "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                            : isEye
                                            ? "text-stone-300 hover:text-rose-600 hover:bg-rose-50"
                                            : "text-white/30 hover:text-rose-400 hover:bg-white/5"
                                    }`}
                                    title="Delete task immediately"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
