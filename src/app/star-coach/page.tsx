"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Target, Moon, Sun, Eye } from "lucide-react";

export default function StarCoachPage() {
    const [question, setQuestion] = useState("Tell me about a time you disagreed with a teammate.");
    const [weakSpot, setWeakSpot] = useState("unclear impact metrics");
    const [story, setStory] = useState("");
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
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith("filmRoom_"));
            if (!keys.length) return;
            const raw = localStorage.getItem(keys.sort().reverse()[0] || "");
            if (!raw) return;
            const data = JSON.parse(raw);
            const gap = (data.annotations || []).find((a: any) => a.kind === "gap");
            if (gap?.text) setWeakSpot(String(gap.text).slice(0, 180));
            if (data.practiceFocus?.[0]) setQuestion(`Practice: ${data.practiceFocus[0]}`);
            if (data.retakePrompts?.[0]) setQuestion(data.retakePrompts[0]);
        } catch {
            /* ignore */
        }
    }, []);

    async function run(mode: "coach" | "score" | "retake") {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/star-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    story,
                    question,
                    weakSpot,
                    mode,
                    company: localStorage.getItem("targetCompany") || "",
                    role: localStorage.getItem("preferredRoles") || "",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Coach failed");
            setResult(data);
            if (mode === "retake" && data.retakePrompt) setQuestion(data.retakePrompt);
            if (data.improvedStory && mode === "coach") setStory(data.improvedStory);
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
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-violet-700 font-bold" : "text-violet-300/80"}`}>
                            <Target className="w-4 h-4" /> STAR coach
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Behavioral drills with retakes</h1>
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

                <div className="space-y-3">
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40"
                        }`}
                        placeholder="Behavioral question"
                    />
                    <input
                        value={weakSpot}
                        onChange={(e) => setWeakSpot(e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40"
                        }`}
                        placeholder="Weak spot from film room"
                    />
                    <textarea
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        className={`w-full min-h-[180px] rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40"
                        }`}
                        placeholder="Draft your STAR story…"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => void run("coach")}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                    : "bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                            }`}
                        >
                            Rewrite with coach
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => void run("score")}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                                isLight
                                    ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                            }`}
                        >
                            Score story
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => void run("retake")}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                                isLight
                                    ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                            }`}
                        >
                            New retake prompt
                        </button>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 self-center" />}
                    </div>
                    {error && <p className="text-rose-500 text-sm font-semibold">{error}</p>}
                    {result && (
                        <div className={`rounded-2xl border p-4 space-y-3 text-sm ${
                            theme === "light"
                                ? "bg-white border-slate-200 shadow-sm"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578]"
                                : "bg-white/5 border-white/10"
                        }`}>
                            <div className={`flex items-center gap-2 font-bold ${isLight ? "text-violet-700" : "text-violet-300"}`}>
                                <Sparkles className="w-4 h-4" /> Score: {result.score ?? "—"}/100
                            </div>
                            {result.starBreakdown && (
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {Object.entries(result.starBreakdown).map(([k, v]) => (
                                        <div key={k} className={`rounded-lg p-2.5 border ${
                                            isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"
                                        }`}>
                                            <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>{k}</div>
                                            <div className={isLight ? "text-slate-800 font-medium" : "text-white/80"}>{String(v)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {result.tips && (
                                <ul className={`list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                    {result.tips.map((t: string, i: number) => (
                                        <li key={i}>{t}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
