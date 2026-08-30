"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Funnel {
    signups: number;
    interviews: number;
    assessments: number;
    exams: number;
    jobs: number;
    aptitude: number;
}

export default function AnalyticsPage() {
    const [funnel, setFunnel] = useState<Funnel | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/analytics")
            .then((r) => r.json())
            .then((d) => {
                if (d.error) setError(d.error);
                else setFunnel(d.funnel);
            })
            .catch(() => setError("Could not load analytics."));
    }, []);

    return (
        <div className="min-h-screen bg-[#0b141a] text-white px-4 py-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold">Placement funnel</h1>
                <p className="mt-2 text-sm text-white/50">Signup → interview → assessment → exam (in-memory this session).</p>
                {error && <p className="mt-4 text-rose-300 text-sm">{error}</p>}
                {funnel && (
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {(
                            [
                                ["Signups", funnel.signups],
                                ["Interviews", funnel.interviews],
                                ["Assessments", funnel.assessments],
                                ["Exams", funnel.exams],
                                ["Jobs tracked", funnel.jobs],
                                ["Aptitude", funnel.aptitude],
                            ] as const
                        ).map(([label, n]) => (
                            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-2xl font-black text-emerald-300">{n}</div>
                                <div className="text-xs text-white/45">{label}</div>
                            </div>
                        ))}
                    </div>
                )}
                <Link href="/faculty/exams" className="mt-8 inline-block text-sm text-emerald-400 hover:underline">
                    Faculty exams →
                </Link>
            </div>
        </div>
    );
}
