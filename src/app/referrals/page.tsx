"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Gift, Share2 } from "lucide-react";

export default function ReferralsPage() {
    const [code, setCode] = useState("");
    const [sharePath, setSharePath] = useState("");
    const [uses, setUses] = useState(0);
    const [copied, setCopied] = useState(false);
    const [compareId, setCompareId] = useState("");
    const [referralCredits, setReferralCredits] = useState(0);

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

                <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-orange-300" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-orange-200">{referralCredits}</div>
                        <p className="text-xs text-white/50">Referral credits earned — 2 for you and 1 for your friend on every first-time invite.</p>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                    <h2 className="font-medium">Your invite stats</h2>
                    <p className="text-sm text-white/55">
                        Uses tracked: <span className="text-orange-200 font-medium">{uses}</span>
                    </p>
                    <p className="text-xs text-white/40">
                        Share your link — when friends sign up with your code, the count goes up. Compare scorecards below.
                    </p>
                    <Link href="/prep" className="inline-block text-sm text-indigo-300 underline">
                        Back to prep dashboard →
                    </Link>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                    <h2 className="font-medium">Compare a friend&apos;s scorecard</h2>
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
