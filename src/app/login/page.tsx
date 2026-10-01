"use client";

import Link from "next/link";
import { ArrowLeft, Video, Loader2, Lock, Mail, AlertCircle, CheckCircle, User, Sun, Moon, Eye } from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/utils/storage";

const COUNTRIES = [
    { name: "United States", code: "+1", iso: "US" },
    { name: "India", code: "+91", iso: "IN" },
    { name: "United Kingdom", code: "+44", iso: "GB" },
    { name: "Canada", code: "+1", iso: "CA" },
    { name: "Australia", code: "+61", iso: "AU" },
    { name: "Germany", code: "+49", iso: "DE" },
    { name: "France", code: "+33", iso: "FR" },
    { name: "Japan", code: "+81", iso: "JP" },
    { name: "Brazil", code: "+55", iso: "BR" },
    { name: "South Africa", code: "+27", iso: "ZA" },
    { name: "Singapore", code: "+65", iso: "SG" },
    { name: "United Arab Emirates", code: "+971", iso: "AE" }
];

// Animated blinking eye SVG — shows password only while hovering
function EyeIcon({ isHovering }: { isHovering: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {isHovering ? (
                // Open eye — show password
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            ) : (
                // Closed / blinking eye
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </>
            )}
        </svg>
    );
}

// Helper to safely parse JSON response and avoid "Unexpected end of JSON input" on server crash
async function safeParseJson(res: Response) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        return { error: `Server error (${res.status}): ${text || res.statusText || "Internal Server Error"}` };
    }
}

function LoginContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [loginType, setLoginType] = useState<"email" | "phone">("email");
    const [loginMode, setLoginMode] = useState<"user" | "organization">("user");
    const [orgSubMode, setOrgSubMode] = useState<"admin" | "employee">("admin");
    const [adminId, setAdminId] = useState("");
    const [employeeId, setEmployeeId] = useState("");

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        Promise.resolve().then(() => {
            setIsHydrated(true);
            const savedTheme = localStorage.getItem("globalTheme") as any;
            if (savedTheme) {
                setTheme(savedTheme);
                document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
                document.documentElement.style.colorScheme = savedTheme === "eyeprotect" ? "light" : savedTheme;
            }
        });
    }, []);

    const cycleTheme = () => {
        let nextTheme: "dark" | "light" | "eyeprotect" = "dark";
        if (theme === "dark") nextTheme = "light";
        else if (theme === "light") nextTheme = "eyeprotect";
        
        setTheme(nextTheme);
        localStorage.setItem("globalTheme", nextTheme);
        document.documentElement.className = nextTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${nextTheme}`;
        document.documentElement.style.colorScheme = nextTheme === "eyeprotect" ? "light" : nextTheme;
    };

    const searchParams = useSearchParams();
    const redirectParam = searchParams ? searchParams.get("redirect") : null;

    // Seamless access: If user is already authenticated and not viewing session expired notice, redirect immediately
    useEffect(() => {
        if (searchParams && searchParams.get("expired") === "1") return;
        const loggedVal = getStorageItem("userLoggedIn");
        const hasToken = !!getStorageItem("sessionToken");
        if (loggedVal === "true" || hasToken) {
            const role = getStorageItem("userRole") || "user";
            const dest = (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/login")
                ? redirectParam
                : (role === "admin" ? "/admin" : "/features");
            router.replace(dest);
        }
    }, [router, redirectParam, searchParams]);

    const handleGuestModeLogin = useCallback(() => {
        try {
            localStorage.removeItem("sessionToken");
            sessionStorage.removeItem("sessionToken");
        } catch {}
        removeStorageItem("sessionToken");
        setStorageItem("userLoggedIn", "guest");
        setStorageItem("userIdentifier", "guest_user");
        setStorageItem("userName", "Guest User");
        setStorageItem("userRole", "guest");
        setStorageItem("userType", "guest");
        document.cookie = "userLoggedIn=guest; path=/; max-age=86400; SameSite=Lax";
        const dest = (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/login")
            ? redirectParam
            : "/features";
        window.location.href = dest;
    }, [redirectParam]);

    // Auth States
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(() => {
        if (searchParams && searchParams.get("expired") === "1") {
            const customMsg = typeof window !== "undefined" ? sessionStorage.getItem("session_expired_message") : null;
            if (customMsg) {
                try { sessionStorage.removeItem("session_expired_message"); } catch {}
                return customMsg;
            }
            return "Your session has expired. Please sign in again.";
        }
        return "";
    });
    const [successMessage, setSuccessMessage] = useState("");
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [successName, setSuccessName] = useState("");

    // Password reveal — shown only while hovering the eye icon
    const [eyeHovering, setEyeHovering] = useState(false);

    // Phone Dropdown States
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

    // OTP & Forgot Password flow states
    const [otpStep, setOtpStep] = useState<"form" | "otp_verify" | "forgot_password" | "forgot_otp_verify" | "reset_password">("form");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const [otpInputs, setOtpInputs] = useState<string[]>(Array(6).fill(""));
    const [otpTimer, setOtpTimer] = useState(30);
    const [forgotIdentifier, setForgotIdentifier] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [originalFlowType, setOriginalFlowType] = useState<"login" | "register">("login");
    const [accountType, setAccountType] = useState<"user" | "admin" | "employee">("user");
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if ((otpStep === "otp_verify" || otpStep === "forgot_otp_verify") && otpTimer > 0) {
            timer = setInterval(() => {
                setOtpTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [otpStep, otpTimer]);



    const filteredCountries = useMemo(() => {
        const search = countrySearch.toLowerCase().trim();
        return COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.code.includes(search)
        );
    }, [countrySearch]);

    const completeLogin = useCallback(async (name: string, identifier: string, role: string, details?: any) => {
        setLoading(true);
        setLoginSuccess(true);
        setSuccessName(name);

        if (typeof document !== "undefined") {
            document.cookie = "userLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
        }
        setStorageItem("userLoggedIn", "true");
        setStorageItem("userName", name);
        setStorageItem("userIdentifier", identifier);
        // Derive userType from the resolved role to avoid stale loginMode closure
        const resolvedType = (role === "admin" || role === "employee") ? "organization" : "user";
        setStorageItem("userType", resolvedType);
        setStorageItem("userRole", role || "user");

        if (details) {
            if (details.token) {
                setStorageItem("sessionToken", details.token);
            }
            setStorageItem("userSubscriptionPlan", details.subscriptionPlan || "Free Tier");
            setStorageItem("userOrgName", details.organizationName || "");
            setStorageItem("userAdminId", details.adminId || "");
            setStorageItem("userDepartment", details.department || "");
            setStorageItem("userProfilePhoto", details.profilePhoto || "");
            setStorageItem("userAdditionalEmail", details.additionalEmail || "");
            setStorageItem("userGithub", details.github || "");
            setStorageItem("userLinkedin", details.linkedin || "");
            setStorageItem("userPortfolio", details.portfolioUrl || "");
            setStorageItem("userResumeCvName", details.resumeCvName || "");
            setStorageItem("userResumeCvText", details.resumeCvText || "");
            setStorageItem("userPhone", details.phone || "");
            setStorageItem("userEducationData", details.educationData ? JSON.stringify(details.educationData) : "");
        } else {
            setStorageItem("userOrgName", "");
            setStorageItem("userAdminId", "");
            setStorageItem("userDepartment", "");
            setStorageItem("userProfilePhoto", "");
            setStorageItem("userAdditionalEmail", "");
            setStorageItem("userGithub", "");
            setStorageItem("userLinkedin", "");
            setStorageItem("userPortfolio", "");
            setStorageItem("userResumeCvName", "");
            setStorageItem("userResumeCvText", "");
            setStorageItem("userPhone", "");
            setStorageItem("userEducationData", "");
        }

        // Keep popup open for 1.2 seconds to allow full success animations to finish
        await new Promise(resolve => setTimeout(resolve, 1200));

        let destination = "/features";
        if (role === "admin") {
            destination = "/admin";
        } else if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/login") {
            destination = redirectParam;
        }

        // Perform hard navigation to prevent stale router caches across browsers
        window.location.href = destination;
    }, [redirectParam]);

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError("");
            try {
                const isPwa = typeof window !== "undefined" && (
                    window.matchMedia("(display-mode: standalone)").matches || 
                    (window.navigator as any).standalone === true
                );
                const res = await fetch("/api/auth/google", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ accessToken: tokenResponse.access_token, isPwa })
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ error: "Failed backend verification" }));
                    throw new Error(errorData.error || "Failed backend verification");
                }
                const data = await res.json().catch(() => ({}));
                completeLogin(data.name, data.email, "user", data);
            } catch (err: any) {
                setError(err.message || "Failed server-side Google authentication verification.");
                setLoading(false);
            }
        },
        onError: (err) => {
            console.error("Google login error:", err);
            setError("Google Login failed or popup was closed. Please enable popups if prompted and try again.");
            setLoading(false);
        }
    });

    const handleGoogleLogin = useCallback(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID" || clientId.trim() === "") {
            setError("Google Client ID is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env file.");
            return;
        }
        googleLogin();
    }, [googleLogin]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setShowCountryDropdown(false);

        let identifier = "";
        if (loginMode === "user") {
            const isEmailEmpty = !email.trim();
            if (isEmailEmpty || !password.trim()) {
                setError("Please fill in all credentials.");
                return;
            }

            if (isRegistering && !displayName.trim()) {
                setError("Please enter your display name.");
                return;
            }

            identifier = email.trim();
        } else {
            // Organization login
            const isIdEmpty = orgSubMode === "admin" ? !adminId.trim() : !employeeId.trim();
            if (isIdEmpty || !password.trim()) {
                setError("Please fill in all credentials.");
                return;
            }
            identifier = orgSubMode === "admin" ? adminId.trim() : employeeId.trim();
        }

        setLoading(true);

        try {
            if (loginMode === "user" && isRegistering) {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        identifier,
                        password,
                        displayName: displayName.trim(),
                        type: loginType
                    })
                });

                const data = await safeParseJson(res);
                if (!res.ok) {
                    throw new Error(data.error || "Registration failed.");
                }

                setGeneratedOtp(data.otpCode || "");
                setForgotIdentifier(identifier);
                setOriginalFlowType("register");
                setAccountType("user");  // register is always a regular user
                setOtpInputs(Array(6).fill(""));
                setOtpTimer(30);
                setOtpStep("otp_verify");
            } else {
                // User login or Organization login
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        identifier,
                        password,
                        loginMode,
                        orgSubMode
                    })
                });

                const data = await safeParseJson(res);
                if (!res.ok) {
                    throw new Error(data.error || "Login failed.");
                }

                // Store the accountType returned by the login API so verify-otp
                // knows which collection to check
                const resolvedAccountType: "user" | "admin" | "employee" = data.accountType || "user";
                setAccountType(resolvedAccountType);
                setGeneratedOtp(data.otpCode || "");
                setForgotIdentifier(identifier);
                setOriginalFlowType("login");
                setOtpInputs(Array(6).fill(""));
                setOtpTimer(30);
                setOtpStep("otp_verify");
            }
        } catch (err: any) {
            setError(err.message || "An authentication error occurred.");
        } finally {
            setLoading(false);
        }
    }, [loginType, email, selectedCountry, phone, password, isRegistering, displayName, loginMode, orgSubMode, adminId, employeeId]);

    const resendOtp = useCallback(async () => {
        setError("");
        setSuccessMessage("");
        setLoading(true);
        try {
            let res;
            if (otpStep === "otp_verify") {
                if (originalFlowType === "register") {
                    res = await fetch("/api/auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ identifier: forgotIdentifier, password, displayName, type: loginType })
                    });
                } else {
                    res = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ identifier: forgotIdentifier, password, loginMode, orgSubMode })
                    });
                }
            } else {
                // Forgot OTP verify
                res = await fetch("/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier: forgotIdentifier })
                });
            }

            const data = await safeParseJson(res);
            if (!res.ok) {
                throw new Error(data.error || "Failed to resend code.");
            }

            setGeneratedOtp(data.otpCode || "");
            setOtpInputs(Array(6).fill(""));
            setOtpTimer(30);
            setError("");
        } catch (err: any) {
            setError(err.message || "Failed to resend verification code.");
        } finally {
            setLoading(false);
        }
    }, [otpStep, originalFlowType, forgotIdentifier, password, displayName, loginType, loginMode, orgSubMode]);

    const handleVerifyOtpSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setLoading(true);

        const enteredOtp = otpInputs.join("");
        if (enteredOtp.length < 6) {
            setError("Please enter the full 6-digit code.");
            setLoading(false);
            return;
        }

        try {
            const flowType = otpStep === "otp_verify" ? originalFlowType : "forgot_password";
            const isPwa = typeof window !== "undefined" && (
                window.matchMedia("(display-mode: standalone)").matches || 
                (window.navigator as any).standalone === true
            );
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: forgotIdentifier,
                    otp: enteredOtp,
                    flowType,
                    accountType,   // pass the account type so the right collection is queried
                    isPwa
                })
            });

            const data = await safeParseJson(res);
            if (!res.ok) {
                throw new Error(data.error || "Invalid or expired verification code.");
            }

            if (otpStep === "otp_verify") {
                // Login or Register flow completed!
                const userObj = data.user;
                const role = userObj.isOrganization ? userObj.orgRole : "user";
                await completeLogin(userObj.displayName, userObj.identifier, role, { ...userObj, token: data.token });
            } else {
                // Forgot Password flow: transition to password input
                setOtpStep("reset_password");
            }
        } catch (err: any) {
            setError(err.message || "Failed to verify passcode.");
        } finally {
            setLoading(false);
        }
    }, [otpStep, originalFlowType, forgotIdentifier, otpInputs, accountType, completeLogin]);

    const handleForgotPasswordSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setLoading(true);

        if (!forgotIdentifier.trim()) {
            setError("Please enter your email or phone number.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: forgotIdentifier.trim(), accountType })
            });

            const data = await safeParseJson(res);
            if (!res.ok) {
                throw new Error(data.error || "Failed to initiate password reset.");
            }

            setGeneratedOtp(data.otpCode || "");
            setOtpInputs(Array(6).fill(""));
            setOtpTimer(30);
            setOtpStep("forgot_otp_verify");
        } catch (err: any) {
            setError(err.message || "Failed to request verification code.");
        } finally {
            setLoading(false);
        }
    }, [forgotIdentifier, accountType]);

    const handleResetPasswordSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setLoading(true);

        if (!newPassword.trim()) {
            setError("Please enter a new password.");
            setLoading(false);
            return;
        }

        try {
            const enteredOtp = otpInputs.join("");
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: forgotIdentifier.trim(),
                    otp: enteredOtp,
                    newPassword: newPassword.trim(),
                    accountType
                })
            });

            const data = await safeParseJson(res);
            if (!res.ok) {
                throw new Error(data.error || "Failed to reset password.");
            }

            // Success: back to login form
            setOtpStep("form");
            setNewPassword("");
            setForgotIdentifier("");
            setPassword("");
            setIsRegistering(false);
            setGeneratedOtp("");
            // Alert success
            setSuccessMessage("Password updated successfully! Please sign in with your new password.");
        } catch (err: any) {
            setError(err.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    }, [forgotIdentifier, otpInputs, newPassword, accountType]);

    const handleOtpInputChange = (index: number, val: string) => {
        const cleanedVal = val.replace(/[^0-9]/g, "").slice(-1);
        const newOtp = [...otpInputs];
        newOtp[index] = cleanedVal;
        setOtpInputs(newOtp);

        // Auto shift focus to next input
        if (cleanedVal && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
            const newOtp = [...otpInputs];
            newOtp[index - 1] = "";
            setOtpInputs(newOtp);
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const getHeaderInfo = () => {
        if (otpStep === "otp_verify" || otpStep === "forgot_otp_verify") {
            return {
                title: "Verify Passcode",
                subtitle: "We sent a 6-digit verification code. Enter it below to secure your session."
            };
        }
        if (otpStep === "forgot_password") {
            return {
                title: "Forgot Password",
                subtitle: accountType === "admin" || accountType === "employee"
                    ? "Enter your registered ID below to request a password reset verification via email."
                    : "Enter your registered credentials below to request a password reset verification."
            };
        }
        if (otpStep === "reset_password") {
            return {
                title: "Reset Password",
                subtitle: "Create a new secure password for your ProInterview account."
            };
        }
        return {
            title: isRegistering ? "Create Account" : "Secure Login",
            subtitle: isRegistering
                ? "Register your credentials to start capturing interview data."
                : "Enter your exact credentials to sync your interview algorithms."
        };
    };

    const headerInfo = getHeaderInfo();
    const isLight = theme === "light" || theme === "eyeprotect";

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-300 ${
            isLight ? "bg-slate-50 text-slate-900" : "bg-[#050505] text-white"
        }`}>
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-6 ${
                            isLight ? "bg-slate-900/60" : "bg-black/85"
                        }`}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`max-w-md w-full rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(79,70,229,0.3)] relative overflow-hidden border ${
                                isLight
                                    ? "bg-white border-slate-200"
                                    : "bg-gradient-to-b from-[#111] to-[#0a0a0a] border-white/10"
                            }`}
                        >
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />
                            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[40px] pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center">
                                {loginSuccess ? (
                                    <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center border ${
                                                isLight
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
                                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                                            }`}
                                        >
                                            <motion.svg
                                                className="w-10 h-10"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <motion.path
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ delay: 0.2, duration: 0.4 }}
                                                    d="M20 6L9 17l-5-5"
                                                />
                                            </motion.svg>
                                        </motion.div>
                                    </div>
                                ) : (
                                    <div className="relative w-24 h-24 mb-6">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-500"
                                        />
                                        <motion.div
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-2 rounded-full border-b-2 border-l-2 border-purple-500"
                                        />
                                        <div className={`absolute inset-4 rounded-full flex items-center justify-center ${
                                            isLight ? "bg-slate-100" : "bg-black/40"
                                        }`}>
                                            <Video className={`w-6 h-6 animate-pulse ${
                                                isLight ? "text-indigo-600" : "text-indigo-400"
                                            }`} />
                                        </div>
                                    </div>
                                )}

                                <h3 className={`text-xl font-bold mb-2 ${
                                    isLight
                                        ? "text-slate-900"
                                        : "bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 text-transparent bg-clip-text"
                                }`}>
                                    {loginSuccess ? "Authentication Successful" : "Secure Authentication"}
                                </h3>
                                <p className={`text-sm mb-6 ${ isLight ? "text-slate-500" : "text-white/60" }`}>
                                    {loginSuccess ? `Welcome back, ${successName}! Syncing your profile...` : "Verifying credentials and establishing a secure session..."}
                                </p>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
                                    isLight ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-white/40"
                                }`}>
                                    {loginSuccess ? (
                                        <>
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                                className="w-2 h-2 rounded-full bg-emerald-400"
                                            />
                                            <span className={isLight ? "text-slate-600" : ""}>Redirecting to home...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                            <span>Syncing with cloud database</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className={`px-4 sm:px-8 py-4 sm:py-5 flex flex-row gap-4 items-center justify-between border-b backdrop-blur-md sticky top-0 z-50 transition-colors duration-300 ${
                isLight
                    ? "border-slate-200 bg-white/90 shadow-sm"
                    : "border-white/10 bg-[#050505]/80"
            }`}>
                <BrandLogo />
                <div className="flex items-center gap-3">
                    {/* Theme Toggle Button */}
                    <button 
                        onClick={cycleTheme}
                        className={`p-2 border rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer w-8 h-8 sm:w-10 sm:h-10 ${
                            isLight
                                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900"
                                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white"
                        }`}
                        title={`Current Theme: ${theme}. Click to switch.`}
                    >
                        {theme === "dark" && <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {theme === "light" && <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {theme === "eyeprotect" && <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />}
                    </button>
                    <Link href="/" className={`text-xs sm:text-sm transition-colors flex items-center gap-1 ${
                        isLight ? "text-slate-500 hover:text-slate-900" : "text-white/60 hover:text-white"
                    }`}>
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Home</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-6 relative">
                <div className={`absolute top-[10%] right-[20%] w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none z-0 ${
                    isLight ? "bg-indigo-300/20" : "bg-indigo-600/10"
                }`} />
                <div className={`absolute bottom-[20%] left-[20%] w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none z-0 ${
                    isLight ? "bg-purple-300/20" : "bg-purple-600/10"
                }`} />

                <div className={`max-w-md w-full rounded-3xl p-8 z-10 relative transition-all duration-300 border ${
                    isLight
                        ? "bg-white border-slate-200 shadow-[0_8px_40px_rgba(99,102,241,0.12),0_2px_12px_rgba(0,0,0,0.06)]"
                        : "bg-[#111] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                }`}>
                    <div className="text-center mb-6">
                        <h1 className={`text-3xl font-bold mb-2 ${ isLight ? "text-slate-900" : "text-white" }`}>{headerInfo.title}</h1>
                        <p className={`text-sm ${ isLight ? "text-slate-500" : "text-white/50" }`}>{headerInfo.subtitle}</p>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: "auto", scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden mb-4"
                            >
                                <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm relative group ${
                                    isLight
                                        ? "bg-red-50 border-red-200 text-red-800"
                                        : "text-red-300 bg-gradient-to-r from-red-500/15 to-rose-600/15 border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.15)] backdrop-blur-md"
                                }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                        isLight ? "bg-red-100 border-red-200" : "bg-red-500/20 border-red-500/40"
                                    }`}>
                                        <AlertCircle className={`w-4 h-4 ${ isLight ? "text-red-600" : "text-red-400" }`} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <p className={`font-bold text-xs tracking-wider uppercase mb-1 ${ isLight ? "text-red-700" : "text-white" }`}>Attention Required</p>
                                        <p className={`leading-relaxed text-xs ${ isLight ? "text-red-600" : "text-white/70" }`}>{error}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setError("")}
                                        className={`absolute right-3 top-3 transition-colors p-1 rounded-lg text-xs ${
                                            isLight ? "text-red-400 hover:text-red-700 hover:bg-red-100" : "text-white/30 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: "auto", scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden mb-4"
                            >
                                <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm relative group ${
                                    isLight
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "text-emerald-300 bg-gradient-to-r from-emerald-500/15 to-teal-600/15 border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)] backdrop-blur-md"
                                }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                        isLight ? "bg-emerald-100 border-emerald-200" : "bg-emerald-500/20 border-emerald-500/40"
                                    }`}>
                                        <CheckCircle className={`w-4 h-4 ${ isLight ? "text-emerald-600" : "text-emerald-400" }`} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <p className={`font-bold text-xs tracking-wider uppercase mb-1 ${ isLight ? "text-emerald-700" : "text-white" }`}>Success</p>
                                        <p className={`leading-relaxed text-xs ${ isLight ? "text-emerald-600" : "text-white/70" }`}>{successMessage}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSuccessMessage("")}
                                        className={`absolute right-3 top-3 transition-colors p-1 rounded-lg text-xs ${
                                            isLight ? "text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100" : "text-white/30 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* RENDER FORMS BASED ON CURRENT OTP STEP */}
                    {otpStep === "form" && (
                        <>
                            {/* User / Organization Toggle Switch */}
                            <div className={`flex rounded-xl p-1 mb-6 border relative z-20 ${
                                isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
                            }`}>
                                <button 
                                    type="button" 
                                    onClick={() => { setLoginMode("user"); setError(""); setSuccessMessage(""); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                                        loginMode === "user"
                                            ? "bg-indigo-600 text-white shadow-md"
                                            : (isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70")
                                    }`}
                                >
                                    User Login
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setLoginMode("organization"); setError(""); setSuccessMessage(""); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                                        loginMode === "organization"
                                            ? "bg-purple-600 text-white shadow-md"
                                            : (isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70")
                                    }`}
                                >
                                    Organization
                                </button>
                            </div>

                            {/* Google Login for Users Only */}
                            {loginMode === "user" && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        className={`w-full h-12 mb-6 flex items-center justify-center gap-3 rounded-xl font-bold transition-all disabled:opacity-70 border ${
                                            isLight
                                                ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                                : "bg-white text-black border-transparent hover:bg-gray-200"
                                        }`}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                <path d="M1 1h22v22H1z" fill="none" />
                                            </svg>
                                        )}
                                        Continue with Google
                                    </button>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`h-px flex-1 ${ isLight ? "bg-slate-200" : "bg-white/10" }`}></div>
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${ isLight ? "text-slate-400" : "text-white/40" }`}>OR</span>
                                        <div className={`h-px flex-1 ${ isLight ? "bg-slate-200" : "bg-white/10" }`}></div>
                                    </div>
                                </>
                            )}

                            {/* Sub-tab toggle for Organization Mode */}
                            {loginMode === "organization" && (
                                <div className={`flex rounded-xl p-1 mb-6 border relative z-20 ${
                                    isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
                                }`}>
                                    <button 
                                        type="button" 
                                        onClick={() => { setOrgSubMode("admin"); setError(""); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                                            orgSubMode === "admin"
                                                ? "bg-purple-600 text-white shadow-md"
                                                : (isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70")
                                        }`}
                                    >
                                        Administration Login
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setOrgSubMode("employee"); setError(""); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                                            orgSubMode === "employee"
                                                ? "bg-purple-600 text-white shadow-md"
                                                : (isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70")
                                        }`}
                                    >
                                        Employee Login
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4 relative z-20">
                                {/* Scoped fields block */}
                                {loginMode === "user" ? (
                                    <>
                                        {/* Display name — only on registration */}
                                        {isRegistering && (
                                            <div className="space-y-1">
                                                <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>Your Name</label>
                                                <div className="relative">
                                                    <User className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                                    <input
                                                        type="text"
                                                        value={displayName}
                                                        onChange={e => setDisplayName(e.target.value)}
                                                        className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                                            isLight
                                                                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-200"
                                                                : "bg-black/50 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                                        }`}
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {/* Email Address */}
                                        <div className="space-y-1">
                                            <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>Email Address</label>
                                            <div className="relative">
                                                <Mail className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                                        isLight
                                                            ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-200"
                                                            : "bg-black/50 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                                    }`}
                                                    placeholder="name@company.com"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Organization Inputs */}
                                        {orgSubMode === "admin" ? (
                                            <div className="space-y-1">
                                                <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>Administration ID</label>
                                                <div className="relative">
                                                    <User className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                                    <input
                                                        type="text"
                                                        value={adminId}
                                                        onChange={e => setAdminId(e.target.value)}
                                                        className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                                            isLight
                                                                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-200"
                                                                : "bg-black/50 border-white/10 text-white focus:border-purple-500 focus:ring-purple-500"
                                                        }`}
                                                        placeholder="e.g. admin123"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>Employee ID</label>
                                                <div className="relative">
                                                    <User className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                                    <input
                                                        type="text"
                                                        value={employeeId}
                                                        onChange={e => setEmployeeId(e.target.value)}
                                                        className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                                            isLight
                                                                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-200"
                                                                : "bg-black/50 border-white/10 text-white focus:border-purple-500 focus:ring-purple-500"
                                                        }`}
                                                        placeholder="e.g. emp123"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Password with hover-to-reveal eye */}
                                <div className="space-y-1 relative z-10">
                                    <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>Password</label>
                                    <div className="relative">
                                        <Lock className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                        <input
                                            type={eyeHovering ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={`w-full border rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                                isLight
                                                    ? `bg-white border-slate-300 text-slate-900 placeholder-slate-400 ${
                                                        loginMode === "organization" ? "focus:border-purple-500 focus:ring-purple-200" : "focus:border-indigo-500 focus:ring-indigo-200"
                                                      }`
                                                    : `bg-black/50 border-white/10 text-white ${
                                                        loginMode === "organization" ? "focus:border-purple-500 focus:ring-purple-500" : "focus:border-indigo-500 focus:ring-indigo-500"
                                                      }`
                                            }`}
                                            placeholder="••••••••"
                                        />
                                        {/* Hover, touch, or focus to reveal eye icon */}
                                        <button
                                            type="button"
                                            onMouseEnter={() => setEyeHovering(true)}
                                            onMouseLeave={() => setEyeHovering(false)}
                                            onTouchStart={() => setEyeHovering(true)}
                                            onTouchEnd={() => setEyeHovering(false)}
                                            onFocus={() => setEyeHovering(true)}
                                            onBlur={() => setEyeHovering(false)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 select-none focus:outline-none ${
                                                eyeHovering 
                                                    ? (loginMode === "organization" ? "text-purple-500 scale-110" : "text-indigo-500 scale-110") 
                                                    : (isLight ? "text-slate-400 hover:text-slate-600" : "text-white/30 hover:text-white/50")
                                            }`}
                                            tabIndex={0}
                                            aria-label="Hold or focus to reveal password"
                                            title="Hold or focus to reveal password"
                                        >
                                            <EyeIcon isHovering={eyeHovering} />
                                        </button>
                                    </div>
                                    <p className={`text-xs ml-1 ${ isLight ? "text-slate-400" : "text-white/25" }`}>Hover the eye icon to reveal your password</p>
                                </div>

                                {/* Custom recovery links for Organization */}
                                {loginMode === "organization" && (
                                    <div className={`flex justify-between items-center px-1 text-[11px] font-semibold pt-1 relative z-30 ${ isLight ? "text-purple-600" : "text-purple-400" }`}>
                                        <button 
                                            type="button" 
                                            onClick={() => setError(`Please contact system administrator to retrieve your ${orgSubMode === "admin" ? "Administration ID" : "Employee ID"}.`)}
                                            className={`transition-colors cursor-pointer ${ isLight ? "hover:text-purple-800" : "hover:text-purple-300" }`}
                                        >
                                            Forgot {orgSubMode === "admin" ? "Administration ID" : "Employee ID"}?
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const orgIdentifier = orgSubMode === "admin" ? adminId.trim() : employeeId.trim();
                                                setOtpStep("forgot_password");
                                                setError("");
                                                setPassword("");
                                                setForgotIdentifier(orgIdentifier);
                                                setAccountType(orgSubMode === "admin" ? "admin" : "employee");
                                            }}
                                            className={`transition-colors cursor-pointer ${ isLight ? "hover:text-purple-800" : "hover:text-purple-300" }`}
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}

                                {/* User forgot password recovery link */}
                                {loginMode === "user" && !isRegistering && (
                                    <div className={`flex justify-end px-1 text-xs font-semibold pt-1 ${ isLight ? "text-indigo-600" : "text-indigo-400" }`}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtpStep("forgot_password");
                                                setError("");
                                                setPassword("");
                                                setForgotIdentifier(loginType === "email" ? email.trim() : `${selectedCountry.code}${phone.trim()}`);
                                            }}
                                            className={`transition-colors cursor-pointer text-right ${ isLight ? "hover:text-indigo-800" : "hover:text-indigo-300" }`}
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full h-12 mt-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 rounded-xl font-bold text-white shadow-lg cursor-pointer ${
                                        loginMode === "organization" 
                                            ? "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20" 
                                            : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                                    }`}
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {loading ? "Authenticating..." : (isRegistering ? "Create Account" : "Sign In")}
                                </button>

                                {loginMode === "user" && !isRegistering && (
                                    <button
                                        type="button"
                                        onClick={handleGuestModeLogin}
                                        className={`w-full h-12 mt-3 flex items-center justify-center gap-2 transition-all rounded-xl font-bold border transition-colors cursor-pointer ${
                                            isLight 
                                                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50" 
                                                : "bg-white/5 border-white/10 text-white/90 hover:bg-white/10"
                                        }`}
                                    >
                                        Explore as Guest (Offline Mode)
                                    </button>
                                )}
                            </form>

                            {loginMode === "user" && (
                                <div className="mt-6 text-center">
                                    <button type="button"
                                        onClick={() => { setIsRegistering(!isRegistering); setError(""); setSuccessMessage(""); setPassword(""); setDisplayName(""); setShowCountryDropdown(false); }}
                                        className={`text-sm font-semibold transition-colors cursor-pointer ${ isLight ? "text-indigo-600 hover:text-indigo-800" : "text-indigo-400 hover:text-indigo-300" }`}>
                                        {isRegistering ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* OTP PASSCODE VERIFICATION VIEW */}
                    {(otpStep === "otp_verify" || otpStep === "forgot_otp_verify") && (
                        <form onSubmit={handleVerifyOtpSubmit} className="space-y-6 relative z-20">
                            {generatedOtp && (
                                <div className={`p-4 border rounded-2xl text-center text-sm relative overflow-hidden animate-pulse ${
                                    isLight ? "bg-indigo-50 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/20"
                                }`}>
                                    {forgotIdentifier.includes("@") || loginType === "email" ? (
                                        <span className={`font-semibold ${ isLight ? "text-indigo-700" : "text-indigo-300" }`}>Verification code sent to {forgotIdentifier}. Please check your inbox.</span>
                                    ) : (
                                        <>
                                            <span className={`font-semibold ${ isLight ? "text-indigo-700" : "text-indigo-300" }`}>[Demo Mode] Verification code sent to {forgotIdentifier || "your registered address"}: </span>
                                            <span className={`font-mono text-lg font-bold tracking-wider ${ isLight ? "text-slate-900" : "text-white" }`}>{generatedOtp}</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className={`text-xs font-bold uppercase tracking-wider block text-center ${ isLight ? "text-slate-500" : "text-white/50" }`}>
                                    Enter 6-Digit Passcode
                                </label>
                                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                                    {otpInputs.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => { otpInputRefs.current[idx] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleOtpInputChange(idx, e.target.value)}
                                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                                            className={`w-10 h-12 border rounded-xl text-center font-bold text-xl focus:outline-none focus:ring-1 transition-all font-mono ${
                                                isLight
                                                    ? "bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-200"
                                                    : "bg-black/50 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs px-2">
                                <span className={isLight ? "text-slate-400" : "text-white/40"}>
                                    {otpTimer > 0 ? `Resend code in ${otpTimer}s` : "Didn't receive code?"}
                                </span>
                                <button
                                    type="button"
                                    disabled={otpTimer > 0 || loading}
                                    onClick={resendOtp}
                                    className={`font-bold transition-colors disabled:opacity-30 cursor-pointer ${
                                        isLight ? "text-indigo-600 hover:text-indigo-800 disabled:hover:text-indigo-600" : "text-indigo-400 hover:text-indigo-300 disabled:hover:text-indigo-400"
                                    }`}
                                >
                                    Resend OTP
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otpInputs.some(d => !d)}
                                className="w-full h-12 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 transition-all disabled:opacity-50 rounded-xl font-bold text-white shadow-lg cursor-pointer"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? "Verifying..." : "Verify Code"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setOtpStep("form"); setError(""); }}
                                className={`w-full text-center text-xs font-semibold transition-colors cursor-pointer ${
                                    isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"
                                }`}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    )}

                    {/* FORGOT PASSWORD REQUEST IDENTIFIER VIEW */}
                    {otpStep === "forgot_password" && (
                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 relative z-20">
                            <div className="space-y-1">
                                <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>
                                    {accountType === "admin" ? "Administration ID" : accountType === "employee" ? "Employee ID" : "Email Address or Phone Number"}
                                </label>
                                <div className="relative">
                                    <Mail className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                    <input
                                        type="text"
                                        value={forgotIdentifier}
                                        onChange={e => setForgotIdentifier(e.target.value)}
                                        className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                            isLight
                                                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-200"
                                                : "bg-black/50 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        }`}
                                        placeholder={accountType === "admin" ? "e.g. admin123" : accountType === "employee" ? "e.g. emp123" : "name@company.com or +91XXXXXXXXXX"}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !forgotIdentifier.trim()}
                                className="w-full h-12 mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 transition-all disabled:opacity-50 rounded-xl font-bold text-white shadow-lg cursor-pointer"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? "Sending..." : "Send Verification Code"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setOtpStep("form"); setError(""); }}
                                className={`w-full text-center text-xs font-semibold transition-colors cursor-pointer ${
                                    isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"
                                }`}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    )}

                    {/* RESET PASSWORD ENTER NEW PASSWORD VIEW */}
                    {otpStep === "reset_password" && (
                        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 relative z-20">
                            <div className="space-y-1 relative z-10">
                                <label className={`text-xs font-bold uppercase tracking-wider block ml-1 ${ isLight ? "text-slate-500" : "text-white/50" }`}>New Password</label>
                                <div className="relative">
                                    <Lock className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${ isLight ? "text-slate-400" : "text-white/30" }`} />
                                    <input
                                        type={eyeHovering ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className={`w-full border rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-1 transition-all font-sans ${
                                            isLight
                                                ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-200"
                                                : "bg-black/50 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        }`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onMouseEnter={() => setEyeHovering(true)}
                                        onMouseLeave={() => setEyeHovering(false)}
                                        onTouchStart={() => setEyeHovering(true)}
                                        onTouchEnd={() => setEyeHovering(false)}
                                        onFocus={() => setEyeHovering(true)}
                                        onBlur={() => setEyeHovering(false)}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 select-none focus:outline-none ${
                                            eyeHovering
                                                ? "text-indigo-500 scale-110"
                                                : (isLight ? "text-slate-400 hover:text-slate-600" : "text-white/30 hover:text-white/50")
                                        }`}
                                        tabIndex={0}
                                        aria-label="Hold or focus to reveal password"
                                        title="Hold or focus to reveal password"
                                    >
                                        <EyeIcon isHovering={eyeHovering} />
                                    </button>
                                </div>
                                <p className={`text-xs ml-1 ${ isLight ? "text-slate-400" : "text-white/25" }`}>Hover the eye icon to reveal your new password</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !newPassword.trim()}
                                className="w-full h-12 mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 transition-all disabled:opacity-50 rounded-xl font-bold text-white shadow-lg cursor-pointer"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setOtpStep("form"); setError(""); }}
                                className={`w-full text-center text-xs font-semibold transition-colors cursor-pointer ${
                                    isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/60"
                                }`}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    )}

                    <p className={`mt-6 text-center text-xs ${ isLight ? "text-slate-400" : "text-white/30" }`}>
                        Credentials secured in Cloud & Sync cache.{" "}
                        <Link href="/privacy" className="underline hover:text-indigo-400">Privacy</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}

export default function LoginPage() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id";
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
            <GoogleOAuthProvider clientId={clientId}>
                <LoginContent />
            </GoogleOAuthProvider>
        </Suspense>
    );
}
