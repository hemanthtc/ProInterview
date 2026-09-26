"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { getStorageItem } from "@/utils/storage";

/** Banner for labs that need online AI / auth. */
export default function LabAuthBanner({ feature = "online AI features" }: { feature?: string }) {
    const [loggedIn, setLoggedIn] = useState(true);

    useEffect(() => {
        Promise.resolve().then(() => {
            setLoggedIn(getStorageItem("userLoggedIn") === "true" || localStorage.getItem("userLoggedIn") === "true");
        });
    }, []);

    if (loggedIn) return null;

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/90">
            <span>
                Sign in to use {feature}. You can still browse; generation and scoring need a session.
            </span>
            <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-slate-950"
            >
                <LogIn className="h-3.5 w-3.5" /> Sign in
            </Link>
        </div>
    );
}
