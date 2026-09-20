"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
import { 
    ArrowRight, FileText, Settings, ShieldCheck, MessageSquare, Download, Play, Trash2, Sparkles, Sun, Moon, Eye, Menu, X,
    Compass, TrendingUp, Database, Code, CalendarClock, Award, Flame, User, Home as HomeIcon, FlaskConical,
    Code2, Clapperboard, FileSearch
} from "lucide-react";
import { useRouter } from "next/navigation";
import { buildPrepSnapshot } from "../utils/labProgress";
import { marked } from "marked";
import { getStorageItem, setStorageItem, removeStorageItem } from "../utils/storage";
import { createInitialThemeState, persistTheme, type ThemeMode } from "../utils/theme";
import { deferEffectWork } from "../utils/deferEffect";
import BrandLogo from "../components/BrandLogo";
import NotificationBell from "../components/NotificationBell";
import ProgressPanel from "../components/features/ProgressPanel";
import HomeTodoWidget from "../components/home/HomeTodoWidget";

interface MobileDashboardContentProps {
    theme: "dark" | "light" | "eyeprotect";
    isRealisticMode: boolean;
    isLoggedIn?: boolean;
    onSelectAnalysis?: () => void;
    onStartInterview: () => void;
    onSelectProgress: () => void;
}

function MobileDashboardContent({
    theme,
    isRealisticMode,
    isLoggedIn = false,
    onStartInterview,
    onSelectProgress,
}: MobileDashboardContentProps) {
    const [pastSessions, setPastSessions] = useState<any[]>(() => {
        if (typeof window === "undefined") return [];
        const stored = getStorageItem("interviewSessions");
        if (stored) {
            try {
                return JSON.parse(stored) || [];
            } catch {
                return [];
            }
        }
        return [];
    });
    const [snap, setSnap] = useState<any>(() => {
        if (typeof window === "undefined") return null;
        return buildPrepSnapshot();
    });

    useEffect(() => {
        const syncSessions = () => {
            const stored = getStorageItem("interviewSessions");
            if (stored) {
                try {
                    setPastSessions(JSON.parse(stored) || []);
                } catch (e) {
                    console.error(e);
                }
            }
            setSnap(buildPrepSnapshot());
        };
        window.addEventListener("ai-storage-change", syncSessions);
        window.addEventListener("storage", syncSessions);
        return () => {
            window.removeEventListener("ai-storage-change", syncSessions);
            window.removeEventListener("storage", syncSessions);
        };
    }, []);

    // Filter sessions to find this month's attempts
    const sessionsThisMonth = pastSessions.filter((s: any) => {
        if (!s.timestamp) return false;
        const d = new Date(s.timestamp);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length || 12; // fallback to 12 if none

    // Calculate average score
    const averageScore = pastSessions.length > 0
        ? Math.round(pastSessions.reduce((acc: number, curr: any) => acc + (curr.finalScore || curr.interviewRating || 0), 0) / pastSessions.length)
        : 81; // fallback to 81

    const dayStreak = 5; // fallback to 5

    // Get display sessions: if empty, show the mock sessions from the screenshot
    const displaySessions = useMemo(() => {
        if (pastSessions.length > 0) return pastSessions.slice(0, 2);
        return [
            {
                id: "mock1",
                role: "Interview Session",
                timestamp: 1700000000000,
                finalScore: 85,
                duration: "45 min",
                difficulty: "Intermediate",
                isMock: true
            },
            {
                id: "mock2",
                role: "Interview Session",
                timestamp: 1699900000000,
                finalScore: 85,
                duration: "60 min",
                difficulty: "Intermediate",
                isMock: true
            }
        ];
    }, [pastSessions]);

    return (
        <div className="w-full max-w-md mx-auto flex flex-col gap-5 px-1 animate-in fade-in duration-300">
            {/* Hero Card */}
            <div className={`w-full relative overflow-hidden rounded-3xl p-5 flex flex-row items-center justify-between mt-2 transition-all duration-300 ${
                theme === "light"
                ? "bg-white border border-slate-200 shadow-xl shadow-slate-100/50"
                : theme === "eyeprotect"
                ? "bg-[#fffcf5] border border-[#8c8578]/30 shadow-md shadow-stone-200/20"
                : "bg-gradient-to-br from-[#0c0d1b] via-[#090918] to-[#04040f] border border-white/10 shadow-[0_0_20px_rgba(79,70,229,0.12)]"
            }`}>
                {/* Background Image Cover Right Side with Fade to Left */}
                <div className="absolute right-0 top-0 bottom-0 h-full w-[48%] z-0 select-none pointer-events-none overflow-hidden rounded-r-3xl">
                    <img 
                        src={
                            theme === "light" 
                                ? "/ai-avatar-light.jpg" 
                                : theme === "eyeprotect" 
                                ? "/ai-avatar-eyeprotect.jpg" 
                                : "/ai-avatar.jpg"
                        } 
                        alt="AI Coach" 
                        className="w-full h-full object-cover object-center"
                        style={{
                            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 30%, black 100%)",
                            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 30%, black 100%)"
                        }}
                    />
                </div>

                <div className="flex-1 text-left z-10 space-y-3.5 max-w-[65%]">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-block px-3 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-bold text-purple-400">
                            Ready to level up?
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black border ${
                            theme === "light" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                            : theme === "eyeprotect"
                            ? "bg-[#f0fdf4] text-emerald-800 border-[#bbf7d0]/50"
                            : "bg-emerald-500/10 text-emerald-450 border-emerald-500/20"
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
                            AI Online
                        </span>
                    </div>
                    
                    <h2 className={`text-lg font-black leading-tight transition-colors duration-300 ${
                        theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"
                    }`}>
                        Master your next <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                            technical interview
                        </span>
                    </h2>
                    
                    <p className={`text-[10px] leading-relaxed font-semibold transition-colors duration-300 ${
                        theme === "light" ? "text-slate-600" : theme === "eyeprotect" ? "text-stone-600" : "text-white/50"
                    }`}>
                        Practice with our AI interviewer, get real-time feedback, and improve with every session.
                    </p>
                    
                    <button 
                        onClick={onStartInterview}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-[11px] cursor-pointer shadow-[0_3px_12px_rgba(79,70,229,0.2)]"
                    >
                        {isRealisticMode ? "Start Realistic Interview" : "Start Practice Session"}
                        <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Daily Agenda & To-Do List (Visible immediately) */}
            <HomeTodoWidget theme={theme} isLoggedIn={isLoggedIn} />

            {/* Quick Stats Grid (4 Boxes + My Progress) */}
            <div className="grid grid-cols-2 gap-3.5">
                <Link
                    href="/features?tool=star"
                    className={`p-3.5 flex flex-col items-start gap-2 border rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                        theme === "light"
                            ? "bg-white border-slate-200 hover:border-purple-500 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]/30 hover:border-purple-500 shadow-sm"
                            : "bg-[#0b0c15] border border-white/5 hover:border-purple-500/50 hover:bg-[#111222]"
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                        <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-0.5">
                        <span className={`text-[12px] font-black transition-colors ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            {snap?.starStories ?? 0}
                        </span>
                        <span className={`text-[7.5px] font-bold uppercase tracking-wider block text-white/30`}>Star Stories Saved</span>
                    </div>
                </Link>

                <Link
                    href="/coding-lab"
                    className={`p-3.5 flex flex-col items-start gap-2 border rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                        theme === "light"
                            ? "bg-white border-slate-200 hover:border-amber-500 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                            : "bg-[#0b0c15] border border-white/5 hover:border-amber-500/50 hover:bg-[#1c1a22]"
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                        <Code2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-0.5">
                        <span className={`text-[12px] font-black transition-colors ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            {snap?.codingSolved ?? 0}
                        </span>
                        <span className={`text-[7.5px] font-bold uppercase tracking-wider block text-white/30`}>Coding Unlocked</span>
                    </div>
                </Link>

                <Link
                    href="/ats-match"
                    className={`p-3.5 flex flex-col items-start gap-2 border rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                        theme === "light"
                            ? "bg-white border-slate-200 hover:border-sky-500 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                            : "bg-[#0b0c15] border border-white/5 hover:border-sky-500/50 hover:bg-[#111622]"
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                        <FileSearch className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-0.5">
                        <span className={`text-[12px] font-black transition-colors ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            {snap?.atsMatch != null ? `${snap.atsMatch}%` : "0%"}
                        </span>
                        <span className={`text-[7.5px] font-bold uppercase tracking-wider block text-white/30`}>Ats Match</span>
                    </div>
                </Link>

                <Link
                    href="/film-room"
                    className={`p-3.5 flex flex-col items-start gap-2 border rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                        theme === "light"
                            ? "bg-white border-slate-200 hover:border-rose-500 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                            : "bg-[#0b0c15] border border-white/5 hover:border-rose-500/50 hover:bg-[#1c121e]"
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                        <Clapperboard className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-0.5">
                        <span className={`text-[12px] font-black transition-colors ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            {snap?.filmRoomGaps?.length ?? 0}
                        </span>
                        <span className={`text-[7.5px] font-bold uppercase tracking-wider block text-white/30`}>Film Gaps</span>
                    </div>
                </Link>

                <div
                    onClick={onSelectProgress}
                    className={`col-span-2 p-3 flex items-center justify-between border rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                        theme === "light"
                            ? "bg-white border-slate-200 hover:border-indigo-500 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]/30 hover:border-indigo-500 shadow-sm"
                            : "bg-[#0b0c15] border border-white/5 hover:border-indigo-500/50 hover:bg-[#111622]"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        <span className={`text-[9.5px] font-black uppercase tracking-wider transition-colors ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            Dashboard
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-sky-450">View Reports →</span>
                </div>
            </div>

            {/* Recent Sessions */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-black transition-colors duration-300 ${
                        theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"
                    }`}>Recent Sessions</h3>
                    <button 
                        onClick={onSelectProgress}
                        className="text-[10px] font-bold text-[#a855f7] flex items-center gap-0.5 hover:text-purple-300 cursor-pointer"
                    >
                        View All
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="space-y-2">
                    {displaySessions.map((sess: any) => {
                        const isPurple = sess.finalScore < 80;
                        const iconBg = isPurple ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400";
                        const ringColor = isPurple ? "stroke-purple-500" : "stroke-emerald-400";
                        const badgeBg = isPurple ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                        
                        let timeText = "Recently";
                        if (sess.isMock) {
                            timeText = sess.id === "mock1" ? "Yesterday" : "2 days ago";
                        } else if (sess.timestamp) {
                            timeText = "Completed";
                        }

                        const duration = sess.duration || "45 min";
                        const difficulty = sess.difficulty || (sess.finalScore >= 80 ? "Advanced" : "Intermediate");

                        return (
                            <div 
                                key={sess.id || sess.timestamp}
                                className={`p-3.5 flex items-center justify-between gap-3 transition-all duration-300 text-left border rounded-2xl ${
                                    theme === "light"
                                    ? "bg-white border-slate-200 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                                    : "bg-[#0b0c15] border-white/5 hover:border-white/10"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                        {(sess.role || "").toLowerCase().includes("design") ? (
                                            <Database className="w-4.5 h-4.5" />
                                        ) : (
                                            <Code className="w-4.5 h-4.5" />
                                        )}
                                    </div>
                                    
                                    <div className="space-y-0.5">
                                        <h4 className={`text-[11px] font-bold leading-tight transition-colors duration-300 ${
                                            theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"
                                        }`}>
                                            {sess.role ? `${sess.role} Interview` : "Interview Session"}
                                        </h4>
                                        <p className={`text-[9px] font-semibold transition-colors duration-300 ${
                                            theme === "light" ? "text-slate-500" : theme === "eyeprotect" ? "text-stone-500" : "text-white/40"
                                        }`}>
                                            {timeText} • {duration}
                                        </p>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider ${badgeBg}`}>
                                            {difficulty}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="text-right flex flex-col justify-center">
                                        <span className={`text-[7.5px] font-bold uppercase leading-none mb-0.5 transition-colors duration-300 ${
                                            theme === "light" ? "text-slate-400" : theme === "eyeprotect" ? "text-stone-400" : "text-white/30"
                                        }`}>Score</span>
                                        <span className={`text-[11px] font-black ${isPurple ? "text-purple-400" : "text-emerald-400"}`}>
                                            {sess.finalScore}/100
                                        </span>
                                    </div>
                                    
                                    <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle 
                                                cx="14" cy="14" r="11" 
                                                className={`transition-colors duration-300 ${
                                                    theme === "light" ? "stroke-slate-100" : theme === "eyeprotect" ? "stroke-stone-200" : "stroke-white/5"
                                                }`} 
                                                strokeWidth="2.2" 
                                                fill="transparent" 
                                            />
                                            <circle 
                                                cx="14" cy="14" r="11" 
                                                className={ringColor} 
                                                strokeWidth="2.2" 
                                                fill="transparent" 
                                                strokeDasharray={2 * Math.PI * 11}
                                                strokeDashoffset={2 * Math.PI * 11 * (1 - sess.finalScore / 100)}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                    
                                    <ArrowRight className={`w-3.5 h-3.5 transition-colors duration-300 ${
                                        theme === "light" ? "text-slate-300" : theme === "eyeprotect" ? "text-stone-400" : "text-white/20"
                                    }`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Statistics */}
            <div className={`p-4 mt-1 flex items-center justify-between border rounded-2xl shadow-md transition-all duration-300 ${
                theme === "light"
                ? "bg-white border-slate-200 divide-x divide-slate-100"
                : theme === "eyeprotect"
                ? "bg-[#fffcf5] border-[#8c8578]/30 divide-x divide-stone-200"
                : "bg-[#0b0c15] border border-white/5 divide-x divide-white/5"
            }`}>
                <div className="flex-1 flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <CalendarClock className="w-4 h-4" />
                    </div>
                    <div className="text-center space-y-0.5">
                        <span className={`text-sm font-black transition-colors duration-300 ${
                            theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"
                        }`}>{sessionsThisMonth}</span>
                        <p className={`text-[7.5px] font-bold uppercase tracking-wider leading-none transition-colors duration-300 ${
                            theme === "light" ? "text-slate-500" : theme === "eyeprotect" ? "text-stone-500" : "text-white/40"
                        }`}>Sessions This Month</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Award className="w-4 h-4" />
                    </div>
                    <div className="text-center space-y-0.5">
                        <span className={`text-sm font-black transition-colors duration-300 ${
                            theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"
                        }`}>{averageScore}%</span>
                        <p className={`text-[7.5px] font-bold uppercase tracking-wider leading-none transition-colors duration-300 ${
                            theme === "light" ? "text-slate-500" : theme === "eyeprotect" ? "text-stone-500" : "text-white/40"
                        }`}>Average Score</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                        <Flame className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-center space-y-0.5">
                        <span className={`text-sm font-black transition-colors duration-300 ${
                            theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"
                        }`}>{dayStreak}</span>
                        <p className={`text-[7.5px] font-bold uppercase tracking-wider leading-none transition-colors duration-300 ${
                            theme === "light" ? "text-slate-500" : theme === "eyeprotect" ? "text-stone-500" : "text-white/40"
                        }`}>Day Streak</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const router = useRouter();
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [pausedSession, setPausedSession] = useState<any>(null);
    const [isRealisticMode, setIsRealisticMode] = useState(false);
    const [theme, setTheme] = useState<ThemeMode>(createInitialThemeState);
    const [activeSection, setActiveSection] = useState<"home" | "how-it-works">("home");
    const isHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [showModeSwitchModal, setShowModeSwitchModal] = useState<{ isOpen: boolean; targetUrl: string; targetLabel: string } | null>(null);
    const [snap, setSnap] = useState<any>(null);
    const [progressActiveTab, setProgressActiveTab] = useState<"filmroom" | "interview" | "aptitude">("interview");

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", checkMobile);

        const syncAuthStateAndData = () => {
            const loggedIn = getStorageItem("userLoggedIn") === "true";
            const guest = getStorageItem("userLoggedIn") === "guest";
            const role = localStorage.getItem("userRole");
            if (loggedIn && role === "admin") {
                router.push("/admin");
                return;
            }

            setIsLoggedIn(loggedIn);
            setIsGuest(guest);
            setIsRealisticMode(getStorageItem("globalInterviewMode") === "realistic");

            const stored = getStorageItem("interviewSessions");
            if (stored) {
                try {
                    const sessions = JSON.parse(stored);
                    const oneHourAgo = Date.now() - 60 * 60 * 1000;
                    const recentSessions = sessions.filter((s: any) => s.timestamp > oneHourAgo);
                    setPastSessions(recentSessions);
                } catch (e) {
                    console.error("Failed to parse sessions", e);
                }
            }

            const storedPaused = getStorageItem("pausedInterviewSession");
            if (storedPaused) {
                try {
                    setPausedSession(JSON.parse(storedPaused));
                } catch (e) {
                    console.error(e);
                }
            }

            setSnap(buildPrepSnapshot());
        };

        const cancelDeferred = deferEffectWork(() => {
            checkMobile();
            syncAuthStateAndData();
        });

        // Real-time synchronization listeners for instantaneous cross-tab and in-tab updates
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                syncAuthStateAndData();
            }
        };

        window.addEventListener("ai-storage-change", syncAuthStateAndData);
        window.addEventListener("storage", syncAuthStateAndData);
        window.addEventListener("focus", syncAuthStateAndData);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Dynamic scrollspy active indicators
        const handleHashChange = () => {
            const targetSection = window.location.hash === "#how-it-works" ? "how-it-works" : "home";
            setActiveSection((prev: "home" | "how-it-works") => (prev === targetSection ? prev : targetSection));
        };

        const handleScroll = () => {
            const howItWorks = document.getElementById("how-it-works");
            if (howItWorks) {
                const rect = howItWorks.getBoundingClientRect();
                if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                    setActiveSection((prev: "home" | "how-it-works") => (prev === "how-it-works" ? prev : "how-it-works"));
                    return;
                }
            }
            setActiveSection((prev: "home" | "how-it-works") => (prev === "home" ? prev : "home"));
        };

        window.addEventListener("hashchange", handleHashChange);
        window.addEventListener("scroll", handleScroll);
        
        handleHashChange();
        handleScroll();

        return () => {
            cancelDeferred();
            window.removeEventListener("resize", checkMobile);
            window.removeEventListener("ai-storage-change", syncAuthStateAndData);
            window.removeEventListener("storage", syncAuthStateAndData);
            window.removeEventListener("focus", syncAuthStateAndData);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("hashchange", handleHashChange);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [router]);

    const toggleMode = () => {
        const newMode = !isRealisticMode;
        setIsRealisticMode(newMode);
        setStorageItem("globalInterviewMode", newMode ? "realistic" : "technical");
    };

    const cycleTheme = () => {
        let nextTheme: ThemeMode = "dark";
        if (theme === "dark") nextTheme = "light";
        else if (theme === "light") nextTheme = "eyeprotect";

        setTheme(nextTheme);
        persistTheme(nextTheme);
    };

    const handleResume = () => {
        if (!pausedSession) return;
        
        if (pausedSession.resumeText) {
            setStorageItem("resumeText", pausedSession.resumeText);
        }
        
        setStorageItem("resumeFromPaused", "true");
        
        const targetMode = pausedSession.mode || getStorageItem("globalInterviewMode") || "technical";
        setStorageItem("globalInterviewMode", targetMode);
        
        if (targetMode === "realistic") {
            router.push("/realistic-interview");
        } else {
            router.push("/interview");
        }
    };

    const handleDeletePaused = () => {
        removeStorageItem("pausedInterviewSession");
        setPausedSession(null);
    };

    const downloadTranscript = (session: any) => {
        marked.setOptions({
            gfm: true,
            breaks: true
        });

        const transcriptContent = (session.transcript || "");
        const formattedTranscript = transcriptContent.replace(/\n\n\n\n/g, '<br/><br/><br/><br/>');
        const renderedTranscript = marked.parse(formattedTranscript);
        const renderedSummary = marked.parse(session.summary || "No summary available.");

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Interview Session Report</title>
                <style>
                    body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #333; }
                    h1 { color: #2c3e50; border-bottom: 2px solid #34495e; padding-bottom: 10px; }
                    .header-info { background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; margin-bottom: 20px; }
                    .transcript { font-size: 11pt; }
                    .transcript p { margin-bottom: 15px; }
                    code, pre { font-family: 'Consolas', 'Courier New', monospace; background: #eee; padding: 10px; border: 1px solid #ccc; display: block; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <h1>Interview Session Report</h1>
                <div class="header-info">
                    <p><b>Date:</b> ${new Date(session.timestamp).toLocaleString()}</p>
                    <p><b>Candidate:</b> ${session.userName || 'Guest'}</p>
                    <p><b>Final Rating:</b> ${session.finalScore}/100</p>
                    <p><b>Technical:</b> ${session.technicalRating || 'N/A'} | <b>Behavioral:</b> ${session.behavioralRating || 'N/A'} | <b>Communication:</b> ${session.communicationRating || 'N/A'}</p>
                    <p><b>Portfolio Rating:</b> ${session.portfolioRating}</p>
                </div>
                <h2>Detailed Feedback</h2>
                <div>${renderedSummary}</div>
                <hr/>
                <h2>Annotated Transcript</h2>
                <div class="transcript">${renderedTranscript}</div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `interview-summary-${session.timestamp}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderModeSwitchModal = () => {
        if (!showModeSwitchModal?.isOpen) return null;
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
                <div 
                    className="w-full max-w-md rounded-2xl border p-6 shadow-2xl relative transition-all duration-300 transform scale-100"
                    style={{
                        backgroundColor: theme === "light" ? "#ffffff" : theme === "eyeprotect" ? "#fdfbf7" : "#0d0d1a",
                        borderColor: theme === "light" ? "#e2e8f0" : theme === "eyeprotect" ? "#e7e5e4" : "rgba(255, 255, 255, 0.12)",
                        color: theme === "light" ? "#0f172a" : theme === "eyeprotect" ? "#292524" : "#ffffff"
                    }}
                >
                    <div className="flex items-start gap-3.5 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0 text-orange-400">
                            <Compass className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">You are in Realistic AI Mode</h3>
                                <button 
                                    onClick={() => setShowModeSwitchModal(null)}
                                    className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className={`text-xs mt-1.5 leading-relaxed ${theme === "light" ? "text-slate-600" : theme === "eyeprotect" ? "text-stone-600" : "text-white/60"}`}>
                                {showModeSwitchModal.targetLabel || "Features and Labs"} are available in <strong className="text-orange-400 font-bold">Practice Mode</strong>. Would you like to switch to Practice Mode now?
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
                        <button
                            onClick={() => {
                                const target = showModeSwitchModal.targetUrl;
                                setShowModeSwitchModal(null);
                                setIsRealisticMode(false);
                                setStorageItem("globalInterviewMode", "technical");
                                if (target) {
                                    router.push(target);
                                }
                            }}
                            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Switch to Practice Mode
                        </button>
                        <button
                            onClick={() => setShowModeSwitchModal(null)}
                            className={`w-full sm:w-auto py-2.5 px-4 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                                theme === "light"
                                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                                    : theme === "eyeprotect"
                                    ? "bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
                            }`}
                        >
                            Stay in Realistic Mode
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div 
                className="selection:bg-indigo-500/30 flex flex-col font-sans min-h-screen pb-24 transition-colors duration-300 w-full max-w-full overflow-x-hidden"
                style={{
                    backgroundColor: theme === "light" ? "#f8fafc" : theme === "eyeprotect" ? "#f4eae1" : "#050505",
                    color: theme === "light" ? "#0f172a" : theme === "eyeprotect" ? "#000000" : "#ffffff"
                }}
            >
                <header 
                    className="px-4 h-16 flex flex-row items-center justify-between border-b backdrop-blur-md sticky top-0 z-50 w-full transition-all duration-300"
                    style={{
                        backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.85)" : theme === "eyeprotect" ? "rgba(244, 234, 225, 0.85)" : "rgba(5, 5, 13, 0.8)",
                        borderColor: theme === "light" ? "rgba(15, 23, 42, 0.08)" : theme === "eyeprotect" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.05)"
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-indigo-500/30 bg-[#141c21] shadow-[0_0_10px_rgba(45,212,191,0.2)]">
                            <img src="/logo-icon-darkmode.png" alt="Icon" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col text-left">
                            <div className="flex items-center text-[15px] font-black tracking-tight leading-tight">
                                <span className={`transition-colors duration-300 ${theme === "light" ? "text-slate-900" : theme === "eyeprotect" ? "text-[#1c1917]" : "text-white"}`}>Pro</span>
                                <span className="text-[#3b82f6] flex items-center">
                                    Interview
                                    <svg className="w-3 h-3 ml-0.5 text-[#3b82f6]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"></path>
                                    </svg>
                                </span>
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                                theme === "light" ? "text-slate-500" : theme === "eyeprotect" ? "text-stone-500" : "text-white/45"
                            }`}>AI-Powered Interview Coach</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={cycleTheme}
                            className={`p-2 border rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                theme === "light"
                                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578]/30 text-[#1c1917] hover:bg-stone-200/50"
                                : "bg-white/5 border-white/10 text-white/80 hover:text-white"
                            }`}
                            title={`Current Theme: ${theme}. Click to switch.`}
                        >
                            {theme === "dark" && <Moon className="w-4 h-4" />}
                            {theme === "light" && <Sun className="w-4 h-4" />}
                            {theme === "eyeprotect" && <Eye className="w-4 h-4 text-amber-400" />}
                        </button>
                        <NotificationBell theme={theme} />
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className={`p-2 border rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                theme === "light"
                                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578]/30 text-[#1c1917] hover:bg-stone-200/50"
                                : "bg-white/5 border-white/10 text-white/80 hover:text-white"
                            }`}
                            title="Open menu"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start relative px-4 pt-4 pb-12 w-full max-w-full">
                    <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-indigo-600/15 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute bottom-[10%] right-[20%] w-[250px] h-[250px] bg-purple-600/15 rounded-full blur-[70px] pointer-events-none" />

                    {activeModal === "progress" ? (
                        <div className="w-full max-w-md mx-auto animate-in fade-in duration-300">
                            <ProgressPanel isLight={theme === "light"} />
                        </div>
                    ) : (
                        <MobileDashboardContent 
                            theme={theme}
                            isRealisticMode={isRealisticMode}
                            isLoggedIn={isLoggedIn}
                            onSelectAnalysis={() => {
                                router.push("/features?tool=analysis");
                            }}
                            onStartInterview={() => {
                                if (isRealisticMode) {
                                    router.push("/setup");
                                } else {
                                    router.push("/features?start=true");
                                }
                            }}
                            onSelectProgress={() => {
                                setActiveModal("progress");
                            }}
                        />
                    )}
                </main>

                {/* Sticky Bottom Navigation Bar for Mobile */}
                <div 
                    className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg pb-safe-bottom transition-all duration-300 border-t"
                    style={{
                        backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : theme === "eyeprotect" ? "rgba(244, 234, 225, 0.95)" : "rgba(6, 6, 12, 0.9)",
                        borderColor: theme === "light" ? "rgba(15, 23, 42, 0.08)" : theme === "eyeprotect" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)"
                    }}
                >
                    <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4">
                        <button 
                            onClick={() => {
                                setActiveModal(null);
                            }}
                            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeModal === null 
                                ? "text-[#a855f7] font-extrabold" 
                                : theme === "light" 
                                ? "text-slate-400 hover:text-slate-600" 
                                : theme === "eyeprotect" 
                                ? "text-stone-400 hover:text-stone-600" 
                                : "text-white/40 hover:text-white/60"}`}
                        >
                            <HomeIcon className="w-5 h-5" />
                            <span className="text-[10px]">Home</span>
                        </button>

                        <button 
                            onClick={() => {
                                if (isRealisticMode) {
                                    setShowModeSwitchModal({
                                        isOpen: true,
                                        targetUrl: "/features",
                                        targetLabel: "Practice & Features"
                                    });
                                    return;
                                }
                                router.push("/features");
                            }}
                            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                                theme === "light"
                                ? "text-slate-400 hover:text-slate-600"
                                : theme === "eyeprotect"
                                ? "text-stone-400 hover:text-stone-600"
                                : "text-white/40 hover:text-white/60"}`}
                            title={isRealisticMode ? "In Realistic Mode. Click to switch to Practice Mode." : "Practice"}
                        >
                            <Compass className="w-5 h-5" />
                            <span className="text-[10px]">Practice</span>
                        </button>

                        <button 
                            onClick={() => {
                                if (isRealisticMode) {
                                    setShowModeSwitchModal({
                                        isOpen: true,
                                        targetUrl: "/labs",
                                        targetLabel: "Labs & Practice Tools"
                                    });
                                    return;
                                }
                                router.push("/labs");
                            }}
                            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                                theme === "light"
                                ? "text-slate-400 hover:text-slate-600"
                                : theme === "eyeprotect"
                                ? "text-stone-400 hover:text-stone-600"
                                : "text-white/40 hover:text-white/60"}`}
                            title={isRealisticMode ? "In Realistic Mode. Click to switch to Practice Mode." : "Labs"}
                        >
                            <FlaskConical className="w-5 h-5" />
                            <span className="text-[10px]">Labs</span>
                        </button>

                        <button 
                            onClick={() => {
                                setActiveModal("progress");
                            }}
                            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeModal === "progress" 
                                ? "text-[#a855f7] font-extrabold" 
                                : theme === "light" 
                                ? "text-slate-400 hover:text-slate-600" 
                                : theme === "eyeprotect" 
                                ? "text-stone-400 hover:text-stone-600" 
                                : "text-white/40 hover:text-white/60"}`}
                        >
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-[10px]">Reports</span>
                        </button>

                        <Link 
                            href="/profile"
                            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                                theme === "light" 
                                ? "text-slate-400 hover:text-slate-600" 
                                : theme === "eyeprotect" 
                                ? "text-stone-400 hover:text-stone-600" 
                                : "text-white/40 hover:text-white/60"}`}
                        >
                            <User className="w-5 h-5" />
                            <span className="text-[10px]">Profile</span>
                        </Link>
                    </div>
                </div>

                {/* Mobile Drawer menu */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <BrandLogo />
                            <button 
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 bg-white/5 border border-white/10 rounded-full text-white/80 hover:text-white"
                                title="Close menu"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex flex-col items-center justify-center flex-1 gap-6 p-6">
                            <Link 
                                href="/" 
                                onClick={() => {
                                    setActiveModal(null);
                                    setMobileMenuOpen(false);
                                }}
                                className={`text-lg font-semibold transition-colors ${activeModal === null ? "text-indigo-400" : "text-white/80 hover:text-white"}`}
                            >
                                Home
                            </Link>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    if (isRealisticMode) {
                                        setShowModeSwitchModal({
                                            isOpen: true,
                                            targetUrl: "/features",
                                            targetLabel: "Features & Practice Tools"
                                        });
                                    } else {
                                        router.push("/features");
                                    }
                                }}
                                className="text-lg font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
                            >
                                Features
                            </button>
                            <Link 
                                href="/community" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
                            >
                                Community
                            </Link>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    if (isRealisticMode) {
                                        setShowModeSwitchModal({
                                            isOpen: true,
                                            targetUrl: "/labs",
                                            targetLabel: "Labs & Interactive Tools"
                                        });
                                    } else {
                                        router.push("/labs");
                                    }
                                }}
                                className="text-lg font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
                            >
                                Labs
                            </button>
                            <Link 
                                href="/jobs" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
                            >
                                Jobs
                            </Link>
                            <Link 
                                href="/#how-it-works" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
                            >
                                How it works
                            </Link>

                            {isLoggedIn && (
                                <div className="flex items-center bg-white/5 border border-white/15 p-1 rounded-full text-xs font-semibold backdrop-blur-md">
                                    <button
                                        onClick={() => {
                                            if (isRealisticMode) toggleMode();
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${!isRealisticMode
                                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)] font-bold'
                                            : 'text-white/60 hover:text-white/90'
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${!isRealisticMode ? 'bg-orange-400 animate-pulse' : 'bg-white/40'}`} />
                                        Practice
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (!isRealisticMode) toggleMode();
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${isRealisticMode
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold'
                                            : 'text-white/60 hover:text-white/90'
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isRealisticMode ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                                        Realistic AI Mode
                                    </button>
                                </div>
                            )}
                            {/* Profile / Login in Menu */}
                            <div className="w-full max-w-xs border-t border-white/10 my-4" />

                            {isLoggedIn ? (
                                <Link 
                                    href="/profile" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/40 px-6 py-3 rounded-full transition-colors font-bold w-full max-w-xs justify-center shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                                >
                                    My Profile
                                </Link>
                            ) : isGuest ? (
                                <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-6 py-3 rounded-full font-bold w-full justify-center">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                        Guest Mode
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center px-2">
                                        Sign in to save your interview progress, access mock interviews, AI resume generation, and cloud storage.
                                    </p>
                                    <Link 
                                        href="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl w-full text-center mt-1"
                                    >
                                        Sign In or Register
                                    </Link>
                                </div>
                            ) : (
                                <Link 
                                    href="/login" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full text-white transition-colors font-bold w-full max-w-xs text-center"
                                >
                                    Log in
                                </Link>
                            )}
                        </nav>

                    </div>
                )}

                {/* Mode Switch Popup Modal for Mobile View */}
                {renderModeSwitchModal()}
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen selection:bg-indigo-500/30 flex flex-col font-sans transition-colors duration-300 w-full max-w-full overflow-x-hidden"
            style={{
                backgroundColor: theme === "light" ? "#f8fafc" : theme === "eyeprotect" ? "#f4eae1" : "#050505",
                color: theme === "light" ? "#0f172a" : theme === "eyeprotect" ? "#000000" : "#ffffff"
            }}
        >
            <header 
                className="px-4 sm:px-8 py-4 sm:py-5 flex flex-row items-center justify-between border-b backdrop-blur-md sticky top-0 z-50 transition-colors duration-300"
                style={{
                    backgroundColor: theme === "light" ? "rgba(248, 250, 252, 0.85)" : theme === "eyeprotect" ? "rgba(244, 234, 225, 0.85)" : "rgba(5, 5, 5, 0.85)",
                    borderBottomColor: theme === "light" ? "rgba(15, 23, 42, 0.1)" : theme === "eyeprotect" ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)"
                }}
            >
                <BrandLogo />
                
                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-white/70 items-center">
                    {!isRealisticMode && (
                        <Link 
                            href="/" 
                            onClick={(e) => {
                                if (window.location.pathname === "/") {
                                    e.preventDefault();
                                    setActiveModal(null);
                                }
                            }}
                            className={`transition-colors pb-1 ${
                                (activeSection === "home" && activeModal === null) 
                                    ? "text-white border-b border-indigo-500" 
                                    : "hover:text-white text-white/70"
                            }`}
                        >
                            Home
                        </Link>
                    )}
                    {isLoggedIn && (
                        <div className="flex items-center bg-white/5 border border-white/15 p-0.5 sm:p-1 rounded-full text-xs font-semibold backdrop-blur-md" title="Switch between Practice Mode and Realistic AI Mode">
                            <button
                                onClick={() => {
                                    if (isRealisticMode) toggleMode();
                                }}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full transition-all duration-200 ${
                                    !isRealisticMode 
                                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)] font-bold' 
                                        : 'text-white/60 hover:text-white/90'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${!isRealisticMode ? 'bg-orange-400 animate-pulse' : 'bg-white/40'}`} />
                                Practice
                            </button>

                            <button
                                onClick={() => {
                                    if (!isRealisticMode) toggleMode();
                                }}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full transition-all duration-200 ${
                                    isRealisticMode 
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold' 
                                        : 'text-white/60 hover:text-white/90'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${isRealisticMode ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                                Realistic AI Mode
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (isRealisticMode) {
                                setShowModeSwitchModal({
                                    isOpen: true,
                                    targetUrl: "/features",
                                    targetLabel: "Features & Practice Tools"
                                });
                            } else {
                                router.push("/features");
                            }
                        }}
                        className="hover:text-white text-white/70 transition-colors pb-1 cursor-pointer"
                    >
                        Features
                    </button>
                    <Link href="/community" className="hover:text-white text-white/70 transition-colors pb-1">Community</Link>
                    <Link href="/privacy" className="hover:text-white text-white/70 transition-colors pb-1">Privacy</Link>
                    <button
                        onClick={() => {
                            if (isRealisticMode) {
                                setShowModeSwitchModal({
                                    isOpen: true,
                                    targetUrl: "/labs",
                                    targetLabel: "Labs & Interactive Tools"
                                });
                            } else {
                                router.push("/labs");
                            }
                        }}
                        className="hover:text-white text-white/70 transition-colors pb-1 cursor-pointer"
                    >
                        Labs
                    </button>
                    <Link href="/jobs" className="hover:text-white text-white/70 transition-colors pb-1">Jobs</Link>
                    {!isRealisticMode && (
                        <Link 
                            href="#how-it-works" 
                            className={`transition-colors pb-1 ${
                                activeSection === "how-it-works" 
                                    ? "text-white border-b border-indigo-500" 
                                    : "hover:text-white text-white/70"
                            }`}
                        >
                            How it works
                        </Link>
                    )}
                    
                    {/* Theme Toggle Button */}
                    <button 
                        onClick={cycleTheme}
                        className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title={`Current Theme: ${theme}. Click to switch.`}
                    >
                        {theme === "dark" && <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {theme === "light" && <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {theme === "eyeprotect" && <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
                    </button>



                    {isLoggedIn ? (
                        <Link href="/profile" className="flex items-center gap-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/40 px-3.5 sm:px-5 flex-shrink-0 relative py-1.5 sm:py-2 rounded-full transition-colors font-bold ml-1 sm:ml-2 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-indigo-500 flex shrink-0 items-center justify-center text-white text-[9px] sm:text-[10px]">US</div>
                            My Profile
                        </Link>
                    ) : isGuest ? (
                        <div className="relative group shrink-0 ml-1 sm:ml-2">
                            <button className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition-all font-bold shadow-[0_0_15px_rgba(245,158,11,0.1)] cursor-pointer">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                Guest Mode
                            </button>
                            <div className="absolute right-0 mt-2 w-72 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                                <p className="text-xs font-bold text-white mb-1 flex items-center gap-1">
                                    💡 Exploring as Guest
                                </p>
                                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                                    You are in Guest Mode. To save your progress, use AI resume editing, unlock realistic mock interviews, and access cloud storage, please create an account.
                                </p>
                                <Link 
                                    href="/login" 
                                    className="block text-center w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition-all"
                                >
                                    Sign In or Register
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className="bg-white/10 hover:bg-white/20 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-white transition-colors font-bold ml-1 sm:ml-2">Log in</Link>
                    )}
                </nav>

                {/* Mobile Navigation Header Buttons */}
                <div className="flex md:hidden items-center gap-2">
                    {/* Theme Toggle Button directly accessible on Mobile */}
                    <button 
                        onClick={cycleTheme}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title={`Current Theme: ${theme}. Click to switch.`}
                    >
                        {theme === "dark" && <Moon className="w-3.5 h-3.5" />}
                        {theme === "light" && <Sun className="w-3.5 h-3.5" />}
                        {theme === "eyeprotect" && <Eye className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    {/* Hamburger Button */}
                    <button 
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0"
                        title="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Mobile Menu Drawer Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col md:hidden animate-in fade-in duration-200">
                    {/* Close header inside mobile overlay */}
                    <div className="flex justify-between items-center p-6 border-b border-white/10">
                        <BrandLogo />
                        <button 
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 bg-white/5 border border-white/10 rounded-full text-white/80 hover:text-white"
                            title="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Links list */}
                    <nav className="flex flex-col items-center justify-center flex-1 gap-6 p-6">
                        {!isRealisticMode && (
                            <Link 
                                href="/" 
                                onClick={() => setMobileMenuOpen(false)}
                                className={`text-lg font-semibold transition-colors ${
                                    activeSection === "home" ? "text-indigo-400" : "text-white/80 hover:text-white"
                                }`}
                            >
                                Home
                            </Link>
                        )}
                        {isLoggedIn && (
                            <div className="flex items-center bg-white/5 border border-white/15 p-1 rounded-full text-xs font-semibold backdrop-blur-md">
                                <button
                                    onClick={() => {
                                        if (isRealisticMode) toggleMode();
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
                                        !isRealisticMode 
                                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)] font-bold' 
                                            : 'text-white/60 hover:text-white/90'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${!isRealisticMode ? 'bg-orange-400 animate-pulse' : 'bg-white/40'}`} />
                                    Practice
                                </button>

                                <button
                                    onClick={() => {
                                        if (!isRealisticMode) toggleMode();
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
                                        isRealisticMode 
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold' 
                                            : 'text-white/60 hover:text-white/90'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isRealisticMode ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                                    Realistic AI Mode
                                </button>
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                setMobileMenuOpen(false);
                                if (isRealisticMode) {
                                    setShowModeSwitchModal({
                                        isOpen: true,
                                        targetUrl: "/features",
                                        targetLabel: "Features & Practice Tools"
                                    });
                                } else {
                                    router.push("/features");
                                }
                            }}
                            className="text-lg font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                            Features
                        </button>
                        <Link
                            href="/community"
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
                        >
                            Community
                        </Link>
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                if (isRealisticMode) {
                                    setShowModeSwitchModal({
                                        isOpen: true,
                                        targetUrl: "/labs",
                                        targetLabel: "Labs & Interactive Tools"
                                    });
                                } else {
                                    router.push("/labs");
                                }
                            }}
                            className="text-lg font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                            Labs
                        </button>
                        <Link
                            href="/jobs"
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
                        >
                            Jobs
                        </Link>
                        {!isRealisticMode && (
                            <Link 
                                href="#how-it-works" 
                                onClick={() => setMobileMenuOpen(false)}
                                className={`text-lg font-semibold transition-colors ${
                                    activeSection === "how-it-works" ? "text-indigo-400" : "text-white/80 hover:text-white"
                                }`}
                            >
                                How it works
                            </Link>
                        )}

                        {/* Profile / Login in Menu */}
                        <div className="w-full max-w-xs border-t border-white/10 my-4" />

                        {isLoggedIn ? (
                            <Link 
                                href="/profile" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/40 px-6 py-3 rounded-full transition-colors font-bold w-full max-w-xs justify-center shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                            >
                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex shrink-0 items-center justify-center text-white text-[10px]">US</div>
                                My Profile
                            </Link>
                        ) : isGuest ? (
                            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-6 py-3 rounded-full font-bold w-full justify-center">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                    Guest Mode
                                </div>
                                <p className="text-[10px] text-slate-400 text-center px-2">
                                    Sign in to save your interview progress, access mock interviews, AI resume generation, and cloud storage.
                                </p>
                                <Link 
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl w-full text-center mt-1"
                                >
                                    Sign In or Register
                                </Link>
                            </div>
                        ) : (
                            <Link 
                                href="/login" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full text-white transition-colors font-bold w-full max-w-xs text-center"
                            >
                                Log in
                            </Link>
                        )}
                    </nav>
                </div>
            )}

            <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4 sm:px-6 min-h-[90vh]">
                {/* Hero Background Image */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/hero-bg.jpg" 
                        alt="" 
                        className="w-full h-full object-cover object-center"
                        style={{ opacity: theme === "dark" ? 0.3 : theme === "light" ? 0.5 : 0.45 }}
                    />
                    {/* Gradient overlay for text readability */}
                    <div 
                        className="absolute inset-0"
                        style={{
                            background: theme === "dark" 
                                ? "linear-gradient(to bottom, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.25) 40%, rgba(5,5,5,0.7) 100%)"
                                : theme === "light"
                                ? "linear-gradient(to bottom, rgba(248,250,252,0.5) 0%, rgba(248,250,252,0.3) 40%, rgba(248,250,252,0.6) 100%)"
                                : "linear-gradient(to bottom, rgba(244,234,225,0.5) 0%, rgba(244,234,225,0.35) 40%, rgba(244,234,225,0.65) 100%)"
                        }}
                    />
                </div>

                <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-[1]" />
                <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none z-[1]" />
                <div className="max-w-6xl w-full mx-auto z-10 px-4 flex flex-col items-center justify-center">
                    {activeModal === "progress" ? (
                        <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-300">
                            <ProgressPanel isLight={theme === "light"} defaultTab={progressActiveTab} onClose={() => setActiveModal(null)} />
                        </div>
                    ) : (isMobile && (isLoggedIn || isGuest)) ? (
                        <MobileDashboardContent 
                            theme={theme}
                            isRealisticMode={isRealisticMode}
                            isLoggedIn={isLoggedIn}
                            onSelectAnalysis={() => {
                                router.push("/features?tool=analysis");
                            }}
                            onStartInterview={() => {
                                if (isRealisticMode) {
                                    router.push("/setup");
                                } else {
                                    router.push("/features?start=true");
                                }
                            }}
                            onSelectProgress={() => {
                                setProgressActiveTab("interview");
                                setActiveModal("progress");
                            }}
                        />
                    ) : (
                        <>
                            {/* Desktop Hero Grid (Visible on md and up) */}
                            <div className="hidden md:flex flex-row items-center justify-between gap-12 w-full text-left">
                                <div className="flex-1 space-y-6">
                                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
                                        <span className="inline-block">Master your next</span>
                                        <br />
                                        <span className={`inline-block transition-colors duration-300 ${theme === "light" ? "text-indigo-600" : theme === "eyeprotect" ? "text-amber-800" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"}`}>
                                            technical interview
                                        </span>
                                    </h1>

                                    <p className={`text-base md:text-lg max-w-xl leading-relaxed transition-colors duration-300 ${theme === "light" ? "text-slate-900/70" : theme === "eyeprotect" ? "text-black/70" : "text-white/60"}`}>
                                        {isRealisticMode 
                                            ? "Simulate a real-world company interview under hiring manager conditions. Get professional technical and behavioral feedback tailored to your background."
                                            : "Upload your resume and practice with our highly realistic AI interviewer. Get tailored questions, real-time voice interaction, and actionable feedback."}
                                    </p>

                                    <div className="pt-2">
                                        <Link 
                                            href={isRealisticMode ? "/setup" : "/features"}
                                            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-xl shadow-indigo-500/20"
                                        >
                                            {isRealisticMode ? "Start Realistic Interview" : "Start Practice Session"}
                                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>

                                    {/* Daily Agenda & To-Do List (Priority first, instant delete on completion) */}
                                    <div className="pt-2 w-full">
                                        <HomeTodoWidget theme={theme} isLoggedIn={isLoggedIn} />
                                    </div>

                                    {/* 4 Stats Cards + Full-Width Dashboard Bar */}
                                    {(isLoggedIn || isGuest) && (
                                        <div className="pt-4 w-full space-y-3 font-sans">
                                            {/* 4 Compact Stats Cards in Grid */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                                                {/* STAR Stories Saved */}
                                                <Link
                                                    href="/features?tool=star"
                                                    className={`p-3.5 flex flex-col justify-between border rounded-2xl text-left transition-all duration-200 hover:border-purple-500/50 cursor-pointer ${
                                                        theme === "light"
                                                            ? "bg-white border-slate-200 shadow-sm"
                                                            : theme === "eyeprotect"
                                                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                                                            : "bg-[#0b0c15] border border-white/5 hover:bg-[#111222]"
                                                    }`}
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2">
                                                        <Sparkles className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className={`text-xl font-black block leading-none ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                                                            {snap?.starStories ?? 0}
                                                        </span>
                                                        <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-white/30 mt-1 block">STAR Stories Saved</span>
                                                    </div>
                                                </Link>

                                                {/* Coding Unlocked */}
                                                <Link
                                                    href="/coding-lab"
                                                    className={`p-3.5 flex flex-col justify-between border rounded-2xl text-left transition-all duration-200 hover:border-amber-500/50 cursor-pointer ${
                                                        theme === "light"
                                                            ? "bg-white border-slate-200 shadow-sm"
                                                            : theme === "eyeprotect"
                                                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                                                            : "bg-[#0b0c15] border border-white/5 hover:bg-[#1c1a22]"
                                                    }`}
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2">
                                                        <Code2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className={`text-xl font-black block leading-none ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                                                            {snap?.codingSolved ?? 0}
                                                        </span>
                                                        <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-white/30 mt-1 block">Coding Unlocked</span>
                                                    </div>
                                                </Link>

                                                {/* ATS Match */}
                                                <Link
                                                    href="/ats-match"
                                                    className={`p-3.5 flex flex-col justify-between border rounded-2xl text-left transition-all duration-200 hover:border-sky-500/50 cursor-pointer ${
                                                        theme === "light"
                                                            ? "bg-white border-slate-200 shadow-sm"
                                                            : theme === "eyeprotect"
                                                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                                                            : "bg-[#0b0c15] border border-white/5 hover:bg-[#111622]"
                                                    }`}
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-2">
                                                        <FileSearch className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className={`text-xl font-black block leading-none ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                                                            {snap?.atsMatch != null ? `${snap.atsMatch}%` : "0%"}
                                                        </span>
                                                        <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-white/30 mt-1 block">ATS Match</span>
                                                    </div>
                                                </Link>

                                                {/* Film Gaps */}
                                                <Link
                                                    href="/film-room"
                                                    className={`p-3.5 flex flex-col justify-between border rounded-2xl text-left transition-all duration-200 hover:border-rose-500/50 cursor-pointer ${
                                                        theme === "light"
                                                            ? "bg-white border-slate-200 shadow-sm"
                                                            : theme === "eyeprotect"
                                                            ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                                                            : "bg-[#0b0c15] border border-white/5 hover:bg-[#1c121e]"
                                                    }`}
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-2">
                                                        <Clapperboard className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className={`text-xl font-black block leading-none ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                                                            {snap?.filmRoomGaps?.length ?? 0}
                                                        </span>
                                                        <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-white/30 mt-1 block">Film Gaps</span>
                                                    </div>
                                                </Link>
                                            </div>

                                            {/* Full-Width Dashboard Card below stats grid */}
                                            <div
                                                onClick={() => {
                                                    setProgressActiveTab("interview");
                                                    setActiveModal("progress");
                                                }}
                                                className={`w-full p-3.5 sm:p-4 flex items-center justify-between border rounded-2xl text-left transition-all duration-200 hover:border-indigo-500/50 cursor-pointer group ${
                                                    theme === "light"
                                                        ? "bg-white border-slate-200 shadow-sm"
                                                        : theme === "eyeprotect"
                                                        ? "bg-[#fffcf5] border-[#8c8578]/30 shadow-sm"
                                                        : "bg-[#0b0c15] border border-white/10 hover:bg-[#111622]"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <TrendingUp className="w-4.5 h-4.5 text-sky-400" />
                                                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">Dashboard</span>
                                                </div>
                                                <span className="text-xs font-bold text-sky-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                                    View Reports &rarr;
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {pausedSession && ((isRealisticMode && pausedSession.mode === "realistic") || (!isRealisticMode && (pausedSession.mode === "technical" || !pausedSession.mode))) && (
                                        <div className="mt-8 p-6 bg-indigo-900/20 border border-indigo-500/30 rounded-xl w-full max-w-md relative backdrop-blur-sm z-20 text-center md:text-left">
                                            <h3 className="text-xl font-bold text-indigo-300 mb-2">You Have a Paused Interview</h3>
                                            <p className="text-sm text-white/60 mb-4">
                                                Paused on {pausedSession.savedAt ? new Date(pausedSession.savedAt).toLocaleString() : "Unknown Date"}
                                            </p>
                                            <div className="flex gap-3">
                                                <button onClick={handleResume} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                                                    <Play className="w-5 h-5"/> Resume
                                                </button>
                                                <button onClick={handleDeletePaused} className="px-4 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 rounded-xl transition flex items-center justify-center" title="Delete Paused Session">
                                                    <Trash2 className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Robot Avatar Artwork */}
                                <div className="relative w-[220px] h-[220px] lg:w-[260px] lg:h-[260px] flex items-center justify-center shrink-0 select-none">
                                    <img 
                                        src={
                                            theme === "light" 
                                                ? "/ai-avatar-light.jpg" 
                                                : theme === "eyeprotect" 
                                                ? "/ai-avatar-eyeprotect.jpg" 
                                                : "/ai-avatar.jpg"
                                        } 
                                        alt="AI Coach" 
                                        className="w-full h-full object-cover rounded-full border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.25)]"
                                    />
                                    <div className={`absolute -bottom-4 right-0 left-0 mx-auto w-max px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border transition-all duration-300 ${
                                        theme === "light"
                                        ? "bg-white border-slate-200/80"
                                        : theme === "eyeprotect"
                                        ? "bg-[#fffcf5] border-[#8c8578]/30"
                                        : "bg-[#08080f]/90 border-white/10"
                                    }`}>
                                        <span className="w-2 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className={`text-[10px] font-black tracking-tight transition-colors duration-300 ${
                                            theme === "light"
                                            ? "text-slate-700"
                                            : theme === "eyeprotect"
                                            ? "text-[#57534e]"
                                            : "text-white/80"
                                        }`}>AI Interviewer Online</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Hero Card (Visible on mobile only) */}
                            <div className={`flex md:hidden w-full relative overflow-hidden rounded-3xl p-5 flex-row items-center justify-between transition-all duration-300 ${
                                theme === "light"
                                ? "bg-white border border-slate-200/80 shadow-md shadow-slate-100/10"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border border-[#8c8578]/30 shadow-md shadow-stone-200/10"
                                : "bg-gradient-to-br from-[#0c0d1b] via-[#090918] to-[#04040f] border border-white/10 shadow-[0_0_20px_rgba(79,70,229,0.12)]"
                            }`}>
                                {/* Background Image Cover Right Side with Fade to Left */}
                                <div className="absolute right-0 top-0 bottom-0 h-full w-[48%] z-0 select-none pointer-events-none overflow-hidden rounded-r-3xl">
                                    <img 
                                        src={
                                            theme === "light" 
                                                ? "/ai-avatar-light.jpg" 
                                                : theme === "eyeprotect" 
                                                ? "/ai-avatar-eyeprotect.jpg" 
                                                : "/ai-avatar.jpg"
                                        } 
                                        alt="AI Coach" 
                                        className="w-full h-full object-cover object-center"
                                        style={{
                                            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 30%, black 100%)",
                                            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 30%, black 100%)"
                                        }}
                                    />
                                </div>

                                <div className="flex-grow text-left z-10 space-y-3 max-w-[65%]">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-block px-3 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-bold text-purple-400">
                                            Ready to level up?
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black border bg-emerald-500/10 text-emerald-450 border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
                                            AI Online
                                        </span>
                                    </div>

                                    <h2 className={`text-lg font-black leading-tight transition-colors duration-300 ${
                                        theme === "light" 
                                        ? "text-slate-900" 
                                        : theme === "eyeprotect" 
                                        ? "text-[#1c1917]" 
                                        : "text-white"
                                    }`}>
                                        Master your next <br />
                                        <span className={`transition-colors duration-300 ${
                                            theme === "light" 
                                            ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" 
                                            : theme === "eyeprotect" 
                                            ? "text-amber-800" 
                                            : "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"
                                        }`}>
                                            technical interview
                                        </span>
                                    </h2>

                                    <p className={`text-[10px] leading-relaxed font-semibold transition-colors duration-300 ${
                                        theme === "light" 
                                        ? "text-slate-700" 
                                        : theme === "eyeprotect" 
                                        ? "text-[#57534e]" 
                                        : "text-white/50"
                                    }`}>
                                        {isRealisticMode 
                                            ? "Simulate a real-world company interview under hiring manager conditions."
                                            : "Practice with our AI interviewer, get real-time feedback, and improve with every session."}
                                    </p>

                                    <Link 
                                        href={isRealisticMode ? "/setup" : "/features"}
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-[11px] cursor-pointer shadow-[0_3px_12px_rgba(79,70,229,0.2)]"
                                    >
                                        {isRealisticMode ? "Start Realistic Interview" : "Start Practice Session"}
                                        <ArrowRight className="w-3 h-3 animate-pulse" />
                                    </Link>
                                </div>
                            </div>

                            {/* Mobile Paused Session (Mobile only, rendered separately below Hero card) */}
                            <div className="flex md:hidden w-full">
                                {pausedSession && ((isRealisticMode && pausedSession.mode === "realistic") || (!isRealisticMode && (pausedSession.mode === "technical" || !pausedSession.mode))) && (
                                    <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl w-full max-w-md mx-auto relative backdrop-blur-sm z-20 text-center">
                                        <h3 className="text-sm font-bold text-indigo-300 mb-1">Paused Interview</h3>
                                        <p className="text-[11px] text-white/50 mb-3">
                                            Paused on {pausedSession.savedAt ? new Date(pausedSession.savedAt).toLocaleString() : "Unknown Date"}
                                        </p>
                                        <div className="flex gap-2">
                                            <button onClick={handleResume} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs">
                                                <Play className="w-4 h-4"/> Resume
                                            </button>
                                            <button onClick={handleDeletePaused} className="px-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 rounded-xl transition flex items-center justify-center" title="Delete Paused Session">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Features Showcase Section */}
            {!isRealisticMode && (
                <section id="features" className="w-full max-w-5xl mx-auto px-6 py-24 border-t border-white/10 scroll-m-20 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Interactive Setup & Pre-Interview Tools</h2>
                        <p className="text-white/50 text-lg mb-10 leading-relaxed">
                            Analyze your GitHub portfolio, assess project source code, and dynamically align interview parameters with top companies like Google, Meta, and Netflix. Build a refined, professional resume using Google Gemini AI.
                        </p>
                        <Link 
                            href="/features"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold transition-all shadow-xl shadow-indigo-600/20 text-white"
                        >
                            <Sparkles className="w-5 h-5 text-indigo-200" /> Open Interactive Setup Tools
                        </Link>
                    </div>
                </section>
            )}

            {/* How it works section */}
            {!isRealisticMode && (
                <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/10 scroll-m-20">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">How it works</h2>
                        <p className="text-white/50 text-lg max-w-2xl mx-auto">Get ready for your next big opportunity in just four simple steps.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: FileText, title: "1. Upload Resume", desc: "Drop your PDF or TXT resume. The AI will analyze your background to tailor specific questions for you." },
                            { icon: Settings, title: "2. Set Difficulty", desc: "Choose your preferred interview level: Basic, Intermediate, or Advanced to match your experience." },
                            { icon: ShieldCheck, title: "3. Grant Permissions", desc: "Allow camera and microphone access to enable anti-cheating features and realistic voice interactions." },
                            { icon: MessageSquare, title: "4. Conduct Interview", desc: "Use the built-in mic to dictate your answers or type them out. The AI adapts to exactly what you say." }
                        ].map((step, idx) => (
                            <div key={idx} className="bg-[#111] border border-white/10 rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-300 flex flex-col items-center text-center group">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <step.icon className="w-7 h-7 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {pastSessions.length > 0 && (
                <section className="w-full max-w-7xl mx-auto px-6 pb-24">
                    <div className="bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Download className="w-5 h-5 text-indigo-400"/> Recent Sessions</h3>
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">Last 1 hour</span>
                        </div>
                        
                        <div className="space-y-3">
                            {pastSessions.map((s: any, idx: number) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">Interview Session</span>
                                        <span className="text-xs text-white/50">{new Date(s.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                                        <div className="flex flex-col items-start sm:items-end">
                                            <span className="text-xs text-white/40">Score</span>
                                            <span className="font-bold text-indigo-300">{s.finalScore}/100</span>
                                        </div>
                                        <button onClick={() => downloadTranscript(s)} className="p-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors cursor-pointer" title="Download Transcript">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Mode Switch Popup Modal for Realistic AI Mode */}
            {renderModeSwitchModal()}
        </div>
    );
}
