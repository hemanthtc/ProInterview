"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Gift, Share2, Moon, Sun, Eye } from "lucide-react";

export default function ReferralsPage() {
    const [code, setCode] = useState("");
    const [sharePath, setSharePath] = useState("");
    const [uses, setUses] = useState(0);
    const [copied, setCopied] = useState(false);
    const [compareId, setCompareId] = useState("");
    const [referralCredits, setReferralCredits] = useState(0);

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
        fetch("/api/referrals")
            .then((r) => r.json())
            .then((d) => {
                setCode(d.code || "");
                setSharePath(d.sharePath || "");
                setUses(d.uses || 0);
            })
            .catch(() => {
                const local = localStorage.getItem("referralCode") || Math.random().toString(36).slice(2, 10);
                localStorage.setItem("referralCode", local);
                setCode(local);
                setSharePath(`/login?ref=${local}`);
            });

        fetch("/api/usage")
            .then((r) => r.json())
            .then((d) => setReferralCredits(d.referralCredits || 0))
            .catch(() => {});
    }, []);

    async function copy() {
        const url = `${window.location.origin}${sharePath}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
                <div className="mb-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 font-bold ${isLight ? "text-orange-700" : "text-orange-300/80"}`}>
                            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Referrals
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                            <button
                                onClick={cycleTheme}
                                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
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
                                className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm whitespace-nowrap ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                        : isLight
                                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                                }`}
                            >
                                <span className="hidden sm:inline">← Back to Labs</span>
                                <span className="sm:hidden">← Labs</span>
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">Invite friends · compare scorecards</h1>
                    </div>
                </div>

                <div className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
                    theme === "light"
                        ? "bg-white border-slate-200 shadow-sm"
                        : theme === "eyeprotect"
                        ? "bg-[#fffcf5] border-[#8c8578]"
                        : "bg-white/5 border-white/10"
                }`}>
                    <div className={`text-sm ${isLight ? "text-slate-500 font-medium" : "text-white/50"}`}>Your invite code</div>
                    <div className="text-2xl sm:text-3xl font-mono tracking-widest font-bold text-orange-600 dark:text-orange-300">{code || "…"}</div>
                    <div className={`text-xs sm:text-sm ${isLight ? "text-slate-500 font-medium" : "text-white/50"}`}>Uses: {uses}</div>
                    <button
                        type="button"
                        onClick={() => void copy()}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${
                            theme === "eyeprotect"
                                ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                : "bg-orange-600 hover:bg-orange-500 text-white"
                        }`}
                    >
                        <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy invite link"}
                    </button>
                </div>

                <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-orange-300" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-orange-200">{referralCredits}</div>
                        <p className={`text-xs ${isLight ? "text-slate-600" : "text-white/50"}`}>Referral credits earned — 2 for you and 1 for your friend on every first-time invite.</p>
                    </div>
                </div>

                <div className={`mt-4 rounded-2xl border p-4 sm:p-5 space-y-3 ${
                    theme === "light"
                        ? "bg-white border-slate-200 shadow-sm"
                        : theme === "eyeprotect"
                        ? "bg-[#fffcf5] border-[#8c8578]"
                        : "bg-white/5 border-white/10"
                }`}>
                    <h2 className="font-semibold text-base">Compare a friend&apos;s scorecard</h2>
                    <input
                        value={compareId}
                        onChange={(e) => setCompareId(e.target.value)}
                        placeholder="Paste scorecard id"
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500/50"
                        }`}
                    />
                    <Link
                        href={compareId ? `/scorecard/${compareId}` : "#"}
                        className={`inline-block rounded-xl border px-4 py-2 text-sm font-bold transition ${
                            isLight
                                ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                    >
                        Open scorecard
                    </Link>
                </div>
            </div>
        </div>
    );
}
