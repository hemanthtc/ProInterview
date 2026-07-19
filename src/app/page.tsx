"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, Video, FileText, Settings, ShieldCheck, MessageSquare, Download, Play, Trash2, Sparkles, Sun, Moon, Eye, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import { getStorageItem, setStorageItem, removeStorageItem } from "../utils/storage";
import { motion } from "framer-motion";

export default function Home() {
    const router = useRouter();
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [pausedSession, setPausedSession] = useState<any>(null);
    const [isRealisticMode, setIsRealisticMode] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [activeSection, setActiveSection] = useState<"home" | "how-it-works">("home");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Org admins have their own dashboard — redirect them away from the user home
        const role = localStorage.getItem("userRole");
        if (role === "admin") {
            router.push("/admin");
            return;
        }

        setIsLoggedIn(getStorageItem("userLoggedIn") === "true");
        setIsRealisticMode(getStorageItem("globalInterviewMode") === "realistic");
        
        const savedTheme = localStorage.getItem("globalTheme") as any;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
        }
        
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

        // Dynamic scrollspy active indicators
        const handleHashChange = () => {
            if (window.location.hash === "#how-it-works") {
                setActiveSection("how-it-works");
            } else {
                setActiveSection("home");
            }
        };

        const handleScroll = () => {
            const howItWorks = document.getElementById("how-it-works");
            if (howItWorks) {
                const rect = howItWorks.getBoundingClientRect();
                if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                    setActiveSection("how-it-works");
                    return;
                }
            }
            setActiveSection("home");
        };

        window.addEventListener("hashchange", handleHashChange);
        window.addEventListener("scroll", handleScroll);
        
        handleHashChange();
        handleScroll();

        return () => {
            window.removeEventListener("hashchange", handleHashChange);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const toggleMode = () => {
        const newMode = !isRealisticMode;
        setIsRealisticMode(newMode);
        setStorageItem("globalInterviewMode", newMode ? "realistic" : "technical");
    };

    const cycleTheme = () => {
        let nextTheme: "dark" | "light" | "eyeprotect" = "dark";
        if (theme === "dark") nextTheme = "light";
        else if (theme === "light") nextTheme = "eyeprotect";
        
        setTheme(nextTheme);
        localStorage.setItem("globalTheme", nextTheme);
        document.documentElement.className = nextTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${nextTheme}`;
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

    return (
        <div 
            className="min-h-screen selection:bg-indigo-500/30 flex flex-col font-sans transition-colors duration-300"
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
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">ProInterview</span>
                </div>
                
                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-white/70 items-center">
                    {!isRealisticMode && (
                        <Link 
                            href="/" 
                            className={`transition-colors pb-1 ${
                                activeSection === "home" 
                                    ? "text-white border-b border-indigo-500" 
                                    : "hover:text-white text-white/70"
                            }`}
                        >
                            Home
                        </Link>
                    )}
                    {isLoggedIn && (
                        <button 
                            onClick={toggleMode}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all ${isRealisticMode ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]'}`}
                        >
                            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isRealisticMode ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></span>
                            {isRealisticMode ? 'Realistic Mode' : 'Practice Mode'}
                        </button>
                    )}
                    {!isRealisticMode && <Link href="/features" className="hover:text-white text-white/70 transition-colors pb-1">Features</Link>}
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
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">ProInterview</span>
                        </div>
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
                            <button 
                                onClick={() => {
                                    toggleMode();
                                    setMobileMenuOpen(false);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-semibold ${isRealisticMode ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-orange-500/20 border-orange-500/50 text-orange-300'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isRealisticMode ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></span>
                                {isRealisticMode ? 'Realistic Mode' : 'Practice Mode'}
                            </button>
                        )}
                        {!isRealisticMode && (
                            <Link 
                                href="/features" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
                            >
                                Features
                            </Link>
                        )}
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
                {/* Abstract shapes */}
                <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-4xl w-full mx-auto text-center z-10 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Powered by Google Gemini
                    </div>

                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                        <motion.span
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="inline-block"
                        >
                            Master your next
                        </motion.span>
                        <br />
                        <motion.span
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                            className={`inline-block transition-colors duration-300 ${theme === "light" ? "text-indigo-600" : theme === "eyeprotect" ? "text-amber-800" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"}`}
                        >
                            technical interview
                        </motion.span>
                    </h1>

                    <p className={`text-lg md:text-xl mb-12 max-w-2xl leading-relaxed transition-colors duration-300 ${theme === "light" ? "text-slate-900/70" : theme === "eyeprotect" ? "text-black/70" : "text-white/60"}`}>
                        {isRealisticMode 
                            ? "Simulate a real-world company interview under hiring manager conditions. Get professional technical and behavioral feedback tailored to your background."
                            : "Upload your resume and practice with our highly realistic AI interviewer. Get tailored questions, real-time voice interaction, and actionable feedback."}
                    </p>

                    <Link 
                        href={isLoggedIn ? (isRealisticMode ? "/setup" : "/features") : "/login"}
                        className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-xl shadow-indigo-500/20"
                    >
                        {isRealisticMode ? "Start Realistic Interview" : "Start Practice Session"}
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {pausedSession && ((isRealisticMode && pausedSession.mode === "realistic") || (!isRealisticMode && (pausedSession.mode === "technical" || !pausedSession.mode))) && (
                        <div className="mt-8 p-6 bg-indigo-900/20 border border-indigo-500/30 rounded-xl w-full max-w-md mx-auto relative backdrop-blur-sm z-20">
                            <h3 className="text-xl font-bold text-indigo-300 mb-2">You Have a Paused Interview</h3>
                            <p className="text-sm text-white/60 mb-4">
                                Paused on {new Date(pausedSession.savedAt || Date.now()).toLocaleString()}
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
                            {pastSessions.map((s, idx) => (
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
        </div>
    );
}
