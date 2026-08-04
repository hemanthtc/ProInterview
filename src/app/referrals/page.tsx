"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Share2 } from "lucide-react";

export default function ReferralsPage() {
    const [code, setCode] = useState("");
    const [sharePath, setSharePath] = useState("");
    const [uses, setUses] = useState(0);
    const [copied, setCopied] = useState(false);
    const [compareId, setCompareId] = useState("");

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
    }, []);

    async function copy() {
        const url = `${window.location.origin}${sharePath}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-orange-300/80 flex items-center gap-2">
                            <Share2 className="w-4 h-4" /> Referrals
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Invite friends · compare scorecards</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                    <div className="text-sm text-white/50">Your invite code</div>
                    <div className="text-3xl font-mono tracking-widest">{code || "…"}</div>
                    <div className="text-sm text-white/50">Uses: {uses}</div>
                    <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm">
                        <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy invite link"}
                    </button>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                    <h2 className="font-medium">Compare a friend's scorecard</h2>
                    <input
                        value={compareId}
                        onChange={(e) => setCompareId(e.target.value)}
                        placeholder="Paste scorecard id"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                    />
                    <Link
                        href={compareId ? `/scorecard/${compareId}` : "#"}
                        className="inline-block rounded-xl bg-white/10 px-4 py-2 text-sm"
                    >
                        Open scorecard
                    </Link>
                </div>
            </div>
        </div>
    );
}
