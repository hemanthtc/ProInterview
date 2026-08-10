"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DOMAIN_PACKS } from "../../data/domainPacks";
import { Layers, Moon, Sun, Eye } from "lucide-react";

export default function DomainsPage() {
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

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-lime-700 font-bold" : "text-lime-300/80"}`}>
                            <Layers className="w-4 h-4" /> Domain packs
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Specialty interview banks</h1>
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
                    {DOMAIN_PACKS.map((d) => (
                        <div
                            key={d.id}
                            className={`rounded-2xl border p-5 transition ${
                                theme === "light"
                                    ? "bg-white border-slate-200 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578]"
                                    : "bg-white/5 border-white/10"
                            }`}
                        >
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-lg">{d.name}</h2>
                                    <p className={`text-sm ${isLight ? "text-slate-600" : "text-white/60"}`}>{d.description}</p>
                                    <p className={`text-xs mt-2 ${isLight ? "text-slate-500 font-semibold" : "text-white/40"}`}>Focus: {d.focusThemes.join(" · ")}</p>
                                </div>
                                <button
                                    type="button"
                                    className={`rounded-xl px-4 py-2 text-sm font-bold h-fit transition cursor-pointer ${
                                        theme === "eyeprotect"
                                            ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                            : "bg-lime-600 hover:bg-lime-500 text-white"
                                    }`}
                                    onClick={() => {
                                        localStorage.setItem("domainPackId", d.id);
                                        localStorage.setItem("preferredRoles", d.name);
                                        window.location.href = "/setup";
                                    }}
                                >
                                    Practice this domain
                                </button>
                            </div>
                            <ul className={`mt-3 text-sm list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                {d.signatureQuestions.slice(0, 2).map((q) => (
                                    <li key={q}>{q}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
