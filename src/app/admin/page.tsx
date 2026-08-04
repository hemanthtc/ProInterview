"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users, UserPlus, Trash2, BarChart3, ShieldCheck, LogOut,
    TrendingUp, Server, Crown, Zap, RefreshCw, X, Eye, EyeOff,
    Building2, ChevronRight, Activity, Calendar, Mail, Briefcase,
    Sun, Moon, AlertCircle, CheckCircle2, Clock, Star
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface StatsData {
    totalUsers: number;
    totalUnverified: number;
    signupsToday: number;
    signupsWeekly: number;
    signupsMonthly: number;
    signupsYearly: number;
    totalEmployees: number;
    subscriptions: { _id: { plan: string; cycle: string }; count: number }[];
    recentUsers: { displayName: string; identifier: string; subscriptionPlan: string; createdAt: string; type: string }[];
    unverifiedUsers: { displayName: string; identifier: string; createdAt: string; type: string }[];
    employees: { identifier: string; displayName: string; department: string; isVerified: boolean; isOnline?: boolean; lastActive?: string; createdAt: string; organizationName: string }[];
    admins?: { identifier: string; displayName: string; organizationName: string; isVerified: boolean; isOnline?: boolean; lastActive?: string; createdAt: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function planColor(plan: string) {
    const p = plan?.toLowerCase() || "";
    if (p.includes("elite")) return { bg: "bg-purple-500/20", text: "text-purple-300", bar: "bg-purple-500", ring: "ring-purple-500/40" };
    if (p.includes("pro"))   return { bg: "bg-indigo-500/20", text: "text-indigo-300", bar: "bg-indigo-500", ring: "ring-indigo-500/40" };
    if (p.includes("enterprise")) return { bg: "bg-amber-500/20", text: "text-amber-300", bar: "bg-amber-500", ring: "ring-amber-500/40" };
    return { bg: "bg-slate-500/20", text: "text-slate-400", bar: "bg-slate-500", ring: "ring-slate-500/40" };
}

function planIcon(plan: string) {
    const p = plan?.toLowerCase() || "";
    if (p.includes("elite")) return <Crown className="w-3.5 h-3.5" />;
    if (p.includes("pro"))   return <Zap className="w-3.5 h-3.5" />;
    if (p.includes("enterprise")) return <Star className="w-3.5 h-3.5" />;
    return <Users className="w-3.5 h-3.5" />;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs  < 24) return `${hrs}h ago`;
    return `${days}d ago`;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8 group`}>
            <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 blur-2xl rounded-full -translate-y-6 translate-x-6 group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-3xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
                    {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-20 text-white`}>{icon}</div>
            </div>
        </div>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "account" | "leaderboard">("dashboard");
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [leaderboardMeta, setLeaderboardMeta] = useState<{ organizationName?: string; seatsUsed?: number; planHint?: string }>({});
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    // Admin identity from localStorage
    const [adminId, setAdminId] = useState("");
    const [adminName, setAdminName] = useState("");
    const [orgName, setOrgName] = useState("");

    // Add Employee modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ identifier: "", password: "", displayName: "", department: "" });
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState("");
    const [addSuccess, setAddSuccess] = useState("");
    const [showAddPassword, setShowAddPassword] = useState(false);

    // Add Admin modal (root admin actions)
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [addAdminForm, setAddAdminForm] = useState({ identifier: "", password: "", displayName: "", organizationName: "" });
    const [addAdminLoading, setAddAdminLoading] = useState(false);
    const [addAdminError, setAddAdminError] = useState("");
    const [addAdminSuccess, setAddAdminSuccess] = useState("");
    const [showAddAdminPassword, setShowAddAdminPassword] = useState(false);

    // Remove confirmation
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Subscription breakdown active tab
    const [breakdownCycle, setBreakdownCycle] = useState<"monthly" | "yearly">("monthly");

    // Unverified users actions modal
    const [showUnverifiedModal, setShowUnverifiedModal] = useState(false);
    const [userActionLoading, setUserActionLoading] = useState<string | null>(null); // holds identifier during active requests

    // ── Auth Guard ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loggedIn = localStorage.getItem("userLoggedIn");
        const role = localStorage.getItem("userRole");

        if (loggedIn !== "true" || role !== "admin") {
            router.push("/");
            return;
        }

        const id   = localStorage.getItem("userIdentifier") || "";
        const name = localStorage.getItem("userName") || "Admin";
        const org  = localStorage.getItem("userOrgName") || "Organization";

        setAdminId(id);
        setAdminName(name);
        setOrgName(org);

        const savedTheme = localStorage.getItem("globalTheme") as any;
        if (savedTheme) {
            setTheme(savedTheme === "dark" ? "dark" : "light");
            document.documentElement.className = savedTheme === "eyeprotect"
                ? "theme-light theme-eyeprotect"
                : `theme-${savedTheme}`;
            document.documentElement.style.colorScheme = savedTheme === "eyeprotect" ? "light" : savedTheme;
        }
    }, [router]);

    // ── Fetch Stats ─────────────────────────────────────────────────────────────
    const fetchStats = useCallback(async (id: string) => {
        if (!id) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/stats?adminId=${encodeURIComponent(id)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load stats.");
            setStats(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (adminId) fetchStats(adminId);
    }, [adminId, fetchStats]);

    // ── Logout ──────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        try {
            const role = localStorage.getItem("userRole"); // "admin" or "employee"
            const identifier = localStorage.getItem("userIdentifier");
            if (identifier && role) {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier, accountType: role })
                });
            }
        } catch (e) {
            console.error("Failed to notify logout to server", e);
        }
        ["userLoggedIn","userName","userIdentifier","userRole","userType",
         "userOrgName","userSubscriptionPlan"].forEach(k => localStorage.removeItem(k));
        router.push("/login");
    };

    // ── Add Employee ────────────────────────────────────────────────────────────
    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        setAddError("");
        setAddSuccess("");
        try {
            const res = await fetch("/api/admin/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...addForm, adminId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add employee.");
            setAddSuccess(`Employee "${addForm.displayName}" added successfully.`);
            setAddForm({ identifier: "", password: "", displayName: "", department: "" });
            await fetchStats(adminId);
            setTimeout(() => { setShowAddModal(false); setAddSuccess(""); }, 1800);
        } catch (err: any) {
            setAddError(err.message);
        } finally {
            setAddLoading(false);
        }
    };

    // ── Remove Employee ─────────────────────────────────────────────────────────
    const handleRemoveEmployee = async (identifier: string) => {
        setRemovingId(identifier);
        try {
            const res = await fetch(`/api/admin/employees?identifier=${encodeURIComponent(identifier)}&adminId=${encodeURIComponent(adminId)}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            await fetchStats(adminId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRemovingId(null);
        }
    };

    // ── Verify Unverified User ──────────────────────────────────────────────────
    const handleVerifyUser = async (userIdentifier: string) => {
        setUserActionLoading(userIdentifier);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: userIdentifier, adminId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to verify user.");
            await fetchStats(adminId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUserActionLoading(null);
        }
    };

    // ── Delete Unverified User ──────────────────────────────────────────────────
    const handleDeleteUser = async (userIdentifier: string) => {
        setUserActionLoading(userIdentifier);
        try {
            const res = await fetch(`/api/admin/users?identifier=${encodeURIComponent(userIdentifier)}&adminId=${encodeURIComponent(adminId)}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete user.");
            await fetchStats(adminId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUserActionLoading(null);
        }
    };

    // ── Create New Admin (Root Admin Action) ───────────────────────────────────
    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddAdminLoading(true);
        setAddAdminError("");
        setAddAdminSuccess("");
        try {
            const res = await fetch("/api/admin/create-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...addAdminForm, adminId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create administrator.");
            setAddAdminSuccess(`Administrator "${addAdminForm.displayName}" created successfully.`);
            setAddAdminForm({ identifier: "", password: "", displayName: "", organizationName: "" });
            await fetchStats(adminId);
            setTimeout(() => { setShowAddAdminModal(false); setAddAdminSuccess(""); }, 1800);
        } catch (err: any) {
            setAddAdminError(err.message);
        } finally {
            setAddAdminLoading(false);
        }
    };

    // ── Theme Toggle ────────────────────────────────────────────────────────────
    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("globalTheme", next);
        document.documentElement.className = `theme-${next}`;
        document.documentElement.style.colorScheme = next;
    };

    // Helper to get subscription plan count for a given billing cycle
    const getPlanCount = useCallback((planName: string, cycle: "monthly" | "yearly") => {
        if (!stats) return 0;
        const match = stats.subscriptions.find(s => {
            const p = s._id.plan || "Free Tier";
            const c = s._id.cycle || "monthly";
            return p.toLowerCase() === planName.toLowerCase() && c.toLowerCase() === cycle.toLowerCase();
        });
        return match ? match.count : 0;
    }, [stats]);

    // ── Revenue estimate (very rough) ──────────────────────────────────────────
    const PLAN_PRICE: Record<string, number> = {
        "Pro Plan": 499,
        "Elite Plan": 999,
        "Enterprise Tier": 1499,
    };
    const estRevenue = stats
        ? stats.subscriptions.reduce((sum, s) => {
            const planName = s._id.plan || "Free Tier";
            const price = PLAN_PRICE[planName] || 0;
            return sum + price * s.count;
        }, 0)
        : 0;

    const isDark = theme === "dark";

    // ────────────────────────────────────────────────────────────────────────────
    return (
        <div className={`min-h-screen font-sans ${isDark ? "bg-[#05050f] text-white" : "bg-slate-100 text-slate-900"} transition-colors`}>

            {/* ── Background glow ── */}
            {isDark && (
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
                    <div className="absolute top-1/2 right-0 w-80 h-80 bg-purple-600/8 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-600/8 blur-[120px] rounded-full" />
                </div>
            )}

            {/* ── Header ── */}
            <header className={`relative z-10 sticky top-0 border-b ${isDark ? "border-white/8 bg-[#05050f]/80" : "border-slate-200 bg-white/80"} backdrop-blur-xl px-6 py-3.5 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold leading-tight">ProInterview Admin</h1>
                        <p className="text-xs opacity-50 leading-tight">{orgName}</p>
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-1">
                    {(["dashboard", "employees", "leaderboard", "account"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab === "leaderboard") {
                                    fetch("/api/admin/leaderboard")
                                        .then((r) => r.json())
                                        .then((d) => {
                                            setLeaderboard(d.leaderboard || []);
                                            setLeaderboardMeta({
                                                organizationName: d.organizationName,
                                                seatsUsed: d.seatsUsed,
                                                planHint: d.planHint,
                                            });
                                        })
                                        .catch(() => setLeaderboard([]));
                                }
                            }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                                activeTab === tab
                                    ? "bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30"
                                    : `${isDark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`
                            }`}
                        >
                            {tab === "employees" ? "Employees" : tab === "account" ? "My Account" : tab === "leaderboard" ? "Team / College" : "Dashboard"}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-slate-100 text-slate-500"} transition-colors`}>
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => adminId && fetchStats(adminId)} className={`p-2 rounded-lg ${isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-slate-100 text-slate-500"} transition-colors`} title="Refresh data">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all ring-1 ring-red-500/20">
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                    </button>
                </div>
            </header>

            {/* ── Mobile tab bar ── */}
            <div className={`md:hidden flex items-center gap-1 px-4 py-2 border-b ${isDark ? "border-white/8 bg-[#05050f]/90" : "border-slate-200 bg-white/90"} backdrop-blur-xl sticky top-[57px] z-10`}>
                {(["dashboard", "employees", "leaderboard", "account"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            if (tab === "leaderboard") {
                                fetch("/api/admin/leaderboard")
                                    .then((r) => r.json())
                                    .then((d) => {
                                        setLeaderboard(d.leaderboard || []);
                                        setLeaderboardMeta({
                                            organizationName: d.organizationName,
                                            seatsUsed: d.seatsUsed,
                                            planHint: d.planHint,
                                        });
                                    })
                                    .catch(() => setLeaderboard([]));
                            }
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                            activeTab === tab
                                ? "bg-indigo-600/20 text-indigo-400"
                                : `${isDark ? "text-white/40" : "text-slate-400"}`
                        }`}
                    >
                        {tab === "employees" ? "Employees" : tab === "account" ? "Account" : tab === "leaderboard" ? "Team" : "Dashboard"}
                    </button>
                ))}
            </div>

            {/* ── Main content ── */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {error && (
                    <div className="mb-6 flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════
                    DASHBOARD TAB
                ════════════════════════════════════════════════════════ */}
                {activeTab === "dashboard" && (
                    <div className="space-y-8">

                        {/* Welcome */}
                        <div>
                            <h2 className="text-2xl font-bold">
                                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
                                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{adminName}</span>
                            </h2>
                            <p className={`text-sm mt-1 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                Here's an overview of your platform activity.
                            </p>
                        </div>

                        {/* Stat cards */}
                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className={`h-28 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-200"} animate-pulse`} />
                                ))}
                            </div>
                        ) : stats && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    icon={<Users className="w-5 h-5" />}
                                    label="Total Users"
                                    value={stats.totalUsers}
                                    sub={`+${stats.signupsToday} today`}
                                    color="bg-indigo-500"
                                />
                                <StatCard
                                    icon={<TrendingUp className="w-5 h-5" />}
                                    label="Monthly Signups"
                                    value={stats.signupsMonthly}
                                    sub={`${stats.signupsWeekly} this week`}
                                    color="bg-emerald-500"
                                />
                                <StatCard
                                    icon={<Briefcase className="w-5 h-5" />}
                                    label="Employees"
                                    value={stats.totalEmployees}
                                    sub="under your org"
                                    color="bg-purple-500"
                                />
                                <StatCard
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    label="Est. Revenue"
                                    value={`₹${(estRevenue / 1000).toFixed(1)}K`}
                                    sub="monthly estimate"
                                    color="bg-amber-500"
                                />
                            </div>
                        )}

                        {/* Two-column layout */}
                        {!loading && stats && (
                            <div className="grid lg:grid-cols-2 gap-6">

                                {/* Subscription Breakdown */}
                                <div className={`rounded-2xl border ${isDark ? "border-white/8 bg-white/4" : "border-slate-200 bg-white"} p-6`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-sm">Subscription Breakdown</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-white/8 text-white/50" : "bg-slate-100 text-slate-500"}`}>
                                            {stats.totalUsers.toLocaleString()} total
                                        </span>
                                    </div>

                                    {/* Monthly vs Yearly tabs */}
                                    <div className={`flex border-b ${isDark ? "border-white/10" : "border-slate-200"} mb-5`}>
                                        <button
                                            onClick={() => setBreakdownCycle("monthly")}
                                            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                                                breakdownCycle === "monthly"
                                                    ? "text-indigo-400 border-indigo-500"
                                                    : `border-transparent ${isDark ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600"}`
                                            }`}
                                        >
                                            Monthly Plans
                                        </button>
                                        <button
                                            onClick={() => setBreakdownCycle("yearly")}
                                            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                                                breakdownCycle === "yearly"
                                                    ? "text-indigo-400 border-indigo-500"
                                                    : `border-transparent ${isDark ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600"}`
                                            }`}
                                        >
                                            Yearly Plans
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {(() => {
                                            const plans = ["Free Tier", "Pro Plan", "Elite Plan"];
                                            const activeCounts = plans.map(p => getPlanCount(p, breakdownCycle));
                                            const maxActiveCount = Math.max(...activeCounts, 1);

                                            return plans.map((plan, idx) => {
                                                const count = activeCounts[idx];
                                                const pct = Math.round((count / maxActiveCount) * 100);
                                                const c = planColor(plan);

                                                return (
                                                    <div key={plan} className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`${c.text}`}>{planIcon(plan)}</span>
                                                                <span className="text-sm font-medium">{plan}</span>
                                                            </div>
                                                            <span className={`text-sm font-bold ${c.text}`}>{count.toLocaleString()}</span>
                                                        </div>
                                                        <div className={`h-2 rounded-full ${isDark ? "bg-white/8" : "bg-slate-100"} overflow-hidden`}>
                                                            <div
                                                                className={`h-full rounded-full ${c.bar} transition-all duration-700`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Server Status */}
                                <div className={`rounded-2xl border ${isDark ? "border-white/8 bg-white/4" : "border-slate-200 bg-white"} p-6`}>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="font-semibold text-sm">Platform Status</h3>
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full ring-1 ring-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Operational
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { label: "API Server",       status: "Operational", color: "text-emerald-400", icon: <Server className="w-4 h-4" /> },
                                            { label: "Database",         status: "Connected",   color: "text-emerald-400", icon: <Activity className="w-4 h-4" /> },
                                            { label: "AI Engine",        status: "Active",      color: "text-emerald-400", icon: <Zap className="w-4 h-4" /> },
                                            { label: "Email Service",    status: "Running",     color: "text-emerald-400", icon: <Mail className="w-4 h-4" /> },
                                            { label: "Payment Gateway",  status: "Live",        color: "text-emerald-400", icon: <CheckCircle2 className="w-4 h-4" /> },
                                        ].map(item => (
                                            <div key={item.label} className={`flex items-center justify-between py-2 border-b ${isDark ? "border-white/5" : "border-slate-100"} last:border-0`}>
                                                <div className="flex items-center gap-2.5 text-sm">
                                                    <span className={isDark ? "text-white/40" : "text-slate-400"}>{item.icon}</span>
                                                    <span>{item.label}</span>
                                                </div>
                                                <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`mt-4 p-3 rounded-xl ${isDark ? "bg-white/4" : "bg-slate-50"}`}>
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className={isDark ? "text-white/50" : "text-slate-500"}>Unverified accounts (pending)</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-amber-400">{stats.totalUnverified}</span>
                                                {stats.totalUnverified > 0 && (
                                                    <button
                                                        onClick={() => setShowUnverifiedModal(true)}
                                                        className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-450 text-[10px] font-bold uppercase tracking-wide transition-all"
                                                    >
                                                        View Accounts
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/5" : "border-slate-200/50"} space-y-1.5`}>
                                            <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-white/30" : "text-slate-400"} mb-1`}>New User Signups</span>
                                            <div className="grid grid-cols-4 gap-2 text-center">
                                                <div className={`p-1.5 rounded-lg ${isDark ? "bg-white/3" : "bg-slate-200/50"}`}>
                                                    <p className="text-[10px] opacity-50">Today</p>
                                                    <p className="text-sm font-bold text-emerald-400">+{stats.signupsToday}</p>
                                                </div>
                                                <div className={`p-1.5 rounded-lg ${isDark ? "bg-white/3" : "bg-slate-200/50"}`}>
                                                    <p className="text-[10px] opacity-50">Weekly</p>
                                                    <p className="text-sm font-bold text-indigo-400">+{stats.signupsWeekly}</p>
                                                </div>
                                                <div className={`p-1.5 rounded-lg ${isDark ? "bg-white/3" : "bg-slate-200/50"}`}>
                                                    <p className="text-[10px] opacity-50">Monthly</p>
                                                    <p className="text-sm font-bold text-purple-400">+{stats.signupsMonthly}</p>
                                                </div>
                                                <div className={`p-1.5 rounded-lg ${isDark ? "bg-white/3" : "bg-slate-200/50"}`}>
                                                    <p className="text-[10px] opacity-50">Yearly</p>
                                                    <p className="text-sm font-bold text-pink-400">+{stats.signupsYearly}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Users */}
                        {!loading && stats && stats.recentUsers.length > 0 && (
                            <div className={`rounded-2xl border ${isDark ? "border-white/8 bg-white/4" : "border-slate-200 bg-white"} p-6`}>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-sm">Recent Signups</h3>
                                    <span className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>Latest 8 users</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-white/30" : "text-slate-400"}`}>
                                                <th className="text-left pb-3">User</th>
                                                <th className="text-left pb-3 hidden sm:table-cell">Identifier</th>
                                                <th className="text-left pb-3">Plan</th>
                                                <th className="text-right pb-3">Joined</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {stats.recentUsers.map((user, i) => {
                                                const c = planColor(user.subscriptionPlan);
                                                return (
                                                    <tr key={i} className={`${isDark ? "hover:bg-white/3" : "hover:bg-slate-50"} transition-colors`}>
                                                        <td className="py-2.5 pr-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                                                                    {user.displayName.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-medium truncate max-w-[120px]">{user.displayName}</span>
                                                            </div>
                                                        </td>
                                                        <td className={`py-2.5 pr-4 hidden sm:table-cell text-xs ${isDark ? "text-white/50" : "text-slate-500"} truncate max-w-[180px]`}>
                                                            {user.identifier}
                                                        </td>
                                                        <td className="py-2.5 pr-4">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} ring-1 ${c.ring}`}>
                                                                {planIcon(user.subscriptionPlan)}
                                                                {user.subscriptionPlan || "Free Tier"}
                                                            </span>
                                                        </td>
                                                        <td className={`py-2.5 text-right text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
                                                            {timeAgo(user.createdAt)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════
                    EMPLOYEES TAB
                ════════════════════════════════════════════════════════ */}
                {activeTab === "leaderboard" && (
                    <div className="space-y-4 mb-8">
                        <div>
                            <h2 className="text-xl font-bold">Team / College leaderboard</h2>
                            <p className={`text-sm mt-0.5 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                {leaderboardMeta.organizationName || orgName} · {leaderboardMeta.seatsUsed ?? leaderboard.length} seats
                            </p>
                            {leaderboardMeta.planHint && (
                                <p className="text-xs text-indigo-300/80 mt-1">{leaderboardMeta.planHint}</p>
                            )}
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "border-white/10" : "border-slate-200"}`}>
                            <table className="w-full text-sm">
                                <thead className={isDark ? "bg-white/5 text-white/50" : "bg-slate-50 text-slate-500"}>
                                    <tr>
                                        <th className="text-left px-4 py-2">#</th>
                                        <th className="text-left px-4 py-2">Member</th>
                                        <th className="text-left px-4 py-2">Dept</th>
                                        <th className="text-right px-4 py-2">Sessions</th>
                                        <th className="text-right px-4 py-2">Avg</th>
                                        <th className="text-right px-4 py-2">Best</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                                                No cohort scores yet — employees need synced interview sessions.
                                            </td>
                                        </tr>
                                    ) : (
                                        leaderboard.map((row, i) => (
                                            <tr key={row.identifier} className={isDark ? "border-t border-white/5" : "border-t border-slate-100"}>
                                                <td className="px-4 py-2">{i + 1}</td>
                                                <td className="px-4 py-2">{row.displayName}</td>
                                                <td className="px-4 py-2 opacity-60">{row.department || "—"}</td>
                                                <td className="px-4 py-2 text-right">{row.sessions}</td>
                                                <td className="px-4 py-2 text-right">{row.avgScore}</td>
                                                <td className="px-4 py-2 text-right font-semibold text-indigo-300">{row.bestScore}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "employees" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Employee Management</h2>
                                <p className={`text-sm mt-0.5 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                    {stats?.totalEmployees ?? 0} employee{(stats?.totalEmployees ?? 0) !== 1 ? "s" : ""} under {orgName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Employee
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className={`h-16 rounded-xl ${isDark ? "bg-white/5" : "bg-slate-200"} animate-pulse`} />
                                ))}
                            </div>
                        ) : (stats?.employees ?? []).length === 0 ? (
                            <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${isDark ? "border-white/10 text-white/30" : "border-slate-200 text-slate-400"}`}>
                                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="font-medium">No employees yet</p>
                                <p className="text-sm mt-1">Click "Add Employee" to get started.</p>
                            </div>
                        ) : (
                            <div className={`rounded-2xl border ${isDark ? "border-white/8 bg-white/4" : "border-slate-200 bg-white"} overflow-hidden`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-white/30 bg-white/3" : "text-slate-400 bg-slate-50"}`}>
                                                <th className="text-left px-5 py-3">Employee</th>
                                                <th className="text-left px-5 py-3 hidden md:table-cell">Login ID</th>
                                                <th className="text-left px-5 py-3 hidden sm:table-cell">Department</th>
                                                <th className="text-left px-5 py-3 hidden lg:table-cell">Added</th>
                                                <th className="text-left px-5 py-3">Status</th>
                                                <th className="px-5 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-slate-100"}`}>
                                            {stats!.employees.map(emp => (
                                                <tr key={emp.identifier} className={`${isDark ? "hover:bg-white/3" : "hover:bg-slate-50"} transition-colors`}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center text-xs font-bold text-purple-300 flex-shrink-0">
                                                                {emp.displayName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium">{emp.displayName}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-5 py-3.5 hidden md:table-cell text-xs ${isDark ? "text-white/50" : "text-slate-500"} max-w-[160px] truncate`}>
                                                        {emp.identifier}
                                                    </td>
                                                    <td className={`px-5 py-3.5 hidden sm:table-cell text-xs ${isDark ? "text-white/60" : "text-slate-600"}`}>
                                                        {emp.department || "—"}
                                                    </td>
                                                    <td className={`px-5 py-3.5 hidden lg:table-cell text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
                                                        {formatDate(emp.createdAt)}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            emp.isOnline
                                                                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                                                                : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${emp.isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                                                            {emp.isOnline ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <button
                                                            onClick={() => handleRemoveEmployee(emp.identifier)}
                                                            disabled={removingId === emp.identifier}
                                                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                            title="Remove employee"
                                                        >
                                                            {removingId === emp.identifier
                                                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                : <Trash2 className="w-3.5 h-3.5" />
                                                            }
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════
                    MY ACCOUNT TAB
                ════════════════════════════════════════════════════════ */}
                {activeTab === "account" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">My Account</h2>

                        <div className={`grid ${adminId.trim().toLowerCase() === "hemanthtchemu2003@gmail.com" ? "lg:grid-cols-2" : "max-w-xl"} gap-6 items-start`}>
                            {/* Left Column: Details, Operations, Session */}
                            <div className="space-y-6">
                                <div className={`rounded-2xl border ${isDark ? "border-white/8 bg-white/4" : "border-slate-200 bg-white"} p-6 space-y-5`}>
                                    {/* Avatar */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-indigo-500/20">
                                            {adminName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{adminName}</p>
                                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 mt-1">
                                                <ShieldCheck className="w-3 h-3" />
                                                Organization Admin
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`border-t ${isDark ? "border-white/8" : "border-slate-100"}`} />

                                    {/* Details */}
                                    {[
                                        { icon: <Mail className="w-4 h-4" />,     label: "Admin ID",       value: adminId },
                                        { icon: <Building2 className="w-4 h-4" />, label: "Organization",   value: orgName },
                                        { icon: <Crown className="w-4 h-4" />,    label: "Access Level",   value: "Enterprise Admin" },
                                        { icon: <Calendar className="w-4 h-4" />, label: "Total Employees", value: `${stats?.totalEmployees ?? "—"} members` },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex-shrink-0 ${isDark ? "text-white/30" : "text-slate-400"}`}>{row.icon}</div>
                                            <div>
                                                <p className={`text-xs font-medium ${isDark ? "text-white/40" : "text-slate-500"}`}>{row.label}</p>
                                                <p className="text-sm font-medium mt-0.5">{row.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Root Admin Actions (restricted to hemanthtchemu2003@gmail.com) */}
                                {adminId.trim().toLowerCase() === "hemanthtchemu2003@gmail.com" && (
                                    <div className={`rounded-2xl border ${isDark ? "border-indigo-500/20 bg-indigo-500/5" : "border-indigo-200 bg-indigo-50/30"} p-5 space-y-4`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 p-2 rounded-xl ${isDark ? "bg-indigo-600/20 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold">Root Admin Operations</h3>
                                                <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                                    As the root platform administrator, you can register new organization admin accounts.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowAddAdminModal(true)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Add New Admin
                                        </button>
                                    </div>
                                )}

                                {/* Danger zone */}
                                <div className={`rounded-2xl border border-red-500/20 bg-red-500/5 p-5`}>
                                    <h3 className="text-sm font-semibold text-red-400 mb-3">Session</h3>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all ring-1 ring-red-500/20"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out of admin panel
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: Administrator Directory (restricted to root admin) */}
                            {adminId.trim().toLowerCase() === "hemanthtchemu2003@gmail.com" && stats && (
                                <div className={`rounded-2xl border ${isDark ? "border-white/8 bg-white/4" : "border-slate-200 bg-white"} p-6 space-y-4 flex flex-col`}>
                                    <div className="flex items-center justify-between border-b pb-3 border-white/5">
                                        <div>
                                            <h3 className="font-bold text-sm">Administrator Directory</h3>
                                            <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                                All registered system administrators.
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-white/8 text-white/50" : "bg-slate-100 text-slate-500"}`}>
                                            {(stats.admins || []).length} admin(s)
                                        </span>
                                    </div>

                                    <div className="divide-y divide-white/5 max-h-[460px] overflow-y-auto pr-1 space-y-3">
                                        {(stats.admins || []).length === 0 ? (
                                            <p className={`text-xs ${isDark ? "text-white/30" : "text-slate-400"} py-4 text-center`}>No other administrators registered.</p>
                                        ) : (
                                            stats.admins!.map(adm => (
                                                <div key={adm.identifier} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                                                    <div className="space-y-1 truncate">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`font-semibold text-xs ${isDark ? "text-white" : "text-slate-900"}`}>{adm.displayName}</span>
                                                            {adm.identifier.trim().toLowerCase() === "hemanthtchemu2003@gmail.com" && (
                                                                <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-bold uppercase">Root</span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[11px] ${isDark ? "text-white/40" : "text-slate-500"} truncate`}>{adm.identifier}</p>
                                                        <p className={`text-[10px] ${isDark ? "text-white/30" : "text-slate-400"} truncate`}>{adm.organizationName}</p>
                                                    </div>

                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                                                        adm.isOnline
                                                            ? "bg-emerald-500/10 text-emerald-450 ring-1 ring-emerald-500/20"
                                                            : "bg-red-500/10 text-red-450 ring-1 ring-red-500/20"
                                                    }`}>
                                                        <span className={`w-1 h-1 rounded-full ${adm.isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                                                        {adm.isOnline ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* ── Add Employee Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl border ${isDark ? "border-white/10 bg-[#0f0f1f]" : "border-slate-200 bg-white"} p-6 shadow-2xl`}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg">Add New Employee</h3>
                            <button onClick={() => { setShowAddModal(false); setAddError(""); setAddSuccess(""); }} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {addSuccess ? (
                            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                {addSuccess}
                            </div>
                        ) : (
                            <form onSubmit={handleAddEmployee} className="space-y-4">
                                {addError && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {addError}
                                    </div>
                                )}

                                {[
                                    { key: "displayName",  label: "Full Name",        placeholder: "Jane Doe",              type: "text" },
                                    { key: "identifier",   label: "Login ID / Email", placeholder: "jane@company.com",      type: "text" },
                                    { key: "department",   label: "Department",       placeholder: "Engineering (optional)", type: "text" },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-white/60" : "text-slate-600"}`}>{field.label}</label>
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={(addForm as any)[field.key]}
                                            onChange={e => setAddForm(f => ({ ...f, [field.key]: e.target.value }))}
                                            required={field.key !== "department"}
                                            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                                                isDark
                                                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/60 focus:bg-white/8"
                                                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                            }`}
                                        />
                                    </div>
                                ))}

                                {/* Password field */}
                                <div>
                                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-white/60" : "text-slate-600"}`}>Password</label>
                                    <div className="relative">
                                        <input
                                            type={showAddPassword ? "text" : "password"}
                                            placeholder="Set employee password"
                                            value={addForm.password}
                                            onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                                            required
                                            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm border outline-none transition-all ${
                                                isDark
                                                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/60 focus:bg-white/8"
                                                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onMouseDown={() => setShowAddPassword(true)}
                                            onMouseUp={() => setShowAddPassword(false)}
                                            onMouseLeave={() => setShowAddPassword(false)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-white/30" : "text-slate-400"}`}
                                        >
                                            {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={addLoading}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    {addLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    {addLoading ? "Adding…" : "Add Employee"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {/* ── Unverified Users Management Modal ── */}
            {showUnverifiedModal && stats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowUnverifiedModal(false)} />
                    <div className={`relative w-full max-w-2xl rounded-2xl border ${isDark ? "border-white/10 bg-[#0f0f1f]" : "border-slate-200 bg-white"} p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                            <div>
                                <h3 className="font-bold text-lg">Unverified Pending Accounts</h3>
                                <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                    These accounts registered but have not completed OTP verification.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUnverifiedModal(false)}
                                className={`p-1.5 rounded-lg ${isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                            {stats.unverifiedUsers.length === 0 ? (
                                <div className="text-center py-10 opacity-40 text-sm">
                                    No pending unverified accounts.
                                </div>
                            ) : (
                                stats.unverifiedUsers.map(user => (
                                    <div
                                        key={user.identifier}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border ${
                                            isDark ? "border-white/5 bg-white/3" : "border-slate-100 bg-slate-50"
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">{user.displayName}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-60">
                                                <span>{user.identifier}</span>
                                                <span>•</span>
                                                <span>Registered: {formatDate(user.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <button
                                                onClick={() => handleVerifyUser(user.identifier)}
                                                disabled={userActionLoading !== null}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-md shadow-emerald-600/10"
                                            >
                                                {userActionLoading === user.identifier ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                )}
                                                Verify
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.identifier)}
                                                disabled={userActionLoading !== null}
                                                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-md shadow-red-600/10"
                                            >
                                                {userActionLoading === user.identifier ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ── Add Admin Modal (Root Admin Action) ── */}
            {showAddAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddAdminModal(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl border ${isDark ? "border-white/10 bg-[#0f0f1f]" : "border-slate-200 bg-white"} p-6 shadow-2xl`}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg">Add New Administrator</h3>
                            <button onClick={() => { setShowAddAdminModal(false); setAddAdminError(""); setAddAdminSuccess(""); }} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-slate-100 text-slate-500"}`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {addAdminSuccess ? (
                            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                {addAdminSuccess}
                            </div>
                        ) : (
                            <form onSubmit={handleAddAdmin} className="space-y-4">
                                {addAdminError && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {addAdminError}
                                    </div>
                                )}

                                {[
                                    { key: "displayName",      label: "Root Admin Name",     placeholder: "Hemanth TC",             type: "text" },
                                    { key: "identifier",       label: "Login ID / Email",    placeholder: "admin@company.com",      type: "text" },
                                    { key: "organizationName", label: "Organization Name",   placeholder: "ProInterview Corp",      type: "text" },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-white/60" : "text-slate-600"}`}>{field.label}</label>
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={(addAdminForm as any)[field.key]}
                                            onChange={e => setAddAdminForm(f => ({ ...f, [field.key]: e.target.value }))}
                                            required
                                            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                                                isDark
                                                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/60 focus:bg-white/8"
                                                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                            }`}
                                        />
                                    </div>
                                ))}

                                {/* Password field */}
                                <div>
                                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-white/60" : "text-slate-600"}`}>Password</label>
                                    <div className="relative">
                                        <input
                                            type={showAddAdminPassword ? "text" : "password"}
                                            placeholder="Set administrator password"
                                            value={addAdminForm.password}
                                            onChange={e => setAddAdminForm(f => ({ ...f, password: e.target.value }))}
                                            required
                                            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm border outline-none transition-all ${
                                                isDark
                                                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/60 focus:bg-white/8"
                                                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onMouseDown={() => setShowAddAdminPassword(true)}
                                            onMouseUp={() => setShowAddAdminPassword(false)}
                                            onMouseLeave={() => setShowAddAdminPassword(false)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-white/30" : "text-slate-400"}`}
                                        >
                                            {showAddAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={addAdminLoading}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    {addAdminLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    {addAdminLoading ? "Creating…" : "Create Administrator"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
