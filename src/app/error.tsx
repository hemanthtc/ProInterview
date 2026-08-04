"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App route error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-slate-950 text-center">
            <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-white/50 max-w-md">{error.message || "Unexpected application error."}</p>
            <button type="button" onClick={reset} className="rounded-lg bg-indigo-500/80 hover:bg-indigo-500 px-4 py-2 text-sm text-white">
                Try again
            </button>
        </div>
    );
}
