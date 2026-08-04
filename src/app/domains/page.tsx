"use client";

import Link from "next/link";
import { DOMAIN_PACKS } from "../../data/domainPacks";
import { Layers } from "lucide-react";

export default function DomainsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-lime-300/80 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Domain packs
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Specialty interview banks</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>
                <div className="space-y-3">
                    {DOMAIN_PACKS.map((d) => (
                        <div key={d.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <h2 className="font-medium">{d.name}</h2>
                                    <p className="text-sm text-white/60">{d.description}</p>
                                    <p className="text-xs text-white/40 mt-2">Focus: {d.focusThemes.join(" · ")}</p>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-xl bg-lime-500/90 px-3 py-2 text-sm h-fit"
                                    onClick={() => {
                                        localStorage.setItem("domainPackId", d.id);
                                        localStorage.setItem("preferredRoles", d.name);
                                        window.location.href = "/setup";
                                    }}
                                >
                                    Practice this domain
                                </button>
                            </div>
                            <ul className="mt-3 text-sm text-white/70 list-disc pl-5">
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
