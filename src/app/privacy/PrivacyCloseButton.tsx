"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { readStoredTheme, ThemeMode } from "@/utils/theme";

interface PrivacyCloseButtonProps {
    variant?: "header" | "bottom";
    className?: string;
    theme?: ThemeMode;
}

export default function PrivacyCloseButton({
    variant = "header",
    className = "",
    theme: propTheme,
}: PrivacyCloseButtonProps) {
    const router = useRouter();
    const [theme, setTheme] = useState<ThemeMode>(propTheme || "dark");

    useEffect(() => {
        if (propTheme) {
            setTheme(propTheme);
            return;
        }
        setTheme(readStoredTheme());
        const handleStorage = () => setTheme(readStoredTheme());
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [propTheme]);

    const isLight = theme === "light";
    const isEye = theme === "eyeprotect";

    const handleClose = useCallback(() => {
        // Emit postMessage in case embedded in an iframe or parent container
        if (typeof window !== "undefined" && window.self !== window.top) {
            window.parent.postMessage({ type: "CLOSE_PRIVACY_MODAL" }, "*");
        }

        // Return to the previous page if user came from within the site, otherwise go home
        if (typeof window !== "undefined") {
            const hasInternalReferrer =
                document.referrer && document.referrer.startsWith(window.location.origin);
            if (hasInternalReferrer || window.history.length > 1) {
                router.back();
                return;
            }
        }
        router.push("/");
    }, [router]);

    // Keyboard accessibility: Escape key closes the privacy policy interface
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleClose]);

    if (variant === "bottom") {
        const bottomClasses = isEye
            ? "border-[#9e8262] bg-[#faf4e8] hover:bg-[#f4ebd9] text-[#2d241e] hover:text-black shadow-xs focus:ring-[#9e8262]/50"
            : isLight
            ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs focus:ring-indigo-500/50"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/80 hover:text-white focus:ring-indigo-500/50";

        const iconClasses = isEye
            ? "text-[#5e4b3c] group-hover:text-black"
            : isLight
            ? "text-slate-600 group-hover:text-slate-900"
            : "text-white/60 group-hover:text-white";

        return (
            <button
                type="button"
                onClick={handleClose}
                aria-label="Close privacy policy"
                title="Close (Esc)"
                className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-98 focus:outline-none focus:ring-2 ${bottomClasses} ${className}`}
            >
                <span>Close Privacy Policy</span>
                <X className={`w-4 h-4 group-hover:rotate-90 transition-transform duration-200 ${iconClasses}`} />
            </button>
        );
    }

    const headerBtnClasses = isEye
        ? "border-[#9e8262] bg-[#faf4e8] hover:bg-[#f4ebd9] text-[#2d241e] hover:text-black shadow-xs focus:ring-[#9e8262]/50"
        : isLight
        ? "border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-xs focus:ring-indigo-500/50"
        : "border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25 text-white/80 hover:text-white focus:ring-indigo-500/50";

    const labelClasses = isEye
        ? "text-[#2d241e] font-semibold"
        : isLight
        ? "text-slate-700 group-hover:text-slate-900 font-medium"
        : "text-white/70 group-hover:text-white font-medium";

    const kbdClasses = isEye
        ? "bg-[#e6dcbe] text-[#382c23] border-[#9e8262]/80"
        : isLight
        ? "bg-slate-200/80 text-slate-600 border-slate-300"
        : "bg-white/10 text-white/50 border-white/10 group-hover:text-white/80 group-hover:border-white/20";

    const iconCircleClasses = isEye
        ? "bg-[#e6dcbe] group-hover:bg-[#dfd4b3]"
        : isLight
        ? "bg-slate-150 group-hover:bg-slate-200"
        : "bg-white/5 group-hover:bg-white/15";

    const iconClasses = isEye
        ? "text-[#2d241e] group-hover:text-black"
        : isLight
        ? "text-slate-700 group-hover:text-slate-900"
        : "text-white/70 group-hover:text-white";

    return (
        <button
            type="button"
            onClick={handleClose}
            aria-label="Close privacy policy"
            title="Close (Esc)"
            className={`group inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 ${headerBtnClasses} ${className}`}
        >
            <span className={`hidden sm:inline text-xs ${labelClasses}`}>
                Close
            </span>
            <kbd className={`hidden md:inline-flex items-center justify-center text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${kbdClasses}`}>
                Esc
            </kbd>
            <span className={`relative flex items-center justify-center w-7 h-7 rounded-full transition-colors ${iconCircleClasses}`}>
                <X className={`w-4 h-4 group-hover:rotate-90 transition-all duration-200 ${iconClasses}`} />
            </span>
        </button>
    );
}
