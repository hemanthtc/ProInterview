"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, PenTool, Sparkles } from "lucide-react";

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#a5b4fc";
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
    }, []);

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
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-cyan-300/80 flex items-center gap-2">
                            <PenTool className="w-4 h-4" /> System design lab
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Whiteboard + auto-eval</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-xs text-white/50">Prompt</label>
                        <select
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
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
                            className="w-full rounded-2xl border border-white/10 touch-none cursor-crosshair"
                        />
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Components, APIs, capacity estimates, tradeoffs…"
                            className="w-full min-h-[120px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => void evaluate()}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Auto-evaluate design
                        </button>
                        {error && <p className="text-rose-300 text-sm">{error}</p>}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        {!result ? (
                            <p className="text-white/40 text-sm">Scores for latency, capacity, APIs, and tradeoffs appear here.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-4xl font-bold text-cyan-300">{result.overall ?? "—"}<span className="text-lg text-white/40">/100</span></div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {result.scores &&
                                        Object.entries(result.scores).map(([k, v]) => (
                                            <div key={k} className="rounded-lg bg-black/30 px-3 py-2 flex justify-between">
                                                <span className="text-white/50 capitalize">{k}</span>
                                                <span>{String(v)}</span>
                                            </div>
                                        ))}
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-emerald-300 mb-1">Strengths</h3>
                                    <ul className="text-sm text-white/70 list-disc pl-5">
                                        {(result.strengths || []).map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-amber-300 mb-1">Gaps</h3>
                                    <ul className="text-sm text-white/70 list-disc pl-5">
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
