"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { getStorageItem } from "@/utils/storage";

function checkIsAuth(): boolean {
    if (typeof window === "undefined") return true;
    const userVal = getStorageItem("userLoggedIn");
    const hasToken = Boolean(getStorageItem("sessionToken"));
    const cookieAuth = typeof document !== "undefined" && document.cookie.includes("userLoggedIn=true");
    return userVal === "true" || hasToken || cookieAuth;
}

/** Banner for labs that need online AI / auth. */
export default function LabAuthBanner({ feature = "online AI features" }: { feature?: string }) {
    const pathname = usePathname();
    const [loggedIn, setLoggedIn] = useState(checkIsAuth);

    useEffect(() => {
        const updateAuth = () => {
            setLoggedIn(checkIsAuth());
        };

        updateAuth();
        window.addEventListener("storage", updateAuth);
        window.addEventListener("ai-storage-change", updateAuth);

        return () => {
            window.removeEventListener("storage", updateAuth);
            window.removeEventListener("ai-storage-change", updateAuth);
        };
    }, []);

    if (loggedIn) return null;

    const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/90">
            <span>
                Sign in to use {feature}. You can still browse; generation and scoring need a session.
            </span>
            <Link
                href={redirectUrl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 px-2.5 py-1 text-xs font-semibold text-slate-950 transition-colors"
            >
                <LogIn className="h-3.5 w-3.5" /> Sign in
            </Link>
        </div>
    );
}

