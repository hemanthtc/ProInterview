"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import PrivacyCloseButton from "./PrivacyCloseButton";
import { Moon, Sun, Eye, ShieldCheck } from "lucide-react";
import { readStoredTheme, persistTheme, ThemeMode } from "@/utils/theme";

export default function PrivacyClientView() {
    const [theme, setTheme] = useState<ThemeMode>("dark");

    useEffect(() => {
        const initial = readStoredTheme();
        setTheme(initial);

        const handleStorage = () => {
            const current = readStoredTheme();
            setTheme(current);
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const cycleTheme = () => {
        const next: ThemeMode =
            theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        persistTheme(next);
        localStorage.setItem("prointerview_theme", next);
    };

    const isLight = theme === "light";
    const isEye = theme === "eyeprotect";

    // Theme color mappings
    const pageBgClass = isEye
        ? "bg-[#f4ebd9] text-[#2d241e]"
        : isLight
        ? "bg-slate-50 text-slate-800"
        : "bg-[#0b0b10] text-white/85";

    const headerBgClass = isEye
        ? "bg-[#fcf7ed]/95 border-[#9e8262] shadow-xs"
        : isLight
        ? "bg-white/90 border-slate-200/90 shadow-xs"
        : "bg-[#0b0b10]/80 border-white/10";

    const cardClass = isEye
        ? "bg-[#fcf7ed] border-[#9e8262] text-[#382c23] shadow-xs"
        : isLight
        ? "bg-white border-slate-200 text-slate-700 shadow-xs"
        : "bg-white/[0.02] border-white/5 text-white/80";

    const titleClass = isEye
        ? "text-[#241a14]"
        : isLight
        ? "text-slate-900"
        : "text-white";

    const subtextClass = isEye
        ? "text-[#5e4b3c]"
        : isLight
        ? "text-slate-500"
        : "text-white/50";

    const badgeClass = isEye
        ? "bg-[#e6dcbe] text-[#0f766e] border-[#0f766e]/40 font-bold"
        : isLight
        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

    const themeBtnClass = isEye
        ? "bg-[#faf4e8] text-[#2d241e] border-[#9e8262] hover:bg-[#f4ebd9] shadow-xs"
        : isLight
        ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-xs"
        : "bg-white/5 text-white/80 border-white/10 hover:bg-white/15";

    const strongClass = isEye
        ? "text-[#1a120b] font-black"
        : isLight
        ? "text-slate-950 font-bold"
        : "text-white font-bold";

    const footerBorderClass = isEye
        ? "border-[#9e8262] text-[#5e4b3c]"
        : isLight
        ? "border-slate-200 text-slate-500"
        : "border-white/10 text-white/40";

    return (
        <main className={`min-h-screen transition-colors duration-300 ${pageBgClass}`}>
            {/* Sticky Top Header with BrandLogo, Theme Switcher & Close Symbol */}
            <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-300 ${headerBgClass}`}>
                <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
                    <BrandLogo href="/" showText themeMode={isLight || isEye ? "light" : "dark"} />

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Theme Switcher Toggle */}
                        <button
                            type="button"
                            onClick={cycleTheme}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${themeBtnClass}`}
                            title={`Current Theme: ${theme}. Click to switch theme.`}
                            aria-label={`Toggle Theme. Current: ${theme}`}
                        >
                            {theme === "dark" && (
                                <>
                                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="hidden sm:inline">Dark</span>
                                </>
                            )}
                            {theme === "light" && (
                                <>
                                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="hidden sm:inline">Light</span>
                                </>
                            )}
                            {theme === "eyeprotect" && (
                                <>
                                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                                    <span className="hidden sm:inline">Eye Comfort</span>
                                </>
                            )}
                        </button>

                        {/* Close Symbol Button */}
                        <PrivacyCloseButton variant="header" theme={theme} />
                    </div>
                </div>
            </header>

            {/* Privacy Policy Content */}
            <div className="max-w-3xl mx-auto px-5 py-10 space-y-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[11px] uppercase tracking-wide rounded-full border flex items-center gap-1 ${badgeClass}`}>
                            <ShieldCheck className="w-3 h-3 shrink-0" /> Legal & Transparency
                        </span>
                    </div>
                    <h1 className={`text-3xl font-black tracking-tight ${titleClass}`}>Privacy notice</h1>
                    <p className={`text-sm ${subtextClass}`}>Last updated: 31 August 2026</p>
                </div>

                <section className={`space-y-3 text-sm leading-relaxed p-6 rounded-2xl border transition-colors ${cardClass}`}>
                    <h2 className={`text-lg font-bold ${titleClass}`}>What we collect</h2>
                    <p>
                        Depending on the features you use, we may store your email (account identifier), display name,
                        password hash, phone and education details you add to your profile, resume text, GitHub / LinkedIn /
                        portfolio URLs, interview transcripts and scores, mock aptitude results, job-application tracking,
                        community messages, and uploaded files (photos, resumes, synthetic datasets).
                    </p>
                </section>

                <section className={`space-y-3 text-sm leading-relaxed p-6 rounded-2xl border transition-colors ${cardClass}`}>
                    <h2 className={`text-lg font-bold ${titleClass}`}>Where it is stored</h2>
                    <p>
                        Account and progress data live in MongoDB Atlas when configured. Profile files, resumes, and some
                        session archives may be stored in Amazon S3. Data in transit should be protected with HTTPS on the
                        host you deploy to. Field-level encryption at rest is not applied beyond what MongoDB Atlas and AWS
                        provide by default.
                    </p>
                </section>

                <section className={`space-y-3 text-sm leading-relaxed p-6 rounded-2xl border transition-colors ${cardClass}`}>
                    <h2 className={`text-lg font-bold ${titleClass}`}>AI and other processors</h2>
                    <p>
                        Interview chat, aptitude quizzes, mock tests, resume help, film-room notes, and similar features send
                        the text (and sometimes images) you provide to <strong className={strongClass}>Google Gemini</strong>. Optional Indic voice
                        uses <strong className={strongClass}>Sarvam AI</strong>. Code execution may be sent to the public{" "}
                        <strong className={strongClass}>Piston (emkc.org)</strong> runner. Job search may call <strong className={strongClass}>Adzuna</strong>. Payments use{" "}
                        <strong className={strongClass}>Razorpay</strong>. Sign-in may use <strong className={strongClass}>Google OAuth</strong>. Connecting Gmail sends
                        message content through our API to Google on your behalf using your token. We redact obvious emails
                        and phone numbers from some AI prompts, but you should not paste secrets into interviews.
                    </p>
                </section>

                <section className={`space-y-3 text-sm leading-relaxed p-6 rounded-2xl border transition-colors ${cardClass}`}>
                    <h2 className={`text-lg font-bold ${titleClass}`}>Your choices</h2>
                    <p>
                        You can export or review profile data from the profile page, and delete your account or wipe generated
                        data there. Deletion removes the account record plus associated MongoDB documents and S3 prefixes we
                        know about. Shared scorecard links remain reachable until they expire (30 days) unless you delete that
                        data first. Browser localStorage copies of sessions are under your control.
                    </p>
                </section>

                <section className={`space-y-3 text-sm leading-relaxed p-6 rounded-2xl border transition-colors ${cardClass}`}>
                    <h2 className={`text-lg font-bold ${titleClass}`}>Contact</h2>
                    <p>
                        For privacy requests, use the in-app feedback channel or the support email you publish for your
                        deployment. This notice is a product disclosure for operators of this codebase, not legal advice.
                    </p>
                </section>

                {/* Bottom Navigation / Close Action */}
                <footer className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${footerBorderClass}`}>
                    <p className="text-xs">
                        ProInterview • Candidate data is never sold or used for public AI training without explicit consent.
                    </p>
                    <PrivacyCloseButton variant="bottom" theme={theme} />
                </footer>
            </div>
        </main>
    );
}
