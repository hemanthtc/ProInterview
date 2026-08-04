"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Send, Users } from "lucide-react";

interface Panelist {
    id: string;
    name: string;
    role: string;
}

interface Msg {
    role: "user" | "assistant";
    content: string;
    panelist?: string;
    speakerRole?: string;
}

export default function PanelInterviewPage() {
    const [panelists, setPanelists] = useState<Panelist[]>([]);
    const [activeId, setActiveId] = useState("tech_lead");
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        fetch("/api/panel-interviewer")
            .then((r) => r.json())
            .then((d) => setPanelists(d.panelists || []))
            .catch(() => {});
        // Opening turn
        void send("", true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function send(text: string, opening = false) {
        if (loading || done) return;
        setLoading(true);
        setError("");
        const history = messages;
        if (!opening && text.trim()) {
            setMessages((m) => [...m, { role: "user", content: text.trim() }]);
            setInput("");
        }
        try {
            const resume = typeof window !== "undefined" ? localStorage.getItem("userResumeCvText") || "" : "";
            const res = await fetch("/api/panel-interviewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history,
                    message: opening ? "" : text,
                    resume,
                    company: localStorage.getItem("targetCompany") || "a tech company",
                    role: localStorage.getItem("preferredRoles") || "Software Engineer",
                    activePanelistId: activeId,
                    sessionId: localStorage.getItem("userIdentifier") || "anon",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Panel request failed");
            setMessages((m) => [
                ...m,
                {
                    role: "assistant",
                    content: data.reply,
                    panelist: data.speakerName,
                    speakerRole: data.speakerRole,
                },
            ]);
            if (data.passTo) setActiveId(data.passTo);
            if (data.terminate) setDone(true);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-indigo-300/80 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Panel interview
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Multi-interviewer round</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {panelists.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setActiveId(p.id)}
                            className={`rounded-full px-3 py-1.5 text-xs border ${
                                activeId === p.id
                                    ? "bg-indigo-500/30 border-indigo-400 text-white"
                                    : "border-white/10 text-white/50"
                            }`}
                        >
                            {p.name} · {p.role}
                        </button>
                    ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 min-h-[420px] p-4 space-y-3">
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`rounded-xl px-3 py-2 text-sm ${
                                m.role === "user" ? "bg-indigo-500/20 ml-8" : "bg-black/30 mr-8"
                            }`}
                        >
                            {m.panelist && (
                                <div className="text-[10px] uppercase tracking-wide text-indigo-300 mb-1">
                                    {m.panelist} · {m.speakerRole}
                                </div>
                            )}
                            {m.content}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 text-white/50 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Panel thinking…
                        </div>
                    )}
                    {error && <p className="text-rose-300 text-sm">{error}</p>}
                    {done && <p className="text-emerald-300 text-sm">Panel concluded. Review in Film Room next.</p>}
                </div>

                <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Answer the active panelist…"
                        className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm"
                        disabled={loading || done}
                    />
                    <button
                        type="submit"
                        disabled={loading || done || !input.trim()}
                        className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
