"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";

/** Compact promo card linking half-wired + new backlog surfaces */
export default function LabsBanner({ isLight = false }: { isLight?: boolean }) {
    return (
        <div
            className={`rounded-2xl border p-4 mb-4 ${
                isLight ? "border-indigo-200 bg-indigo-50" : "border-indigo-500/30 bg-indigo-500/10"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <FlaskConical className={`w-5 h-5 mt-0.5 ${isLight ? "text-indigo-600" : "text-indigo-300"}`} />
                    <div>
                        <h3 className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Labs & quick wins</h3>
                        <p className={`text-sm ${isLight ? "text-slate-600" : "text-white/60"}`}>
                            Panel interviews, system design, STAR coach, jobs, coding lab, coaches, ATS match, domain packs — plus Gmail invites, aptitude quizzes, and mock tests in Features.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/labs" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition">
                        ← Back to Labs
                    </Link>
                    <Link href="/jobs" className={`rounded-xl px-3 py-2 text-xs font-bold border transition ${isLight ? "border-slate-300 text-slate-700 bg-white" : "border-white/15 text-white/80"}`}>
                        Jobs
                    </Link>
                    <button
                        type="button"
                        className={`rounded-xl px-3 py-2 text-xs font-bold border transition ${isLight ? "border-slate-300 text-slate-700 bg-white" : "border-white/15 text-white/80"}`}
                        onClick={() => {
                            const el = document.querySelector("[data-tool=email_analyser], button");
                            window.location.hash = "email";
                            // Users open Email Analyser from the tool grid below
                            alert("Tip: open Email Analyser for Gmail invite import, then Prep Packs / Aptitude / Mock tests from the tool grid.");
                        }}
                    >
                        Prep + Gmail
                    </button>
                </div>
            </div>
        </div>
    );
}
