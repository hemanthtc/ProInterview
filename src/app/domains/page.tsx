"use client";

import Link from "next/link";
import { DOMAIN_PACKS } from "../../data/domainPacks";
import { Layers } from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";

export default function DomainsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-4xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-lime-300/80">
                            <Layers className="h-4 w-4" /> Domain packs
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Specialty interview banks</h1>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm">
                        <Link href="/prep" className="text-indigo-300 hover:underline">
                            Prep dashboard
                        </Link>
                        <Link href="/labs" className="text-white/60 hover:text-white">
                            ← Labs
                        </Link>
                    </div>
                </div>
                <LabAuthBanner feature="domain-targeted online mocks" />
                <div className="space-y-3">
                    {DOMAIN_PACKS.map((d) => (
                        <div key={d.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <h2 className="font-medium">{d.name}</h2>
                                    <p className="text-sm text-white/60">{d.description}</p>
                                    <p className="mt-2 text-xs text-white/40">Focus: {d.focusThemes.join(" · ")}</p>
                                </div>
                                <div className="flex h-fit flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="rounded-xl bg-lime-500/90 px-3 py-2 text-sm"
                                        onClick={() => {
                                            localStorage.setItem("domainPackId", d.id);
                                            localStorage.setItem("preferredRoles", d.name);
                                            window.location.href = "/setup";
                                        }}
                                    >
                                        Full mock
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80"
                                        onClick={() => {
                                            localStorage.setItem("domainPackId", d.id);
                                            const q = d.behavioralThemes?.[0]
                                                ? `Tell me about a time related to: ${d.behavioralThemes[0]}`
                                                : d.signatureQuestions[0] || "Tell me about a relevant project.";
                                            window.location.href = `/star-coach?question=${encodeURIComponent(q)}&weakSpot=${encodeURIComponent("domain depth")}`;
                                        }}
                                    >
                                        STAR drill
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80"
                                        onClick={() => {
                                            localStorage.setItem("domainPackId", d.id);
                                            window.location.href = "/system-design";
                                        }}
                                    >
                                        Design lab
                                    </button>
                                </div>
                            </div>
                            <ul className="mt-3 list-disc pl-5 text-sm text-white/70">
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
