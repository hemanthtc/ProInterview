"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, PenTool, Sparkles, Moon, Sun, Eye } from "lucide-react";

const PROMPTS = [
    "Design a URL shortener used by 100M DAU",
    "Design a ride-sharing dispatch system",
    "Design a notification service (push/email/SMS)",
    "Design a multi-tenant feature-flag platform",
];

export default function SystemDesignPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [prompt, setPrompt] = useState(PROMPTS[0]);
    const [notes, setNotes] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            setTheme(savedTheme);
        }
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = theme === "light" ? "#f8fafc" : theme === "eyeprotect" ? "#fffcf5" : "#0b1220";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = theme === "light" ? "#4f46e5" : theme === "eyeprotect" ? "#0b5f58" : "#a5b4fc";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        const pos = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            return {
                x: ((e.clientX - r.left) / r.width) * canvas.width,
                y: ((e.clientY - r.top) / r.height) * canvas.height,
            };
        };
        const down = (e: PointerEvent) => {
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        };
        const move = (e: PointerEvent) => {
            if (!drawing.current) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        };
        const up = () => {
            drawing.current = false;
        };
        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            canvas.removeEventListener("pointerdown", down);
            canvas.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [theme]);

    async function evaluate() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/evaluate-system-design", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    notes,
                    sketchDescription: notes ? `Whiteboard notes capture: ${notes.slice(0, 500)}` : "Freehand sketch on canvas",
                    company: localStorage.getItem("targetCompany") || "",
                    role: localStorage.getItem("preferredRoles") || "",
                    level: localStorage.getItem("interviewLevel") || "intermediate",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Eval failed");
            setResult(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-cyan-700 font-bold" : "text-cyan-300/80"}`}>
                            <PenTool className="w-4 h-4" /> System design lab
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Whiteboard + auto-eval</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={cycleTheme}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                                isLight
                                    ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                            }`}
                            title={`Current Theme: ${theme}. Click to switch.`}
                        >
                            {theme === "dark" && <><Moon className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline">Dark</span></>}
                            {theme === "light" && <><Sun className="w-3.5 h-3.5 text-amber-500" /> <span className="hidden sm:inline">Light</span></>}
                            {theme === "eyeprotect" && <><Eye className="w-3.5 h-3.5 text-teal-600" /> <span className="hidden sm:inline">Eye Comfort</span></>}
                        </button>

                        <Link
                            href="/labs"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                    : isLight
                                    ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            }`}
                        >
                            ← Back to Labs
                        </Link>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className={`text-xs ${isLight ? "text-slate-600 font-semibold" : "text-white/50"}`}>Prompt</label>
                        <select
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                isLight
                                    ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                                    : "bg-black/40 border-white/10 text-white"
                            }`}
                        >
                            {PROMPTS.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                        <canvas
                            ref={canvasRef}
                            width={900}
                            height={560}
                            className={`w-full rounded-2xl border touch-none cursor-crosshair ${
                                isLight ? "border-slate-300 shadow-sm" : "border-white/10"
                            }`}
                        />
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Components, APIs, capacity estimates, tradeoffs…"
                            className={`w-full min-h-[120px] rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                isLight
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40"
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => void evaluate()}
                            disabled={loading}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                    : "bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                            }`}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Auto-evaluate design
                        </button>
                        {error && <p className="text-rose-500 text-sm font-semibold">{error}</p>}
                    </div>

                    <div className={`rounded-2xl border p-5 ${
                        theme === "light"
                            ? "bg-white border-slate-200 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]"
                            : "bg-white/5 border-white/10"
                    }`}>
                        {!result ? (
                            <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/40"}`}>Scores for latency, capacity, APIs, and tradeoffs appear here.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className={`text-4xl font-bold ${isLight ? "text-cyan-700" : "text-cyan-300"}`}>{result.overall ?? "—"}<span className={`text-lg ${isLight ? "text-slate-400" : "text-white/40"}`}>/100</span></div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {result.scores &&
                                        Object.entries(result.scores).map(([k, v]) => (
                                            <div key={k} className={`rounded-lg px-3 py-2 flex justify-between border ${
                                                isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/30 border-white/5 text-white"
                                            }`}>
                                                <span className={`capitalize ${isLight ? "text-slate-500" : "text-white/50"}`}>{k}</span>
                                                <span className="font-semibold">{String(v)}</span>
                                            </div>
                                        ))}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-300 mb-1">Strengths</h3>
                                    <ul className={`text-sm list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                        {(result.strengths || []).map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-amber-600 dark:text-amber-300 mb-1">Gaps</h3>
                                    <ul className={`text-sm list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                        {(result.gaps || []).map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
