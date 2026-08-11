"use client";

import Link from "next/link";
import { ArrowLeft, Video, LogOut, Download, TrendingUp, User, Award, Activity, Trash2, Sparkles, Loader2, ChevronDown, Pencil, Check, X, GraduationCap, Camera, Sun, Moon, Eye, FileText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ProfileInterviewSession, ProfileToastState } from "../../types/profile";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getStorageItem, setStorageItem, removeStorageItem, clearUserScopedData } from "../../utils/storage";
import { pullSessionsFromCloud, syncSessionsToCloud } from "../../utils/cloudSync";
import BrandLogo from "../../components/BrandLogo";
import PhotoCropperModal from "../../components/profile/PhotoCropperModal";
import SessionHistoryPanel from "../../components/profile/SessionHistoryPanel";
import { uploadFileToS3 } from "../../utils/s3ClientUpload";

function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header?.match(/data:(.*?);/);
    const mime = mimeMatch?.[1] || "image/png";
    const binary = atob(base64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
}

export default function ProfilePage() {
    const router = useRouter();
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [isRealisticMode, setIsRealisticMode] = useState(false);
    const [sessions, setSessions] = useState<ProfileInterviewSession[]>([]);
    const [userName, setUserName] = useState<string>("Guest");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // AI Guidance
    const [guidance, setGuidance] = useState<string>("");
    const [loadingGuidance, setLoadingGuidance] = useState(false);
    const [guidanceOpen, setGuidanceOpen] = useState(false);
    const [accountDetailsOpen, setAccountDetailsOpen] = useState(false);
    const [userIdentifier, setUserIdentifier] = useState("");
    const [memberSince, setMemberSince] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");

    // Delete Account states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmMode, setDeleteConfirmMode] = useState<'account' | 'data_only'>('account');
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmError, setConfirmError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Toast success/info messages state
    const [toast, setToast] = useState<ProfileToastState>({ show: false, message: "", type: "success" });

    // Profile photo states
    const [profilePhoto, setProfilePhoto] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resumeFileInputRef = useRef<HTMLInputElement>(null);

    // Profile photo menu & view states
    const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
    const [viewPhotoOpen, setViewPhotoOpen] = useState(false);

    // WhatsApp-like cropping states
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState("");

    // Additional email for phone logins
    const [additionalEmail, setAdditionalEmail] = useState("");
    const [editingAdditionalEmail, setEditingAdditionalEmail] = useState(false);
    const [editAdditionalEmailValue, setEditAdditionalEmailValue] = useState("");

    // Social & Portfolio Info
    const [github, setGithub] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [editingGithub, setEditingGithub] = useState(false);
    const [editGithubValue, setEditGithubValue] = useState("");
    const [editingLinkedin, setEditingLinkedin] = useState(false);
    const [editLinkedinValue, setEditLinkedinValue] = useState("");
    const [editingPortfolio, setEditingPortfolio] = useState(false);
    const [editPortfolioValue, setEditPortfolioValue] = useState("");

    // Resume / CV upload state
    const [resumeCvName, setResumeCvName] = useState("");
    const [resumeCvText, setResumeCvText] = useState("");
    const [resumeCvUploading, setResumeCvUploading] = useState(false);

    // Contact Info
    const [phone, setPhone] = useState("");
    const [editingPhone, setEditingPhone] = useState(false);
    const [editPhoneValue, setEditPhoneValue] = useState("");

    // Structured Education Info
    const [eduOpen, setEduOpen] = useState(false);
    const [edu10thInstitution, setEdu10thInstitution] = useState("");
    const [edu10thBoard, setEdu10thBoard] = useState("");
    const [edu10thMarks, setEdu10thMarks] = useState("");
    const [edu12thInstitution, setEdu12thInstitution] = useState("");
    const [edu12thBoard, setEdu12thBoard] = useState("");
    const [edu12thMarks, setEdu12thMarks] = useState("");
    const [eduUGInstitution, setEduUGInstitution] = useState("");
    const [eduUGCourse, setEduUGCourse] = useState("");
    const [eduUGMarks, setEduUGMarks] = useState("");
    const [eduPGInstitution, setEduPGInstitution] = useState("");
    const [eduPGCourse, setEduPGCourse] = useState("");
    const [eduPGMarks, setEduPGMarks] = useState("");

    // Subscription States
    const [subscriptionPlan, setSubscriptionPlan] = useState<string>("Free Tier");
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
    const [upgradeSuccess, setUpgradeSuccess] = useState(false);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    // Razorpay Checkout Payment States
    const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<"idle" | "requesting" | "verifying" | "success" | "error">("idle");
    const [txDetails, setTxDetails] = useState<{ txId: string; refNo: string; date: string; amount: number } | null>(null);

    // Utility getter to display "Elite Plan" for legacy Enterprise tiers
    const getPlanDisplay = (plan: string) => {
        if (plan === "Enterprise Tier" || plan === "Enterprise Plan") return "Elite Plan";
        return plan;
    };

    // Sync profile helper
    const syncProfileToCloud = async (fieldsToUpdate: any) => {
        const identifier = getStorageItem("userIdentifier") || userIdentifier;
        if (!identifier) return;
        try {
            const res = await fetch("/api/auth/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, ...fieldsToUpdate })
            });
            if (!res.ok) {
                console.warn("Cloud sync: profile save returned non-200 status.");
            }
        } catch (err) {
            console.warn("Cloud sync offline or connection missing:", err);
        }
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem("globalTheme") as any;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
            document.documentElement.style.colorScheme = savedTheme === "eyeprotect" ? "light" : savedTheme;
        }
        setIsRealisticMode(getStorageItem("globalInterviewMode") === "realistic");

        if (getStorageItem("userLoggedIn") !== "true") {
            router.push("/login");
            return;
        }

        const exactUser = getStorageItem("userName") || "Guest";
        const identifier = getStorageItem("userIdentifier") || "";
        setUserName(exactUser);
        setEditNameValue(exactUser);
        setUserIdentifier(identifier);

        const storedPhoto = getStorageItem("userProfilePhoto") || "";
        setProfilePhoto(storedPhoto);

        const storedAdditionalEmail = getStorageItem("userAdditionalEmail") || "";
        setAdditionalEmail(storedAdditionalEmail);
        setEditAdditionalEmailValue(storedAdditionalEmail);

        const storedPlan = getStorageItem("userSubscriptionPlan") || "Free Tier";
        setSubscriptionPlan(storedPlan);

        const storedGithub = getStorageItem("userGithub") || "";
        const storedLinkedin = getStorageItem("userLinkedin") || "";
        const storedPortfolio = getStorageItem("userPortfolio") || "";
        setGithub(storedGithub);
        setLinkedin(storedLinkedin);
        setPortfolioUrl(storedPortfolio);
        setEditGithubValue(storedGithub);
        setEditLinkedinValue(storedLinkedin);
        setEditPortfolioValue(storedPortfolio);

        const storedResumeCvName = getStorageItem("userResumeCvName") || "";
        const storedResumeCvText = getStorageItem("userResumeCvText") || "";
        setResumeCvName(storedResumeCvName);
        setResumeCvText(storedResumeCvText);

        const storedPhone = getStorageItem("userPhone") || "";
        setPhone(storedPhone);
        setEditPhoneValue(storedPhone);

        try {
            const storedEdu = JSON.parse(getStorageItem("userEducationData") || "{}");
            setEdu10thInstitution(storedEdu.tenth?.institution || "");
            setEdu10thBoard(storedEdu.tenth?.board || "");
            setEdu10thMarks(storedEdu.tenth?.marks || "");
            setEdu12thInstitution(storedEdu.twelfth?.institution || "");
            setEdu12thBoard(storedEdu.twelfth?.board || "");
            setEdu12thMarks(storedEdu.twelfth?.marks || "");
            setEduUGInstitution(storedEdu.ug?.institution || "");
            setEduUGCourse(storedEdu.ug?.course || "");
            setEduUGMarks(storedEdu.ug?.marks || "");
            setEduPGInstitution(storedEdu.pg?.institution || "");
            setEduPGCourse(storedEdu.pg?.course || "");
            setEduPGMarks(storedEdu.pg?.marks || "");
        } catch { /* ignore */ }

        // Fetch user document from cloud database on load
        const fetchCloudProfile = async (id: string) => {
            try {
                const res = await fetch(`/api/auth/profile?identifier=${encodeURIComponent(id)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        const u = data.user;
                        setUserName(u.displayName);
                        setEditNameValue(u.displayName);
                        setStorageItem("userName", u.displayName);

                        if (u.profilePhotoUrl || u.profilePhoto) {
                            const photo = u.profilePhotoUrl || u.profilePhoto;
                            setProfilePhoto(photo);
                            setStorageItem("userProfilePhoto", photo);
                        }
                        if (u.additionalEmail) {
                            setAdditionalEmail(u.additionalEmail);
                            setEditAdditionalEmailValue(u.additionalEmail);
                            setStorageItem("userAdditionalEmail", u.additionalEmail);
                        }
                        if (u.subscriptionPlan) {
                            setSubscriptionPlan(u.subscriptionPlan);
                            setStorageItem("userSubscriptionPlan", u.subscriptionPlan);
                        }
                        if (u.github) {
                            setGithub(u.github);
                            setEditGithubValue(u.github);
                            setStorageItem("userGithub", u.github);
                        }
                        if (u.linkedin) {
                            setLinkedin(u.linkedin);
                            setEditLinkedinValue(u.linkedin);
                            setStorageItem("userLinkedin", u.linkedin);
                        }
                        if (u.portfolioUrl) {
                            setPortfolioUrl(u.portfolioUrl);
                            setEditPortfolioValue(u.portfolioUrl);
                            setStorageItem("userPortfolio", u.portfolioUrl);
                        }
                        if (u.resumeCvName) {
                            setResumeCvName(u.resumeCvName);
                            setStorageItem("userResumeCvName", u.resumeCvName);
                        }
                        if (u.resumeCvText) {
                            setResumeCvText(u.resumeCvText);
                            setStorageItem("userResumeCvText", u.resumeCvText);
                        }
                        if (u.phone) {
                            setPhone(u.phone);
                            setEditPhoneValue(u.phone);
                            setStorageItem("userPhone", u.phone);
                        }
                        if (u.educationData) {
                            setStorageItem("userEducationData", JSON.stringify(u.educationData));
                            setEdu10thInstitution(u.educationData.tenth?.institution || "");
                            setEdu10thBoard(u.educationData.tenth?.board || "");
                            setEdu10thMarks(u.educationData.tenth?.marks || "");
                            setEdu12thInstitution(u.educationData.twelfth?.institution || "");
                            setEdu12thBoard(u.educationData.twelfth?.board || "");
                            setEdu12thMarks(u.educationData.twelfth?.marks || "");
                            setEduUGInstitution(u.educationData.ug?.institution || "");
                            setEduUGCourse(u.educationData.ug?.course || "");
                            setEduUGMarks(u.educationData.ug?.marks || "");
                            setEduPGInstitution(u.educationData.pg?.institution || "");
                            setEduPGCourse(u.educationData.pg?.course || "");
                            setEduPGMarks(u.educationData.pg?.marks || "");
                        }
                        if (u.createdAt) {
                            setMemberSince(new Date(u.createdAt).toLocaleDateString());
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not sync profile with Cloud database, offline or connection error:", err);
            }
        };

        if (identifier) {
            fetchCloudProfile(identifier);
        }

        if (!memberSince) setMemberSince(new Date().toLocaleDateString());

        const hydrateSessions = async () => {
            if (identifier) {
                await pullSessionsFromCloud();
            }
            loadSessions(exactUser);
        };
        void hydrateSessions();
    }, [router]);

    // Dynamically load Razorpay script on mount
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Reset payment states when subscription modal closes
    useEffect(() => {
        if (!subModalOpen) {
            setSelectedPlanForPayment(null);
            setPaymentStatus("idle");
        }
    }, [subModalOpen]);

    const loadSessions = (exactUser: string) => {
        const stored = getStorageItem("interviewSessions");
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const currentIdentifier = getStorageItem("userIdentifier") || "";

            const userSessions = parsed.filter((s: any) => {
                // Time gate: only last year
                if (now - s.timestamp >= ONE_YEAR_MS) return false;
                // No owner tag = old guest session, show to current user
                if (!s.userName && !s.userIdentifier) return true;
                // Match by stable identifier first (immune to display name changes)
                if (currentIdentifier && s.userIdentifier === currentIdentifier) return true;
                // Fallback: match by userName (covers Google login and legacy sessions)
                if (s.userName === exactUser) return true;
                // Also match old sessions saved with identifier as userName (before displayName was added)
                if (currentIdentifier && s.userName === currentIdentifier) return true;
                return false;
            });

            userSessions.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setSessions(userSessions);
        } catch (e) {
            console.error("Failed parsing profile history", e);
        }
    };

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
        document.documentElement.style.colorScheme = nextTheme === "eyeprotect" ? "light" : nextTheme;
    };

    const handleLogout = async () => {
        try {
            const role = getStorageItem("userRole");
            const identifier = getStorageItem("userIdentifier");
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
        removeStorageItem("userLoggedIn");
        removeStorageItem("userName");
        removeStorageItem("userIdentifier");
        removeStorageItem("userType");
        removeStorageItem("userRole");
        router.push("/");
    };

    const initiatePayment = async (planName: string) => {
        try {
            if (!(window as any).Razorpay) {
                alert("Razorpay payment SDK failed to load. Please check your internet connection.");
                return;
            }

            setSelectedPlanForPayment(planName);
            setPaymentStatus("requesting");

            const identifier = getStorageItem("userIdentifier") || userIdentifier;
            const res = await fetch("/api/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planName,
                    billingCycle,
                    userIdentifier: identifier
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to initiate payment order.");
            }

            const orderData = await res.json();
            
            // Set transaction details for invoice display
            const calculatedAmount = orderData.amount / 100;
            const txId = orderData.orderId;
            const refNo = "RZP" + Math.floor(100000000000 + Math.random() * 900000000000);
            const dateStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
            
            setTxDetails({
                txId,
                refNo,
                date: dateStr,
                amount: calculatedAmount
            });

            setPaymentStatus("idle");

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
                amount: orderData.amount,
                currency: orderData.currency,
                name: "ProInterview",
                description: `Upgrade to ${planName} (${billingCycle})`,
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    try {
                        setPaymentStatus("verifying");

                        const verifyRes = await fetch("/api/razorpay/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                planName,
                                userIdentifier: identifier
                            })
                        });

                        if (!verifyRes.ok) {
                            const verifyErr = await verifyRes.json();
                            throw new Error(verifyErr.error || "Payment verification failed.");
                        }

                        const verifyData = await verifyRes.json();
                        const finalPlan = verifyData.subscriptionPlan;

                        setStorageItem("userSubscriptionPlan", finalPlan);
                        setSubscriptionPlan(finalPlan);
                        setPaymentStatus("success");
                    } catch (err: any) {
                        console.error("Signature verification error:", err);
                        setPaymentStatus("error");
                    }
                },
                prefill: {
                    name: userName || "",
                    email: identifier || "",
                },
                theme: {
                    color: "#4f46e5"
                },
                modal: {
                    ondismiss: function () {
                        setPaymentStatus("idle");
                        setSelectedPlanForPayment(null);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error: any) {
            console.error("Razorpay initiation failed:", error);
            setPaymentStatus("error");
        }
    };

    const downloadReceipt = () => {
        if (!txDetails || !selectedPlanForPayment) return;
        const receiptText = `
========================================
       PROINTERVIEW SUBSCRIPTION
           RAZORPAY RECEIPT
========================================
Date: ${txDetails.date}
Merchant: ProInterview Inc. (Razorpay Certified)
Plan: ${selectedPlanForPayment} (${billingCycle})
Amount Paid: INR ${txDetails.amount}.00
Payment Channel: Razorpay Secure checkout
Order ID: ${txDetails.txId}
Receipt Reference: ${txDetails.refNo}
Status: VERIFIED / SETTLED / SUCCESSFUL
========================================
Thank you for subscribing!
You have been successfully upgraded to ${selectedPlanForPayment}.
`;
        const blob = new Blob([receiptText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Receipt_${selectedPlanForPayment.replace(/\s+/g, "_")}_${txDetails.txId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getPlanTier = (plan: string) => {
        if (plan === "Pro Plan") return 1;
        if (plan === "Elite Plan" || plan === "Enterprise Plan" || plan === "Enterprise Tier") return 2;
        return 0; // Free Tier
    };

    const handleUpgradePlan = async (planName: string) => {
        const currentTier = getPlanTier(subscriptionPlan);
        const targetTier = getPlanTier(planName);

        if (targetTier < currentTier) {
            alert("Downgrades are not allowed. You can only upgrade to a higher tier plan.");
            return;
        }

        if (planName === "Free Tier") {
            setUpgradingPlan(planName);
            setUpgradeSuccess(false);

            await new Promise(resolve => setTimeout(resolve, 1000));
            setUpgradeSuccess(true);

            setStorageItem("userSubscriptionPlan", "Free Tier");
            setSubscriptionPlan("Free Tier");
            syncProfileToCloud({ subscriptionPlan: "Free Tier" });

            await new Promise(resolve => setTimeout(resolve, 1000));
            setUpgradingPlan(null);
            setUpgradeSuccess(false);
            setSubModalOpen(false);
        } else {
            initiatePayment(planName);
        }
    };

    const saveName = () => {
        const trimmed = editNameValue.trim();
        if (!trimmed) return;
        setStorageItem("userName", trimmed);
        syncProfileToCloud({ displayName: trimmed });
        setUserName(trimmed);
        setEditingName(false);
        loadSessions(trimmed);
    };

    const saveGithub = () => {
        const trimmed = editGithubValue.trim();
        setStorageItem("userGithub", trimmed);
        syncProfileToCloud({ github: trimmed });
        setGithub(trimmed);
        setEditingGithub(false);
    };

    const saveLinkedin = () => {
        const trimmed = editLinkedinValue.trim();
        setStorageItem("userLinkedin", trimmed);
        syncProfileToCloud({ linkedin: trimmed });
        setLinkedin(trimmed);
        setEditingLinkedin(false);
    };

    const savePortfolio = () => {
        const trimmed = editPortfolioValue.trim();
        setStorageItem("userPortfolio", trimmed);
        syncProfileToCloud({ portfolioUrl: trimmed });
        setPortfolioUrl(trimmed);
        setEditingPortfolio(false);
    };

    const savePhone = () => {
        const trimmed = editPhoneValue.trim();
        setStorageItem("userPhone", trimmed);
        syncProfileToCloud({ phone: trimmed });
        setPhone(trimmed);
        setEditingPhone(false);
    };

    const saveAdditionalEmail = () => {
        const trimmed = editAdditionalEmailValue.trim();
        setStorageItem("userAdditionalEmail", trimmed);
        syncProfileToCloud({ additionalEmail: trimmed });
        setAdditionalEmail(trimmed);
        setEditingAdditionalEmail(false);
    };

    const saveEducationData = () => {
        const eduObj = {
            tenth: { institution: edu10thInstitution.trim(), board: edu10thBoard.trim(), marks: edu10thMarks.trim() },
            twelfth: { institution: edu12thInstitution.trim(), board: edu12thBoard.trim(), marks: edu12thMarks.trim() },
            ug: { institution: eduUGInstitution.trim(), course: eduUGCourse.trim(), marks: eduUGMarks.trim() },
            pg: { institution: eduPGInstitution.trim(), course: eduPGCourse.trim(), marks: eduPGMarks.trim() }
        };
        setStorageItem("userEducationData", JSON.stringify(eduObj));
        syncProfileToCloud({ educationData: eduObj });

        // Also build a plain-text summary for the resume builder
        const lines: string[] = [];
        if (eduObj.tenth.institution || eduObj.tenth.marks)
            lines.push(`10th — ${eduObj.tenth.institution || "N/A"}${eduObj.tenth.board ? " (" + eduObj.tenth.board + ")" : ""} | ${eduObj.tenth.marks || "N/A"}`);
        if (eduObj.twelfth.institution || eduObj.twelfth.marks)
            lines.push(`12th — ${eduObj.twelfth.institution || "N/A"}${eduObj.twelfth.board ? " (" + eduObj.twelfth.board + ")" : ""} | ${eduObj.twelfth.marks || "N/A"}`);
        if (eduObj.ug.institution || eduObj.ug.marks)
            lines.push(`UG — ${eduObj.ug.course || "Degree"}, ${eduObj.ug.institution || "N/A"} | ${eduObj.ug.marks || "N/A"}`);
        if (eduObj.pg.institution || eduObj.pg.marks)
            lines.push(`PG — ${eduObj.pg.course || "Degree"}, ${eduObj.pg.institution || "N/A"} | ${eduObj.pg.marks || "N/A"}`);
        setStorageItem("userEducation", lines.join("\n"));
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        setConfirmError("");
        await new Promise(resolve => setTimeout(resolve, 800));

        const identifier = getStorageItem("userIdentifier") || userIdentifier;
        const role = getStorageItem("userRole") || "user";
        try {
            if (identifier) {
                const res = await fetch("/api/auth/profile", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        identifier,
                        accountType: role,
                        mode: deleteConfirmMode,
                        password: confirmPassword,
                    }),
                });
                const result = await res.json();
                
                if (!res.ok) {
                    setConfirmError(result.error || "Failed to confirm request.");
                    setIsDeleting(false);
                    return;
                }
            }
        } catch (err) {
            console.warn("Could not delete Cloud profile:", err);
            setConfirmError("An error occurred. Please verify your connection.");
            setIsDeleting(false);
            return;
        }

        if (deleteConfirmMode === "data_only") {
            // Wipe generated inputs and browser keys
            removeStorageItem("proResumeState");
            removeStorageItem("userEducationData");
            removeStorageItem("userResumeCvName");
            removeStorageItem("userResumeCvText");
            removeStorageItem("userProfilePhoto");
            removeStorageItem("userGithub");
            removeStorageItem("userLinkedin");
            removeStorageItem("userPortfolio");
            removeStorageItem("userPhone");
            removeStorageItem("userAdditionalEmail");

            setProfilePhoto("");
            setAdditionalEmail("");
            setGithub("");
            setLinkedin("");
            setPortfolioUrl("");
            setResumeCvName("");
            setResumeCvText("");
            setPhone("");
            
            setEdu10thInstitution("");
            setEdu10thBoard("");
            setEdu10thMarks("");
            setEdu12thInstitution("");
            setEdu12thBoard("");
            setEdu12thMarks("");
            setEduUGInstitution("");
            setEduUGCourse("");
            setEduUGMarks("");
            setEduPGInstitution("");
            setEduPGCourse("");
            setEduPGMarks("");

            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setConfirmPassword("");
            setToast({ show: true, message: "All your profile details and generated resume configurations have been wiped successfully!", type: "success" });
            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 4000);
        } else {
            // Complete account removal
            if (identifier) {
                clearUserScopedData(identifier);
            }

            removeStorageItem("userLoggedIn");
            removeStorageItem("userName");
            removeStorageItem("userIdentifier");
            removeStorageItem("userType");
            removeStorageItem("userRole");

            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setConfirmPassword("");
            router.push("/");
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const triggerResumeFileInput = () => {
        resumeFileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Image file size should be less than 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setTempImageSrc(base64String);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleResumeCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        const allowedTypes = [
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        const allowedExtensions = [".pdf", ".txt", ".doc", ".docx"];
        const name = file.name.toLowerCase();
        const isAllowed = allowedTypes.includes(file.type) || allowedExtensions.some(ext => name.endsWith(ext));

        if (!isAllowed) {
            alert("Please upload a PDF, TXT, DOC, or DOCX resume/CV file.");
            return;
        }

        setResumeCvUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("storeInS3", "1");

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to upload resume/CV");
            }

            const stored = Array.isArray(data.stored) ? data.stored[0] : undefined;
            setResumeCvName(file.name);
            setResumeCvText(data.text || "");
            setStorageItem("userResumeCvName", file.name);
            setStorageItem("userResumeCvText", data.text || "");
            syncProfileToCloud({
                resumeCvName: file.name,
                resumeCvText: data.text || "",
                ...(stored?.key ? { resumeCvKey: stored.key, resumeCvUrl: stored.url } : {}),
            });
        } catch (error) {
            console.error("Resume/CV upload failed:", error);
            alert((error as Error).message || "Failed to upload resume/CV.");
        } finally {
            setResumeCvUploading(false);
        }
    };

    const handleCropSave = async (base64String: string) => {
        setStorageItem("userProfilePhoto", base64String);
        setProfilePhoto(base64String);
        setCropModalOpen(false);
        setTempImageSrc("");

        try {
            const file = dataUrlToFile(base64String, "profile-photo.png");
            const s3 = await uploadFileToS3(file, "profile-photos");
            if (s3) {
                setProfilePhoto(s3.publicUrl);
                setStorageItem("userProfilePhoto", s3.publicUrl);
                syncProfileToCloud({
                    profilePhoto: s3.publicUrl,
                    profilePhotoKey: s3.key,
                    profilePhotoUrl: s3.publicUrl,
                });
                return;
            }
        } catch (err) {
            console.warn("S3 profile photo upload failed; saving base64 fallback", err);
        }
        syncProfileToCloud({ profilePhoto: base64String });
    };

    const handleRemoveResumeCv = () => {
        removeStorageItem("userResumeCvName");
        removeStorageItem("userResumeCvText");
        syncProfileToCloud({
            resumeCvName: "",
            resumeCvText: "",
            resumeCvKey: "",
            resumeCvUrl: "",
        });
        setResumeCvName("");
        setResumeCvText("");
    };

    const toggleSelect = (idx: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sessions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sessions.map((_, i) => i)));
        }
    };

    const deleteSelected = () => {
        const stored = getStorageItem("interviewSessions");
        if (!stored) return;
        try {
            const allSessions: any[] = JSON.parse(stored);
            const toDelete = new Set(selectedIds.size > 0
                ? Array.from(selectedIds).map(i => sessions[i]?.timestamp)
                : []
            );
            const remaining = allSessions.filter(s => !toDelete.has(s.timestamp));
            setStorageItem("interviewSessions", JSON.stringify(remaining));
            setSelectedIds(new Set());
            loadSessions(userName);
            void syncSessionsToCloud();
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const shareSessionScorecard = async (session: any) => {
        try {
            const res = await fetch("/api/scorecard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateName: session.userName || userName || "Candidate",
                    company: session.company || "",
                    role: session.role || "",
                    finalScore: session.finalScore,
                    technicalRating: session.technicalRating,
                    behavioralRating: session.behavioralRating,
                    communicationRating: session.communicationRating,
                    portfolioRating: session.portfolioRating,
                    summary: session.summary || "",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Share failed");
            const url = data.url?.startsWith("http")
                ? data.url
                : `${window.location.origin}${data.url || `/scorecard/${data.shareId}`}`;
            try {
                await navigator.clipboard.writeText(url);
            } catch { /* ignore */ }
            setToast({ show: true, message: `Scorecard link copied: ${url}`, type: "success" });
            setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
        } catch (e) {
            setToast({ show: true, message: (e as Error).message || "Failed to share scorecard", type: "error" });
            setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
        }
    };

    const toggleExpand = (idx: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const downloadTranscript = (text: string, date: number) => {
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Interview_${new Date(date).toLocaleDateString().replace(/\//g, "-")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const fetchGuidance = async () => {
        if (sessions.length === 0) return;
        setLoadingGuidance(true);
        setGuidanceOpen(true);
        setGuidance("");
        try {
            const res = await fetch("/api/profile-guidance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessions })
            });
            const data = await res.json();
            setGuidance(data.guidance || "Could not generate guidance at this time.");
        } catch {
            setGuidance("Failed to fetch guidance. Please check your connection.");
        }
        setLoadingGuidance(false);
    };

    // Weighted avg: linear decay over 1 year
    const avgScore = (() => {
        if (sessions.length === 0) return 0;
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let weightedSum = 0, totalWeight = 0;
        sessions.forEach((s: any) => {
            const ageMs = now - s.timestamp;
            const weight = Math.max(0, 1 - ageMs / ONE_YEAR_MS);
            weightedSum += (s.finalScore || 0) * weight;
            totalWeight += weight;
        });
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    })();

    const totalInterviews = sessions.length;
    const benchmark = avgScore >= 80 ? "Top Tier Candidate" : avgScore >= 60 ? "Proficient" : avgScore > 0 ? "Needs Improvement" : "No Data Yet";
    const benchmarkColor = avgScore >= 80 ? "text-green-400" : avgScore >= 60 ? "text-yellow-400" : avgScore > 0 ? "text-red-400" : "text-white/40";

    // Profile completion percentage
    const profileCompletionFields = [
        { filled: !!userName && userName !== "Guest" },
        { filled: !!userIdentifier },
        { filled: !!phone },
        { filled: !!github },
        { filled: !!linkedin },
        { filled: !!portfolioUrl },
        { filled: !!(edu10thInstitution || edu10thBoard || edu10thMarks) },
        { filled: !!(edu12thInstitution || edu12thBoard || edu12thMarks) },
        { filled: !!(eduUGInstitution || eduUGCourse || eduUGMarks) },
        { filled: !!(eduPGInstitution || eduPGCourse || eduPGMarks) },
    ];
    const profileFilledCount = profileCompletionFields.filter(f => f.filled).length;
    const profileCompletionPct = Math.round((profileFilledCount / profileCompletionFields.length) * 100);
    const completionColor = profileCompletionPct >= 80 ? "#22c55e" : profileCompletionPct >= 50 ? "#eab308" : profileCompletionPct >= 20 ? "#f97316" : "#ef4444";
    const circleRadius = 46;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const circleOffset = circleCircumference - (profileCompletionPct / 100) * circleCircumference;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <header className="px-4 sm:px-8 py-4 sm:py-5 flex flex-row items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#050505]/80 gap-3">
                <BrandLogo />
                <div className="flex items-center gap-2 sm:gap-4">
                    <button 
                        onClick={toggleMode}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] sm:text-xs font-medium transition-all shrink-0 ${isRealisticMode ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]'}`}
                    >
                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isRealisticMode ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></span>
                        {isRealisticMode ? 'Realistic Mode' : 'Practice Mode'}
                    </button>

                    {/* Theme Toggle Button */}
                    <button 
                        onClick={cycleTheme}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer w-8 h-8 sm:w-9 sm:h-9"
                        title={`Current Theme: ${theme}. Click to switch.`}
                    >
                        {theme === "dark" && <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {theme === "light" && <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {theme === "eyeprotect" && <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
                    </button>
                    <Link href="/" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Home</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 relative z-10">

                {/* Profile Header */}
                <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between shadow-[0_0_50px_rgba(0,0,0,0.5)] gap-6">
                    <div className="flex items-center gap-6 mb-4 md:mb-0">
                        {/* Circular Avatar with SVG completion ring & Dropdown Menu */}
                        <div className="relative">
                            <svg width="96" height="96" className="absolute -top-2 -left-2 pointer-events-none" viewBox="0 0 100 100">
                                {/* Background track */}
                                <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                                {/* Progress arc */}
                                <circle
                                    cx="50" cy="50" r={circleRadius}
                                    fill="none"
                                    stroke={completionColor}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={circleCircumference}
                                    strokeDashoffset={circleOffset}
                                    transform="rotate(-90 50 50)"
                                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                                />
                            </svg>
                            <div 
                                onClick={() => setPhotoMenuOpen(!photoMenuOpen)} 
                                className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden relative group cursor-pointer border border-white/10"
                                title="Profile photo options"
                            >
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-extrabold text-white">{userName.charAt(0).toUpperCase()}</span>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                    <Camera className="w-5 h-5 text-white/80" />
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handlePhotoChange} 
                                className="hidden" 
                                accept="image/*" 
                            />
                            <input
                                type="file"
                                ref={resumeFileInputRef}
                                onChange={handleResumeCvChange}
                                className="hidden"
                                accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            />
                            {photoMenuOpen && (
                                <>
                                    <div className="fixed top-0 left-0 w-full h-full z-40" onClick={() => setPhotoMenuOpen(false)} />
                                    <div className="absolute top-[110%] left-1/2 -translate-x-1/2 bg-[#16161a] border border-white/10 rounded-xl shadow-2xl p-1 z-50 w-48 flex flex-col gap-0.5 overflow-hidden">
                                        <button
                                            type="button"
                                            disabled={!profilePhoto}
                                            onClick={() => { setViewPhotoOpen(true); setPhotoMenuOpen(false); }}
                                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg flex items-center gap-2 transition-colors text-white/80"
                                        >
                                            <User className="w-3.5 h-3.5" /> View Photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { triggerFileInput(); setPhotoMenuOpen(false); }}
                                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors text-white/80"
                                        >
                                            <Camera className="w-3.5 h-3.5" /> Add New Photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { triggerResumeFileInput(); setPhotoMenuOpen(false); }}
                                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors text-white/80"
                                        >
                                            <FileText className="w-3.5 h-3.5" /> Upload Resume / CV
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!profilePhoto}
                                            onClick={() => {
                                                removeStorageItem("userProfilePhoto");
                                                setProfilePhoto("");
                                                setPhotoMenuOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-red-500/10 text-red-400 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
                                {userName}
                                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">Verified</span>
                            </h1>
                            <p className="text-white/50 flex items-center gap-2 text-sm mb-1.5">
                                <User className="w-4 h-4" /> {totalInterviews} interview{totalInterviews !== 1 ? "s" : ""} on record
                            </p>
                            <div className="flex items-center">
                                <span 
                                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider"
                                    style={{ backgroundColor: `${completionColor}15`, color: completionColor, borderColor: `${completionColor}35` }}
                                >
                                    {profileCompletionPct}% Profile Strength
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Subscription section in between */}
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl md:ml-auto w-full md:w-auto justify-between md:justify-start">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Subscription</span>
                            <span className="text-sm font-extrabold text-indigo-400 flex items-center gap-1.5 mt-0.5">
                                <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                                {getPlanDisplay(subscriptionPlan)}
                            </span>
                        </div>
                        <button
                            onClick={() => setSubModalOpen(true)}
                            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 transition-all text-xs font-bold px-4 py-2 rounded-xl"
                        >
                            Manage Plan
                        </button>
                    </div>

                    <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-6 py-3 rounded-xl transition-colors font-bold whitespace-nowrap w-full md:w-auto justify-center">
                        <LogOut className="w-4 h-4" /> Log Out
                    </button>
                </div>

                {/* Compact collapsible Account Details */}
                <div className="mb-8 bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setAccountDetailsOpen(o => !o)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3 text-sm font-semibold text-white/70">
                            <User className="w-4 h-4 text-indigo-400" />
                            Account Details
                        </div>
                        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${accountDetailsOpen ? "rotate-180" : ""}`} />
                    </button>

                    {accountDetailsOpen && (
                        <div className="border-t border-white/10 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Editable Display Name row */}
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">Display Name</span>
                                {editingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editNameValue}
                                            onChange={e => setEditNameValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setEditNameValue(userName); } }}
                                            className="flex-1 bg-black/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <button onClick={saveName} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-colors" title="Save">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setEditingName(false); setEditNameValue(userName); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" title="Cancel">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span className="text-sm font-semibold text-white/80">{userName}</span>
                                        <button
                                            onClick={() => { setEditingName(true); setEditNameValue(userName); }}
                                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 flex items-center justify-center transition-all"
                                            title="Edit name"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Static detail rows */}
                            {[
                                { label: "Account ID", value: userIdentifier || "Google / Guest" },
                                { label: "Member Since", value: memberSince || new Date().toLocaleDateString() },
                                { label: "Login Method", value: userIdentifier?.includes("@") ? "Email" : userIdentifier?.startsWith("+") ? "Phone" : "Google" },
                                { label: "Total Sessions", value: `${totalInterviews} interview${totalInterviews !== 1 ? "s" : ""}` },
                                { label: "Weighted Avg Score", value: `${avgScore} / 100` },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-0.5">{item.label}</span>
                                    <span className="text-sm font-semibold text-white/80 truncate">{item.value}</span>
                                </div>
                            ))}

                            <div className="flex flex-col sm:col-span-2">
                                <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">Resume / CV</span>
                                {resumeCvName ? (
                                    <div className="flex items-center gap-2 justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white/80 truncate">{resumeCvName}</p>
                                            <p className="text-[11px] text-white/40">Uploaded resume/CV is saved to your account</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={triggerResumeFileInput}
                                                disabled={resumeCvUploading}
                                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 disabled:opacity-50"
                                            >
                                                {resumeCvUploading ? "Uploading..." : "Replace"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveResumeCv}
                                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-red-400 border border-white/10"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={triggerResumeFileInput}
                                        disabled={resumeCvUploading}
                                        className="w-full flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 rounded-lg px-3 py-3 text-left transition-colors disabled:opacity-50"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white/80">Upload Resume / CV</p>
                                            <p className="text-[11px] text-white/40">PDF, TXT, DOC, or DOCX</p>
                                        </div>
                                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                    </button>
                                )}
                                {resumeCvText ? (
                                    <p className="mt-1 text-[11px] text-white/40 line-clamp-1">Stored extracted text is available for future interview setup.</p>
                                ) : null}
                            </div>

                            {/* Editable GitHub Profile row */}
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">GitHub Profile</span>
                                {editingGithub ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="url"
                                            value={editGithubValue}
                                            onChange={e => setEditGithubValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") saveGithub(); if (e.key === "Escape") { setEditingGithub(false); setEditGithubValue(github); } }}
                                            placeholder="https://github.com/username"
                                            className="flex-1 bg-black/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <button onClick={saveGithub} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-colors" title="Save">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setEditingGithub(false); setEditGithubValue(github); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" title="Cancel">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span className="text-sm font-semibold text-white/80 truncate max-w-xs">{github || "Not specified"}</span>
                                        <button
                                            onClick={() => { setEditingGithub(true); setEditGithubValue(github); }}
                                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 flex items-center justify-center transition-all"
                                            title="Edit GitHub URL"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editable LinkedIn Profile row */}
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">LinkedIn Profile</span>
                                {editingLinkedin ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="url"
                                            value={editLinkedinValue}
                                            onChange={e => setEditLinkedinValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") saveLinkedin(); if (e.key === "Escape") { setEditingLinkedin(false); setEditLinkedinValue(linkedin); } }}
                                            placeholder="https://linkedin.com/in/username"
                                            className="flex-1 bg-black/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <button onClick={saveLinkedin} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-colors" title="Save">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setEditingLinkedin(false); setEditLinkedinValue(linkedin); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" title="Cancel">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span className="text-sm font-semibold text-white/80 truncate max-w-xs">{linkedin || "Not specified"}</span>
                                        <button
                                            onClick={() => { setEditingLinkedin(true); setEditLinkedinValue(linkedin); }}
                                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 flex items-center justify-center transition-all"
                                            title="Edit LinkedIn URL"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editable Portfolio row */}
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">Portfolio Website</span>
                                {editingPortfolio ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="url"
                                            value={editPortfolioValue}
                                            onChange={e => setEditPortfolioValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") savePortfolio(); if (e.key === "Escape") { setEditingPortfolio(false); setEditPortfolioValue(portfolioUrl); } }}
                                            placeholder="https://myportfolio.com"
                                            className="flex-1 bg-black/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <button onClick={savePortfolio} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-colors" title="Save">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setEditingPortfolio(false); setEditPortfolioValue(portfolioUrl); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" title="Cancel">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span className="text-sm font-semibold text-white/80 truncate max-w-xs">{portfolioUrl || "Not specified"}</span>
                                        <button
                                            onClick={() => { setEditingPortfolio(true); setEditPortfolioValue(portfolioUrl); }}
                                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 flex items-center justify-center transition-all"
                                            title="Edit Portfolio URL"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editable Contact Number row */}
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">Contact Number</span>
                                {editingPhone ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editPhoneValue}
                                            onChange={e => setEditPhoneValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") { setEditingPhone(false); setEditPhoneValue(phone); } }}
                                            placeholder="e.g. +1 555-0199"
                                            className="flex-1 bg-black/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <button onClick={savePhone} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-colors" title="Save">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setEditingPhone(false); setEditPhoneValue(phone); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" title="Cancel">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span className="text-sm font-semibold text-white/80 truncate max-w-xs">{phone || "Not specified"}</span>
                                        <button
                                            onClick={() => { setEditingPhone(true); setEditPhoneValue(phone); }}
                                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 flex items-center justify-center transition-all"
                                            title="Edit Phone"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editable Additional Email row (Only if logged in with Phone) */}
                            {userIdentifier?.startsWith("+") && (
                                <div className="flex flex-col">
                                    <span className="text-xs text-indigo-400 uppercase tracking-wider font-bold mb-1">Email Address (Optional)</span>
                                    {editingAdditionalEmail ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                type="email"
                                                value={editAdditionalEmailValue}
                                                onChange={e => setEditAdditionalEmailValue(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") saveAdditionalEmail(); if (e.key === "Escape") { setEditingAdditionalEmail(false); setEditAdditionalEmailValue(additionalEmail); } }}
                                                placeholder="name@company.com"
                                                className="flex-1 bg-black/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                            />
                                            <button onClick={saveAdditionalEmail} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-colors" title="Save">
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => { setEditingAdditionalEmail(false); setEditAdditionalEmailValue(additionalEmail); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" title="Cancel">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <span className="text-sm font-semibold text-white/80 truncate max-w-xs">{additionalEmail || "Not specified"}</span>
                                            <button
                                                onClick={() => { setEditingAdditionalEmail(true); setEditAdditionalEmailValue(additionalEmail); }}
                                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 flex items-center justify-center transition-all"
                                                title="Edit Email"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Education Details — structured button + form */}
                            <div className="col-span-1 sm:col-span-2">
                                <button
                                    onClick={() => setEduOpen(o => !o)}
                                    className="w-full flex items-center justify-between bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-3 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <GraduationCap className="w-4.5 h-4.5 text-indigo-400" />
                                        <span className="text-sm font-bold text-white">Education Details</span>
                                        {(edu10thInstitution || edu12thInstitution || eduUGInstitution || eduPGInstitution) && (
                                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                                                {[edu10thInstitution, edu12thInstitution, eduUGInstitution, eduPGInstitution].filter(Boolean).length} Added
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${eduOpen ? "rotate-180" : ""}`} />
                                </button>

                                {eduOpen && (
                                    <div className="mt-3 space-y-5 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                        {/* 10th */}
                                        <div>
                                            <h5 className="text-xs font-extrabold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-black flex items-center justify-center">10</span>
                                                10th Standard / SSC
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    value={edu10thInstitution}
                                                    onChange={e => { setEdu10thInstitution(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="School name"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={edu10thBoard}
                                                    onChange={e => { setEdu10thBoard(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="Board (e.g. CBSE, ICSE, State)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={edu10thMarks}
                                                    onChange={e => { setEdu10thMarks(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="Marks / CGPA (e.g. 92%)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                            </div>
                                        </div>

                                        {/* 12th */}
                                        <div>
                                            <h5 className="text-xs font-extrabold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-black flex items-center justify-center">12</span>
                                                12th Standard / HSC
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    value={edu12thInstitution}
                                                    onChange={e => { setEdu12thInstitution(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="School / College name"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={edu12thBoard}
                                                    onChange={e => { setEdu12thBoard(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="Board (e.g. CBSE, ICSE, State)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={edu12thMarks}
                                                    onChange={e => { setEdu12thMarks(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="Marks / CGPA (e.g. 88%)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                            </div>
                                        </div>

                                        {/* UG */}
                                        <div>
                                            <h5 className="text-xs font-extrabold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <span className="w-5 h-5 rounded bg-teal-500/20 text-teal-400 text-[10px] font-black flex items-center justify-center">UG</span>
                                                Under Graduate (B.Tech / B.Sc / BCA etc.)
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    value={eduUGInstitution}
                                                    onChange={e => { setEduUGInstitution(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="College / University name"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={eduUGCourse}
                                                    onChange={e => { setEduUGCourse(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="Course (e.g. B.Tech CSE, BCA)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={eduUGMarks}
                                                    onChange={e => { setEduUGMarks(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="CGPA / Percentage (e.g. 8.5)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                            </div>
                                        </div>

                                        {/* PG */}
                                        <div>
                                            <h5 className="text-xs font-extrabold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <span className="w-5 h-5 rounded bg-pink-500/20 text-pink-400 text-[10px] font-black flex items-center justify-center">PG</span>
                                                Post Graduate (M.Tech / M.Sc / MCA etc.)
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    value={eduPGInstitution}
                                                    onChange={e => { setEduPGInstitution(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="College / University name"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={eduPGCourse}
                                                    onChange={e => { setEduPGCourse(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="Course (e.g. M.Tech AI, MCA)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={eduPGMarks}
                                                    onChange={e => { setEduPGMarks(e.target.value); }}
                                                    onBlur={saveEducationData}
                                                    placeholder="CGPA / Percentage (e.g. 9.0)"
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/25"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] text-white/30 italic">Changes auto-save when you click away</span>
                                            <button
                                                onClick={() => { saveEducationData(); setEduOpen(false); }}
                                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                            >
                                                <Check className="w-3 h-3" /> Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div className="border-t border-white/10 pt-6 mt-4 col-span-1 sm:col-span-2 flex flex-col items-stretch gap-4">
                                <p className="text-sm font-extrabold text-red-500 uppercase tracking-wider">Danger Zone</p>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-white/80">Wipe Generated Data</p>
                                        <p className="text-xs text-white/40">Erase all generated resume settings, educational details, social links, and uploaded files. Keep your account login credentials.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setDeleteConfirmMode('data_only'); setDeleteConfirmOpen(true); }}
                                        className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/20 hover:border-orange-600 px-5 py-2.5 rounded-xl transition-all font-bold text-xs shadow-lg shrink-0"
                                    >
                                        <X className="w-3.5 h-3.5" /> Wipe Generated Data
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/5 pt-4">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-white/80">Delete Account</p>
                                        <p className="text-xs text-white/40">Permanently delete your profile registration, login credentials, subscription plan, and all saved items forever.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setDeleteConfirmMode('account'); setDeleteConfirmOpen(true); }}
                                        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-red-600 px-5 py-2.5 rounded-xl transition-all font-bold text-xs shadow-lg shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#111] border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group shadow-[0_0_20px_rgba(79,70,229,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform"><Activity className="w-16 h-16" /></div>
                        <h3 className="text-indigo-400 font-bold mb-2 text-xs tracking-widest uppercase">Total Interviews</h3>
                        <p className="text-4xl font-black">{totalInterviews}</p>
                        <p className="text-xs text-white/30 mt-1">Last 12 months</p>
                    </div>
                    <div className="bg-[#111] border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group shadow-[0_0_20px_rgba(79,70,229,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform"><TrendingUp className="w-16 h-16" /></div>
                        <h3 className="text-indigo-400 font-bold mb-2 text-xs tracking-widest uppercase">Weighted Avg Score</h3>
                        <p className="text-4xl font-black">{avgScore} <span className="text-lg text-white/30 font-bold">/ 100</span></p>
                        <p className="text-xs text-white/30 mt-1">Recent sessions count more</p>
                    </div>
                    <div className="bg-[#111] border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group shadow-[0_0_20px_rgba(79,70,229,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform"><Award className="w-16 h-16" /></div>
                        <h3 className="text-indigo-400 font-bold mb-2 text-xs tracking-widest uppercase">Benchmark</h3>
                        <p className={`text-xl font-bold mt-1 ${benchmarkColor}`}>{benchmark}</p>
                        <p className="text-xs text-white/30 mt-1">Based on weighted performance</p>
                    </div>
                </div>

                {/* AI Guidance Panel */}
                <div className="mb-8 bg-[#111] border border-indigo-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(79,70,229,0.1)]">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">AI Career Coach</h2>
                                <p className="text-sm text-white/50">Get personalized guidance based on your interview history</p>
                            </div>
                        </div>
                        <button
                            onClick={guidanceOpen ? () => setGuidanceOpen(false) : fetchGuidance}
                            disabled={loadingGuidance || sessions.length === 0}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20"
                        >
                            {loadingGuidance ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : guidanceOpen ? "Close" : "Get My Plan"}
                        </button>
                    </div>

                    {guidanceOpen && (
                        <div className="border-t border-white/10 p-6">
                            {loadingGuidance ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-3 text-white/50">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                    <p className="text-sm">Analyzing your sessions and crafting your personalized plan...</p>
                                </div>
                            ) : (
                                <div className="prose prose-invert max-w-none">
                                    {guidance.split("\n").map((line, i) => {
                                        const isBold = /^\*\*.+\*\*/.test(line);
                                        const cleaned = line.replace(/\*\*/g, "").replace(/^#+\s*/, "");
                                        if (!cleaned.trim()) return <div key={i} className="h-2" />;
                                        if (isBold) return <p key={i} className="font-extrabold text-indigo-300 text-base mt-4 mb-1">{cleaned}</p>;
                                        if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="text-white/70 text-sm pl-4 before:content-['•'] before:text-indigo-400 before:mr-2">{cleaned.replace(/^[-•]\s*/, "")}</p>;
                                        return <p key={i} className="text-white/70 text-sm leading-relaxed">{cleaned}</p>;
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Session Logs Section */}
                <SessionHistoryPanel
                    sessions={sessions}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onToggleExpand={toggleExpand}
                    onDeleteSelected={deleteSelected}
                    onDownloadTranscript={downloadTranscript}
                    onShareScorecard={(session) => void shareSessionScorecard(session)}
                />
            </main>

            {/* Manage Subscription Plan Modal */}
            <AnimatePresence>
                {subModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-gradient-to-b from-[#16161a] to-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-[0_20px_50px_rgba(79,70,229,0.25)] relative overflow-y-auto max-h-[90vh] scrollbar-thin"
                        >
                            {/* Decorative background lights */}
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                            {/* Loading & Success States Overlays */}
                            <AnimatePresence>
                                {upgradingPlan && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center"
                                    >
                                        {upgradeSuccess ? (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Subscription Activated!</h3>
                                                <p className="text-sm text-white/50">Your profile has been successfully upgraded to the <b>{upgradingPlan}</b>.</p>
                                            </motion.div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                                                <h3 className="text-lg font-bold text-white mb-1">Securing Connection...</h3>
                                                <p className="text-sm text-white/50">Contacting billing server and updating subscription state...</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {selectedPlanForPayment ? (
                                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-stretch">
                                    {/* Left Column: Transaction details & Razorpay Status */}
                                    <div className="flex-1 flex flex-col justify-between border border-white/10 rounded-2xl bg-white/[0.01] p-5">
                                        <div>
                                            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                                                            Razorpay Secure Checkout
                                                        </h3>
                                                        <p className="text-[10px] text-white/40">Verified Payment Partner Gateway</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPlanForPayment(null);
                                                            setPaymentStatus("idle");
                                                        }}
                                                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 hover:bg-indigo-500/25 px-2.5 py-1 rounded-lg transition-all"
                                                    >
                                                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSubModalOpen(false);
                                                            setSelectedPlanForPayment(null);
                                                            setPaymentStatus("idle");
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                                                        title="Close"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
 
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-xs text-white/50">Subscription Plan</p>
                                                        <h4 className="text-lg font-black text-white">{selectedPlanForPayment === "Enterprise Plan" ? "Elite Plan" : selectedPlanForPayment}</h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-white/50">Total Amount ({billingCycle === "yearly" ? "Annually" : "Monthly"})</p>
                                                        <p className="text-xl font-black text-indigo-400">₹{txDetails?.amount}</p>
                                                        <p className="text-[10px] text-white/30">
                                                            {billingCycle === "yearly" ? "Equivalent to ₹999/mo (Pro) or ₹2,999/mo (Elite)" : "Monthly recurring billing"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="border-t border-white/5 pt-2 mt-2 flex justify-between text-[11px] text-white/40 font-mono">
                                                    <span>Order ID: {txDetails?.txId || "PENDING"}</span>
                                                    <span>Ref No: {txDetails?.refNo || "PENDING"}</span>
                                                </div>
                                            </div>
 
                                            {paymentStatus === "requesting" ? (
                                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-center my-6">
                                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-300">Contacting Payment Gateway...</p>
                                                        <p className="text-xs text-white/40 mt-1">Initializing secure order and opening Razorpay checkout widget.</p>
                                                    </div>
                                                </div>
                                            ) : paymentStatus === "verifying" ? (
                                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-center my-6">
                                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-300">Verifying Payment Signature...</p>
                                                        <p className="text-xs text-white/40 mt-1">Checking hash authenticity and updating user subscription status in database.</p>
                                                    </div>
                                                </div>
                                            ) : paymentStatus === "success" ? (
                                                <div className="space-y-4 py-2 flex-1 flex flex-col justify-center">
                                                    <div className="flex flex-col items-center text-center">
                                                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                                            <Check className="w-7 h-7" />
                                                        </div>
                                                        <h3 className="text-lg font-bold text-white mb-1">Razorpay Payment Success!</h3>
                                                        <p className="text-xs text-white/50 max-w-sm">
                                                            Your transaction has been settled. Your account has been upgraded to the <b>{selectedPlanForPayment === "Enterprise Plan" ? "Elite Plan" : selectedPlanForPayment}</b>.
                                                        </p>
                                                    </div>
 
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs space-y-2 font-mono">
                                                        <div className="flex justify-between"><span className="text-white/40">Plan:</span><span className="text-white">{selectedPlanForPayment === "Enterprise Plan" ? "Elite Plan" : selectedPlanForPayment}</span></div>
                                                        <div className="flex justify-between"><span className="text-white/40">Amount:</span><span className="text-white font-bold">₹{txDetails?.amount}.00</span></div>
                                                        <div className="flex justify-between"><span className="text-white/40">Order ID:</span><span className="text-white">{txDetails?.txId}</span></div>
                                                        <div className="flex justify-between"><span className="text-white/40">Reference Ref:</span><span className="text-white">{txDetails?.refNo}</span></div>
                                                        <div className="flex justify-between"><span className="text-white/40">Settle Date:</span><span className="text-white">{txDetails?.date}</span></div>
                                                    </div>
 
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={downloadReceipt}
                                                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> Download Receipt
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPlanForPayment(null);
                                                                setPaymentStatus("idle");
                                                                setSubModalOpen(false);
                                                            }}
                                                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors"
                                                        >
                                                            Start Practicing
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : paymentStatus === "error" ? (
                                                <div className="space-y-4 py-2 flex-1 flex flex-col justify-center text-center">
                                                    <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
                                                        <X className="w-7 h-7" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mb-1">Transaction Failed / Cancelled</h3>
                                                    <p className="text-xs text-white/50 max-w-sm mx-auto">
                                                        The Razorpay checkout session failed or was dismissed. Please attempt checkout again.
                                                    </p>
                                                    <button
                                                        onClick={() => initiatePayment(selectedPlanForPayment)}
                                                        className="py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors max-w-xs mx-auto w-full"
                                                    >
                                                        Try Again
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 py-4 text-center">
                                                    <p className="text-xs text-white/60 leading-relaxed max-w-md mx-auto">
                                                        Connection established. Press the button below to initiate the secure Razorpay payment flow.
                                                    </p>
                                                    <button
                                                        onClick={() => initiatePayment(selectedPlanForPayment)}
                                                        className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-500/20"
                                                    >
                                                        Pay Securely with Razorpay
                                                    </button>
                                                </div>
                                            )}
                                        </div>
 
                                        <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between text-[10px] text-white/40">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746A2 2 0 0119 6.653v5.694a8 8 0 01-4.767 7.307l-3.733 1.68a1 1 0 01-.88 0l-3.733-1.68A8 8 0 011 12.347V6.653a2 2 0 011.166-1.753zM10 3.74l-6 2.87v5.738a6 6 0 003.575 5.48l2.425 1.092 2.425-1.092A6 6 0 0016 12.348V6.61l-6-2.87z" clipRule="evenodd" />
                                                </svg>
                                                Razorpay Secure 256-Bit SSL
                                            </span>
                                            <div className="flex gap-2 uppercase tracking-widest font-bold opacity-30 text-[8px]">
                                                <span>UPI</span>
                                                <span>CARDS</span>
                                                <span>NETBANKING</span>
                                            </div>
                                        </div>
                                    </div>
 
                                    {/* Right Column: Checkout Info & Security Guarantee */}
                                    <div className="w-full md:w-80 flex flex-col items-center justify-center border border-white/10 rounded-2xl bg-black/40 p-6 text-center relative overflow-hidden shrink-0">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                                        
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
                                                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                                                </svg>
                                            </div>
                                            <h4 className="text-white font-extrabold text-sm uppercase tracking-wider">PCI-DSS Compliant</h4>
                                            <p className="text-white/40 text-[10px] mt-2 leading-relaxed px-2">
                                                All credentials are encrypted. Your subscription will be instantly updated in MongoDB upon successful validation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-6 relative z-10 gap-4">
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2">
                                                <Award className="w-6 h-6 text-indigo-400" />
                                                Manage Subscription
                                            </h2>
                                            <p className="text-xs md:text-sm text-white/50 mt-0.5">Choose a plan that fits your interview preparation goals.</p>
                                        </div>
                                        
                                        {/* Header Actions Container */}
                                        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                                            {/* Billing Cycle Toggle */}
                                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1 rounded-xl">
                                                <button
                                                    onClick={() => setBillingCycle("monthly")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        billingCycle === "monthly"
                                                            ? "bg-indigo-600 text-white shadow-md"
                                                            : "text-white/60 hover:text-white"
                                                    }`}
                                                >
                                                    Monthly
                                                </button>
                                                <button
                                                    onClick={() => setBillingCycle("yearly")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                        billingCycle === "yearly"
                                                            ? "bg-indigo-600 text-white shadow-md"
                                                            : "text-white/60 hover:text-white"
                                                    }`}
                                                >
                                                    Yearly
                                                    <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[8px] px-1 py-0.5 rounded font-black uppercase tracking-wider">Save 20%+</span>
                                                </button>
                                            </div>

                                            {/* Close Button */}
                                            <button
                                                type="button"
                                                onClick={() => setSubModalOpen(false)}
                                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
                                                title="Close"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
 
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                        {/* Free Tier Card */}
                                        <div className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${subscriptionPlan === "Free Tier" ? "bg-indigo-500/5 border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.1)]" : "bg-white/5 border-white/5 hover:border-white/10"}`}>
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Free Starter</span>
                                                    {subscriptionPlan === "Free Tier" && <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Active</span>}
                                                </div>
                                                <h3 className="text-lg font-bold text-white">Free Tier</h3>
                                                <div className="mt-3 mb-4 flex items-baseline">
                                                    <span className="text-3xl font-black">₹0</span>
                                                    <span className="text-xs text-white/40 ml-1">/ month</span>
                                                </div>
                                                <ul className="space-y-2.5 text-xs text-white/60 mb-6">
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        2 standard interviews / month
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Basic performance scorecard
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Gemini integration only
                                                    </li>
                                                </ul>
                                            </div>
                                            <button
                                                disabled={getPlanTier(subscriptionPlan) >= 0}
                                                onClick={() => handleUpgradePlan("Free Tier")}
                                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all bg-white/5 text-white/30 border border-white/5 cursor-default`}
                                            >
                                                {subscriptionPlan === "Free Tier" ? "Current Plan" : "Downgrade Restricted"}
                                            </button>
                                        </div>
 
                                        {/* Pro Plan Card */}
                                        <div className={`rounded-2xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${subscriptionPlan === "Pro Plan" ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_25px_rgba(79,70,229,0.2)]" : "bg-white/5 border-white/5 hover:border-white/10"}`}>
                                            <div className="absolute -top-3 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-md shadow-indigo-500/20">
                                                Popular
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Growth Focus</span>
                                                    {subscriptionPlan === "Pro Plan" && <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Active</span>}
                                                </div>
                                                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                                                    Pro Plan <Sparkles className="w-4 h-4 text-indigo-400" />
                                                </h3>
                                                <div className="mt-3 mb-4 flex items-baseline">
                                                    <span className="text-3xl font-black">
                                                        ₹{billingCycle === "yearly" ? "999" : "1,299"}
                                                    </span>
                                                    <span className="text-xs text-white/40 ml-1">/ month</span>
                                                    {billingCycle === "yearly" && (
                                                        <span className="text-[10px] text-indigo-400 font-extrabold ml-2">
                                                            (₹11,988 billed annually)
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="space-y-2.5 text-xs text-white/60 mb-6">
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Unlimited standard interviews
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        5 D-ID Avatar Stream interviews / mo
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Advanced difficulty mode
                                                    </li>
                                                    <li className="flex items-center gap-2 text-indigo-300 font-semibold">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Multilingual (Google Gemini)
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Code (`[MODE:CODE]`) & Board (`[MODE:DRAW]`)
                                                    </li>
                                                </ul>
                                            </div>
                                            <button
                                                disabled={getPlanTier(subscriptionPlan) >= 1}
                                                onClick={() => handleUpgradePlan("Pro Plan")}
                                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${getPlanTier(subscriptionPlan) >= 1 ? "bg-white/5 text-white/30 border border-white/5 cursor-default" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-indigo-500/10"}`}
                                            >
                                                {subscriptionPlan === "Pro Plan" ? "Current Plan" : getPlanTier(subscriptionPlan) > 1 ? "Downgrade Restricted" : "Upgrade to Pro"}
                                            </button>
                                        </div>
 
                                        {/* Elite Plan Card */}
                                        <div className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${(subscriptionPlan === "Elite Plan" || subscriptionPlan === "Enterprise Plan" || subscriptionPlan === "Enterprise Tier") ? "bg-indigo-500/5 border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.1)]" : "bg-white/5 border-white/5 hover:border-white/10"}`}>
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Premium Prep</span>
                                                    {(subscriptionPlan === "Elite Plan" || subscriptionPlan === "Enterprise Plan" || subscriptionPlan === "Enterprise Tier") && <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Active</span>}
                                                </div>
                                                <h3 className="text-lg font-bold text-white">Elite Plan</h3>
                                                <div className="mt-3 mb-4 flex items-baseline">
                                                    <span className="text-3xl font-black">
                                                        ₹{billingCycle === "yearly" ? "2,999" : "3,499"}
                                                    </span>
                                                    <span className="text-xs text-white/40 ml-1">/ month</span>
                                                    {billingCycle === "yearly" && (
                                                        <span className="text-[10px] text-indigo-400 font-extrabold ml-2">
                                                            (₹35,988 billed annually)
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="space-y-2.5 text-xs text-white/60 mb-6">
                                                    <li className="flex items-center gap-2 font-bold text-indigo-300">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Unlimited D-ID Avatar Calls
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        All Pro features included
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Unlimited codebase ZIP uploads
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Full Career Guidance & skill maps
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        Unlimited Roadmap & Email Analysis
                                                    </li>
                                                </ul>
                                            </div>
                                            <button
                                                disabled={getPlanTier(subscriptionPlan) >= 2}
                                                onClick={() => handleUpgradePlan("Elite Plan")}
                                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${(getPlanTier(subscriptionPlan) >= 2) ? "bg-white/5 text-white/30 border border-white/5 cursor-default" : "bg-white/10 hover:bg-white/20 text-white"}`}
                                            >
                                                {(subscriptionPlan === "Elite Plan" || subscriptionPlan === "Enterprise Plan" || subscriptionPlan === "Enterprise Tier") ? "Current Plan" : "Upgrade to Elite"}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Account Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-gradient-to-b from-[#1a1111] to-[#0f0a0a] border border-red-500/20 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(220,38,38,0.15)] relative overflow-hidden"
                        >
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none" />
 
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                    <Trash2 className="w-8 h-8 animate-pulse" />
                                </div>
 
                                <h2 className="text-xl font-extrabold text-white mb-2">
                                    {deleteConfirmMode === 'data_only' ? 'Wipe All Generated Data?' : 'Delete Account Permanently?'}
                                </h2>
                                <p className="text-sm text-white/60 leading-relaxed mb-6">
                                    {deleteConfirmMode === 'data_only' 
                                        ? 'This action is irreversible. All of your contact profile settings, educational history, social links, and resume assets will be cleared. Your login credentials will remain active.'
                                        : 'This action is irreversible. All of your profile details, education records, subscriptions, and interview transcripts will be deleted forever.'}
                                </p>

                                <div className="w-full">
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm account password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white mb-4 placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all text-center"
                                    />
                                    {confirmError && (
                                        <p className="text-xs text-red-500 font-bold mb-3">{confirmError}</p>
                                    )}
                                </div>
 
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={handleDeleteAccount}
                                        className="flex-1 h-12 bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors rounded-xl font-bold text-white flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/20 order-2 sm:order-1"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Confirming...
                                            </>
                                        ) : (
                                            deleteConfirmMode === 'data_only' ? 'Yes, Wipe My Data' : 'Yes, Delete My Account'
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={() => {
                                            setDeleteConfirmOpen(false);
                                            setConfirmPassword("");
                                            setConfirmError("");
                                        }}
                                        className="flex-1 h-12 bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors border border-white/10 rounded-xl font-bold text-white text-sm order-1 sm:order-2"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Photo Modal */}
            <AnimatePresence>
                {viewPhotoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setViewPhotoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="relative max-w-lg w-full flex flex-col items-center justify-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setViewPhotoOpen(false)}
                                className="absolute -top-12 right-0 bg-white/5 hover:bg-white/10 border border-white/10 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-80 h-80 rounded-full overflow-hidden border-2 border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.3)] bg-gradient-to-tr from-indigo-900 to-purple-900">
                                <img src={profilePhoto} alt="Profile Large" className="w-full h-full object-cover" />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* WhatsApp-like Image Cropping Modal */}
            <PhotoCropperModal
                open={cropModalOpen}
                imageSrc={tempImageSrc}
                onCancel={() => {
                    setCropModalOpen(false);
                    setTempImageSrc("");
                }}
                onSave={handleCropSave}
            />

            {/* Custom Wiped Data Success Toast */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50 bg-[#111] border border-green-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-center gap-3 max-w-sm"
                    >
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                            <Check className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Success</p>
                            <p className="text-xs text-white/95 font-medium leading-tight">{toast.message}</p>
                        </div>
                        <button 
                            onClick={() => setToast(prev => ({ ...prev, show: false }))} 
                            className="text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
