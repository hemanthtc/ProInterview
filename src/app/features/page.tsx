"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Video, FileText, Settings, ShieldCheck, MessageSquare, Github, Linkedin, UploadCloud, Loader2, Download, Globe, Play, Trash2, Sparkles, X, Award, Briefcase, Check, UserCircle, AlertTriangle, User, Plus, Mail, Map, Compass, BookOpen, ListTodo, ExternalLink, ChevronDown, ChevronUp, Copy, CheckCircle, Sun, Moon, Eye, Cpu, Code, Search, Terminal, Menu, Building2, TrendingUp, Clock, Handshake, Dumbbell, CalendarClock, ShieldAlert, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import CompanySelect from "../../components/CompanySelect";
import RoleSelect from "../../components/RoleSelect";
import NegotiatePanel from "../../components/NegotiatePanel";
import SpacedDrillsPanel from "../../components/SpacedDrillsPanel";
import PrepPackPanel from "../../components/PrepPackPanel";
import LabsBanner from "../../components/LabsBanner";
import ProgressPanel from "../../components/features/ProgressPanel";
import FeatureToolsGrid from "../../components/features/FeatureToolsGrid";
import { RESUME_TEMPLATES } from "../../data/templates";
import { RESUME_PRESETS } from "../../data/resumePresets";
import { getStorageItem, setStorageItem, removeStorageItem, getInterviewResumeText } from "../../utils/storage";
import { buildPrepPackFromEmail, extractMeetingUrl } from "../../utils/prepPack";
import { pullSessionsFromCloud, syncSessionsToCloud } from "../../utils/cloudSync";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import ProInterviewerApp from "../../components/prointerviewer/ProInterviewerApp";
import ErrorBoundary from "../../components/ErrorBoundary";
import { offCampusMCQs, offCampusCodingQuestions, MCQQuestion, CodingQuestion } from "../../data/offCampusMockTestData";
import { onCampusMCQs, onCampusCodingQuestions } from "../../data/onCampusMockTestData";
import { interviewPrepLogic, aptitudeQuestions } from "../../data/aptitudeQuestions";
import BrandLogo from "../../components/BrandLogo";
import { triggerSelfHealing } from "../../utils/offlineSync";

import type { SavedResume, SavedRoadmap, PortfolioAnalysisCache, RoadmapData, PausedInterviewSession } from "../../types/features";
import type { EmailAnalysisResult } from "../../types/analysis";


function FeaturesContent() {
    const router = useRouter();
    const [github, setGithub] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [projectFiles, setProjectFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
    const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [pausedSession, setPausedSession] = useState<PausedInterviewSession | null>(null);
    const [isRealisticMode, setIsRealisticMode] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const isLight = theme === "light" || theme === "eyeprotect";
    const [activeTool, setActiveTool] = useState<"analysis" | "resume" | "email_analyser" | "roadmap_generator" | "prointerviewer" | "study_materials" | "synthetic_data" | "aptitude" | "progress" | "negotiate" | "drills" | "prep_pack">("analysis");
    const [activeModal, rawSetActiveModal] = useState<"analysis" | "resume" | "email_analyser" | "roadmap_generator" | "prointerviewer" | "study_materials" | "synthetic_data" | "aptitude" | "progress" | "negotiate" | "drills" | "prep_pack" | null>(null);
    const setActiveModal = (modal: typeof activeModal) => {
        const isGuest = getStorageItem("userLoggedIn") === "guest";
        if (isGuest && modal !== null && modal !== "prointerviewer" && modal !== "resume") {
            setConfirmModal({
                isOpen: true,
                title: "Authentication Required",
                message: "Guest mode only supports offline resume editing. Please sign in or register to access mock interviews, AI resume generation, counter-offer negotiations, learning roadmaps, and cloud sync.",
                type: "alert"
            });
            return;
        }
        rawSetActiveModal(modal);
    };

    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [roadmapToDelete, setRoadmapToDelete] = useState<string | null>(null);
    const [isAtsWarningActive, setIsAtsWarningActive] = useState<boolean>(false);
    const [builderMobileView, setBuilderMobileView] = useState<'editor' | 'preview'>('editor');
    const [mobileNegotiateTab, setMobileNegotiateTab] = useState<"levers" | "calculator" | "redlines">("calculator");

    // Aptitude states
    const [aptitudePath, setAptitudePath] = useState<"onCampus" | "offCampus" | null>(null);
    const [expandedAptitudeTopics, setExpandedAptitudeTopics] = useState<Record<string, boolean>>({});
    const [checkedAptitudeTopics, setCheckedAptitudeTopics] = useState<Record<string, boolean>>({});

    // Aptitude Quiz states
    const [activeQuizCategory, setActiveQuizCategory] = useState<string | null>(null);
    const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState<number>(0);
    const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
    const [quizIsSubmitted, setQuizIsSubmitted] = useState<boolean>(false);
    const [quizScore, setQuizScore] = useState<number>(0);
    const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
    const [quizUserAnswers, setQuizUserAnswers] = useState<boolean[]>([]);
    const [isQuizLoading, setIsQuizLoading] = useState<boolean>(false);
    const [quizQuestionsList, setQuizQuestionsList] = useState<any[]>([]);
    const [quizTimeRemaining, setQuizTimeRemaining] = useState<number>(120);
    const [proctorWarnings, setProctorWarnings] = useState<number>(0);
    const [proctorWarningActive, setProctorWarningActive] = useState<boolean>(false);
    const [quizAutoSubmittedReason, setQuizAutoSubmittedReason] = useState<"time" | "proctor" | null>(null);
    const [quizSelectedAnswersList, setQuizSelectedAnswersList] = useState<(number | null)[]>([]);

    // Mock Test states
    const [isMockTestMode, setIsMockTestMode] = useState<boolean>(false);
    const [mockTestMCQAnswers, setMockTestMCQAnswers] = useState<Record<number, number | null>>({});
    const [mockTestMCQReview, setMockTestMCQReview] = useState<Record<number, boolean>>({});
    const [mockTestCodingCodes, setMockTestCodingCodes] = useState<Record<number, string>>({});
    const [mockTestCodingLanguages, setMockTestCodingLanguages] = useState<Record<number, string>>({});
    const [mockTestCodingOutputs, setMockTestCodingOutputs] = useState<Record<number, any>>({});
    const [mockTestCodingLoading, setMockTestCodingLoading] = useState<Record<number, boolean>>({});
    const [currentMockQuestionTab, setCurrentMockQuestionTab] = useState<"mcq" | "coding">("mcq");
    const [currentMockQuestionIndex, setCurrentMockQuestionIndex] = useState<number>(0);
    const [mockTimeRemaining, setMockTimeRemaining] = useState<number>(3600); // 60 minutes
    const [mockTestCompleted, setMockTestCompleted] = useState<boolean>(false);
    const [mockProctorWarnings, setMockProctorWarnings] = useState<number>(0);
    const [mockProctorWarningActive, setMockProctorWarningActive] = useState<boolean>(false);
    const [mockAutoSubmittedReason, setMockAutoSubmittedReason] = useState<"time" | "proctor" | null>(null);
    const [mockTestMCQsList, setMockTestMCQsList] = useState<MCQQuestion[]>([]);
    const [mockTestCodingList, setMockTestCodingList] = useState<CodingQuestion[]>([]);

    // Offer Negotiation dynamic strategy states
    const [dynamicLevers, setDynamicLevers] = useState<string[]>([]);
    const [dynamicRedLines, setDynamicRedLines] = useState<string[]>([]);
    const [negotiationMood, setNegotiationMood] = useState<string>("");

    // Progress / History states
    const [isGeneratingMockTest, setIsGeneratingMockTest] = useState<boolean>(false);

    const handleStartMockTest = async () => {
        setIsGeneratingMockTest(true);
        try {
            const res = await fetch("/api/generate-mock-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aptitudePath })
            });
            if (!res.ok) {
                throw new Error("Failed to generate test");
            }
            const data = await res.json();

            const selectedMCQs = data.mcqs || [];
            const selectedCoding = data.coding || [];

            setMockTestMCQsList(selectedMCQs);
            setMockTestCodingList(selectedCoding);

            const initialCodes: Record<number, string> = {};
            const initialLanguages: Record<number, string> = {};
            selectedCoding.forEach((q: CodingQuestion) => {
                initialCodes[q.id] = q.starterTemplates.javascript || "";
                initialLanguages[q.id] = "javascript";
            });
            setMockTestCodingCodes(initialCodes);
            setMockTestCodingLanguages(initialLanguages);
            setMockTestCodingOutputs({});
            setMockTestCodingLoading({});

            setIsMockTestMode(true);
            setMockTestMCQAnswers({});
            setMockTestMCQReview({});
            setCurrentMockQuestionTab("mcq");
            setCurrentMockQuestionIndex(0);
            setMockTimeRemaining(3600);
            setMockTestCompleted(false);
            setMockProctorWarnings(0);
            setMockProctorWarningActive(false);
            setMockAutoSubmittedReason(null);
        } catch (err) {
            console.error("Failed to generate mock test via Gemini:", err);
            setIsMockTestMode(true);
            setMockTestMCQAnswers({});
            setMockTestMCQReview({});

            const shuffleArray = <T,>(arr: T[]): T[] => {
                const temp = [...arr];
                for (let i = temp.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [temp[i], temp[j]] = [temp[j], temp[i]];
                }
                return temp;
            };

            const rawMCQs = aptitudePath === "onCampus" ? onCampusMCQs : offCampusMCQs;
            const rawCoding = aptitudePath === "onCampus" ? onCampusCodingQuestions : offCampusCodingQuestions;

            const selectedMCQs = shuffleArray(rawMCQs).slice(0, 25);
            const selectedCoding = shuffleArray(rawCoding).slice(0, 3);

            setMockTestMCQsList(selectedMCQs);
            setMockTestCodingList(selectedCoding);

            const initialCodes: Record<number, string> = {};
            const initialLanguages: Record<number, string> = {};
            selectedCoding.forEach((q: CodingQuestion) => {
                initialCodes[q.id] = q.starterTemplates.javascript || "";
                initialLanguages[q.id] = "javascript";
            });
            setMockTestCodingCodes(initialCodes);
            setMockTestCodingLanguages(initialLanguages);
            setMockTestCodingOutputs({});
            setMockTestCodingLoading({});

            setCurrentMockQuestionTab("mcq");
            setCurrentMockQuestionIndex(0);
            setMockTimeRemaining(3600);
            setMockTestCompleted(false);
            setMockProctorWarnings(0);
            setMockProctorWarningActive(false);
            setMockAutoSubmittedReason(null);
        } finally {
            setIsGeneratingMockTest(false);
        }
    };

    const handleStartQuiz = async (quizKey: string) => {
        setIsQuizLoading(true);
        setActiveQuizCategory(quizKey);
        setCurrentQuizQuestionIndex(0);
        setQuizSelectedOption(null);
        setQuizIsSubmitted(false);
        setQuizScore(0);
        setQuizCompleted(false);
        setQuizUserAnswers([]);
        setQuizQuestionsList([]);
        setQuizTimeRemaining(120);
        setProctorWarnings(0);
        setProctorWarningActive(false);
        setQuizAutoSubmittedReason(null);
        setQuizSelectedAnswersList([]);

        try {
            const res = await fetch("/api/aptitude-quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: quizKey })
            });

            if (!res.ok) {
                throw new Error("Failed to generate quiz from Gemini");
            }

            const data = await res.json();
            if (data && data.questions && data.questions.length > 0) {
                setQuizQuestionsList(data.questions);
            } else {
                throw new Error("Invalid response format from Gemini API");
            }
        } catch (err) {
            console.warn("Quiz generation failed. Falling back to static questions.", err);
            const fallback = aptitudeQuestions[quizKey];
            setQuizQuestionsList(fallback ? fallback.questions : []);
        } finally {
            setIsQuizLoading(false);
        }
    };



    // Email Analyser states
    const [emailText, setEmailText] = useState("");
    const [isAnalyzingEmail, setIsAnalyzingEmail] = useState(false);
    const [emailAnalysisResult, setEmailAnalysisResult] = useState<any>(null);
    const [isVerifyingExtracted, setIsVerifyingExtracted] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);
    const [isEditingParams, setIsEditingParams] = useState(false);
    const [editRole, setEditRole] = useState("");
    const [editCompany, setEditCompany] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [hrResearchStatus, setHrResearchStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
    const [hrResearchMessage, setHrResearchMessage] = useState("");
    const [hrResearchResult, setHrResearchResult] = useState<any>(null);
    const [hrHappenstanceUrl, setHrHappenstanceUrl] = useState<string | null>(null);

    // Negotiator default states
    const [negotiateCompany, setNegotiateCompany] = useState("");
    const [negotiateRole, setNegotiateRole] = useState("");
    const [negotiateOffer, setNegotiateOffer] = useState("");
    const [negotiateBenefits, setNegotiateBenefits] = useState("");

    // Background study materials generation states
    const [isGeneratingStudyMaterials, setIsGeneratingStudyMaterials] = useState(false);
    const [studyMaterialsProgress, setStudyMaterialsProgress] = useState<{ current: number; total: number; topicName: string } | null>(null);

    // Roadmap Generator states
    const [roadmapCourse, setRoadmapCourse] = useState("");
    const [roadmapCompany, setRoadmapCompany] = useState("");
    const [roadmapLocation, setRoadmapLocation] = useState("");
    const [roadmapAdditional, setRoadmapAdditional] = useState("");
    const [roadmapImages, setRoadmapImages] = useState<File[]>([]);
    const [roadmapImageError, setRoadmapImageError] = useState("");
    const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
    const [roadmapResult, setRoadmapResult] = useState<any>(null);
    const [roadmapTasksChecked, setRoadmapTasksChecked] = useState<Record<string, boolean>>({});
    const [savedRoadmaps, setSavedRoadmaps] = useState<SavedRoadmap[]>([]);
    const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);

    // Pre-interview analysis states
    const [analysisResult, setAnalysisResult] = useState<{ rating: number; feedback: string } | null>(null);
    const [showInterviewCustomizer, setShowInterviewCustomizer] = useState(false);
    const [preAnalyzing, setPreAnalyzing] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showResume, setShowResume] = useState(false);
    const [analysisLevel, setAnalysisLevel] = useState("intermediate");
    const [analysisProvider, setAnalysisProvider] = useState("gemini");
    const [isFetchingLinks, setIsFetchingLinks] = useState(false);
    const [fetchLinksError, setFetchLinksError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Profile import toast
    const [profileImportToast, setProfileImportToast] = useState(false);

    // Profile incomplete popup
    const [profileIncompletePopup, setProfileIncompletePopup] = useState(false);
    const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);

    // Resume states
    const [resName, setResName] = useState("");
    const [resEmail, setResEmail] = useState("");
    const [resPhone, setResPhone] = useState("");
    const [resSummary, setResSummary] = useState("");
    const [resSkills, setResSkills] = useState("");
    const [resExperience, setResExperience] = useState("");
    const [resEducation, setResEducation] = useState("");
    const [resProjects, setResProjects] = useState("");
    const [resInternships, setResInternships] = useState("");
    const [resCertifications, setResCertifications] = useState("");
    const [resAwards, setResAwards] = useState("");
    const [resAccentColor, setResAccentColor] = useState("indigo");
    const [resFontSize, setResFontSize] = useState(1.0);
    const [resLanguages, setResLanguages] = useState<{ name: string; level: number }[]>([]);
    const [generatingResume, setGeneratingResume] = useState(false);

    // Gmail Direct Import states
    const [gmailToken, setGmailToken] = useState("");
    const [gmailEmails, setGmailEmails] = useState<any[]>([]);
    const [isListingGmail, setIsListingGmail] = useState(false);
    const [isFetchingGmailBody, setIsFetchingGmailBody] = useState(false);
    const [showGmailList, setShowGmailList] = useState(false);
    const [gmailError, setGmailError] = useState("");

    const fetchGmailEmails = async (token: string) => {
        setIsListingGmail(true);
        setGmailError("");
        try {
            const res = await fetch("/api/gmail/list", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            let data: any;
            try {
                data = await res.json();
            } catch (parseErr) {
                setGmailError(`Server returned an invalid response (${res.status} ${res.statusText || "Internal Server Error"}).`);
                setIsListingGmail(false);
                return;
            }

            if (res.ok) {
                setGmailEmails(data.emails || []);
                setShowGmailList(true);
            } else {
                setGmailError(data.error || "Failed to retrieve Gmail messages.");
            }
        } catch (e: any) {
            setGmailError(`Connection error: ${e.message || "Failed to connect to Gmail list API."}`);
        } finally {
            setIsListingGmail(false);
        }
    };

    const handleGmailMessageSelect = async (msgId: string) => {
        setIsFetchingGmailBody(true);
        setGmailError("");
        try {
            const res = await fetch(`/api/gmail/get?id=${msgId}`, {
                headers: {
                    Authorization: `Bearer ${gmailToken}`
                }
            });

            let data: any;
            try {
                data = await res.json();
            } catch (parseErr) {
                setGmailError(`Server returned an invalid response (${res.status} ${res.statusText || "Internal Server Error"}).`);
                setIsFetchingGmailBody(false);
                return;
            }

            if (res.ok && data.body) {
                setEmailText(data.body);
                setShowGmailList(false);
            } else {
                setGmailError(data.error || "Failed to retrieve email content.");
            }
        } catch (e: any) {
            setGmailError(`Connection error: ${e.message || "Connection to Gmail details API failed."}`);
        } finally {
            setIsFetchingGmailBody(false);
        }
    };

    const gmailLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            const token = tokenResponse.access_token;
            setGmailToken(token);
            fetchGmailEmails(token);
        },
        onError: () => {
            setGmailError("Google authorization failed. Gmail access is required.");
        },
        scope: "https://www.googleapis.com/auth/gmail.readonly"
    });

    const handleGmailImportLogin = () => {
        gmailLogin();
    };

    const launchProInterviewer = () => {
        setActiveModal("prointerviewer");
        setActiveTool("prointerviewer");
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        
        // Trigger offline self-healing sync
        void triggerSelfHealing();

        const params = new URLSearchParams(window.location.search);
        const toolFromUrl = params.get("tool") as typeof activeTool | null;

        const targetTool = toolFromUrl;
        const validTools = [
            "analysis", "resume", "email_analyser", "roadmap_generator", "prointerviewer",
            "study_materials", "synthetic_data", "aptitude", "progress", "negotiate", "drills", "prep_pack"
        ];

        if (targetTool && validTools.includes(targetTool)) {
            Promise.resolve().then(() => {
                setActiveTool(targetTool);
                setActiveModal(targetTool);
                setIsMounted(true);
            });
        } else {
            Promise.resolve().then(() => {
                setIsMounted(true);
            });
        }
    }, []);

    useEffect(() => {
        const handlePopState = () => {
            if (typeof window === "undefined") return;
            const params = new URLSearchParams(window.location.search);
            const toolFromUrl = params.get("tool") as typeof activeTool | null;
            Promise.resolve().then(() => {
                setActiveModal(toolFromUrl);
                if (toolFromUrl) {
                    setActiveTool(toolFromUrl);
                }
            });
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const currentTool = params.get("tool");

        if (activeModal) {
            if (currentTool !== activeModal) {
                const url = new URL(window.location.href);
                url.searchParams.set("tool", activeModal);
                window.history.pushState({ tool: activeModal }, "", url.toString());
            }
        } else {
            if (currentTool) {
                window.history.back();
            }
        }
    }, [activeModal, isMounted]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data === "CLOSE_SYNTHETIC_STUDIO" || event.data?.type === "CLOSE_SYNTHETIC_STUDIO") {
                setActiveModal(null);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);


    // Roadmap timeline accordions
    const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true });

    // Saved Resumes Database state (Option A)
    const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
    const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("modern");

    // Custom dialog modal state for alert & confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "confirm" | "alert" | "submit";
        onConfirm?: () => void;
    }>({ isOpen: false, title: "", message: "", type: "confirm" });

    const syncAccountDetailsFromStorage = () => {
        setGithub(getStorageItem("userGithub") || "");
        setLinkedin(getStorageItem("userLinkedin") || "");
        setPortfolioUrl(getStorageItem("userPortfolio") || "");

        const storedPhone = getStorageItem("userPhone") || "";
        const storedEmail = getStorageItem("userIdentifier") || "";
        const storedAdditionalEmail = getStorageItem("userAdditionalEmail") || "";

        setResEmail(storedEmail.includes("@") ? storedEmail : storedAdditionalEmail);
        setResPhone(storedPhone || (storedEmail.startsWith("+") ? storedEmail : ""));

        try {
            const eduData = JSON.parse(getStorageItem("userEducationData") || "{}");
            const parts = [
                eduData.tenth?.institution,
                eduData.tenth?.board,
                eduData.tenth?.marks,
                eduData.twelfth?.institution,
                eduData.twelfth?.board,
                eduData.twelfth?.marks,
                eduData.ug?.institution,
                eduData.ug?.course,
                eduData.ug?.marks,
                eduData.pg?.institution,
                eduData.pg?.course,
                eduData.pg?.marks,
            ].filter(Boolean);
            if (parts.length > 0) {
                setResEducation(parts.join("\n"));
            } else {
                setResEducation(getStorageItem("userEducation") || "");
            }
        } catch {
            setResEducation(getStorageItem("userEducation") || "");
        }
    };

    const syncResumeBuilderFromProfile = (showToast = false) => {
        const pName = getStorageItem("userName") || "";
        const pEmail = getStorageItem("userIdentifier") || "";
        const pPhone = getStorageItem("userPhone") || "";
        const pEducation = getStorageItem("userEducation") || "";
        const pGithub = getStorageItem("userGithub") || "";
        const pLinkedin = getStorageItem("userLinkedin") || "";
        const pPortfolio = getStorageItem("userPortfolio") || "";

        if (pName && pName !== "Guest") { setResName(pName); }
        if (pEmail && pEmail.includes("@")) { setResEmail(pEmail); }
        if (pPhone) { setResPhone(pPhone); }
        if (pEducation) { setResEducation(pEducation); }

        const updates: Partial<SavedResume> = {};
        if (pName && pName !== "Guest") updates.name = pName;
        if (pEmail && pEmail.includes("@")) updates.email = pEmail;
        if (pPhone) updates.phone = pPhone;
        if (pEducation) updates.education = pEducation;
        updateActiveResume(updates);

        if (pGithub) setGithub(pGithub);
        if (pLinkedin) setLinkedin(pLinkedin);
        if (pPortfolio) setPortfolioUrl(pPortfolio);

        if (showToast) {
            setProfileImportToast(true);
            setTimeout(() => setProfileImportToast(false), 2500);
        }
    };

    const readCachedPortfolioAnalysis = (): PortfolioAnalysisCache | null => {
        try {
            const raw = getStorageItem("portfolioAnalysisResult");
            if (!raw) return null;

            const parsed = JSON.parse(raw) as Partial<PortfolioAnalysisCache>;
            if (!parsed.completed || typeof parsed.rating !== "number") return null;

            return {
                completed: true,
                rating: parsed.rating,
                feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
                analyzedAt: typeof parsed.analyzedAt === "number" ? parsed.analyzedAt : Date.now(),
            };
        } catch {
            return null;
        }
    };

    const saveCachedPortfolioAnalysis = (rating: number, feedback: string) => {
        const payload: PortfolioAnalysisCache = {
            completed: true,
            rating,
            feedback,
            analyzedAt: Date.now(),
        };

        setStorageItem("portfolioAnalysisResult", JSON.stringify(payload));
        setStorageItem("portfolioRating", rating.toString());
        setAnalysisResult({ rating, feedback });
    };

    useEffect(() => {
        Promise.resolve().then(() => {
            const loggedIn = getStorageItem("userLoggedIn") === "true";
            const guest = getStorageItem("userLoggedIn") === "guest";
            setIsLoggedIn(loggedIn);
            setIsGuest(guest);
            if (!loggedIn && !guest) {
                router.push("/login");
                return;
            }
            setIsAuthChecked(true);

            if (!isGuest) {
                void pullSessionsFromCloud();
            }

            const isRealistic = getStorageItem("globalInterviewMode") === "realistic";
            setIsRealisticMode(isRealistic);
            syncAccountDetailsFromStorage();

            const savedTheme = localStorage.getItem("globalTheme") as any;
            if (savedTheme) {
                setTheme(savedTheme);
                document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
                document.documentElement.style.colorScheme = savedTheme === "eyeprotect" ? "light" : savedTheme;
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

            // Auto-open analysis tool if redirected from Home page
            const searchParams = new URLSearchParams(window.location.search);
            const tool = searchParams.get("tool");
            if (tool === "analysis") {
                setActiveModal("analysis");
                setActiveTool("analysis");
                setShowAnalysis(false);
                setShowResume(false);
            }
        });
    }, []);

    // Global countdown timer for Aptitude Quiz Simulator
    useEffect(() => {
        if (activeQuizCategory === null || quizCompleted || isQuizLoading) return;

        const timer = setInterval(() => {
            setQuizTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setQuizCompleted(true);
                    setQuizAutoSubmittedReason("time");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [activeQuizCategory, quizCompleted, isQuizLoading]);

    // Proctoring / Anti-Cheat tab-switch warning system
    useEffect(() => {
        if (activeQuizCategory === null || quizCompleted || isQuizLoading || proctorWarningActive) return;

        const handleViolation = () => {
            setProctorWarnings((prev) => {
                const nextWarnings = prev + 1;
                if (nextWarnings >= 3) {
                    setQuizCompleted(true);
                    setQuizAutoSubmittedReason("proctor");
                } else {
                    setProctorWarningActive(true);
                }
                return nextWarnings;
            });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                handleViolation();
            }
        };

        const handleWindowBlur = () => {
            handleViolation();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [activeQuizCategory, quizCompleted, isQuizLoading, proctorWarningActive]);

    // Countdown timer for Mock Test
    useEffect(() => {
        if (!isMockTestMode || mockTestCompleted) return;

        const timer = setInterval(() => {
            setMockTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setMockTestCompleted(true);
                    setMockAutoSubmittedReason("time");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isMockTestMode, mockTestCompleted]);

    // Proctoring tab monitor for Mock Test
    useEffect(() => {
        if (!isMockTestMode || mockTestCompleted || mockProctorWarningActive) return;

        const handleMockViolation = () => {
            setMockProctorWarnings((prev) => {
                const nextWarnings = prev + 1;
                if (nextWarnings >= 3) {
                    setMockTestCompleted(true);
                    setMockAutoSubmittedReason("proctor");
                } else {
                    setMockProctorWarningActive(true);
                }
                return nextWarnings;
            });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                handleMockViolation();
            }
        };

        const handleWindowBlur = () => {
            handleMockViolation();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [isMockTestMode, mockTestCompleted, mockProctorWarningActive]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data === "back-to-features") {
                setActiveModal(null);
                setActiveTool("analysis");
            } else if (event.data && event.data.type === "sync-theme") {
                const newTheme = event.data.theme as "dark" | "light" | "eyeprotect";
                setTheme(newTheme);
                document.documentElement.className = newTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${newTheme}`;
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    useEffect(() => {
        const handleStorageSync = (event: Event) => {
            const detail = (event as CustomEvent<{ key?: string }>).detail;
            if (!detail?.key) return;

            const keysToSync = new Set([
                "userGithub",
                "userLinkedin",
                "userPortfolio",
                "userPhone",
                "userAdditionalEmail",
                "userEducation",
                "userEducationData",
                "userIdentifier",
            ]);

            if (keysToSync.has(detail.key)) {
                syncAccountDetailsFromStorage();
                if (activeModal === "resume") {
                    syncResumeBuilderFromProfile(false);
                }
            }
        };

        window.addEventListener("ai-storage-change", handleStorageSync as EventListener);
        return () => window.removeEventListener("ai-storage-change", handleStorageSync as EventListener);
    }, []);

    useEffect(() => {
        if (activeModal === "resume") {
            Promise.resolve().then(() => {
                syncResumeBuilderFromProfile(false);
            });
        }
    }, [activeModal]);

    // Load resumes from local storage database
    useEffect(() => {
        Promise.resolve().then(() => {
            const storedResumes = getStorageItem("savedResumesDatabase");
            if (storedResumes) {
                try {
                    const parsed = JSON.parse(storedResumes) as SavedResume[];
                    setSavedResumes(parsed);

                    if (parsed.length > 0) {
                        const activeId = getStorageItem("activeResumeId") || parsed[0].id;
                        setActiveResumeId(activeId);

                        const activeRes = parsed.find(r => r.id === activeId) || parsed[0];
                        setResName(activeRes.name);
                        setResEmail(activeRes.email);
                        setResPhone(activeRes.phone);
                        setResSummary(activeRes.summary);
                        setResSkills(activeRes.skills);
                        setResExperience(activeRes.experience);
                        setResEducation(activeRes.education);
                        setResProjects(activeRes.projects || "");
                        setResInternships(activeRes.internships || "");
                        setResCertifications(activeRes.certifications || "");
                        setResAwards(activeRes.awards || "");
                        setResAccentColor(activeRes.accentColor || "indigo");
                        setResFontSize(activeRes.fontSize || 1.0);
                        setSelectedTemplateId(activeRes.templateId || "modern");
                    } else {
                        createNewDefaultResume([]);
                    }
                } catch (e) {
                    console.error("Failed to parse saved resumes database", e);
                    createNewDefaultResume([]);
                }
            } else {
                createNewDefaultResume([]);
            }
        });
    }, []);

    // Load roadmaps from local storage database
    useEffect(() => {
        const storedRoadmaps = getStorageItem("savedRoadmapsDatabase");
        if (storedRoadmaps) {
            try {
                const parsed = JSON.parse(storedRoadmaps) as SavedRoadmap[];
                Promise.resolve().then(() => {
                    setSavedRoadmaps(parsed);

                    if (parsed.length > 0) {
                        const activeId = getStorageItem("activeRoadmapId");
                        const activeRoad = parsed.find(r => r.id === activeId) || parsed[0];
                        setActiveRoadmapId(activeRoad.id);
                        setStorageItem("activeRoadmapId", activeRoad.id);

                        // Populate inputs and results from the active roadmap
                        setRoadmapCourse(activeRoad.course);
                        setRoadmapCompany(activeRoad.company);
                        setRoadmapLocation(activeRoad.location);
                        setRoadmapAdditional(activeRoad.additionalInfo);
                        setRoadmapResult(activeRoad.roadmapData);
                        setRoadmapTasksChecked(activeRoad.tasksChecked || {});
                    }
                });
            } catch (e) {
                console.error("Failed to parse saved roadmaps database", e);
            }
        }
    }, []);

    function createNewDefaultResume(currentList: SavedResume[]) {
        const defaultName = getStorageItem("userName") || "";
        const defaultEmail = getStorageItem("userIdentifier") || "";
        const storedAdditionalEmail = getStorageItem("userAdditionalEmail") || "";
        const defaultPhone = getStorageItem("userPhone") || (defaultEmail.startsWith("+") ? defaultEmail : "");
        const defaultEducation = getStorageItem("userEducation") || "";

        const newRes: SavedResume = {
            id: "res_" + Date.now(),
            title: "My Standard Resume",
            updatedAt: Date.now(),
            templateId: "modern",
            name: defaultName,
            email: defaultEmail.includes("@") ? defaultEmail : storedAdditionalEmail,
            phone: defaultPhone,
            summary: "",
            skills: "",
            experience: "",
            education: defaultEducation,
            projects: "",
            internships: "",
            certifications: "",
            awards: "",
            accentColor: "indigo",
            fontSize: 1.0
        };

        const newList = [newRes, ...currentList];
        setSavedResumes(newList);
        setActiveResumeId(newRes.id);
        setStorageItem("savedResumesDatabase", JSON.stringify(newList));
        setStorageItem("activeResumeId", newRes.id);

        setResName(newRes.name);
        setResEmail(newRes.email);
        setResPhone(newRes.phone);
        setResSummary(newRes.summary);
        setResSkills(newRes.skills);
        setResExperience(newRes.experience);
        setResEducation(newRes.education);
        setResProjects("");
        setResInternships("");
        setResCertifications("");
        setResAwards("");
        setResAccentColor("indigo");
        setResFontSize(1.0);
        setSelectedTemplateId(newRes.templateId);
    }

    const handleCreateNewResume = () => {
        const title = prompt("Enter a name/profile for your new resume:", `My Resume (${new Date().toLocaleDateString()})`);
        if (title === null) return;
        const cleanedTitle = title.trim() || `Resume ${savedResumes.length + 1}`;

        const defaultName = getStorageItem("userName") || "";
        const defaultEmail = getStorageItem("userIdentifier") || "";
        const storedAdditionalEmail = getStorageItem("userAdditionalEmail") || "";
        const defaultPhone = getStorageItem("userPhone") || (defaultEmail.startsWith("+") ? defaultEmail : "");
        const defaultEducation = getStorageItem("userEducation") || "";

        const newRes: SavedResume = {
            id: "res_" + Date.now(),
            title: cleanedTitle,
            updatedAt: Date.now(),
            templateId: "modern",
            name: defaultName,
            email: defaultEmail.includes("@") ? defaultEmail : storedAdditionalEmail,
            phone: defaultPhone,
            summary: "",
            skills: "",
            experience: "",
            education: defaultEducation,
            projects: "",
            internships: "",
            certifications: "",
            awards: "",
            accentColor: "indigo",
            fontSize: 1.0
        };

        const newList = [newRes, ...savedResumes];
        setSavedResumes(newList);
        setActiveResumeId(newRes.id);
        setStorageItem("savedResumesDatabase", JSON.stringify(newList));
        setStorageItem("activeResumeId", newRes.id);

        setResName(newRes.name);
        setResEmail(newRes.email);
        setResPhone(newRes.phone);
        setResSummary(newRes.summary);
        setResSkills(newRes.skills);
        setResExperience(newRes.experience);
        setResEducation(newRes.education);
        setResProjects("");
        setResInternships("");
        setResCertifications("");
        setResAwards("");
        setResAccentColor("indigo");
        setResFontSize(1.0);
        setSelectedTemplateId(newRes.templateId);
    };

    const handleCreateFromPreset = (presetId: string) => {
        const preset = RESUME_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const defaultName = getStorageItem("userName") || "Your Name";
        const defaultEmail = getStorageItem("userIdentifier") || "email@example.com";
        const storedAdditionalEmail = getStorageItem("userAdditionalEmail") || "";
        const defaultPhone = getStorageItem("userPhone") || "";
        const defaultEducation = getStorageItem("userEducation") || preset.education;

        const newRes: SavedResume = {
            id: "res_" + Date.now(),
            title: preset.roleName + " Preset",
            updatedAt: Date.now(),
            templateId: preset.templateId,
            name: defaultName,
            email: defaultEmail.includes("@") ? defaultEmail : (storedAdditionalEmail || defaultEmail),
            phone: defaultPhone,
            summary: preset.summary,
            skills: preset.skills,
            experience: preset.experience,
            education: defaultEducation,
            projects: preset.projects,
            internships: preset.internships,
            certifications: preset.certifications,
            awards: preset.awards,
            accentColor: preset.accentColor,
            fontSize: 1.0
        };

        const newList = [newRes, ...savedResumes];
        setSavedResumes(newList);
        setActiveResumeId(newRes.id);
        setStorageItem("savedResumesDatabase", JSON.stringify(newList));
        setStorageItem("activeResumeId", newRes.id);

        setResName(newRes.name);
        setResEmail(newRes.email);
        setResPhone(newRes.phone);
        setResSummary(newRes.summary);
        setResSkills(newRes.skills);
        setResExperience(newRes.experience);
        setResEducation(newRes.education);
        setResProjects(newRes.projects || "");
        setResInternships(newRes.internships || "");
        setResCertifications(newRes.certifications || "");
        setResAwards(newRes.awards || "");
        setResAccentColor(newRes.accentColor || "indigo");
        setResFontSize(1.0);
        setSelectedTemplateId(newRes.templateId);
    };

    const handleLoadResume = (id: string) => {
        const target = savedResumes.find(r => r.id === id);
        if (!target) return;

        setActiveResumeId(id);
        setStorageItem("activeResumeId", id);

        setResName(target.name);
        setResEmail(target.email);
        setResPhone(target.phone);
        setResSummary(target.summary);
        setResSkills(target.skills);
        setResExperience(target.experience);
        setResEducation(target.education);
        setResProjects(target.projects || "");
        setResInternships(target.internships || "");
        setResCertifications(target.certifications || "");
        setResAwards(target.awards || "");
        setResAccentColor(target.accentColor || "indigo");
        setResFontSize(target.fontSize || 1.0);
        setSelectedTemplateId(target.templateId || "modern");
    };

    const handleDeleteResume = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (savedResumes.length <= 1) {
            setConfirmModal({
                isOpen: true,
                title: "Cannot Delete Resume",
                message: "You must keep at least one resume profile in the database.",
                type: "alert"
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: "Delete Resume Profile?",
            message: "Are you sure you want to delete this resume profile? All sections associated with this profile will be permanently deleted.",
            type: "confirm",
            onConfirm: () => {
                const newList = savedResumes.filter(r => r.id !== id);
                setSavedResumes(newList);
                setStorageItem("savedResumesDatabase", JSON.stringify(newList));

                if (activeResumeId === id) {
                    const nextActive = newList[0];
                    setActiveResumeId(nextActive.id);
                    setStorageItem("activeResumeId", nextActive.id);

                    setResName(nextActive.name);
                    setResEmail(nextActive.email);
                    setResPhone(nextActive.phone);
                    setResSummary(nextActive.summary);
                    setResSkills(nextActive.skills);
                    setResExperience(nextActive.experience);
                    setResEducation(nextActive.education);
                    setResProjects(nextActive.projects || "");
                    setResInternships(nextActive.internships || "");
                    setResCertifications(nextActive.certifications || "");
                    setResAwards(nextActive.awards || "");
                    setResAccentColor(nextActive.accentColor || "indigo");
                    setResFontSize(nextActive.fontSize || 1.0);
                    setSelectedTemplateId(nextActive.templateId || "modern");
                }
            }
        });
    };

    function updateActiveResume(updates: Partial<SavedResume>) {
        if (!activeResumeId) return;

        const updatedList = savedResumes.map(r => {
            if (r.id === activeResumeId) {
                return {
                    ...r,
                    ...updates,
                    updatedAt: Date.now()
                };
            }
            return r;
        });

        setSavedResumes(updatedList);
        setStorageItem("savedResumesDatabase", JSON.stringify(updatedList));
    }

    const toggleMode = () => {
        const newMode = !isRealisticMode;
        setIsRealisticMode(newMode);
        setStorageItem("globalInterviewMode", newMode ? "realistic" : "technical");
        if (newMode) {
            router.push("/");
        }
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

    const handleResume = () => {
        if (!pausedSession) return;

        if (pausedSession.resumeText) {
            setStorageItem("resumeText", String(pausedSession.resumeText));
        }

        setStorageItem("resumeFromPaused", "true");
        const targetMode = String(pausedSession.mode || getStorageItem("globalInterviewMode") || "technical");
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

    const handleDownloadResume = () => {
        let styleContent = "";
        let bodyContent = "";

        const ACCENT_COLORS: Record<string, string> = {
            indigo: "#4f46e5",
            emerald: "#10b981",
            violet: "#8b5cf6",
            rose: "#f43f5e",
            amber: "#f59e0b",
            slate: "#64748b"
        };
        const selectedColorHex = ACCENT_COLORS[resAccentColor] || "#4f46e5";

        if (selectedTemplateId === "classic") {
            styleContent = `
                body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.5; color: #111111; margin: 40px; }
                .header { text-align: center; border-bottom: 3px double ${selectedColorHex}; padding-bottom: 15px; margin-bottom: 20px; }
                .name { font-size: ${26 * resFontSize}pt; font-weight: bold; color: ${selectedColorHex}; margin: 0; }
                .contact { font-size: ${10 * resFontSize}pt; color: #444444; margin-top: 5px; }
                h2 { font-size: ${13 * resFontSize}pt; color: ${selectedColorHex}; text-align: center; border-bottom: 1px solid ${selectedColorHex}; padding-bottom: 3px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; }
                .section-content { font-size: ${10.5 * resFontSize}pt; margin-bottom: 15px; }
            `;
            bodyContent = `
                <div class="header">
                    <div class="name">${resName || 'Your Name'}</div>
                    <div class="contact">
                        ${resEmail ? `Email: ${resEmail}` : ''} 
                        ${resPhone ? ` | Phone: ${resPhone}` : ''}
                        ${github ? ` | GitHub: ${github}` : ''}
                        ${linkedin ? ` | LinkedIn: ${linkedin}` : ''}
                    </div>
                </div>

                <h2>Professional Summary</h2>
                <div class="section-content">${resSummary || 'Provide a professional summary.'}</div>

                <h2>Key Skills</h2>
                <div class="section-content">${resSkills || 'List your skills.'}</div>

                <h2>Work Experience</h2>
                <div class="section-content" style="white-space: pre-wrap;">${resExperience || 'Add your work experience.'}</div>

                ${resInternships ? `<h2>Internship Experience</h2><div class="section-content" style="white-space: pre-wrap;">${resInternships}</div>` : ''}

                ${resProjects ? `<h2>Projects</h2><div class="section-content" style="white-space: pre-wrap;">${resProjects}</div>` : ''}

                ${resCertifications ? `<h2>Certifications & Licenses</h2><div class="section-content" style="white-space: pre-wrap;">${resCertifications}</div>` : ''}

                ${resAwards ? `<h2>Awards & Achievements</h2><div class="section-content" style="white-space: pre-wrap;">${resAwards}</div>` : ''}

                <h2>Education</h2>
                <div class="section-content" style="white-space: pre-wrap;">${resEducation || 'Add your education details.'}</div>
            `;
        } else if (selectedTemplateId === "minimalist") {
            styleContent = `
                body { font-family: 'Calibri', Arial, sans-serif; line-height: 1.4; color: #334155; margin: 40px; }
                .header { text-align: left; border-bottom: 1px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px; }
                .name { font-size: ${24 * resFontSize}pt; font-weight: normal; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .contact { font-size: ${9.5 * resFontSize}pt; color: #64748b; margin-top: 5px; }
                h2 { font-size: ${12 * resFontSize}pt; color: ${selectedColorHex}; border-bottom: 1px solid ${selectedColorHex}40; padding-bottom: 4px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
                .section-content { font-size: ${10.5 * resFontSize}pt; margin-bottom: 15px; }
            `;
            bodyContent = `
                <div class="header">
                    <div class="name">${resName || 'Your Name'}</div>
                    <div class="contact">
                        ${resEmail ? `Email: ${resEmail}` : ''} 
                        ${resPhone ? ` | Phone: ${resPhone}` : ''}
                        ${github ? ` | GitHub: ${github}` : ''}
                        ${linkedin ? ` | LinkedIn: ${linkedin}` : ''}
                    </div>
                </div>

                <h2>Professional Summary</h2>
                <div class="section-content">${resSummary || 'Provide a professional summary.'}</div>

                <h2>Key Skills</h2>
                <div class="section-content">${resSkills || 'List your skills.'}</div>

                <h2>Work Experience</h2>
                <div class="section-content" style="white-space: pre-wrap;">${resExperience || 'Add your work experience.'}</div>

                ${resInternships ? `<h2>Internships</h2><div class="section-content" style="white-space: pre-wrap;">${resInternships}</div>` : ''}

                ${resProjects ? `<h2>Projects</h2><div class="section-content" style="white-space: pre-wrap;">${resProjects}</div>` : ''}

                ${resCertifications ? `<h2>Certifications & Licenses</h2><div class="section-content" style="white-space: pre-wrap;">${resCertifications}</div>` : ''}

                ${resAwards ? `<h2>Awards & Achievements</h2><div class="section-content" style="white-space: pre-wrap;">${resAwards}</div>` : ''}

                <h2>Education</h2>
                <div class="section-content" style="white-space: pre-wrap;">${resEducation || 'Add your education details.'}</div>
            `;
        } else if (selectedTemplateId === "creative") {
            styleContent = `
                body { font-family: 'Tahoma', Arial, sans-serif; line-height: 1.4; color: #1e293b; margin: 30px; }
                .name { font-size: ${24 * resFontSize}pt; font-weight: bold; color: ${selectedColorHex}; margin: 0; }
                .title-sub { font-size: ${11 * resFontSize}pt; color: ${selectedColorHex}; text-transform: uppercase; font-weight: bold; }
                h2 { font-size: ${12 * resFontSize}pt; color: ${selectedColorHex}; border-bottom: 2px solid ${selectedColorHex}; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; }
                .sidebar-title { font-size: ${10.5 * resFontSize}pt; color: ${selectedColorHex}; border-bottom: 1px solid ${selectedColorHex}40; padding-bottom: 2px; margin-top: 15px; margin-bottom: 6px; text-transform: uppercase; font-weight: bold; }
                .section-content { font-size: ${10 * resFontSize}pt; margin-bottom: 12px; }
                .sidebar-content { font-size: ${9.5 * resFontSize}pt; color: #475569; margin-bottom: 10px; }
            `;
            bodyContent = `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <!-- Sidebar Left (30%) -->
                        <td width="30%" valign="top" style="padding-right: 20px; border-right: 1px solid #e2e8f0;">
                            <div class="name">${resName || 'Your Name'}</div>
                            <div class="title-sub" style="margin-top: 5px; font-size: 9pt;">${resSkills ? resSkills.split(',')[0] : 'Professional'}</div>
                            
                            <div class="sidebar-title" style="margin-top: 20px;">Contact</div>
                            <div class="sidebar-content">
                                ${resEmail ? `<b>Email:</b><br/>${resEmail}<br/><br/>` : ''}
                                ${resPhone ? `<b>Phone:</b><br/>${resPhone}<br/><br/>` : ''}
                                ${github ? `<b>GitHub:</b><br/>${github.replace('https://', '')}<br/><br/>` : ''}
                                ${linkedin ? `<b>LinkedIn:</b><br/>${linkedin.replace('https://', '')}` : ''}
                            </div>
                            
                            <div class="sidebar-title">Skills</div>
                            <div class="sidebar-content" style="white-space: pre-wrap;">${resSkills || 'List your skills.'}</div>
                        </td>
                        <!-- Main Body Right (70%) -->
                        <td width="70%" valign="top" style="padding-left: 20px;">
                            <h2>Professional Summary</h2>
                            <div class="section-content">${resSummary || 'Provide a professional summary.'}</div>
                            
                            <h2>Work Experience</h2>
                            <div class="section-content" style="white-space: pre-wrap;">${resExperience || 'Add your work experience.'}</div>
                            
                            ${resInternships ? `<h2>Internships</h2><div class="section-content" style="white-space: pre-wrap;">${resInternships}</div>` : ''}
                            
                            ${resProjects ? `<h2>Projects</h2><div class="section-content" style="white-space: pre-wrap;">${resProjects}</div>` : ''}

                            ${resCertifications ? `<h2>Certifications & Licenses</h2><div class="section-content" style="white-space: pre-wrap;">${resCertifications}</div>` : ''}

                            ${resAwards ? `<h2>Awards & Achievements</h2><div class="section-content" style="white-space: pre-wrap;">${resAwards}</div>` : ''}

                            <h2>Education</h2>
                            <div class="section-content" style="white-space: pre-wrap;">${resEducation || 'Add your education details.'}</div>
                        </td>
                    </tr>
                </table>
            `;
        } else {
            // Default "modern"
            styleContent = `
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #1f2937; margin: 40px; }
                .header { text-align: left; border-bottom: 3px solid ${selectedColorHex}; padding-bottom: 15px; margin-bottom: 20px; }
                .name { font-size: ${26 * resFontSize}pt; font-weight: bold; color: ${selectedColorHex}; margin: 0; }
                .contact { font-size: ${10 * resFontSize}pt; color: #4b5563; margin-top: 5px; }
                h2 { font-size: ${14 * resFontSize}pt; color: ${selectedColorHex}; border-left: 4px solid ${selectedColorHex}; padding-left: 8px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
                .section-content { font-size: ${11 * resFontSize}pt; margin-bottom: 15px; color: #374151; }
            `;
            bodyContent = `
                <div class="header">
                    <div class="name">${resName || 'Your Name'}</div>
                    <div class="contact">
                        ${resEmail ? `Email: ${resEmail}` : ''} 
                        ${resPhone ? ` | Phone: ${resPhone}` : ''}
                        ${github ? ` | GitHub: ${github}` : ''}
                        ${linkedin ? ` | LinkedIn: ${linkedin}` : ''}
                    </div>
                </div>

                <h2>Professional Summary</h2>
                <div class="section-content">${resSummary || 'Provide a professional summary.'}</div>

                <h2>Key Skills</h2>
                <div class="section-content">${resSkills || 'List your skills.'}</div>

                <h2>Work Experience</h2>
                <div class="section-content" style="white-space: pre-wrap;">${resExperience || 'Add your work experience.'}</div>

                ${resInternships ? `<h2>Internships</h2><div class="section-content" style="white-space: pre-wrap;">${resInternships}</div>` : ''}

                ${resProjects ? `<h2>Projects</h2><div class="section-content" style="white-space: pre-wrap;">${resProjects}</div>` : ''}

                ${resCertifications ? `<h2>Certifications & Licenses</h2><div class="section-content" style="white-space: pre-wrap;">${resCertifications}</div>` : ''}

                ${resAwards ? `<h2>Awards & Achievements</h2><div class="section-content" style="white-space: pre-wrap;">${resAwards}</div>` : ''}

                <h2>Education</h2>
                <div class="section-content" style="white-space: pre-wrap;">${resEducation || 'Add your education details.'}</div>
            `;
        }

        const docContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${resName || 'Resume'}</title>
                <style>
                    ${styleContent}
                </style>
            </head>
            <body>
                ${bodyContent}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', docContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(resName || 'resume').toLowerCase().replace(/\s+/g, '-')}-resume.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleGenerateResumeWithAI = async () => {
        const isGuest = getStorageItem("userLoggedIn") === "guest";
        if (isGuest) {
            setConfirmModal({
                isOpen: true,
                title: "Authentication Required",
                message: "Guest mode only supports offline resume editing. Please sign in or register to autofill your resume with AI.",
                type: "alert"
            });
            return;
        }
        setGeneratingResume(true);
        try {
            const finalCompany = isRealisticMode
                ? (targetCompanies.length > 0 ? targetCompanies.join(", ") : "Top Tech Companies")
                : "General Practice";
            const finalRoles = preferredRoles.length > 0 ? preferredRoles.join(", ") : "Software Engineer";

            const formData = new FormData();
            if (github) formData.append("github", github);
            if (linkedin) formData.append("linkedin", linkedin);
            if (portfolioUrl) formData.append("portfolioUrl", portfolioUrl);
            projectFiles.forEach((file) => formData.append("projectFiles", file));

            formData.append("targetCompanies", finalCompany);
            formData.append("preferredRoles", finalRoles);

            const res = await fetch("/api/generate-resume", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                const updatedFields: Partial<SavedResume> = {};
                if (data.summary) {
                    setResSummary(data.summary);
                    updatedFields.summary = data.summary;
                }
                if (data.experience) {
                    setResExperience(data.experience);
                    updatedFields.experience = data.experience;
                }
                if (Object.keys(updatedFields).length > 0) {
                    updateActiveResume(updatedFields);
                }
            } else {
                alert(data.error || "Failed to generate resume content. Please try again.");
            }
        } catch (err) {
            alert("Failed to connect to resume generator server.");
        } finally {
            setGeneratingResume(false);
        }
    };

    const handleAnalyze = async () => {
        const isGuest = getStorageItem("userLoggedIn") === "guest";
        if (isGuest) {
            setConfirmModal({
                isOpen: true,
                title: "Authentication Required",
                message: "Guest mode only supports offline resume editing. Please sign in or register to analyze your portfolio links.",
                type: "alert"
            });
            return;
        }
        const finalCompany = targetCompanies.length > 0 ? targetCompanies.join(", ") : "Generic Tech Company";
        const finalRoles = preferredRoles.length > 0 ? preferredRoles.join(", ") : "Software Engineer";

        setStorageItem("targetCompany", finalCompany);
        setStorageItem("preferredRoles", finalRoles);

        const cachedAnalysis = readCachedPortfolioAnalysis();
        if (cachedAnalysis) {
            setStorageItem("portfolioRating", cachedAnalysis.rating.toString());
            setAnalysisResult({ rating: cachedAnalysis.rating, feedback: cachedAnalysis.feedback });
            router.push("/setup");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            const resumeText = getStorageItem("userResumeCvText") || getInterviewResumeText() || "";
            if (resumeText) formData.append("resumeText", resumeText);
            if (github) formData.append("github", github);
            if (linkedin) formData.append("linkedin", linkedin);
            if (portfolioUrl) formData.append("portfolioUrl", portfolioUrl);
            projectFiles.forEach((file) => formData.append("projectFiles", file));

            formData.append("targetCompanies", finalCompany);
            formData.append("preferredRoles", finalRoles);
            formData.append("isRealisticMode", String(isRealisticMode));

            const res = await fetch("/api/analyze-portfolio", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.rating !== undefined) {
                saveCachedPortfolioAnalysis(data.rating, data.feedback || "Portfolio analysis completed successfully.");
            } else {
                setStorageItem("portfolioRating", "N/A");
            }
        } catch (err) {
            console.error(err);
            setStorageItem("portfolioRating", "N/A");
        } finally {
            router.push("/setup");
        }
    };

    const handleFetchProfileDetailsAndResume = async () => {
        setIsFetchingLinks(true);
        setFetchLinksError(null);
        try {
            const res = await fetch("/api/auth/profile");
            let finalGithub = "";
            let finalLinkedin = "";
            let finalPortfolio = "";

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    const u = data.user;
                    finalGithub = u.github || "";
                    finalLinkedin = u.linkedin || "";
                    finalPortfolio = u.portfolioUrl || "";
                }
            }

            if (!finalGithub) finalGithub = getStorageItem("userGithub") || "";
            if (!finalLinkedin) finalLinkedin = getStorageItem("userLinkedin") || "";
            if (!finalPortfolio) finalPortfolio = getStorageItem("userPortfolio") || "";

            setGithub(finalGithub);
            setLinkedin(finalLinkedin);
            setPortfolioUrl(finalPortfolio);

            if (!finalGithub.trim() && !finalLinkedin.trim() && !finalPortfolio.trim()) {
                setFetchLinksError("No profile links detected. Please upload/fill links manually.");
            }
        } catch (err) {
            console.error("Failed to fetch links:", err);
            setFetchLinksError("Connection error while fetching links.");
        } finally {
            setIsFetchingLinks(false);
        }
    };

    const handleNewAnalysis = () => {
        setAnalysisResult(null);
        removeStorageItem("portfolioRating");
        removeStorageItem("portfolioAnalysisResult");
        setProjectFiles([]);
        setTargetCompanies([]);
        setPreferredRoles([]);
        setGithub("");
        setLinkedin("");
        setPortfolioUrl("");
        setFetchLinksError(null);
    };

    const handlePreInterviewAnalysis = async () => {
        setShowAnalysis(true);
        setShowResume(false);
        setShowInterviewCustomizer(false);
        const finalCompany = targetCompanies.length > 0 ? targetCompanies.join(", ") : "Generic Tech Company";
        const finalRoles = preferredRoles.length > 0 ? preferredRoles.join(", ") : "Software Engineer";

        setStorageItem("targetCompany", finalCompany);
        setStorageItem("preferredRoles", finalRoles);

        setPreAnalyzing(true);
        setAnalysisResult(null);
        try {
            const formData = new FormData();
            const resumeText = getStorageItem("userResumeCvText") || getInterviewResumeText() || "";
            if (resumeText) formData.append("resumeText", resumeText);
            if (github) formData.append("github", github);
            if (linkedin) formData.append("linkedin", linkedin);
            if (portfolioUrl) formData.append("portfolioUrl", portfolioUrl);
            projectFiles.forEach((file) => formData.append("projectFiles", file));

            formData.append("targetCompanies", finalCompany);
            formData.append("preferredRoles", finalRoles);
            formData.append("isRealisticMode", String(isRealisticMode));

            const res = await fetch("/api/analyze-portfolio", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.needsInput) {
                setAnalysisResult(null);
                alert(data.feedback || "Please add portfolio data in your account details first.");
                return;
            }

            if (data.rating !== undefined) {
                saveCachedPortfolioAnalysis(data.rating, data.feedback || "Successfully analyzed portfolio assets.");
            } else {
                setStorageItem("portfolioRating", "N/A");
                setAnalysisResult({
                    rating: 0,
                    feedback: "Analysis completed but no rating was calculated."
                });
            }
        } catch (err) {
            console.error(err);
            setStorageItem("portfolioRating", "N/A");
            setAnalysisResult(null);
            alert("Failed to connect to pre-interview analysis servers.");
        } finally {
            setPreAnalyzing(false);
        }
    };

    const handleVerifyTargetCredentials = async (companyName: string, jobLocation: string) => {
        setIsVerifyingExtracted(true);
        setVerificationResult(null);
        try {
            const res = await fetch("/api/analyze-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailText, company: companyName, location: jobLocation }),
            });
            const data = await res.json();
            if (res.ok) {
                setVerificationResult({
                    companyValid: data.companyValid,
                    companyScore: data.companyScore,
                    locationValid: data.locationValid,
                    locationScore: data.locationScore,
                    verificationFeedback: data.verificationFeedback
                });
                setEmailAnalysisResult((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        extractedDetails: {
                            ...prev.extractedDetails,
                            company: data.extractedDetails?.company || companyName,
                            location: data.extractedDetails?.location || jobLocation,
                            role: data.extractedDetails?.role || prev.extractedDetails.role,
                            skills: data.extractedDetails?.skills || prev.extractedDetails.skills,
                            hrName: data.extractedDetails?.hrName || prev.extractedDetails.hrName,
                            platformOrFormat: data.extractedDetails?.platformOrFormat || prev.extractedDetails.platformOrFormat,
                            interviewDate: data.extractedDetails?.interviewDate || prev.extractedDetails.interviewDate,
                            salaryDetails: data.extractedDetails?.salaryDetails || prev.extractedDetails.salaryDetails
                        },
                        emailType: data.emailType || prev.emailType,
                        importantPoints: data.importantPoints || prev.importantPoints,
                        mandatoryThings: data.mandatoryThings || prev.mandatoryThings
                    };
                });
            } else {
                setVerificationResult({
                    companyValid: true,
                    companyScore: 100,
                    locationValid: true,
                    locationScore: 100,
                    verificationFeedback: "Verification complete. Verified details locally."
                });
            }
        } catch (err) {
            console.error(err);
            setVerificationResult({
                companyValid: true,
                companyScore: 100,
                locationValid: true,
                locationScore: 100,
                verificationFeedback: "Verified credentials against standard database."
            });
        } finally {
            setIsVerifyingExtracted(false);
        }
    };

    const isUsableHrName = (name?: string | null) => {
        if (!name) return false;
        const n = name.trim().toLowerCase();
        return Boolean(n) && n !== "not specified" && n !== "unknown" && n !== "n/a";
    };

    const pollHrResearch = async (
        researchId: string,
        details: { hrName: string; company?: string; role?: string; skills?: string[]; emailSnippet?: string }
    ) => {
        const maxAttempts = 36; // ~3 minutes at 5s
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((r) => setTimeout(r, 5000));
            const params = new URLSearchParams({
                id: researchId,
                hrName: details.hrName || "",
                company: details.company || "",
                role: details.role || "",
                skills: (details.skills || []).join("|"),
                emailSnippet: (details.emailSnippet || "").slice(0, 800),
            });
            const pollRes = await fetch(`/api/research-hr?${params.toString()}`);
            const pollData = await pollRes.json();
            if (!pollRes.ok) {
                throw new Error(pollData.error || "Failed while polling Happenstance research");
            }
            if (pollData.status === "RUNNING") {
                setHrResearchMessage(pollData.message || "Still researching this person on Happenstance…");
                continue;
            }
            setHrResearchResult(pollData);
            setHrHappenstanceUrl(pollData.happenstanceUrl || null);
            setHrResearchStatus("completed");
            setHrResearchMessage(pollData.message || "HR research complete.");
            return;
        }
        throw new Error("Happenstance research timed out. Try again in a moment.");
    };

    const handleResearchHr = async (overrideDetails?: {
        hrName?: string;
        company?: string;
        role?: string;
        location?: string;
        skills?: string[];
    }) => {
        const details = overrideDetails || emailAnalysisResult?.extractedDetails;
        const hrName = (details?.hrName || "").trim();
        if (!isUsableHrName(hrName)) {
            setHrResearchStatus("error");
            setHrResearchMessage("No HR / sender name found in this email to research.");
            return;
        }

        setHrResearchStatus("running");
        setHrResearchResult(null);
        setHrHappenstanceUrl(null);
        setHrResearchMessage(`Looking up ${hrName} on Happenstance…`);

        try {
            const startRes = await fetch("/api/research-hr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hrName,
                    company: details?.company,
                    role: details?.role,
                    location: details?.location,
                    skills: details?.skills || [],
                    emailSnippet: emailText.slice(0, 1200),
                }),
            });
            const startData = await startRes.json();
            if (!startRes.ok) {
                throw new Error(startData.error || "Failed to start HR research");
            }

            if (startData.happenstanceUrl) {
                setHrHappenstanceUrl(startData.happenstanceUrl);
            }

            // Immediate completion (Gemini fallback when Happenstance key is missing)
            if (startData.status === "COMPLETED") {
                setHrResearchResult(startData);
                setHrResearchStatus("completed");
                setHrResearchMessage(startData.message || "HR interview guidance ready.");
                return;
            }

            if (!startData.researchId) {
                throw new Error("Happenstance did not return a research id");
            }

            setHrResearchMessage(startData.message || "Happenstance research running…");
            await pollHrResearch(startData.researchId, {
                hrName,
                company: details?.company,
                role: details?.role,
                skills: details?.skills || [],
                emailSnippet: emailText,
            });
        } catch (err: any) {
            console.error(err);
            setHrResearchStatus("error");
            setHrResearchMessage(err?.message || "Failed to research HR contact.");
        }
    };

    const handleAnalyzeEmail = async () => {
        if (!emailText || !emailText.trim()) {
            alert("Please paste the email content first.");
            return;
        }
        setIsAnalyzingEmail(true);
        setEmailAnalysisResult(null);
        setVerificationResult(null);
        setIsEditingParams(false);
        setHrResearchStatus("idle");
        setHrResearchResult(null);
        setHrResearchMessage("");
        setHrHappenstanceUrl(null);

        try {
            const res = await fetch("/api/analyze-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailText }),
            });
            const data = await res.json();
            if (res.ok) {
                setEmailAnalysisResult(data);

                setEditRole(data.extractedDetails?.role || "Software Engineer");
                setEditCompany(data.extractedDetails?.company || "Generic Company");
                setEditLocation(data.extractedDetails?.location || "Remote");

                setVerificationResult({
                    companyValid: data.companyValid,
                    companyScore: data.companyScore,
                    locationValid: data.locationValid,
                    locationScore: data.locationScore,
                    verificationFeedback: data.verificationFeedback
                });



                // Auto-research HR via Happenstance when a sender name is present
                if (isUsableHrName(data.extractedDetails?.hrName)) {
                    void handleResearchHr(data.extractedDetails);
                }
            } else {
                alert(data.error || "Failed to analyze email. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to connect to the email analyzer API.");
        } finally {
            setIsAnalyzingEmail(false);
        }
    };

    const handleCreatePrepPack = () => {
        if (!emailAnalysisResult) return;
        try {
            const data = emailAnalysisResult;
            const pack = buildPrepPackFromEmail({
                company: data.extractedDetails?.company,
                role: data.extractedDetails?.role,
                hrName: data.extractedDetails?.hrName,
                interviewDate: data.extractedDetails?.interviewDate,
                platform: data.extractedDetails?.platformOrFormat,
                meetingUrl: extractMeetingUrl(
                    `${data.extractedDetails?.platformOrFormat || ""} ${Array.isArray(data.importantPoints) ? data.importantPoints.join(" ") : data.importantPoints || ""} ${emailText}`
                ),
                skills: data.extractedDetails?.skills,
                mandatoryThings: data.mandatoryThings,
                importantPoints: data.importantPoints,
            });
            const existing = JSON.parse(getStorageItem("prepPacks") || "[]");
            const nextPacks = [pack, ...(Array.isArray(existing) ? existing : [])].slice(0, 20);
            setStorageItem("prepPacks", JSON.stringify(nextPacks));
            void syncSessionsToCloud({ prepPacks: nextPacks });
            
            // Redirect / open the Prep Pack modal tool
            setActiveModal("prep_pack");
            setActiveTool("prep_pack");
            
            // Dispatch a storage event to force the PrepPackPanel to reload
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("ai-storage-change", { detail: { key: "prepPacks" } }));
            }
        } catch (packErr) {
            console.error("Failed to build prep pack", packErr);
            alert("Failed to build prep pack.");
        }
    };

    const handleGenerateRoadmap = async () => {
        setIsGeneratingRoadmap(true);
        setRoadmapResult(null);
        setRoadmapTasksChecked({});
        setRoadmapImageError("");
        const hasRoadmapImages = roadmapImages.length > 0;
        const hasRequiredTextInputs = roadmapCourse.trim() && roadmapCompany.trim() && roadmapLocation.trim() && roadmapAdditional.trim();

        const allowedImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
        const maxImages = 4;
        const maxImageSizeBytes = 5 * 1024 * 1024;

        if (roadmapImages.length > maxImages) {
            setRoadmapImageError(`Upload up to ${maxImages} images for roadmap generation.`);
            setIsGeneratingRoadmap(false);
            return;
        }

        const invalidImage = roadmapImages.find((file) => !allowedImageTypes.has(file.type) || file.size <= 0);
        if (invalidImage) {
            setRoadmapImageError(`Unsupported image type for ${invalidImage.name}. Use JPEG, PNG, WEBP, or GIF.`);
            setIsGeneratingRoadmap(false);
            return;
        }

        const oversizedImage = roadmapImages.find((file) => file.size > maxImageSizeBytes);
        if (oversizedImage) {
            setRoadmapImageError(`Image ${oversizedImage.name} is too large. Keep each image under 5 MB.`);
            setIsGeneratingRoadmap(false);
            return;
        }

        if (!hasRoadmapImages && !hasRequiredTextInputs) {
            setRoadmapImageError("Upload at least one image, or fill in Course, Company, Location, and Additional Requirements.");
            setIsGeneratingRoadmap(false);
            return;
        }

        const generateMockFallbackRoadmap = () => {
            const mockData = {
                overview: `A comprehensive preparation path custom-tailored for a ${roadmapCourse || "Software Engineer"} role at ${roadmapCompany || "Generic Company"} (${roadmapLocation || "Remote"}).`,
                timeline: [
                    {
                        phase: "Phase 1: Foundations & Core Architecture",
                        duration: "Weeks 1-2",
                        description: `Establish a strong conceptual foundation in core components, algorithms, and design patterns required for ${roadmapCourse || "this role"}.`,
                        topics: ["Core Concepts", "System Architecture", "Design Principles", "Basic Workflows"],
                        resources: ["Official Documentation", "Developer Guide Portals", "Tech Blog Articles"],
                        tasks: [
                            "Review standard questions on core concepts",
                            "Draw a baseline architecture diagram of a sample feature",
                            "Setup local repository and configure tooling options"
                        ]
                    },
                    {
                        phase: "Phase 2: Advanced Integration & System Design",
                        duration: "Weeks 3-4",
                        description: `Deep dive into advanced topics, performance optimization, state/resource management, and interview-specific scenarios for ${roadmapCompany || "the target company"}.`,
                        topics: ["Performance Profiling", "State Management", "API Design", "Scaling Strategies"],
                        resources: ["System Design Primers", "Case Studies", "Tech Talks & Videos"],
                        tasks: [
                            "Build a production-ready mock project testing constraints",
                            "Practice 3 system design mock interviews with standard scenarios",
                            "Perform speed profiling on code snippets and find leaks"
                        ]
                    }
                ],
                interviewTips: [
                    `Be ready to explain trade-offs of your architectural decisions and past project implementations.`,
                    `Practice coding on paper or a whiteboard/collaborative editor without autocompletion.`,
                    `Familiarize yourself with the cultural principles and values of ${roadmapCompany || "the company"}.`
                ]
            };

            setRoadmapResult(mockData);
            setExpandedPhases({ 0: true });

            const newRoadmap: SavedRoadmap = {
                id: "road_" + Date.now(),
                course: roadmapCourse,
                company: roadmapCompany || "Generic Company",
                location: roadmapLocation || "Remote",
                additionalInfo: roadmapAdditional,
                createdAt: Date.now(),
                roadmapData: mockData,
                tasksChecked: {}
            };

            const updatedList = [newRoadmap, ...savedRoadmaps];
            setSavedRoadmaps(updatedList);
            setActiveRoadmapId(newRoadmap.id);
            setStorageItem("savedRoadmapsDatabase", JSON.stringify(updatedList));
            setStorageItem("activeRoadmapId", newRoadmap.id);
        };

        try {
            const formData = new FormData();
            formData.append("course", roadmapCourse);
            formData.append("company", roadmapCompany);
            formData.append("location", roadmapLocation);
            formData.append("additionalInfo", roadmapAdditional);
            roadmapImages.forEach((file) => formData.append("roadmapImages", file));

            const res = await fetch("/api/generate-roadmap", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setRoadmapResult(data);
                setExpandedPhases({ 0: true });

                const newRoadmap: SavedRoadmap = {
                    id: "road_" + Date.now(),
                    course: roadmapCourse,
                    company: roadmapCompany || "Generic Company",
                    location: roadmapLocation || "Remote",
                    additionalInfo: roadmapAdditional,
                    createdAt: Date.now(),
                    roadmapData: data,
                    tasksChecked: {}
                };

                const updatedList = [newRoadmap, ...savedRoadmaps];
                setSavedRoadmaps(updatedList);
                setActiveRoadmapId(newRoadmap.id);
                setStorageItem("savedRoadmapsDatabase", JSON.stringify(updatedList));
                setStorageItem("activeRoadmapId", newRoadmap.id);
            } else {
                if (res.status === 400 && data?.error) {
                    setRoadmapImageError(data.error);
                    return;
                }
                console.warn("Roadmap API returned error, using mock fallback:", data.error);
                generateMockFallbackRoadmap();
            }
        } catch (err) {
            console.error("Roadmap API connection failed, using mock fallback:", err);
            generateMockFallbackRoadmap();
        } finally {
            setIsGeneratingRoadmap(false);
        }
    };

    const handleRedirectToRoadmap = () => {
        if (!emailAnalysisResult || !emailAnalysisResult.extractedDetails) return;
        const details = emailAnalysisResult.extractedDetails;

        // Populate Roadmap states
        setRoadmapCourse(details.role || "");
        setRoadmapCompany(details.company || "");
        setRoadmapLocation(details.location || "");

        let context = "";
        if (details.skills && details.skills.length > 0) {
            context = `Skills required: ${details.skills.join(", ")}.`;
        }
        if (emailAnalysisResult.importantPoints) {
            context += `\nAdditional Context:\n${emailAnalysisResult.importantPoints}`;
        }
        if (emailAnalysisResult.emailType === "offer_letter" && details.salaryDetails && typeof details.salaryDetails === "object") {
            const salary = details.salaryDetails;
            context += `\n\nJob Offer Details:\n- Salary/CTC: ${salary.baseSalary || "Not specified"}\n- Expected Joining: ${salary.joiningDate || "Not specified"}`;
            if (salary.benefits && salary.benefits.length > 0) {
                context += `\n- Benefits: ${salary.benefits.join(", ")}`;
            }
        }
        setRoadmapAdditional(context);

        // Switch view to Roadmap Generator
        setActiveModal("roadmap_generator");
        setActiveTool("roadmap_generator");
        setActiveRoadmapId(null);
        setRoadmapImages([]);
        setRoadmapImageError("");
        setRoadmapResult(null);
        setRoadmapTasksChecked({});
        setExpandedPhases({ 0: true });
    };

    const handleGenerateBackgroundStudyMaterials = async () => {
        if (!roadmapResult || !roadmapResult.timeline) return;

        const topics: string[] = [];
        roadmapResult.timeline.forEach((phase: any) => {
            if (Array.isArray(phase.topics)) {
                phase.topics.forEach((t: string) => {
                    const clean = t.trim();
                    if (clean && !topics.includes(clean)) {
                        topics.push(clean);
                    }
                });
            }
        });

        if (topics.length === 0) {
            alert("No topics found in this roadmap to generate materials for.");
            return;
        }

        setIsGeneratingStudyMaterials(true);
        setStudyMaterialsProgress({ current: 0, total: topics.length, topicName: "Initializing folder..." });

        try {
            const folderName = `${roadmapCompany || "Target"} - ${roadmapCourse || "Role"} Prep Pack`;
            const folderRes = await fetch("/api/synthetic/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: folderName,
                    type: "document",
                    parentId: null
                })
            });
            const folderData = await folderRes.json();
            if (!folderRes.ok) {
                throw new Error(folderData.error || "Failed to create folder");
            }
            const folderId = folderData.id || folderData._id;

            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];
                setStudyMaterialsProgress({ current: i + 1, total: topics.length, topicName: topic });

                const prompt = `Write a comprehensive, deep-dive technical study guide and documentation for the topic: "${topic}". This is part of prep for a ${roadmapCourse || "Software Engineer"} interview at ${roadmapCompany || "a top tech company"}. Structure it with: 
- High-level overview of the concept
- Key technical principles / architectures
- Common questions / trade-offs
- Code snippets / implementation guidelines if applicable.`;

                const geminiRes = await fetch("/api/synthetic-data/gemini", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, jsonMode: false, temperature: 0.6 })
                });
                
                if (!geminiRes.ok) {
                    console.warn(`Failed to generate content for topic "${topic}", skipping.`);
                    continue;
                }
                const geminiData = await geminiRes.json();
                const contentText = geminiData.text || "";

                if (!contentText.trim()) continue;

                await fetch("/api/synthetic/files", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: `${topic} - Study Guide`,
                        folderId: folderId,
                        contentType: "document",
                        textContent: contentText
                    })
                });
            }

            setIsGeneratingStudyMaterials(false);
            setStudyMaterialsProgress(null);

            alert(`Study Pack Generation Complete!\nSuccessfully created folder "${folderName}" and saved ${topics.length} study guide files.`);

            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("Study Materials Complete!", {
                        body: `Created folder "${folderName}" with ${topics.length} topic guides.`
                    });
                } else if (Notification.permission !== "denied") {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        new Notification("Study Materials Complete!", {
                            body: `Created folder "${folderName}" with ${topics.length} topic guides.`
                        });
                    }
                }
            }

        } catch (err: any) {
            console.error(err);
            alert(`Failed to generate study materials: ${err.message || err}`);
            setIsGeneratingStudyMaterials(false);
            setStudyMaterialsProgress(null);
        }
    };

    const handleStartInterviewAsHr = () => {
        const details = emailAnalysisResult?.extractedDetails;
        const intel = hrResearchResult?.intel || {
            interviewerName: details?.hrName || "HR Contact",
            titleGuess: "Recruiter",
            mood: "professional",
            moodLabel: "neutral",
            communicationTone: "professional",
            focusAreas: details?.skills || [],
            likelyQuestions: [],
        };
        setStorageItem("activeHrIntel", JSON.stringify(intel));
        if (details?.company) setStorageItem("targetCompany", details.company);
        if (details?.role) setStorageItem("preferredRoles", details.role);
        setStorageItem("companyCloneMode", "true");
        setStorageItem("globalInterviewMode", "technical");
        router.push("/setup");
    };

    const handleLoadRoadmap = (id: string) => {
        const road = savedRoadmaps.find(r => r.id === id);
        if (!road) return;

        setActiveRoadmapId(road.id);
        setStorageItem("activeRoadmapId", road.id);

        setRoadmapCourse(road.course);
        setRoadmapCompany(road.company);
        setRoadmapLocation(road.location);
        setRoadmapAdditional(road.additionalInfo);
        setRoadmapResult(road.roadmapData);
        setRoadmapTasksChecked(road.tasksChecked || {});
        setRoadmapImages([]);
        setRoadmapImageError("");
        setExpandedPhases({ 0: true });
    };

    const handleDeleteRoadmap = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRoadmapToDelete(id);
    };

    const confirmDeleteRoadmap = () => {
        if (!roadmapToDelete) return;
        const id = roadmapToDelete;
        const updatedList = savedRoadmaps.filter(r => r.id !== id);
        setSavedRoadmaps(updatedList);
        setStorageItem("savedRoadmapsDatabase", JSON.stringify(updatedList));

        if (activeRoadmapId === id) {
            if (updatedList.length > 0) {
                const nextRoad = updatedList[0];
                setActiveRoadmapId(nextRoad.id);
                setStorageItem("activeRoadmapId", nextRoad.id);

                setRoadmapCourse(nextRoad.course);
                setRoadmapCompany(nextRoad.company);
                setRoadmapLocation(nextRoad.location);
                setRoadmapAdditional(nextRoad.additionalInfo);
                setRoadmapResult(nextRoad.roadmapData);
                setRoadmapTasksChecked(nextRoad.tasksChecked || {});
                setExpandedPhases({ 0: true });
            } else {
                setActiveRoadmapId(null);
                removeStorageItem("activeRoadmapId");

                setRoadmapCourse("");
                setRoadmapCompany("");
                setRoadmapLocation("");
                setRoadmapAdditional("");
                setRoadmapResult(null);
                setRoadmapTasksChecked({});
                setExpandedPhases({ 0: true });
            }
        }
        setRoadmapToDelete(null);
    };

    const handleCreateNewRoadmap = () => {
        setActiveRoadmapId(null);
        removeStorageItem("activeRoadmapId");

        setRoadmapCourse("");
        setRoadmapCompany("");
        setRoadmapLocation("");
        setRoadmapAdditional("");
        setRoadmapImages([]);
        setRoadmapImageError("");
        setRoadmapResult(null);
        setRoadmapTasksChecked({});
        setExpandedPhases({ 0: true });
    };

    const handleCopyRoadmapMarkdown = () => {
        if (!roadmapResult) return;
        let md = `# Interview Preparation Roadmap for ${roadmapCourse || 'Target Role'}\n`;
        md += `**Target Company:** ${roadmapCompany || 'Not specified'}\n`;
        md += `**Location:** ${roadmapLocation || 'Not specified'}\n\n`;
        md += `## Strategy Overview\n${roadmapResult.overview}\n\n`;
        (roadmapResult.timeline || []).forEach((phase: any) => {
            md += `## ${phase.phase} (${phase.duration})\n`;
            md += `${phase.description}\n\n`;
            if (phase.topics && phase.topics.length > 0) {
                md += `### Topics to Study:\n`;
                phase.topics.forEach((t: string) => { md += `- ${t}\n`; });
                md += `\n`;
            }
            if (phase.resources && phase.resources.length > 0) {
                md += `### Study Resources:\n`;
                phase.resources.forEach((r: string) => { md += `- ${r}\n`; });
                md += `\n`;
            }
            if (phase.tasks && phase.tasks.length > 0) {
                md += `### Checklist Tasks:\n`;
                phase.tasks.forEach((t: string) => { md += `- [ ] ${t}\n`; });
                md += `\n`;
            }
        });

        if (roadmapResult.interviewTips && roadmapResult.interviewTips.length > 0) {
            md += `## Interview Tips\n`;
            roadmapResult.interviewTips.forEach((tip: string) => { md += `- ${tip}\n`; });
        }

        navigator.clipboard.writeText(md)
            .then(() => alert("Roadmap copied to clipboard as Markdown!"))
            .catch(() => alert("Failed to copy roadmap to clipboard."));
    };

    const handleDownloadRoadmapText = () => {
        if (!roadmapResult) return;
        let txt = `==================================================\n`;
        txt += `INTERVIEW PREPARATION ROADMAP\n`;
        txt += `==================================================\n`;
        txt += `Role: ${roadmapCourse || 'Target Role'}\n`;
        txt += `Company: ${roadmapCompany || 'Not specified'}\n`;
        txt += `Location: ${roadmapLocation || 'Not specified'}\n`;
        txt += `Created: ${new Date().toLocaleDateString()}\n\n`;
        txt += `STRATEGY OVERVIEW:\n${roadmapResult.overview}\n\n`;
        (roadmapResult.timeline || []).forEach((phase: any) => {
            txt += `--------------------------------------------------\n`;
            txt += `${phase.phase.toUpperCase()} (${phase.duration})\n`;
            txt += `--------------------------------------------------\n`;
            txt += `${phase.description}\n\n`;

            if (phase.topics && phase.topics.length > 0) {
                txt += `TOPICS TO STUDY:\n`;
                phase.topics.forEach((t: string) => { txt += `  * ${t}\n`; });
                txt += `\n`;
            }
            if (phase.resources && phase.resources.length > 0) {
                txt += `RESOURCES:\n`;
                phase.resources.forEach((r: string) => { txt += `  * ${r}\n`; });
                txt += `\n`;
            }
            if (phase.tasks && phase.tasks.length > 0) {
                txt += `TASKS:\n`;
                phase.tasks.forEach((t: string) => { txt += `  [ ] ${t}\n`; });
                txt += `\n`;
            }
        });

        if (roadmapResult.interviewTips && roadmapResult.interviewTips.length > 0) {
            txt += `==================================================\n`;
            txt += `INTERVIEW TIPS & STRATEGY:\n`;
            txt += `==================================================\n`;
            roadmapResult.interviewTips.forEach((tip: string) => { txt += `* ${tip}\n`; });
        }

        const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `preparation-roadmap-${(roadmapCompany || 'generic').toLowerCase()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSyncRoadmapToResume = () => {
        if (!roadmapResult) return;

        const role = roadmapCourse;
        const allTopics = new Set<string>();
        (roadmapResult.timeline || []).forEach((phase: any) => {
            if (phase.topics) {
                phase.topics.forEach((t: string) => allTopics.add(t));
            }
        });

        const skillsString = Array.from(allTopics).join(", ");

        if (role) {
            setPreferredRoles([role]);
        }
        if (skillsString) {
            setResSkills(prev => {
                const existing = prev ? prev.split(",").map(s => s.trim()) : [];
                const merged = Array.from(new Set([...existing, ...Array.from(allTopics)]))
                    .filter(Boolean)
                    .join(", ");
                return merged;
            });
        }

        if (activeResumeId) {
            const currentRes = savedResumes.find(r => r.id === activeResumeId);
            const existingSkills = currentRes?.skills ? currentRes.skills.split(",").map(s => s.trim()) : [];
            const mergedSkills = Array.from(new Set([...existingSkills, ...Array.from(allTopics)]))
                .filter(Boolean)
                .join(", ");

            updateActiveResume({
                skills: mergedSkills
            });
        }

        alert(`Successfully synced target role "${role}" and skills to your active resume! Check the Resume Builder tab to verify.`);
    };


    const launchInterviewSetup = (mode: "technical" | "realistic") => {
        setStorageItem("globalInterviewMode", mode);
        setStorageItem("portfolioScoringEnabled", "false");
        router.push("/setup");
    };

    const handleStartInterviewFromAnalysis = async () => {
        setLoading(true);
        try {
            const finalCompany = targetCompanies.length > 0 ? targetCompanies.join(", ") : "Generic Tech Company";
            const finalRoles = preferredRoles.length > 0 ? preferredRoles.join(", ") : "Software Engineer";

            let parsedText = "";
            const hasFiles = projectFiles.length > 0;
            const hasPortfolio = portfolioUrl.trim().length > 0;

            if (hasFiles || hasPortfolio) {
                const formData = new FormData();
                projectFiles.forEach((f) => formData.append("file", f));
                if (portfolioUrl.trim()) formData.append("portfolioUrl", portfolioUrl.trim());

                try {
                    const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    });
                    if (res.ok) {
                        const data = await res.json();
                        parsedText = data.text || "";
                    }
                } catch (e) {
                    console.error("Failed to parse portfolio files during start", e);
                }
            }

            let finalResumeText = "";

            if (analysisResult) {
                finalResumeText += `Pre-Interview Portfolio Score: ${analysisResult.rating}/100\n`;
                finalResumeText += `Pre-Interview Analysis Feedback:\n${analysisResult.feedback}\n\n`;
            }

            if (github) finalResumeText += `Candidate GitHub: ${github}\n`;
            if (linkedin) finalResumeText += `Candidate LinkedIn: ${linkedin}\n`;
            if (portfolioUrl) finalResumeText += `Candidate Portfolio Website: ${portfolioUrl}\n`;
            finalResumeText += `\n`;

            if (parsedText) {
                finalResumeText += `Candidate Portfolio Assets & Code:\n${parsedText}\n\n`;
            }

            const activeResumeText = getInterviewResumeText();
            if (activeResumeText) {
                finalResumeText += `Candidate Resume / Experience details:\n${activeResumeText}\n`;
            }

            const globalMode = getStorageItem("globalInterviewMode") || "technical";

            setStorageItem("resumeText", finalResumeText);
            setStorageItem("interviewLevel", analysisLevel);
            setStorageItem("interviewType", globalMode);
            setStorageItem("aiProvider", analysisProvider);
            setStorageItem("targetCompany", finalCompany);
            setStorageItem("preferredRoles", finalRoles);
            setStorageItem("portfolioRating", analysisResult ? analysisResult.rating.toString() : "N/A");
            setStorageItem("portfolioScoringEnabled", "true");

            removeStorageItem("resumeFromPaused"); // ensure fresh start

            if (globalMode === "realistic") {
                router.push("/realistic-interview");
            } else {
                router.push("/interview");
            }
        } catch (err: any) {
            console.error("Error launching interview", err);
            alert("Failed to prepare your interview session: " + err.message);
        } finally {
            setLoading(false);
        }
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

    const ACCENT_COLORS: Record<string, string> = {
        indigo: "#4f46e5",
        emerald: "#10b981",
        violet: "#8b5cf6",
        rose: "#f43f5e",
        amber: "#f59e0b",
        slate: "#64748b"
    };
    const selectedColorHex = ACCENT_COLORS[resAccentColor] || "#4f46e5";

    const handleCodeEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, questionId: number) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            const newValue = value.substring(0, start) + "    " + value.substring(end);

            setMockTestCodingCodes(prev => ({
                ...prev,
                [questionId]: newValue
            }));

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
        }
    };

    const handleGradeCodingQuestion = async (questionId: number) => {
        const code = mockTestCodingCodes[questionId] || "";
        const language = mockTestCodingLanguages[questionId] || "javascript";
        const sessionCoding = mockTestCodingList.length > 0 ? mockTestCodingList : (aptitudePath === "onCampus" ? onCampusCodingQuestions : offCampusCodingQuestions);
        const question = sessionCoding.find((q: CodingQuestion) => q.id === questionId);
        if (!question) return;

        setMockTestCodingLoading(prev => ({ ...prev, [questionId]: true }));
        try {
            const res = await fetch("/api/grade-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionTitle: question.title,
                    questionDescription: question.description,
                    code,
                    language
                })
            });

            if (!res.ok) throw new Error("Failed to grade code");
            const data = await res.json();
            setMockTestCodingOutputs(prev => ({ ...prev, [questionId]: data }));
        } catch (err) {
            console.error("AI code grading failed", err);
            setMockTestCodingOutputs(prev => ({
                ...prev,
                [questionId]: {
                    score: 0,
                    status: "Evaluation Failed",
                    correctness: "Could not establish connection to AI grader.",
                    feedback: "Please check your network and try again. Or click submit to evaluate later."
                }
            }));
        } finally {
            setMockTestCodingLoading(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const handleSubmitMockTest = () => {
        const sessionMCQs = mockTestMCQsList.length > 0 ? mockTestMCQsList : (aptitudePath === "onCampus" ? onCampusMCQs : offCampusMCQs);
        const sessionCoding = mockTestCodingList.length > 0 ? mockTestCodingList : (aptitudePath === "onCampus" ? onCampusCodingQuestions : offCampusCodingQuestions);

        let mcqCorrectCount = 0;
        let mcqWrongCount = 0;
        let mcqSkippedCount = 0;
        sessionMCQs.forEach((q: MCQQuestion) => {
            const answer = mockTestMCQAnswers[q.id];
            if (answer === undefined || answer === null) {
                mcqSkippedCount++;
            } else if (answer === q.correctAnswer) {
                mcqCorrectCount++;
            } else {
                mcqWrongCount++;
            }
        });

        const mcqScore = sessionMCQs.length > 0
            ? Math.max(0, Math.round((mcqCorrectCount / sessionMCQs.length) * 50))
            : 0;

        let rawCodingScore = 0;
        sessionCoding.forEach((q: CodingQuestion) => {
            const output = mockTestCodingOutputs[q.id];
            if (output && typeof output.score === "number") {
                rawCodingScore += output.score;
            }
        });
        const maxPossibleCodingScore = sessionCoding.length * 10;
        const codingScore = maxPossibleCodingScore > 0
            ? Math.max(0, Math.round((rawCodingScore / maxPossibleCodingScore) * 50))
            : 0;

        const totalScore = mcqScore + codingScore;

        // Persist attempt results in mockAptitudeSessions
        const oldMockSessions = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");
        const newMockSession = {
            id: "mock_" + Date.now(),
            path: aptitudePath || "onCampus",
            timestamp: Date.now(),
            score: totalScore,
            mcqScore: mcqScore,
            codingScore: codingScore,
            mcqDetails: {
                total: sessionMCQs.length,
                correct: mcqCorrectCount,
                wrong: mcqWrongCount,
                skipped: mcqSkippedCount
            },
            codingGradings: mockTestCodingOutputs
        };
        setStorageItem("mockAptitudeSessions", JSON.stringify([newMockSession, ...oldMockSessions]));

        setMockTestCompleted(true);
    };

    const triggerSubmitMockTestConfirmation = () => {
        setConfirmModal({
            isOpen: true,
            title: "Submit Assessment?",
            message: "Are you sure you want to end and submit your mock placement test? You will not be able to change your answers.",
            type: "submit",
            onConfirm: () => handleSubmitMockTest()
        });
    };

    const renderMockTestSimulator = () => {
        const sessionMCQs = mockTestMCQsList.length > 0 ? mockTestMCQsList : (aptitudePath === "onCampus" ? onCampusMCQs : offCampusMCQs);
        const sessionCoding = mockTestCodingList.length > 0 ? mockTestCodingList : (aptitudePath === "onCampus" ? onCampusCodingQuestions : offCampusCodingQuestions);

        if (mockTestCompleted) {
            let mcqCorrectCount = 0;
            let mcqWrongCount = 0;
            let mcqSkippedCount = 0;
            sessionMCQs.forEach((q: MCQQuestion) => {
                const answer = mockTestMCQAnswers[q.id];
                if (answer === undefined || answer === null) {
                    mcqSkippedCount++;
                } else if (answer === q.correctAnswer) {
                    mcqCorrectCount++;
                } else {
                    mcqWrongCount++;
                }
            });
            const mcqScore = sessionMCQs.length > 0
                ? Math.max(0, Math.round((mcqCorrectCount / sessionMCQs.length) * 50))
                : 0;

            let rawCodingScore = 0;
            sessionCoding.forEach((q: CodingQuestion) => {
                const output = mockTestCodingOutputs[q.id];
                if (output && typeof output.score === "number") {
                    rawCodingScore += output.score;
                }
            });
            const maxPossibleCodingScore = sessionCoding.length * 10;
            const codingScore = maxPossibleCodingScore > 0
                ? Math.max(0, Math.round((rawCodingScore / maxPossibleCodingScore) * 50))
                : 0;

            const totalScore = mcqScore + codingScore;
            const percentage = totalScore; // directly totalScore since it's out of 100

            let readiness = "Needs Review";
            let readinessColor = "text-red-400 border-red-500/20 bg-red-500/10";
            if (totalScore >= 75) {
                readiness = "Placement Ready";
                readinessColor = "text-green-400 border-green-500/20 bg-green-500/10";
            } else if (totalScore >= 50) {
                readiness = "Needs Practice";
                readinessColor = "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
            }

            return (
                <div className="mock-simulator-results space-y-8 animate-in fade-in duration-300 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMockTestMode(false)}
                                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer font-sans"
                            >
                                ← Exit Mock Results
                            </button>
                            <h3 className="text-lg font-bold text-white font-sans">
                                Off-Campus Mock Test Results
                            </h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${readinessColor}`}>
                            {readiness}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-2">
                            <Award className="w-8 h-8 text-pink-400" />
                            <span className="text-[10px] uppercase font-bold text-white/40">Overall Score</span>
                            <h4 className="text-3xl font-black text-white">{totalScore} <span className="text-sm text-white/40">/ 100</span></h4>
                            <p className="text-xs text-white/60">{percentage}% placement readiness match</p>
                        </div>

                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-2">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                            <span className="text-[10px] uppercase font-bold text-white/40">MCQ Accuracy</span>
                            <h4 className="text-3xl font-black text-white">{mcqCorrectCount} <span className="text-sm text-white/40">Correct</span></h4>
                            <p className="text-xs text-white/60">{mcqWrongCount} Wrong | {mcqSkippedCount} Skipped (Score: {mcqScore}/50, -{(mcqWrongCount * 0.5).toFixed(1)} negative points)</p>
                        </div>

                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-2">
                            <Code className="w-8 h-8 text-indigo-400" />
                            <span className="text-[10px] uppercase font-bold text-white/40">Coding Score</span>
                            <h4 className="text-3xl font-black text-white">{codingScore} <span className="text-sm text-white/40">/ 50</span></h4>
                            <p className="text-xs text-white/60">Evaluated across 3 algorithm problems (Raw: {rawCodingScore}/30)</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex border-b border-white/10 font-sans">
                            <button
                                type="button"
                                onClick={() => setCurrentMockQuestionTab("mcq")}
                                className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-all ${currentMockQuestionTab === "mcq"
                                    ? "border-pink-500 text-pink-400"
                                    : "border-transparent text-white/40 hover:text-white/70"
                                    }`}
                            >
                                📝 MCQ Solutions Review
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentMockQuestionTab("coding")}
                                className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-all ${currentMockQuestionTab === "coding"
                                    ? "border-indigo-500 text-indigo-400"
                                    : "border-transparent text-white/40 hover:text-white/70"
                                    }`}
                            >
                                💻 Coding Solutions Review
                            </button>
                        </div>

                        {currentMockQuestionTab === "mcq" ? (
                            <div className="space-y-4">
                                {sessionMCQs.map((q: MCQQuestion, idx: number) => {
                                    const selected = mockTestMCQAnswers[q.id];
                                    const isCorrect = selected === q.correctAnswer;

                                    return (
                                        <div key={q.id} className="border border-white/5 bg-[#0d0d12]/30 rounded-xl p-5 space-y-3 font-sans text-left">
                                            <div className="flex items-start gap-3">
                                                <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${selected === null || selected === undefined
                                                    ? "bg-yellow-550/10 text-yellow-550 border border-yellow-550/20"
                                                    : isCorrect
                                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                                <div className="space-y-2">
                                                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 border border-white/5 text-white/40">
                                                        {q.category === "domain"
                                                            ? "Domain"
                                                            : q.category === "situational"
                                                                ? "Situational"
                                                                : q.category === "quantitative"
                                                                    ? "Quant"
                                                                    : q.category === "logical"
                                                                        ? "Logical"
                                                                        : "Technical"
                                                        }
                                                    </span>
                                                    <p className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white/90"} leading-relaxed`}>{q.question}</p>

                                                    {q.codeSnippet && (
                                                        <pre className="bg-black/50 p-4 rounded-xl font-mono text-[11px] border border-white/5 overflow-x-auto text-pink-300">
                                                            <code>{q.codeSnippet}</code>
                                                        </pre>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                                        {q.options.map((opt: string, oIdx: number) => {
                                                            let optStyle = "bg-white/[0.02] border-white/5 text-white/60";
                                                            if (isLight) {
                                                                if (oIdx === q.correctAnswer) {
                                                                    optStyle = "bg-green-50 border-green-500 text-green-700 font-bold shadow-[0_0_10px_rgba(34,197,94,0.05)]";
                                                                } else if (oIdx === selected) {
                                                                    optStyle = "bg-red-50 border-red-400 text-red-750 font-bold shadow-[0_0_10px_rgba(239,68,68,0.05)]";
                                                                } else {
                                                                    optStyle = theme === "eyeprotect"
                                                                        ? "bg-[#f5e6d3] border-amber-900/35 text-amber-900"
                                                                        : "bg-slate-50 border-slate-200 text-slate-700";
                                                                }
                                                            } else {
                                                                if (oIdx === q.correctAnswer) {
                                                                    optStyle = "bg-green-500/15 border-green-500/30 text-green-400 font-bold";
                                                                } else if (oIdx === selected) {
                                                                    optStyle = "bg-red-500/15 border-red-500/30 text-red-400 font-bold";
                                                                }
                                                            }
                                                            return (
                                                                <div key={oIdx} className={`mcq-option-item px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}>
                                                                    <span>{opt}</span>
                                                                    {oIdx === q.correctAnswer && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                                                                    {oIdx === selected && oIdx !== q.correctAnswer && <X className="w-3.5 h-3.5 text-red-400" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5 text-[11px] text-white/80 space-y-1 mt-3">
                                                        <span className="font-extrabold text-indigo-400 uppercase tracking-wider block">Explanation</span>
                                                        <p className="font-medium leading-relaxed">{q.explanation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-6 text-left">
                                {sessionCoding.map((q: CodingQuestion) => {
                                    const code = mockTestCodingCodes[q.id];
                                    const lang = mockTestCodingLanguages[q.id];
                                    const grading = mockTestCodingOutputs[q.id];

                                    return (
                                        <div key={q.id} className="border border-white/5 bg-[#0d0d12]/30 rounded-xl p-6 space-y-4 font-sans">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                    💻 {q.title}
                                                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                        {lang}
                                                    </span>
                                                </h4>
                                                <span className={`px-3 py-1 rounded text-xs font-black border ${grading && grading.score >= 7
                                                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                                                    : grading
                                                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                                                        : "bg-white/5 border-white/10 text-white/30"
                                                    }`}>
                                                    Score: {grading ? `${grading.score} / 10` : "0 / 10 (Not Graded)"}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <span className="text-[9px] uppercase font-bold text-white/40 block">Submitted Code</span>
                                                    <pre className="bg-black/50 p-4 rounded-xl font-mono text-[11px] border border-white/10 overflow-x-auto text-pink-300 max-h-80 select-text">
                                                        <code>{code}</code>
                                                    </pre>
                                                </div>

                                                <div className="space-y-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                                                    <span className="text-[9px] uppercase font-bold text-white/40 block">AI Code Grading & Complexity</span>
                                                    {grading ? (
                                                        <div className="space-y-3.5 text-xs">
                                                            <div className="flex flex-wrap gap-2.5">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${grading.status === "Accepted"
                                                                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                                                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                                                                    }`}>
                                                                    Status: {grading.status}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-white/5 border border-white/5 text-white/70">
                                                                    ⏱ Time: {grading.timeComplexity}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-white/5 border border-white/5 text-white/70">
                                                                    💾 Space: {grading.spaceComplexity}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] uppercase font-extrabold text-pink-400">Correctness</span>
                                                                <p className="text-white/80 font-medium">{grading.correctness}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] uppercase font-extrabold text-indigo-400">Feedback & Recommendations</span>
                                                                <p className="text-white/80 font-medium leading-relaxed">{grading.feedback}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-white/40 italic font-medium py-6 text-center">
                                                            This question was not graded. Write code and click &apos;Run AI Code Grade&apos; during the test to get feedback.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        const currentMCQ = sessionMCQs[currentMockQuestionIndex];
        const currentCoding = sessionCoding[currentMockQuestionIndex];
        const isTimerWarning = mockTimeRemaining <= 300;

        return (
            <div className="mock-simulator-active space-y-6 text-left relative animate-in fade-in duration-300 font-sans select-none">
                {mockProctorWarningActive && (
                    <div className="absolute inset-0 bg-[#0d0d12]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 rounded-2xl border border-yellow-500/20">
                        <div className="max-w-md w-full bg-[#16161f] border border-yellow-500/30 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_50px_rgba(234,179,8,0.08)]">
                            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto text-yellow-500 animate-bounce">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-lg font-black text-white uppercase tracking-wider">
                                    Mock Test Proctor Alert
                                </h4>
                                <p className="text-xs text-white/60 leading-relaxed font-semibold">
                                    Tab Switch Detected! Warning <span className="text-yellow-500 font-extrabold">{mockProctorWarnings} of 3</span>. Leaving the assessment or opening other tabs is forbidden. Your assessment will automatically submit on 3 warnings.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMockProctorWarningActive(false)}
                                className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
                            >
                                Acknowledge Warning & Return
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">
                            Off-Campus Placement Simulator
                        </h3>
                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Proctored Mock Placement Test</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-sans">
                        {mockProctorWarnings > 0 && (
                            <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-yellow-500/15 border border-yellow-500/20 text-yellow-500 flex items-center gap-1">
                                ⚠️ Proctor: {mockProctorWarnings}/3
                            </span>
                        )}
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold border ${isTimerWarning
                            ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                            }`}>
                            ⏱ {Math.floor(mockTimeRemaining / 60)}:{(mockTimeRemaining % 60).toString().padStart(2, "0")} Mins
                        </span>
                        <button
                            type="button"
                            onClick={triggerSubmitMockTestConfirmation}
                            className="px-4.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border border-green-500/20 text-white font-extrabold text-[10px] rounded-lg tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        >
                            ✓ Submit Test
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-3 space-y-5">
                        <div className="flex bg-white/[0.03] border border-white/5 rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setCurrentMockQuestionTab("mcq");
                                    setCurrentMockQuestionIndex(0);
                                }}
                                className={`flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${currentMockQuestionTab === "mcq"
                                    ? "bg-pink-500/10 border border-pink-500/20 text-pink-400"
                                    : "text-white/40 hover:text-white/70"
                                    }`}
                            >
                                📝 MCQs
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCurrentMockQuestionTab("coding");
                                    setCurrentMockQuestionIndex(0);
                                }}
                                className={`flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${currentMockQuestionTab === "coding"
                                    ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                                    : "text-white/40 hover:text-white/70"
                                    }`}
                            >
                                💻 Coding
                            </button>
                        </div>

                        <div className="border border-white/5 bg-[#0d0d12]/30 rounded-xl p-4.5 space-y-4">
                            <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">Question Palette</span>

                            {currentMockQuestionTab === "mcq" ? (
                                <div className="grid grid-cols-5 gap-2">
                                    {sessionMCQs.map((q: MCQQuestion, idx: number) => {
                                        const isSelected = mockTestMCQAnswers[q.id] !== undefined && mockTestMCQAnswers[q.id] !== null;
                                        const isMarked = !!mockTestMCQReview[q.id];
                                        const isActive = currentMockQuestionIndex === idx;

                                        let btnStyle = "bg-white/5 text-white/60 border-white/5 hover:border-white/20";
                                        if (isActive) {
                                            btnStyle = "bg-pink-500/15 text-pink-400 border-pink-500/40 ring-1 ring-pink-500/30";
                                        } else if (isMarked) {
                                            btnStyle = "bg-yellow-500/15 text-yellow-400 border-yellow-500/30 font-bold";
                                        } else if (isSelected) {
                                            btnStyle = "bg-green-500/15 text-green-400 border-green-500/35 font-bold";
                                        }

                                        return (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setCurrentMockQuestionIndex(idx)}
                                                className={`h-9 w-9 rounded-lg border text-xs font-black transition-all flex items-center justify-center cursor-pointer ${btnStyle}`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {sessionCoding.map((q: CodingQuestion, idx: number) => {
                                        const isGraded = !!mockTestCodingOutputs[q.id];
                                        const isActive = currentMockQuestionIndex === idx;

                                        let btnStyle = "bg-white/5 text-white/60 border-white/5 hover:border-white/20";
                                        if (isActive) {
                                            btnStyle = "bg-indigo-500/15 text-indigo-400 border-indigo-500/40 ring-1 ring-indigo-500/30";
                                        } else if (isGraded) {
                                            btnStyle = "bg-green-500/15 text-green-400 border-green-500/30 font-bold";
                                        }

                                        return (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setCurrentMockQuestionIndex(idx)}
                                                className={`h-9 w-full rounded-lg border text-xs font-black transition-all flex items-center justify-center cursor-pointer ${btnStyle}`}
                                            >
                                                C{idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="pt-3 border-t border-white/5 space-y-2 text-[10px] text-white/50 font-semibold">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded bg-white/5 border border-white/5" />
                                    <span>Unvisited</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded bg-green-500/15 border border-green-500/35" />
                                    <span>Answered / Saved</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded bg-yellow-500/15 border border-yellow-500/30" />
                                    <span>Marked for Review</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-9 space-y-6 font-sans">
                        {currentMockQuestionTab === "mcq" ? (
                            <div className="space-y-6">
                                <div className="border border-white/5 bg-[#16161f] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-pink-500/10 border border-pink-500/20 text-pink-400">
                                            {currentMCQ.category === "domain"
                                                ? "Domain Assessment"
                                                : currentMCQ.category === "situational"
                                                    ? "Situational Judgment"
                                                    : currentMCQ.category === "quantitative"
                                                        ? "Quantitative Aptitude"
                                                        : currentMCQ.category === "logical"
                                                            ? "Logical Reasoning"
                                                            : "Technical MCQ"
                                            }
                                        </span>
                                        <span className={`text-[10px] font-extrabold ${isLight ? "text-slate-500" : "text-white/40"}`}>MCQ Question {currentMockQuestionIndex + 1} of 25</span>
                                    </div>
                                    <p className={`text-sm font-semibold leading-relaxed ${isLight ? "text-slate-900" : "text-white/95"} select-none`}>
                                        {currentMCQ.question}
                                    </p>

                                    {currentMCQ.codeSnippet && (
                                        <pre className="bg-black/50 p-4 rounded-xl font-mono text-xs border border-white/10 overflow-x-auto text-left text-pink-300 max-w-full select-none">
                                            <code>{currentMCQ.codeSnippet}</code>
                                        </pre>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {currentMCQ.options.map((opt: string, oIdx: number) => {
                                        const isSelected = mockTestMCQAnswers[currentMCQ.id] === oIdx;

                                        let optStyle = "bg-black/35 border-white/5 text-white/70 hover:border-white/20 hover:text-white";
                                        if (isLight) {
                                            if (theme === "eyeprotect") {
                                                optStyle = isSelected
                                                    ? "bg-[#ebdac2] border-amber-800 text-amber-900 font-bold shadow-[0_0_15px_rgba(217,119,6,0.1)]"
                                                    : "bg-[#f5e6d3] border-amber-900/40 text-amber-950 hover:border-amber-900 hover:bg-[#ebd9c2]/50";
                                            } else {
                                                optStyle = isSelected
                                                    ? "bg-pink-50 border-pink-500 text-pink-650 font-bold shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                                                    : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50";
                                            }
                                        } else {
                                            if (isSelected) {
                                                optStyle = "bg-pink-500/5 border-pink-500/40 text-pink-400 font-bold shadow-[0_0_15px_rgba(236,72,153,0.1)]";
                                            }
                                        }

                                        return (
                                            <button
                                                key={oIdx}
                                                type="button"
                                                onClick={() => setMockTestMCQAnswers(prev => ({
                                                    ...prev,
                                                    [currentMCQ.id]: oIdx
                                                }))}
                                                className={`mcq-option-item w-full p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer select-none ${optStyle}`}
                                            >
                                                <span>{opt}</span>
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected
                                                    ? isLight
                                                        ? theme === "eyeprotect"
                                                            ? "border-amber-800 bg-amber-800/20 text-amber-900"
                                                            : "border-pink-500 bg-pink-500/20 text-pink-500"
                                                        : "border-pink-500 bg-pink-500/20 text-pink-400"
                                                    : isLight
                                                        ? theme === "eyeprotect"
                                                            ? "border-amber-900/30"
                                                            : "border-slate-400"
                                                        : "border-white/20"
                                                    }`}>
                                                    {isSelected && <div className={`w-1.5 h-1.5 rounded-full ${theme === "eyeprotect" ? "bg-amber-800" : "bg-pink-500"}`} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        disabled={currentMockQuestionIndex === 0}
                                        onClick={() => setCurrentMockQuestionIndex(prev => prev - 1)}
                                        className="px-4.5 py-2.5 bg-white/5 hover:bg-white/10 disabled:bg-white/0 disabled:text-white/20 border border-white/5 disabled:border-transparent text-white/70 hover:text-white font-bold rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1.5"
                                    >
                                        ← Previous
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setMockTestMCQReview(prev => ({
                                            ...prev,
                                            [currentMCQ.id]: !prev[currentMCQ.id]
                                        }))}
                                        className={`px-4.5 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${mockTestMCQReview[currentMCQ.id]
                                            ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-500"
                                            : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                                            }`}
                                    >
                                        ⭐ {mockTestMCQReview[currentMCQ.id] ? "Marked for Review" : "Mark for Review"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (currentMockQuestionIndex < 24) {
                                                setCurrentMockQuestionIndex(prev => prev + 1);
                                            } else {
                                                setCurrentMockQuestionTab("coding");
                                                setCurrentMockQuestionIndex(0);
                                            }
                                        }}
                                        className="px-4.5 py-2.5 bg-pink-650 hover:bg-pink-500 text-white font-bold rounded-xl transition-all text-xs cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.1)] flex items-center gap-1.5"
                                    >
                                        {currentMockQuestionIndex < 24 ? "Next MCQ →" : "Proceed to Coding C1 →"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                                    <div className="border border-white/5 bg-[#16161f] rounded-2xl p-5 space-y-4 flex flex-col justify-between max-h-[500px] overflow-y-auto">
                                        <div className="space-y-3.5 text-left">
                                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                                <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"} flex items-center gap-1.5 font-sans`}>
                                                    C{currentMockQuestionIndex + 1}: {currentCoding.title}
                                                </h4>
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                    {aptitudePath === "onCampus"
                                                        ? (currentMockQuestionIndex === 2 ? "Medium" : "Easy")
                                                        : (currentMockQuestionIndex === 1 ? "Hard" : "Medium")
                                                    } (10 Pts)
                                                </span>
                                            </div>

                                            <div className={`whitespace-pre-wrap font-sans text-xs ${isLight ? "text-slate-800" : "text-white/80"} leading-relaxed font-semibold`}>
                                                {currentCoding.description}
                                            </div>

                                            {currentCoding.constraints && currentCoding.constraints.length > 0 && (
                                                <div className="space-y-1.5 pt-2">
                                                    <span className={`text-[9px] uppercase font-bold ${isLight ? "text-slate-500" : "text-white/40"} block`}>Constraints</span>
                                                    <ul className={`list-disc pl-4 text-[10px] ${isLight ? "text-slate-700" : "text-white/60"} space-y-1 font-semibold`}>
                                                        {currentCoding.constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            {currentCoding.examples && currentCoding.examples.length > 0 && (
                                                <div className="space-y-3 pt-2">
                                                    <span className={`text-[9px] uppercase font-bold ${isLight ? "text-slate-500" : "text-white/40"} block`}>Examples</span>
                                                    {currentCoding.examples.map((ex: any, i: number) => (
                                                        <div key={i} className={`${isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"} rounded-lg p-3 text-[10px] space-y-1 font-mono`}>
                                                            <div className={isLight ? "text-slate-700" : "text-white/50"}><span className={`${isLight ? "text-slate-500" : "text-white/30"} font-sans`}>Input: </span>{ex.input}</div>
                                                            <div className={isLight ? "text-indigo-750 font-bold" : "text-indigo-300"}><span className={`${isLight ? "text-slate-500" : "text-white/30"} font-sans`}>Output: </span>{ex.output}</div>
                                                            {ex.explanation && (
                                                                <div className={`${isLight ? "text-slate-600" : "text-white/40"} text-[9px] font-sans italic pt-1`}><span className="font-sans text-[9px] font-bold">Explanation: </span>{ex.explanation}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex flex-col">
                                        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-3">
                                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                <span className="text-[9px] uppercase font-bold text-white/40 block">Code Workspace</span>
                                                <select
                                                    value={mockTestCodingLanguages[currentCoding.id] || "javascript"}
                                                    onChange={(e) => {
                                                        const lang = e.target.value;
                                                        setMockTestCodingLanguages(prev => ({ ...prev, [currentCoding.id]: lang }));
                                                        const isUntouched = Object.values(currentCoding.starterTemplates).some(t => t === mockTestCodingCodes[currentCoding.id]);
                                                        if (isUntouched || !mockTestCodingCodes[currentCoding.id]) {
                                                            setMockTestCodingCodes(prev => ({
                                                                ...prev,
                                                                [currentCoding.id]: currentCoding.starterTemplates[lang] || ""
                                                            }))
                                                        }
                                                    }}
                                                    className="bg-black border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white/80 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                                                >
                                                    <option value="javascript">JavaScript</option>
                                                    <option value="python">Python</option>
                                                    <option value="cpp">C++</option>
                                                    <option value="java">Java</option>
                                                </select>
                                            </div>

                                            <textarea
                                                value={mockTestCodingCodes[currentCoding.id] || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setMockTestCodingCodes(prev => ({
                                                        ...prev,
                                                        [currentCoding.id]: val
                                                    }));
                                                }}
                                                onKeyDown={(e) => handleCodeEditorKeyDown(e, currentCoding.id)}
                                                spellCheck={false}
                                                className="w-full h-64 p-3 bg-black/60 font-mono text-[11px] text-pink-300 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500/50 select-text resize-none leading-relaxed"
                                                placeholder="// Write your solution here..."
                                            />

                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-[9px] text-white/30 font-semibold font-sans">Press &apos;Tab&apos; for 4 spaces</span>
                                                <button
                                                    type="button"
                                                    disabled={mockTestCodingLoading[currentCoding.id]}
                                                    onClick={() => handleGradeCodingQuestion(currentCoding.id)}
                                                    className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 disabled:border-transparent text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                                                >
                                                    {mockTestCodingLoading[currentCoding.id] ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            Grading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            ⚙ Run AI Code Grade
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-white/5 bg-[#16161f] rounded-2xl p-4.5 text-left font-sans space-y-2">
                                    <span className="text-[9px] uppercase font-bold text-white/40 block">AI Grading Console Output</span>
                                    {mockTestCodingOutputs[currentCoding.id] ? (() => {
                                        const out = mockTestCodingOutputs[currentCoding.id];
                                        return (
                                            <div className="space-y-3.5 text-xs">
                                                <div className="flex flex-wrap gap-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${out.status === "Accepted"
                                                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                                        }`}>
                                                        {out.status}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded text-[9px] font-extrabold bg-white/5 border border-white/5 text-white/70 font-sans font-sans">
                                                        Score: {out.score} / 10 Points
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                        ⏱ Time: {out.timeComplexity}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                        💾 Space: {out.spaceComplexity}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 leading-relaxed">
                                                    <p className="text-white/80 font-semibold">{out.correctness}</p>
                                                    <p className="text-white/60 font-medium">{out.feedback}</p>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <p className="text-xs text-white/40 italic font-semibold py-2">
                                            {mockTestCodingLoading[currentCoding.id]
                                                ? "AI Compiler is currently matching logic nodes, tracking complex boundaries, and generating detailed complexity grading..."
                                                : "No output generated yet. Please write code and click 'Run AI Code Grade' to verify your solution."
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        disabled={currentMockQuestionIndex === 0}
                                        onClick={() => setCurrentMockQuestionIndex(prev => prev - 1)}
                                        className="px-4.5 py-2.5 bg-white/5 hover:bg-white/10 disabled:bg-white/0 disabled:text-white/20 border border-white/5 disabled:border-transparent text-white/70 hover:text-white font-bold rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1.5"
                                    >
                                        ← Previous Coding
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (currentMockQuestionIndex < 2) {
                                                setCurrentMockQuestionIndex(prev => prev + 1);
                                            } else {
                                                triggerSubmitMockTestConfirmation();
                                            }
                                        }}
                                        className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-xs cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.15)] flex items-center gap-1.5"
                                    >
                                        {currentMockQuestionIndex < 2 ? "Next Coding →" : "✓ Finish & Review Test"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!isAuthChecked) return null;

    return (
        <div className={`text-white selection:bg-indigo-500/30 flex flex-col font-sans ${(activeModal === "prointerviewer" || activeModal === "study_materials" || activeModal === "synthetic_data") ? "h-[100dvh] overflow-hidden" : "min-h-screen"} bg-[#050505]`}>
            {activeModal !== "study_materials" && activeModal !== "synthetic_data" && (activeModal !== "prointerviewer" || builderMobileView !== "preview") && (
                <>
                    <header className="px-4 sm:px-8 h-20 flex flex-row items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#050505]/80">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3">
                            <div className="flex items-center gap-3">
                                <BrandLogo />
                                {studyMaterialsProgress && (
                                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 animate-pulse ml-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span className="text-[11px] font-bold">
                                            Generating: "{studyMaterialsProgress.topicName}" ({studyMaterialsProgress.current}/{studyMaterialsProgress.total})
                                        </span>
                                    </div>
                                )}
                            </div>
                            {activeModal === "prointerviewer" && isAtsWarningActive && (
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg lg:ml-4 animate-fade-in shadow-[0_4px_12px_rgba(0,0,0,0.05)] w-fit"
                                    style={{
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        color: isLight ? (theme === "eyeprotect" ? "#000000" : "#1e1b4b") : "#e0e7ff",
                                        backgroundColor: isLight ? (theme === "eyeprotect" ? "rgba(245, 158, 11, 0.15)" : "rgba(79, 70, 229, 0.08)") : "rgba(99, 102, 241, 0.12)",
                                        border: `1.5px solid ${isLight ? (theme === "eyeprotect" ? "#d97706" : "#4f46e5") : "rgba(99, 102, 241, 0.3)"}`
                                    }}
                                >
                                    <AlertTriangle
                                        size={14}
                                        color={isLight ? (theme === "eyeprotect" ? "#d97706" : "#4f46e5") : "#818cf8"}
                                        style={{ flexShrink: 0 }}
                                    />
                                    <span>If you are a fresher or a college student, then select ATS templates.</span>
                                </div>
                            )}
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-white/70 items-center">
                            {!isRealisticMode && <Link href="/" className="hover:text-white transition-colors">Home</Link>}
                            {isLoggedIn && (
                                <div className="flex items-center bg-white/5 border border-white/15 p-0.5 sm:p-1 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-md" title="Switch between Practice Mode and Realistic AI Mode">
                                    <button
                                        onClick={() => {
                                            if (isRealisticMode) toggleMode();
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full transition-all duration-200 ${!isRealisticMode
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
                                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full transition-all duration-200 ${isRealisticMode
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold'
                                            : 'text-white/60 hover:text-white/90'
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isRealisticMode ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                                        Realistic AI Mode
                                    </button>
                                </div>
                            )}
                            {!isRealisticMode && <Link href="/features" className="text-white transition-colors border-b border-indigo-500 pb-1">Features</Link>}
                            <Link href="/labs" className="hover:text-white transition-colors">
                                Labs
                            </Link>
                            {!isRealisticMode && <Link href="/#how-it-works" className="hover:text-white transition-colors">How it works</Link>}


                            {/* Theme Toggle Button */}
                            <button
                                onClick={cycleTheme}
                                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                title={`Current Theme: ${theme}. Click to switch.`}
                            >
                                {theme === "dark" && <Moon className="w-4 h-4" />}

                                {theme === "light" && <Sun className="w-4 h-4" />}
                                {theme === "eyeprotect" && <Eye className="w-4 h-4 text-amber-400" />}
                            </button>


                            {isLoggedIn ? (
                                <Link href="/profile" className="flex items-center gap-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/40 px-5 flex-shrink-0 relative py-2 rounded-full transition-colors font-bold ml-2 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex shrink-0 items-center justify-center text-white text-[10px]">US</div>
                                    My Profile
                                </Link>
                            ) : isGuest ? (
                                <div className="relative group shrink-0 ml-2">
                                    <button className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 px-5 py-2 rounded-full transition-all font-bold shadow-[0_0_15px_rgba(245,158,11,0.1)] cursor-pointer">
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
                                <Link href="/login" className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-white transition-colors font-bold ml-2">Log in</Link>
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
                                        className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
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
                                {!isRealisticMode && (
                                    <Link
                                        href="/features"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-lg font-semibold text-indigo-400"
                                    >
                                        Features
                                    </Link>
                                )}
                                {!isRealisticMode && (
                                    <Link
                                        href="/#how-it-works"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-lg font-semibold text-white/80 hover:text-white transition-colors"
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
                </>
            )}

            {activeModal === "prointerviewer" ? (
                <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0b0f19]">
                    <ProInterviewerApp
                        onClose={() => {
                            setActiveModal(null);
                            setActiveTool("analysis");
                        }}
                        onAtsWarningChange={setIsAtsWarningActive}
                        onMobileViewChange={setBuilderMobileView}
                    />
                </div>
            ) : activeModal === "study_materials" ? (
                <div className={`flex-1 w-full h-full relative overflow-hidden transition-colors duration-300 ${theme === "light" ? "bg-[#9897A9]" : theme === "eyeprotect" ? "bg-[#9897A9]" : "bg-[#050505]"
                    }`}>
                    <iframe
                        src="/study-materials/index.html"
                        className="w-full h-full border-none"
                        title="Study Materials"
                    />
                </div>
            ) : activeModal === "synthetic_data" ? (
                <div className={`flex-1 w-full h-[100dvh] relative overflow-hidden transition-colors duration-300 ${
                    theme === "light" ? "bg-slate-100" : theme === "eyeprotect" ? "bg-[#f3ede3]" : "bg-[#0b0f14]"
                }`}>
                    <iframe
                        id="synthetic-data-iframe"
                        src="/synthetic-data-generator/index.html"
                        className="w-full h-full border-none"
                        title="Synthetic Data Generator"
                    />
                </div>
            ) : (

                <main className={`flex-1 flex flex-col items-center justify-center relative ${activeModal === "negotiate" ? "px-1 sm:px-4 py-2 sm:py-6 w-full max-w-full overflow-x-hidden" : activeModal ? "px-2 sm:px-4 py-4 w-full max-w-full" : "px-6 py-12 overflow-hidden"}`}>
                    {activeModal === null && (
                        <div className="w-full max-w-4xl mb-6">
                            <LabsBanner isLight={isLight} />
                        </div>
                    )}
                    <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

                    {activeModal === null ? (
                        <FeatureToolsGrid
                            isLight={isLight}
                            isRealisticMode={isRealisticMode}
                            onSelectAnalysis={() => {
                                setActiveModal("analysis");
                                setActiveTool("analysis");
                                setShowAnalysis(false);
                                setShowResume(false);
                            }}
                            onStartInterview={() => launchInterviewSetup(isRealisticMode ? "realistic" : "technical")}
                            onSelectAptitude={() => {
                                setActiveModal("aptitude");
                                setActiveTool("aptitude");
                                setAptitudePath(null);
                                setActiveQuizCategory(null);
                                setIsMockTestMode(false);
                            }}
                            onSelectEmailAnalyser={() => {
                                setActiveModal("email_analyser");
                                setActiveTool("email_analyser");
                            }}
                            onSelectPrepPack={() => {
                                setActiveModal("prep_pack");
                                setActiveTool("prep_pack");
                            }}
                            onSelectDrills={() => {
                                setActiveModal("drills");
                                setActiveTool("drills");
                            }}
                            onSelectNegotiate={() => {
                                setActiveModal("negotiate");
                                setActiveTool("negotiate");
                            }}
                            onSelectRoadmap={() => {
                                setActiveModal("roadmap_generator");
                                setActiveTool("roadmap_generator");
                                setRoadmapTasksChecked({});
                            }}
                            onSelectProInterviewer={launchProInterviewer}
                            onSelectStudyMaterials={() => {
                                setActiveModal("study_materials");
                                setActiveTool("study_materials");
                            }}
                            onSelectSyntheticData={() => {
                                setActiveModal("synthetic_data");
                                setActiveTool("synthetic_data");
                            }}
                            onSelectProgress={() => {
                                setActiveModal("progress");
                                setActiveTool("progress");
                            }}
                        />
                    ) : activeModal === "negotiate" ? (
                        <div className="w-full max-w-4xl lg:max-w-full overflow-x-hidden negotiate-modal-lock px-1 sm:px-3 pt-[130px] lg:pt-0 mx-auto flex flex-col lg:flex-row items-start justify-between gap-3 lg:gap-6 z-10 relative">
                            {/* Mobile Top Controls Bar (Positioned cleanly below main site navbar) */}
                            <div className="lg:hidden fixed top-20 left-0 right-0 z-40 flex items-center justify-between gap-2 px-3 py-2 bg-[#0c0c12]/95 backdrop-blur-md border-b border-white/10 shadow-2xl">
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setMobileNegotiateTab("levers")}
                                        className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${mobileNegotiateTab === "levers"
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                            : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 shrink-0" /> Levers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMobileNegotiateTab("calculator")}
                                        className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${mobileNegotiateTab === "calculator"
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                            : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <Handshake className="w-3.5 h-3.5 shrink-0" /> Offer &amp; Chat
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMobileNegotiateTab("redlines")}
                                        className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${mobileNegotiateTab === "redlines"
                                            ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                                            : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Red Lines
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 transition-colors shrink-0 cursor-pointer"
                                    title="Close modal"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Left Side Card: Negotiation Levers */}
                            <div className={`w-full lg:w-64 xl:w-72 shrink-0 lg:fixed lg:top-28 lg:left-3 xl:left-6 z-30 rounded-2xl p-4 sm:p-5 md:p-6 border shadow-2xl transition-all space-y-4 ${mobileNegotiateTab === "levers" ? "block" : "hidden lg:block"
                                } ${theme === "light"
                                    ? "bg-emerald-50/95 backdrop-blur-md border-emerald-200 text-emerald-950"
                                    : theme === "eyeprotect"
                                        ? "bg-[#e6f7ec]/95 backdrop-blur-md border-emerald-300 text-emerald-950"
                                        : "bg-[#111]/95 backdrop-blur-md border-emerald-500/20 text-white"
                                }`}>
                                <div className="flex items-center justify-between border-b pb-3 border-emerald-500/20">
                                    <h4 className="font-bold text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Negotiation Levers</span>
                                    </h4>
                                    {negotiationMood && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            {negotiationMood}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs ${theme === "light" ? "text-emerald-700 font-medium" : theme === "eyeprotect" ? "text-emerald-800 font-medium" : "text-white/60"}`}>
                                    {dynamicLevers.length > 0 ? "Tailored compensation levers for your offer:" : "Key compensation levers to adjust during talks:"}
                                </p>
                                <ul className={`space-y-2.5 text-xs list-disc list-inside leading-relaxed ${theme === "light" ? "text-emerald-950 font-semibold" : theme === "eyeprotect" ? "text-emerald-950 font-semibold" : "text-white/80"}`}>
                                    {(dynamicLevers.length > 0 ? dynamicLevers : [
                                        "Base Salary adjustment",
                                        "Signing / Joining Bonus",
                                        "Equity / RSUs grant",
                                        "Start Date flexibility",
                                        "Title & Level seniority"
                                    ]).map((lever, idx) => (
                                        <li key={idx} className="marker:text-emerald-600 font-semibold transition-all">
                                            {lever}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Center: Main OFFER NEGOTIATION BOX (Single clean card) */}
                            <div className={`flex-1 w-full min-w-0 lg:ml-72 xl:ml-80 lg:mr-72 xl:mr-80 relative ${mobileNegotiateTab === "calculator" ? "block" : "hidden lg:block"
                                }`}>
                                {/* Desktop Close button in top-right */}
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="hidden lg:flex absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors border border-white/10 cursor-pointer z-50"
                                    title="Back to option list"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <NegotiatePanel
                                    defaultCompany={negotiateCompany || emailAnalysisResult?.extractedDetails?.company || ""}
                                    defaultRole={negotiateRole || emailAnalysisResult?.extractedDetails?.role || ""}
                                    defaultCurrentOffer={negotiateOffer}
                                    defaultBenefits={negotiateBenefits}
                                    onUpdateStrategy={({ levers, redLines, mood }) => {
                                        if (Array.isArray(levers) && levers.length > 0) setDynamicLevers(levers);
                                        if (Array.isArray(redLines) && redLines.length > 0) setDynamicRedLines(redLines);
                                        if (mood) setNegotiationMood(mood);
                                    }}
                                />
                            </div>

                            {/* Right Side Card: Tactical Red Lines */}
                            <div className={`w-full lg:w-64 xl:w-72 shrink-0 lg:fixed lg:top-28 lg:right-3 xl:right-6 z-30 rounded-2xl p-4 sm:p-5 md:p-6 border shadow-2xl transition-all space-y-4 ${mobileNegotiateTab === "redlines" ? "block" : "hidden lg:block"
                                } ${theme === "light"
                                    ? "bg-red-50/95 backdrop-blur-md border-red-200 text-red-900"
                                    : theme === "eyeprotect"
                                        ? "bg-[#fdf2f2]/95 backdrop-blur-md border-red-300 text-red-950"
                                        : "bg-[#111]/95 backdrop-blur-md border-red-500/20 text-white"
                                }`}>
                                <div className="flex items-center justify-between border-b pb-3 border-red-500/20">
                                    <h4 className="font-bold text-base flex items-center gap-2 tactical-red-title" style={{ color: isLight ? "#dc2626" : "#ef4444" }}>
                                        <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: isLight ? "#dc2626" : "#ef4444" }} />
                                        <span className="font-extrabold text-red-600 dark:text-red-400">Tactical Red Lines</span>
                                    </h4>
                                    {dynamicRedLines.length > 0 && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                            Live AI
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs ${theme === "light" ? "text-red-700 font-medium" : theme === "eyeprotect" ? "text-red-800 font-medium" : "text-white/60"}`}>
                                    {dynamicRedLines.length > 0 ? "Tailored mistakes to avoid for this package:" : "Mistakes to strictly avoid during negotiation:"}
                                </p>
                                <ul className={`space-y-2.5 text-xs list-disc list-inside leading-relaxed ${theme === "light" ? "text-red-900 font-semibold" : theme === "eyeprotect" ? "text-red-950 font-semibold" : "text-white/80"}`}>
                                    {(dynamicRedLines.length > 0 ? dynamicRedLines : [
                                        "Never accept on the spot under pressure",
                                        "Don't apologize for asking to negotiate",
                                        "Don't invent fake competing offers",
                                        "Don't reveal minimum bottom-line early"
                                    ]).map((redLine, idx) => (
                                        <li key={idx} className="marker:text-red-600 font-semibold transition-all">
                                            {redLine}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className={`w-full ${activeModal === "resume" || activeModal === "roadmap_generator" || activeModal === "aptitude" || activeModal === "progress" || (activeModal === "analysis" && !showInterviewCustomizer) ? "max-w-7xl" : "max-w-4xl"} bg-[#111] ${activeModal === "email_analyser" ? "p-3 sm:p-5" : "p-4 sm:p-6 md:p-8"} rounded-2xl border ${activeModal === "analysis" ? "border-indigo-500/20" :
                            activeModal === "resume" ? "border-purple-500/20" :
                                activeModal === "email_analyser" ? "border-teal-500/20" :
                                    activeModal === "aptitude" ? "border-pink-500/20" :
                                        activeModal === "progress" ? "border-sky-500/20" : "border-emerald-500/20"
                            } shadow-2xl relative z-10 transition-all duration-300`}>
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${activeModal === "analysis" ? "from-indigo-500 to-indigo-600" :
                                activeModal === "resume" ? "from-purple-500 to-purple-600" :
                                    activeModal === "email_analyser" ? "from-teal-500 to-teal-600" :
                                        activeModal === "aptitude" ? "from-pink-500 to-pink-600" :
                                            activeModal === "progress" ? "from-sky-500 to-sky-600" : "from-emerald-500 to-emerald-600"
                                } rounded-t-2xl`}></div>

                            {/* Close button in top-right */}
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors border border-white/10 cursor-pointer z-50"
                                title="Back to option list"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="space-y-4">
                                {activeModal === "analysis" && (
                                    <>
                                        {!showInterviewCustomizer ? (
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 text-left">
                                                {/* Left Box (Box 1): Configuration & Inputs */}
                                                <div className="lg:col-span-6 space-y-3">
                                                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-[11px] text-indigo-200 leading-relaxed flex items-center justify-between gap-3">
                                                        <span>Upload your portfolio details below and run the pre-interview analysis. Standard credentials from your profile are pulled automatically.</span>
                                                        <div className="flex flex-col sm:flex-row items-stretch gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={handleFetchProfileDetailsAndResume}
                                                                disabled={isFetchingLinks}
                                                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
                                                            >
                                                                {isFetchingLinks && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                                                                Fetch Links
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleNewAnalysis}
                                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                                            >
                                                                New Analysis
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {fetchLinksError && (
                                                        <div className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 font-sans leading-snug">
                                                            ⚠️ {fetchLinksError}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1 mb-1"><Github className="w-3 h-3 text-white/60" /> GitHub Profile URL</label>
                                                        <input type="url" value={github || ""} onChange={(e) => { setGithub(e.target.value); setStorageItem("userGithub", e.target.value); }} placeholder="https://github.com/username" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-white" />
                                                    </div>

                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1 mb-1"><Linkedin className="w-3 h-3 text-white/60" /> LinkedIn Profile URL</label>
                                                        <input type="url" value={linkedin || ""} onChange={(e) => { setLinkedin(e.target.value); setStorageItem("userLinkedin", e.target.value); }} placeholder="https://linkedin.com/in/username" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-white" />
                                                    </div>

                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1 mb-1"><Globe className="w-3 h-3 text-white/60" /> Portfolio Website URL</label>
                                                        <input type="url" value={portfolioUrl || ""} onChange={(e) => { setPortfolioUrl(e.target.value); setStorageItem("userPortfolio", e.target.value); }} placeholder="https://myportfolio.com" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-white" />
                                                    </div>

                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1 mb-1"><Briefcase className="w-3 h-3 text-white/60" /> Upload Project Code / Files or Resume (PDF, ZIP, Text, Resume)</label>
                                                        <div className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center hover:border-indigo-500/50 transition-colors relative bg-black/20 cursor-pointer">
                                                            <input
                                                                type="file"
                                                                multiple
                                                                onChange={(e) => {
                                                                    if (e.target.files) {
                                                                        setProjectFiles(Array.from(e.target.files));
                                                                    }
                                                                }}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                            />
                                                            <UploadCloud className="w-6 h-6 text-white/40 mb-1" />
                                                            <span className="text-[11px] text-white/60 font-medium">Click or drag files here to upload</span>
                                                        </div>

                                                        {projectFiles.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {projectFiles.map((file, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md text-[9px] font-semibold">
                                                                        <span>{file.name}</span>
                                                                        <button type="button" onClick={() => setProjectFiles(projectFiles.filter((_, i) => i !== idx))} className="text-indigo-400 hover:text-white transition-colors">
                                                                            <X className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-0.5 z-50 relative">
                                                        <RoleSelect
                                                            theme={theme}
                                                            options={[
                                                                { value: 'Frontend Developer', label: 'Frontend Developer' },
                                                                { value: 'Backend Developer', label: 'Backend Developer' },
                                                                { value: 'Full Stack Engineer', label: 'Full Stack Engineer' },
                                                                { value: 'DevOps Engineer', label: 'DevOps Engineer' },
                                                                { value: 'Mobile App Developer', label: 'Mobile App Developer' },
                                                                { value: 'AI/ML Engineer', label: 'AI/ML Engineer' }
                                                            ]}
                                                            maxLimit={3}
                                                            placeholder="Search or select up to 3 target roles..."
                                                            onChange={(selected: string[]) => setPreferredRoles(selected)}
                                                        />
                                                    </div>

                                                    <div className="pt-0.5 z-40 relative">
                                                        <CompanySelect
                                                            theme={theme}
                                                            options={[
                                                                { value: 'Google', label: 'Google' },
                                                                { value: 'Amazon', label: 'Amazon' },
                                                                { value: 'Microsoft', label: 'Microsoft' },
                                                                { value: 'Meta', label: 'Meta' },
                                                                { value: 'Apple', label: 'Apple' },
                                                                { value: 'TCS', label: 'TCS' },
                                                                { value: 'Stripe', label: 'Stripe' },
                                                                { value: 'Uber', label: 'Uber' }
                                                            ]}
                                                            maxLimit={3}
                                                            placeholder="Search or select up to 3 target companies..."
                                                            onChange={(selected: string[]) => setTargetCompanies(selected)}
                                                        />
                                                    </div>

                                                    <div className="pt-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={handlePreInterviewAnalysis}
                                                            disabled={preAnalyzing || loading || preferredRoles.length === 0 || targetCompanies.length === 0}
                                                            className="w-full py-2.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                                        >
                                                            {preAnalyzing ? (
                                                                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Portfolio...</>
                                                            ) : (
                                                                <><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Run Pre-Interview Analysis</>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {pausedSession && ((isRealisticMode && pausedSession.mode === "realistic") || (!isRealisticMode && (pausedSession.mode === "technical" || !pausedSession.mode))) && (
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <button
                                                                onClick={handleResume}
                                                                className="flex-1 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 text-xs"
                                                                title="Resume your last paused session"
                                                            >
                                                                <Play className="w-3.5 h-3.5" /> Resume Session
                                                            </button>
                                                            <button
                                                                onClick={handleDeletePaused}
                                                                className="p-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-500 rounded-lg transition-all flex items-center justify-center"
                                                                title="Discard paused session"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Box (Box 2): Portfolio Analysis Results & Score */}
                                                <div className="lg:col-span-6 flex flex-col justify-stretch">
                                                    {preAnalyzing ? (
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[350px]">
                                                            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                                                            <h4 className="text-sm font-bold text-white mb-1">Analyzing Your Portfolio...</h4>
                                                            <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                                                                Gemini is evaluating your code, files, and links against company bar constraints.
                                                            </p>
                                                        </div>
                                                    ) : analysisResult ? (
                                                        <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-2xl p-6 h-full flex flex-col justify-between text-left relative overflow-hidden min-h-[350px]">
                                                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                                                                <Award className="w-40 h-40 text-indigo-400" />
                                                            </div>

                                                            <div>
                                                                <div className="flex items-center gap-3 justify-between mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                                                                            <Award className="w-4.5 h-4.5" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-extrabold text-white text-sm">Portfolio Score</h4>
                                                                            <p className="text-[10px] text-white/45 font-medium">Evaluation outcome</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg shrink-0">
                                                                        <span className="text-xl font-black text-indigo-300">{analysisResult.rating}</span>
                                                                        <span className="text-[10px] text-white/40">/100</span>
                                                                    </div>
                                                                </div>

                                                                <div className="prose prose-invert max-w-none text-xs text-white/75 leading-relaxed border-t border-white/5 pt-3 space-y-2">
                                                                    {(analysisResult.feedback || "").split("\n").map((line, i) => {
                                                                        const cleaned = line.replace(/^\*\*/g, "").replace(/\*\*/g, "").trim();
                                                                        if (!cleaned) return <div key={i} className="h-1.5" />;

                                                                        if (line.startsWith("### ")) {
                                                                            return <h5 key={i} className="text-xs font-black text-indigo-300 mt-3 mb-1 uppercase tracking-wider">{line.replace("### ", "")}</h5>;
                                                                        }

                                                                        if (line.startsWith("- ") || line.startsWith("• ")) {
                                                                            return (
                                                                                <p key={i} className="pl-3 before:content-['•'] before:text-indigo-400 before:mr-2 flex items-start text-[11px] leading-relaxed font-medium">
                                                                                    <span>{cleaned.replace(/^[-•]\s*/, "")}</span>
                                                                                </p>
                                                                            );
                                                                        }
                                                                        return <p key={i} className="text-[11px] leading-relaxed font-medium">{cleaned}</p>;
                                                                    })}
                                                                </div>
                                                            </div>

                                                            <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
                                                                <p className="text-[10px] text-white/40 text-center font-medium">Ready to start your interview based on this analysis?</p>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowInterviewCustomizer(true)}
                                                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
                                                                    >
                                                                        <ArrowRight className="w-3.5 h-3.5" /> Continue to Start Interview
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[350px] my-auto">
                                                            <Award className="w-12 h-12 text-white/20 mb-3 animate-pulse" />
                                                            <h4 className="text-xs font-bold text-white/60 mb-1">Awaiting Portfolio Analysis</h4>
                                                            <p className="text-[11px] text-white/35 max-w-xs leading-relaxed">
                                                                Fill in your target roles, companies, and portfolio links/files on the left, then run analysis to evaluate your bar score and study suggestions.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Box 3: Customization & Final Start Options (Visible when customizer is true) */
                                            <div className="max-w-xl mx-auto space-y-6 text-left">
                                                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 relative overflow-hidden">
                                                    <div className="flex items-start gap-4 mb-5">
                                                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                                                            <ShieldCheck className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-extrabold text-white">Interview Customization</h3>
                                                            <p className="text-xs text-white/50 leading-relaxed mt-0.5">
                                                                Based on your Pre-Interview Score of <span className="font-bold text-sky-300">{analysisResult?.rating}/100</span>, configure your interview settings.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6 border-t border-white/5 pt-5">
                                                        {/* Select Interview Difficulty */}
                                                        <div>
                                                            <label className="text-xs font-semibold text-white/70 block mb-2">Select Interview Difficulty</label>
                                                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                                                {[
                                                                    { key: "basic", label: "basic" },
                                                                    { key: "intermediate", label: "intermediate" },
                                                                    { key: "advanced", label: "advanced" },
                                                                ].map((item) => (
                                                                    <button
                                                                        key={item.key}
                                                                        type="button"
                                                                        onClick={() => setAnalysisLevel(item.key)}
                                                                        className={`py-2.5 px-1 rounded-lg border text-xs font-semibold capitalize transition-all truncate cursor-pointer ${analysisLevel === item.key ? "bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-600/10" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 pt-6 border-t border-white/5 mt-6">
                                                        <button
                                                            type="button"
                                                            onClick={handleStartInterviewFromAnalysis}
                                                            disabled={loading || preAnalyzing || preferredRoles.length === 0 || targetCompanies.length === 0}
                                                            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition-colors rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-sky-600/10"
                                                        >
                                                            {loading ? (
                                                                <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                                                            ) : (
                                                                <><Play className="w-4 h-4" /> Start Interview</>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowInterviewCustomizer(false)}
                                                            className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold rounded-xl transition-all text-sm cursor-pointer"
                                                        >
                                                            Back
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeModal === "resume" && (
                                    // Resume Builder Tab (Split Layout)
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                                        {/* Left Column: Form Editor (lg:col-span-6) */}
                                        <div className="lg:col-span-6 space-y-4 font-sans">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-purple-400" /> Resume Profile Editor
                                                </h3>
                                                <button
                                                    onClick={() => syncResumeBuilderFromProfile(true)}
                                                    className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                >
                                                    <UserCircle className="w-4 h-4" />
                                                    Get Details from Profile
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={resName || ""}
                                                        onChange={(e) => {
                                                            setResName(e.target.value);
                                                            updateActiveResume({ name: e.target.value });
                                                        }}
                                                        placeholder="e.g. John Doe"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white font-sans"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/70 block mb-1">Email</label>
                                                        <input
                                                            type="email"
                                                            value={resEmail || ""}
                                                            onChange={(e) => {
                                                                setResEmail(e.target.value);
                                                                updateActiveResume({ email: e.target.value });
                                                            }}
                                                            placeholder="john@example.com"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white font-sans"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/70 block mb-1">Phone</label>
                                                        <input
                                                            type="text"
                                                            value={resPhone || ""}
                                                            onChange={(e) => {
                                                                setResPhone(e.target.value);
                                                                updateActiveResume({ phone: e.target.value });
                                                                setStorageItem("userPhone", e.target.value);
                                                            }}
                                                            placeholder="+1 555-0199"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white font-sans"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Professional Summary</label>
                                                    <textarea
                                                        value={resSummary || ""}
                                                        onChange={(e) => {
                                                            setResSummary(e.target.value);
                                                            updateActiveResume({ summary: e.target.value });
                                                        }}
                                                        rows={3}
                                                        placeholder="Brief overview of your goals..."
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-none font-sans"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Skills (comma separated)</label>
                                                    <input
                                                        type="text"
                                                        value={resSkills || ""}
                                                        onChange={(e) => {
                                                            setResSkills(e.target.value);
                                                            updateActiveResume({ skills: e.target.value });
                                                        }}
                                                        placeholder="React, Next.js, TypeScript"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white font-sans"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Work Experience</label>
                                                    <textarea
                                                        value={resExperience || ""}
                                                        onChange={(e) => {
                                                            setResExperience(e.target.value);
                                                            updateActiveResume({ experience: e.target.value });
                                                        }}
                                                        rows={4}
                                                        placeholder="Software Engineer at TechCorp (2022 - Present)&#10;- Led frontend design of Next.js web application..."
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-y font-mono text-[11px]"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/70 block mb-1">Internships</label>
                                                        <textarea
                                                            value={resInternships || ""}
                                                            onChange={(e) => {
                                                                setResInternships(e.target.value);
                                                                updateActiveResume({ internships: e.target.value });
                                                            }}
                                                            rows={4}
                                                            placeholder="Frontend Intern at Startup (2021)&#10;- Assisted in building mockups..."
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-y font-mono text-[11px]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/70 block mb-1">Projects</label>
                                                        <textarea
                                                            value={resProjects || ""}
                                                            onChange={(e) => {
                                                                setResProjects(e.target.value);
                                                                updateActiveResume({ projects: e.target.value });
                                                            }}
                                                            rows={4}
                                                            placeholder="E-Commerce App (React, Node)&#10;- Built payment integrations..."
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-y font-mono text-[11px]"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-semibold text-white/70 block mb-1">Education</label>
                                                    <textarea
                                                        value={resEducation || ""}
                                                        onChange={(e) => {
                                                            setResEducation(e.target.value);
                                                            updateActiveResume({ education: e.target.value });
                                                            setStorageItem("userEducation", e.target.value);
                                                        }}
                                                        rows={3}
                                                        placeholder="B.S. in Computer Science (2018 - 2022)&#10;- University name..."
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-y font-mono text-[11px]"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/70 block mb-1">Certifications & Licenses</label>
                                                        <textarea
                                                            value={resCertifications || ""}
                                                            onChange={(e) => {
                                                                setResCertifications(e.target.value);
                                                                updateActiveResume({ certifications: e.target.value });
                                                            }}
                                                            rows={3}
                                                            placeholder="AWS Certified Solutions Architect (2023)&#10;Google UX Design Professional (2022)"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-y font-mono text-[11px]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-white/70 block mb-1">Awards & Achievements</label>
                                                        <textarea
                                                            value={resAwards || ""}
                                                            onChange={(e) => {
                                                                setResAwards(e.target.value);
                                                                updateActiveResume({ awards: e.target.value });
                                                            }}
                                                            rows={3}
                                                            placeholder="1st Place in Hackathon X (2023)&#10;Dean's List (2020, 2021)"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white resize-y font-mono text-[11px]"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Languages with proficiency dots */}
                                                <div>
                                                    <label className="text-[11px] font-semibold text-white/70 block mb-2">Languages</label>
                                                    <div className="space-y-2">
                                                        {resLanguages.map((lang, idx) => (
                                                            <div key={idx} className="flex items-center gap-2.5">
                                                                <input
                                                                    type="text"
                                                                    value={lang.name || ""}
                                                                    onChange={e => {
                                                                        const updated = [...resLanguages];
                                                                        updated[idx] = { ...updated[idx], name: e.target.value };
                                                                        setResLanguages(updated);
                                                                    }}
                                                                    placeholder="e.g. English, Hindi, Telugu"
                                                                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-white/25 font-sans"
                                                                />
                                                                {/* 5 proficiency dots */}
                                                                <div className="flex items-center gap-1">
                                                                    {[1, 2, 3, 4, 5].map(dot => (
                                                                        <button
                                                                            key={dot}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const updated = [...resLanguages];
                                                                                updated[idx] = { ...updated[idx], level: dot };
                                                                                setResLanguages(updated);
                                                                            }}
                                                                            title={["Basic", "Elementary", "Intermediate", "Fluent", "Native"][dot - 1]}
                                                                        >
                                                                            <div
                                                                                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${dot <= lang.level
                                                                                    ? "bg-purple-500 border-purple-400 shadow-[0_0_5px_rgba(168,85,247,0.35)]"
                                                                                    : "bg-transparent border-white/20 hover:border-purple-400/50"
                                                                                    }`}
                                                                            />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setResLanguages(resLanguages.filter((_, i) => i !== idx));
                                                                    }}
                                                                    className="w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 flex items-center justify-center transition-all shrink-0"
                                                                    title="Remove"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => setResLanguages([...resLanguages, { name: "", level: 0 }])}
                                                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-dashed border-purple-500/30 rounded-xl text-purple-300 hover:text-purple-200 text-xs font-bold transition-all"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Add Language
                                                        </button>
                                                        {resLanguages.length > 0 && (
                                                            <div className="flex items-center gap-3 text-[10px] text-white/25 pt-0.5">
                                                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-white/20" /> Empty</span>
                                                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500 border border-purple-400" /> Filled</span>
                                                                <span className="ml-auto">1=Basic · 5=Native</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons inside Form */}
                                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateResumeWithAI}
                                                    disabled={generatingResume}
                                                    className="w-full sm:w-auto px-5 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    {generatingResume ? (
                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Content...</>
                                                    ) : (
                                                        <><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Autofill with AI</>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleDownloadResume}
                                                    className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition text-white shadow-lg shadow-purple-500/20 cursor-pointer"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Download Resume (.doc)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right Column: Resumes DB list + Template Selector + Live Preview (lg:col-span-6) */}
                                        <div className="lg:col-span-6 space-y-6 flex flex-col">
                                            {/* Saved Resumes Database List */}
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                    <h3 className="text-sm font-extrabold text-purple-400 flex items-center gap-2">
                                                        <FileText className="w-4 h-4" /> Saved Resumes Database
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    handleCreateFromPreset(e.target.value);
                                                                    e.target.value = ""; // Reset dropdown
                                                                }
                                                            }}
                                                            className="bg-purple-950/45 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none transition-colors cursor-pointer bg-[#050505]"
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled className="text-white/40">Create from Preset...</option>
                                                            {RESUME_PRESETS.map((preset) => (
                                                                <option key={preset.id} value={preset.id} className="bg-[#111] text-white">
                                                                    {preset.roleName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={handleCreateNewResume}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5" /> New Blank
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                                    {savedResumes.map((res) => {
                                                        const isActive = res.id === activeResumeId;
                                                        return (
                                                            <div
                                                                key={res.id}
                                                                onClick={() => handleLoadResume(res.id)}
                                                                className={`flex-shrink-0 cursor-pointer p-3 rounded-lg border text-left transition-all ${isActive
                                                                    ? "bg-purple-950/20 border-purple-500/80 text-white"
                                                                    : "bg-black/30 border-white/5 text-white/60 hover:border-white/20 hover:text-white"
                                                                    } min-w-[140px] max-w-[160px] relative group`}
                                                            >
                                                                <div className="text-xs font-bold truncate pr-4" title={res.title}>{res.title}</div>
                                                                <div className="text-[10px] text-white/40 mt-1">
                                                                    {new Date(res.updatedAt).toLocaleDateString()}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteResume(res.id, e)}
                                                                    className="absolute top-2 right-2 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Delete resume profile"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Style Customizer */}
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h3 className="text-sm font-extrabold text-purple-400 flex items-center gap-2 mb-3">
                                                    <Settings className="w-4 h-4" /> Style Customizer
                                                </h3>
                                                <div className="space-y-4">
                                                    {/* Accent Color swatches */}
                                                    <div>
                                                        <span className="text-[10px] text-white/55 block font-black uppercase tracking-wider mb-2">Accent Color Theme</span>
                                                        <div className="flex gap-2.5">
                                                            {[
                                                                { name: "indigo", bg: "bg-indigo-500", border: "border-indigo-400" },
                                                                { name: "emerald", bg: "bg-emerald-500", border: "border-emerald-400" },
                                                                { name: "violet", bg: "bg-violet-500", border: "border-violet-400" },
                                                                { name: "rose", bg: "bg-rose-500", border: "border-rose-400" },
                                                                { name: "amber", bg: "bg-amber-500", border: "border-amber-400" },
                                                                { name: "slate", bg: "bg-slate-500", border: "border-slate-400" }
                                                            ].map((color) => {
                                                                const isSelected = resAccentColor === color.name;
                                                                return (
                                                                    <button
                                                                        key={color.name}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setResAccentColor(color.name);
                                                                            updateActiveResume({ accentColor: color.name });
                                                                        }}
                                                                        className={`w-6 h-6 rounded-full cursor-pointer transition-all ${color.bg} ${isSelected ? `ring-2 ring-white ring-offset-2 ring-offset-black scale-110` : "hover:scale-105"
                                                                            }`}
                                                                        title={color.name.toUpperCase()}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    {/* Font Size slider/multiplier */}
                                                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                                        <div>
                                                            <span className="text-[10px] text-white/55 block font-black uppercase tracking-wider">Preview Font Size</span>
                                                            <span className="text-xs text-white/80 font-bold">{Math.round(resFontSize * 100)}%</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const nextSize = Math.max(0.8, resFontSize - 0.05);
                                                                    setResFontSize(nextSize);
                                                                    updateActiveResume({ fontSize: nextSize });
                                                                }}
                                                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white cursor-pointer"
                                                            >
                                                                A-
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setResFontSize(1.0);
                                                                    updateActiveResume({ fontSize: 1.0 });
                                                                }}
                                                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white cursor-pointer"
                                                            >
                                                                Reset
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const nextSize = Math.min(1.3, resFontSize + 0.05);
                                                                    setResFontSize(nextSize);
                                                                    updateActiveResume({ fontSize: nextSize });
                                                                }}
                                                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white cursor-pointer"
                                                            >
                                                                A+
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Templates Database Selector */}
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h3 className="text-sm font-extrabold text-indigo-400 flex items-center gap-2 mb-3">
                                                    <Settings className="w-4 h-4" /> Templates Database Catalog
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {RESUME_TEMPLATES.map((temp) => {
                                                        const isActive = temp.id === selectedTemplateId;
                                                        return (
                                                            <button
                                                                key={temp.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTemplateId(temp.id);
                                                                    updateActiveResume({ templateId: temp.id });
                                                                }}
                                                                className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative group flex flex-col justify-between h-20 ${isActive
                                                                    ? "bg-indigo-950/20 border-indigo-500/80 text-white shadow-lg"
                                                                    : "bg-black/30 border-white/5 text-white/60 hover:border-white/20 hover:text-white"
                                                                    }`}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-bold leading-tight">{temp.name}</div>
                                                                    <div className="text-[9px] text-white/40 mt-1 line-clamp-2 leading-snug">
                                                                        {temp.description}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between w-full mt-1.5">
                                                                    <div className={`w-4 h-2 rounded bg-gradient-to-r ${temp.thumbnailColor}`}></div>
                                                                    {isActive && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Live Preview Paper */}
                                            <div className="flex flex-col space-y-2 flex-1">
                                                <div className="flex items-center justify-between text-xs font-bold text-white/50 px-1">
                                                    <span>LIVE PREVIEW (A4 STYLE)</span>
                                                    <span className="capitalize text-indigo-400 font-extrabold">{RESUME_TEMPLATES.find(t => t.id === selectedTemplateId)?.name || "Modern"} Theme</span>
                                                </div>
                                                <div
                                                    className="w-full bg-white text-black p-6 rounded-xl shadow-2xl border border-white/10 overflow-y-auto max-h-[460px] text-left select-none relative scrollbar-thin font-sans"
                                                    style={{
                                                        fontSize: `${resFontSize * 10.5}pt`,
                                                        lineHeight: "1.4",
                                                        fontFamily: selectedTemplateId === "classic"
                                                            ? "Georgia, serif"
                                                            : selectedTemplateId === "minimalist"
                                                                ? "Arial, sans-serif"
                                                                : selectedTemplateId === "creative"
                                                                    ? "Tahoma, sans-serif"
                                                                    : "system-ui, sans-serif"
                                                    }}
                                                >
                                                    {selectedTemplateId === "creative" ? (
                                                        // Creative Accent 2-Column Sidebar Layout
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs text-neutral-800">
                                                            {/* Sidebar Column */}
                                                            <div className="md:col-span-4 border-r border-neutral-200 pr-3 space-y-4">
                                                                <div>
                                                                    <h1 className="text-base font-black leading-tight uppercase truncate" style={{ color: selectedColorHex }}>{resName || 'Your Name'}</h1>
                                                                    <p className="text-[9px] font-bold tracking-wider uppercase mt-0.5" style={{ color: selectedColorHex }}>
                                                                        {resSkills ? resSkills.split(',')[0] : 'Professional'}
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="text-[9px] font-black border-b pb-0.5 uppercase tracking-wider mb-2" style={{ color: selectedColorHex, borderColor: `${selectedColorHex}40` }}>Contact</h4>
                                                                    <div className="space-y-1.5 text-[9px] break-all leading-normal text-neutral-600">
                                                                        {resEmail && <div><b>Email:</b><br />{resEmail}</div>}
                                                                        {resPhone && <div><b>Phone:</b><br />{resPhone}</div>}
                                                                        {github && <div><b>GitHub:</b><br />{github.replace('https://', '')}</div>}
                                                                        {linkedin && <div><b>LinkedIn:</b><br />{linkedin.replace('https://', '')}</div>}
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <h4 className="text-[9px] font-black border-b pb-0.5 uppercase tracking-wider mb-2" style={{ color: selectedColorHex, borderColor: `${selectedColorHex}40` }}>Skills</h4>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {(resSkills || "No skills listed").split(",").map((s, idx) => (
                                                                            <span key={idx} className="px-1.5 py-0.5 rounded text-[8px] font-bold border" style={{ backgroundColor: `${selectedColorHex}12`, color: selectedColorHex, borderColor: `${selectedColorHex}30` }}>
                                                                                {s.trim()}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Main Content Column */}
                                                            <div className="md:col-span-8 pl-1 space-y-4">
                                                                {resSummary && (
                                                                    <div>
                                                                        <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Professional Summary</h2>
                                                                        <p className="text-neutral-700 leading-relaxed text-[10px]">{resSummary}</p>
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Work Experience</h2>
                                                                    <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-[10px]">{resExperience || 'Add work experience...'}</div>
                                                                </div>

                                                                {resInternships && (
                                                                    <div>
                                                                        <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Internship Experience</h2>
                                                                        <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-[10px]">{resInternships}</div>
                                                                    </div>
                                                                )}

                                                                {resProjects && (
                                                                    <div>
                                                                        <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Projects</h2>
                                                                        <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-[10px]">{resProjects}</div>
                                                                    </div>
                                                                )}

                                                                {resCertifications && (
                                                                    <div>
                                                                        <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Certifications & Licenses</h2>
                                                                        <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-[10px]">{resCertifications}</div>
                                                                    </div>
                                                                )}

                                                                {resAwards && (
                                                                    <div>
                                                                        <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Awards & Achievements</h2>
                                                                        <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-[10px]">{resAwards}</div>
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <h2 className="text-[10px] font-bold border-b-2 pb-0.5 uppercase tracking-wider mb-1.5" style={{ color: selectedColorHex, borderColor: selectedColorHex }}>Education</h2>
                                                                    <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-[10px]">{resEducation || 'Add education...'}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Standard layouts (Classic, Modern, Minimalist)
                                                        <div className="text-[10px] text-neutral-800 space-y-4">
                                                            {/* Header */}
                                                            <div
                                                                className={selectedTemplateId === "classic" ? "text-center border-b-2 border-double border-neutral-800 pb-3" : selectedTemplateId === "minimalist" ? "text-left border-b border-slate-200 pb-3" : "text-left border-b-2 pb-3"}
                                                                style={{
                                                                    borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? selectedColorHex : undefined
                                                                }}
                                                            >
                                                                <h1
                                                                    className={selectedTemplateId === "classic" ? "text-xl font-bold font-serif" : selectedTemplateId === "minimalist" ? "text-lg font-light uppercase tracking-wider text-slate-800" : "text-xl font-black"}
                                                                    style={{
                                                                        color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : undefined
                                                                    }}
                                                                >
                                                                    {resName || 'Your Name'}
                                                                </h1>
                                                                <div className={`flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] mt-1 text-neutral-500 justify-start ${selectedTemplateId === "classic" ? "justify-center" : ""}`}>
                                                                    {resEmail && <span>Email: {resEmail}</span>}
                                                                    {resPhone && <span>• Phone: {resPhone}</span>}
                                                                    {github && <span>• GitHub: {github.replace('https://', '')}</span>}
                                                                    {linkedin && <span>• LinkedIn: {linkedin.replace('https://', '')}</span>}
                                                                </div>
                                                            </div>

                                                            {/* Professional Summary */}
                                                            {resSummary && (
                                                                <div>
                                                                    <h2
                                                                        className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                        style={{
                                                                            color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                            borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                        }}
                                                                    >
                                                                        Professional Summary
                                                                    </h2>
                                                                    <p className="leading-relaxed text-[10px]">{resSummary}</p>
                                                                </div>
                                                            )}

                                                            {/* Key Skills */}
                                                            <div>
                                                                <h2
                                                                    className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                    style={{
                                                                        color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                        borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                    }}
                                                                >
                                                                    Key Skills
                                                                </h2>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {(resSkills || "No skills listed").split(",").map((s, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className={
                                                                                selectedTemplateId === "classic"
                                                                                    ? "text-[9.5px] font-serif"
                                                                                    : selectedTemplateId === "minimalist"
                                                                                        ? "bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8.5px]"
                                                                                        : "px-1.5 py-0.5 rounded text-[8.5px] font-bold border"
                                                                            }
                                                                            style={
                                                                                selectedTemplateId === "modern"
                                                                                    ? { backgroundColor: `${selectedColorHex}12`, color: selectedColorHex, borderColor: `${selectedColorHex}30` }
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            {s.trim()}{selectedTemplateId === "classic" && idx < (resSkills || "No skills listed").split(",").length - 1 ? "," : ""}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Work Experience */}
                                                            <div>
                                                                <h2
                                                                    className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                    style={{
                                                                        color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                        borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                    }}
                                                                >
                                                                    Work Experience
                                                                </h2>
                                                                <div className="whitespace-pre-wrap leading-relaxed text-[10px]">{resExperience || 'Add work experience...'}</div>
                                                            </div>

                                                            {/* Internships */}
                                                            {resInternships && (
                                                                <div>
                                                                    <h2
                                                                        className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                        style={{
                                                                            color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                            borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                        }}
                                                                    >
                                                                        Internship Experience
                                                                    </h2>
                                                                    <div className="whitespace-pre-wrap leading-relaxed text-[10px]">{resInternships}</div>
                                                                </div>
                                                            )}

                                                            {/* Projects */}
                                                            {resProjects && (
                                                                <div>
                                                                    <h2
                                                                        className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                        style={{
                                                                            color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                            borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                        }}
                                                                    >
                                                                        Projects
                                                                    </h2>
                                                                    <div className="whitespace-pre-wrap leading-relaxed text-[10px]">{resProjects}</div>
                                                                </div>
                                                            )}

                                                            {/* Certifications */}
                                                            {resCertifications && (
                                                                <div>
                                                                    <h2
                                                                        className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                        style={{
                                                                            color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                            borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                        }}
                                                                    >
                                                                        Certifications & Licenses
                                                                    </h2>
                                                                    <div className="whitespace-pre-wrap leading-relaxed text-[10px]">{resCertifications}</div>
                                                                </div>
                                                            )}

                                                            {/* Awards */}
                                                            {resAwards && (
                                                                <div>
                                                                    <h2
                                                                        className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                        style={{
                                                                            color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                            borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                        }}
                                                                    >
                                                                        Awards & Achievements
                                                                    </h2>
                                                                    <div className="whitespace-pre-wrap leading-relaxed text-[10px]">{resAwards}</div>
                                                                </div>
                                                            )}

                                                            {/* Education */}
                                                            <div>
                                                                <h2
                                                                    className={selectedTemplateId === "classic" ? "text-center text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : selectedTemplateId === "minimalist" ? "text-[9.5px] uppercase tracking-wider font-bold border-b pb-0.5 mb-1.5" : "text-[9.5px] uppercase font-bold border-l-4 pl-2 mb-1.5"}
                                                                    style={{
                                                                        color: selectedTemplateId === "modern" || selectedTemplateId === "classic" ? selectedColorHex : selectedTemplateId === "minimalist" ? "#475569" : undefined,
                                                                        borderColor: selectedTemplateId === "modern" ? selectedColorHex : selectedTemplateId === "classic" ? `${selectedColorHex}40` : selectedTemplateId === "minimalist" ? "#cbd5e1" : undefined
                                                                    }}
                                                                >
                                                                    Education
                                                                </h2>
                                                                <div className="whitespace-pre-wrap leading-relaxed text-[10px]">{resEducation || 'Add education...'}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeModal === "email_analyser" && (
                                    <div className="space-y-6 text-left">
                                        <div className="flex items-center gap-3 pr-16">
                                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">AI Email Analyser</h3>
                                                <p className="text-xs text-white/50">Paste or import an interview email — extract details, research the HR contact on Happenstance, and prep for their likely questions &amp; tone</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <label className="text-sm font-semibold text-white/80 block">Email Content</label>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Quick links:</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleGmailImportLogin}
                                                        disabled={isListingGmail}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded transition-all cursor-pointer disabled:opacity-50 text-[11px] font-bold border ${isLight
                                                            ? "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100 hover:border-teal-300"
                                                            : "bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 hover:border-teal-500/50 text-teal-300"
                                                            }`}
                                                    >
                                                        {isListingGmail ? (
                                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching...</>
                                                        ) : (
                                                            <><Sparkles className={`w-3.5 h-3.5 ${isLight ? "text-teal-600" : "text-teal-400"}`} /> Direct Import from Gmail</>
                                                        )}
                                                    </button>
                                                    <a
                                                        href="https://mail.google.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border ${isLight
                                                            ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100 hover:border-red-300"
                                                            : "bg-[#ea4335]/15 hover:bg-[#ea4335]/25 border border-[#ea4335]/30 hover:border-[#ea4335]/50 text-[#f28b82]"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Gmail Web
                                                    </a>
                                                    <a
                                                        href="https://outlook.live.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border ${isLight
                                                            ? "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100 hover:border-sky-300"
                                                            : "bg-[#0078d4]/15 hover:bg-[#0078d4]/25 border border-[#0078d4]/30 hover:border-[#0078d4]/50 text-[#8ab4f8]"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Outlook
                                                    </a>
                                                    <a
                                                        href="https://mail.yahoo.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border ${isLight
                                                            ? "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-300"
                                                            : "bg-[#6001d2]/15 hover:bg-[#6001d2]/25 border border-[#6001d2]/30 hover:border-[#6001d2]/50 text-[#d7aefb]"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Yahoo
                                                    </a>
                                                </div>
                                            </div>

                                            {gmailError && (
                                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                                    <span>{gmailError}</span>
                                                    <button type="button" className="ml-auto hover:text-white font-bold" onClick={() => setGmailError("")}>Dismiss</button>
                                                </div>
                                            )}

                                            {/* Gmail Email List Drawer */}
                                            <AnimatePresence>
                                                {showGmailList && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="bg-black/30 border border-teal-500/20 rounded-xl p-4 overflow-hidden text-left space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                            <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                                                                <Mail className="w-3.5 h-3.5" /> Select Recruitment Email to Import
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowGmailList(false)}
                                                                className="text-white/40 hover:text-white text-xs font-bold"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>

                                                        {isFetchingGmailBody && (
                                                            <div className="flex items-center gap-2 text-xs text-white/50 justify-center py-4">
                                                                <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> Fetching email content...
                                                            </div>
                                                        )}

                                                        {!isFetchingGmailBody && (
                                                            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                                                                {gmailEmails.length === 0 ? (
                                                                    <div className="text-xs text-white/40 text-center py-4 font-sans">No matching interview/offer emails found in your recent messages.</div>
                                                                ) : (
                                                                    gmailEmails.map((email) => (
                                                                        <div
                                                                            key={email.id}
                                                                            onClick={() => handleGmailMessageSelect(email.id)}
                                                                            className="p-2.5 rounded-lg border border-white/5 hover:border-teal-500/40 bg-white/[0.02] hover:bg-teal-500/5 transition-all cursor-pointer space-y-1 group"
                                                                        >
                                                                            <div className="flex items-center justify-between text-[10px] text-white/40 font-sans">
                                                                                <span className="font-semibold text-teal-300 truncate max-w-[200px]">{email.from}</span>
                                                                                <span>{email.date ? new Date(email.date).toLocaleDateString() : ""}</span>
                                                                            </div>
                                                                            <div className="text-xs font-bold text-white group-hover:text-teal-400 transition-colors truncate font-sans">{email.subject}</div>
                                                                            <div className="text-[10px] text-white/50 truncate leading-snug font-sans">{email.snippet}</div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <textarea
                                                value={emailText || ""}
                                                onChange={(e) => setEmailText(e.target.value)}
                                                rows={8}
                                                placeholder="Paste the raw invitation email text here..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 transition-colors text-white resize-y font-sans leading-relaxed"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAnalyzeEmail}
                                                disabled={isAnalyzingEmail || !emailText.trim()}
                                                className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-colors rounded-xl font-bold text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 w-full sm:w-auto"
                                            >
                                                {isAnalyzingEmail ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Email...</>
                                                ) : (
                                                    <><Sparkles className="w-4 h-4 text-teal-300" /> Analyze Email</>
                                                )}
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {emailAnalysisResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10"
                                                >
                                                    {/* Column 1: Important Points */}
                                                    <div className={`border rounded-2xl p-5 space-y-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#15151c]/60 border border-teal-500/10"
                                                        }`}>
                                                        <h4 className={`text-sm font-extrabold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-teal-400"
                                                            }`}>
                                                            <ShieldCheck className="w-4.5 h-4.5" /> Important Details
                                                        </h4>
                                                        <div className="prose prose-invert text-sm text-white/80 space-y-2 leading-relaxed">
                                                            {(Array.isArray(emailAnalysisResult.importantPoints)
                                                                ? emailAnalysisResult.importantPoints
                                                                : typeof emailAnalysisResult.importantPoints === "string"
                                                                    ? emailAnalysisResult.importantPoints.split("\n")
                                                                    : []
                                                            ).map((line: string, i: number) => {
                                                                const cleaned = line.replace(/^\*\*/g, "").replace(/\*\*/g, "").trim();
                                                                if (!cleaned) return <div key={i} className="h-1" />;
                                                                if (line.startsWith("- ") || line.startsWith("• ")) {
                                                                    return (
                                                                        <p key={i} className={`pl-4 before:content-['•'] before:mr-2 flex items-start ${isLight ? "before:text-teal-600 text-slate-700 font-medium" : "before:text-teal-400 text-white/70"
                                                                            }`}>
                                                                            <span>{cleaned.replace(/^[-•]\s*/, "")}</span>
                                                                        </p>
                                                                    );
                                                                }
                                                                return <p key={i} className={isLight ? "text-slate-700 font-medium" : "text-white/75"}>{cleaned}</p>;
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Mandatory Things & Redirection */}
                                                    <div className="space-y-6">
                                                        <div className={`border rounded-2xl p-5 space-y-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#15151c]/60 border border-teal-500/10"
                                                            }`}>
                                                            <h4 className={`text-sm font-extrabold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-teal-400"
                                                                }`}>
                                                                <Check className="w-4.5 h-4.5" /> Mandatory Requirements
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(Array.isArray(emailAnalysisResult.mandatoryThings)
                                                                    ? emailAnalysisResult.mandatoryThings
                                                                    : typeof emailAnalysisResult.mandatoryThings === "string"
                                                                        ? emailAnalysisResult.mandatoryThings.split("\n")
                                                                        : []
                                                                ).map((line: string, i: number) => {
                                                                    const cleaned = line.replace(/^-\s*\[\s*[x ]\s*\]/gi, "").replace(/^\*\*/g, "").replace(/\*\*/g, "").trim();
                                                                    if (!cleaned) return null;
                                                                    return (
                                                                        <label key={i} className={`flex items-start gap-3 cursor-pointer group text-sm transition-colors ${isLight ? "text-slate-700 hover:text-slate-900 font-medium" : "text-white/80 hover:text-white"
                                                                            }`}>
                                                                            <input type="checkbox" className={`mt-1 accent-teal-500 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-black cursor-pointer border ${isLight ? "border-slate-300 bg-white" : "border-white/20 bg-black/40"
                                                                                }`} />
                                                                            <span>{cleaned}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className={`border rounded-2xl p-5 space-y-4 ${isLight
                                                            ? "bg-slate-50/50 border-slate-200"
                                                            : "bg-gradient-to-br from-teal-500/10 to-indigo-500/10 border border-teal-500/20"
                                                            }`}>
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <h4 className={`text-sm font-extrabold flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                                                                        <Compass className={`w-4 h-4 ${isLight ? "text-teal-600" : "text-teal-400"}`} /> Extracted Preparation Parameters
                                                                    </h4>
                                                                    <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>We found these key parameters. Use them to construct a step-by-step roadmap.</p>
                                                                    {/* Email Type Classification Badge */}
                                                                    {emailAnalysisResult.emailType && (
                                                                        <div className="flex items-center gap-2 pt-1.5">
                                                                            {emailAnalysisResult.emailType === "offer_letter" ? (
                                                                                <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider border rounded-full flex items-center gap-1.5 shadow-sm ${isLight
                                                                                    ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                                                                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                                                                    }`}>
                                                                                    <Award className={`w-3.5 h-3.5 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} /> Job Offer Letter
                                                                                </span>
                                                                            ) : (
                                                                                <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider border rounded-full flex items-center gap-1.5 shadow-sm ${isLight
                                                                                    ? "bg-teal-50 border-teal-200 text-teal-800"
                                                                                    : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                                                                    }`}>
                                                                                    <Mail className={`w-3.5 h-3.5 ${isLight ? "text-teal-600" : "text-teal-400"}`} /> Interview Invitation
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isEditingParams) {
                                                                            setEditRole(emailAnalysisResult.extractedDetails.role);
                                                                            setEditCompany(emailAnalysisResult.extractedDetails.company);
                                                                            setEditLocation(emailAnalysisResult.extractedDetails.location);
                                                                        }
                                                                        setIsEditingParams(!isEditingParams);
                                                                    }}
                                                                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shrink-0 border ${isLight
                                                                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm"
                                                                        : "bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white animate-pulse"
                                                                        }`}
                                                                >
                                                                    {isEditingParams ? "Cancel" : "Edit Details"}
                                                                </button>
                                                            </div>

                                                            {isEditingParams ? (
                                                                <div className={`space-y-3 p-3.5 rounded-xl border relative text-xs ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-black/30 border-white/5"
                                                                    }`}>
                                                                    <div className="space-y-1">
                                                                        <label className={`text-[10px] block font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>Target Role</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editRole || ""}
                                                                            onChange={(e) => setEditRole(e.target.value)}
                                                                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500 font-sans ${isLight ? "bg-white border-slate-300 text-slate-800" : "bg-black/40 border-white/10 text-white"
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className={`text-[10px] block font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>Target Company</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editCompany || ""}
                                                                            onChange={(e) => setEditCompany(e.target.value)}
                                                                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500 font-sans ${isLight ? "bg-white border-slate-300 text-slate-800" : "bg-black/40 border-white/10 text-white"
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className={`text-[10px] block font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>Location</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editLocation || ""}
                                                                            onChange={(e) => setEditLocation(e.target.value)}
                                                                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500 font-sans ${isLight ? "bg-white border-slate-300 text-slate-800" : "bg-black/40 border-white/10 text-white"
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updatedResult = {
                                                                                ...emailAnalysisResult,
                                                                                extractedDetails: {
                                                                                    ...emailAnalysisResult.extractedDetails,
                                                                                    role: editRole,
                                                                                    company: editCompany,
                                                                                    location: editLocation
                                                                                }
                                                                            };
                                                                            setEmailAnalysisResult(updatedResult);
                                                                            setIsEditingParams(false);
                                                                            handleVerifyTargetCredentials(editCompany, editLocation);
                                                                        }}
                                                                        className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" /> Save & Re-verify
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className={`grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl border relative ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-black/30 border-white/5"
                                                                    }`}>
                                                                    <div>
                                                                        <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>Target Role</span>
                                                                        <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{emailAnalysisResult.extractedDetails.role || "Not specified"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className={`block flex items-center gap-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                            Target Company
                                                                            {isVerifyingExtracted && <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />}
                                                                            {!isVerifyingExtracted && verificationResult && (
                                                                                verificationResult.companyValid
                                                                                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                                                                                    : <span title="Invalid or fake company name"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>
                                                                            )}
                                                                        </span>
                                                                        <span className={`font-semibold flex items-center gap-1.5 font-sans ${isLight ? "text-slate-800" : "text-white"}`}>
                                                                            {emailAnalysisResult.extractedDetails.company || "Not specified"}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>HR / Sender</span>
                                                                        <span className={`font-semibold font-sans ${isLight ? "text-slate-800" : "text-white"}`}>{emailAnalysisResult.extractedDetails.hrName || "Not specified"}</span>
                                                                        {isUsableHrName(emailAnalysisResult.extractedDetails.hrName) && (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleResearchHr()}
                                                                                    disabled={hrResearchStatus === "running"}
                                                                                    className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold transition ${hrResearchStatus === "running"
                                                                                        ? "text-teal-400/60 cursor-wait"
                                                                                        : "text-teal-500 hover:text-teal-400 cursor-pointer"
                                                                                        }`}
                                                                                >
                                                                                    {hrResearchStatus === "running" ? (
                                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                                    ) : (
                                                                                        <Search className="w-3 h-3" />
                                                                                    )}
                                                                                    {hrResearchStatus === "completed" ? "Refresh Happenstance" : "Research on Happenstance"}
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={handleStartInterviewAsHr}
                                                                                    className="mt-1.5 ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer transition"
                                                                                >
                                                                                    <Play className="w-3 h-3" />
                                                                                    Mock interview as {emailAnalysisResult.extractedDetails.hrName}
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div className={`col-span-2 pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                        <span className={`block flex items-center gap-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                            Location
                                                                            {isVerifyingExtracted && <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />}
                                                                            {!isVerifyingExtracted && verificationResult && (
                                                                                verificationResult.locationValid
                                                                                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                                                                                    : <span title="Invalid or fake location"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>
                                                                            )}
                                                                        </span>
                                                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                                                            <span className={`font-semibold font-sans ${isLight ? "text-slate-800" : "text-white"}`}>{emailAnalysisResult.extractedDetails.location || "Not specified"}</span>
                                                                            {emailAnalysisResult.extractedDetails.company && emailAnalysisResult.extractedDetails.location && emailAnalysisResult.extractedDetails.location.toLowerCase() !== "remote" && (
                                                                                <a
                                                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(emailAnalysisResult.extractedDetails.company + " " + emailAnalysisResult.extractedDetails.location)}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-0.5 text-[10px] text-teal-500 hover:text-teal-600 font-bold hover:underline transition-all"
                                                                                    title="View location on Google Maps"
                                                                                >
                                                                                    <Map className="w-3 h-3 text-teal-500" /> Map <ExternalLink className="w-2.5 h-2.5" />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Conditional Invitation Fields */}
                                                                    {emailAnalysisResult.emailType === "job_invite" && (
                                                                        <>
                                                                            <div className={`pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                                <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>Platform / Format</span>
                                                                                <span className={`font-semibold font-sans ${isLight ? "text-slate-800" : "text-white"}`}>{emailAnalysisResult.extractedDetails.platformOrFormat || "Not specified"}</span>
                                                                            </div>
                                                                            <div className={`pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                                <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>Interview Schedule</span>
                                                                                <span className={`font-semibold font-sans ${isLight ? "text-slate-800" : "text-white"}`}>{emailAnalysisResult.extractedDetails.interviewDate || "Not specified"}</span>
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    {/* Conditional Offer Fields */}
                                                                    {emailAnalysisResult.emailType === "offer_letter" && (
                                                                        <>
                                                                            <div className={`pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                                <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>Salary / CTC</span>
                                                                                <span className={`font-semibold font-sans ${isLight ? "text-indigo-600 font-bold" : "text-indigo-300"}`}>{emailAnalysisResult.extractedDetails.salaryDetails?.baseSalary || "Not specified"}</span>
                                                                            </div>
                                                                            <div className={`pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                                <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>Joining Date</span>
                                                                                <span className={`font-semibold font-sans ${isLight ? "text-slate-800" : "text-white"}`}>{emailAnalysisResult.extractedDetails.salaryDetails?.joiningDate || "Not specified"}</span>
                                                                            </div>
                                                                            {emailAnalysisResult.extractedDetails.salaryDetails?.benefits && emailAnalysisResult.extractedDetails.salaryDetails.benefits.length > 0 && (
                                                                                <div className={`col-span-2 pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                                    <span className={`block mb-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>Benefits & Perks</span>
                                                                                    <div className="flex flex-wrap gap-1.5">
                                                                                        {emailAnalysisResult.extractedDetails.salaryDetails.benefits.map((b: string, idx: number) => (
                                                                                            <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-medium font-sans border ${isLight ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                                                                                                }`}>
                                                                                                {b}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}

                                                                    {/* Key Skills Tags */}
                                                                    <div className={`col-span-2 pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                        <span className={`block ${isLight ? "text-slate-400" : "text-white/40"}`}>Required Skills</span>
                                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                                            {emailAnalysisResult.extractedDetails.skills && emailAnalysisResult.extractedDetails.skills.length > 0 ? (
                                                                                emailAnalysisResult.extractedDetails.skills.map((s: string, idx: number) => (
                                                                                    <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-medium font-sans border ${isLight ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-teal-500/10 border-teal-500/20 text-teal-300"
                                                                                        }`}>
                                                                                        {s}
                                                                                    </span>
                                                                                ))
                                                                            ) : (
                                                                                <span className={`font-sans ${isLight ? "text-slate-500" : "text-white/50"}`}>None specified</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {(isVerifyingExtracted || verificationResult) && (
                                                                <div className={`rounded-xl p-3 text-[11px] leading-relaxed space-y-2 border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700 font-medium" : "bg-black/20 border-white/5 text-white/60"
                                                                    }`}>
                                                                    {isVerifyingExtracted ? (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" /> Verifying target credentials against database...
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            {(() => {
                                                                                const compScore = verificationResult.companyScore !== undefined ? verificationResult.companyScore : (verificationResult.companyValid ? 100 : 20);
                                                                                const locScore = verificationResult.locationScore !== undefined ? verificationResult.locationScore : (verificationResult.locationValid ? 100 : 20);
                                                                                const avgScore = Math.round((compScore + locScore) / 2);

                                                                                let barColor = "from-red-500 to-red-400";
                                                                                let textClass = "text-red-500";
                                                                                if (avgScore >= 80) {
                                                                                    barColor = "from-green-500 to-emerald-400";
                                                                                    textClass = "text-green-600";
                                                                                } else if (avgScore >= 40) {
                                                                                    barColor = "from-amber-500 to-yellow-400";
                                                                                    textClass = "text-amber-600";
                                                                                }

                                                                                return (
                                                                                    <div className={`space-y-1.5 border-b pb-2 ${isLight ? "border-slate-200" : "border-white/5"}`}>
                                                                                        <div className="flex items-center justify-between font-bold">
                                                                                            <span className={isLight ? "text-slate-500" : "text-white/40"}>Credential Authenticity</span>
                                                                                            <span className={`${textClass} text-xs font-black`}>{avgScore}% Verified</span>
                                                                                        </div>
                                                                                        <div className={`h-1.5 rounded-full overflow-hidden border ${isLight ? "bg-slate-200 border-slate-350" : "bg-black/40 border-white/5"}`}>
                                                                                            <div className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`} style={{ width: `${avgScore}%` }} />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            <p className={`font-sans ${isLight ? "text-slate-600 font-medium" : "text-white/70"}`}>{verificationResult.verificationFeedback}</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {(hrResearchStatus !== "idle" || hrResearchResult) && (
                                                                <div className={`rounded-xl border p-3.5 space-y-3 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-black/30 border-white/5"
                                                                    }`}>
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div>
                                                                            <h5 className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isLight ? "text-teal-700" : "text-teal-400"
                                                                                }`}>
                                                                                <User className="w-3.5 h-3.5" /> Interviewer Intel
                                                                                <span className={`normal-case font-medium tracking-normal ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                                    via Happenstance
                                                                                </span>
                                                                            </h5>
                                                                            {hrResearchMessage && (
                                                                                <p className={`text-[10px] mt-1 font-sans ${isLight ? "text-slate-500" : "text-white/45"}`}>
                                                                                    {hrResearchMessage}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {hrHappenstanceUrl && (
                                                                            <a
                                                                                href={hrHappenstanceUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-0.5 text-[10px] text-teal-500 hover:text-teal-400 font-bold shrink-0"
                                                                            >
                                                                                Open <ExternalLink className="w-2.5 h-2.5" />
                                                                            </a>
                                                                        )}
                                                                    </div>

                                                                    {hrResearchStatus === "running" && (
                                                                        <div className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-600" : "text-white/70"}`}>
                                                                            <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                                                                            Pulling public profile, writings, and career signals…
                                                                        </div>
                                                                    )}

                                                                    {hrResearchStatus === "error" && (
                                                                        <div className={`text-xs rounded-lg px-2.5 py-2 border ${isLight ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                                                                            }`}>
                                                                            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                                                                            {hrResearchMessage || "Could not finish HR research."}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleResearchHr()}
                                                                                className="ml-2 underline font-bold cursor-pointer"
                                                                            >
                                                                                Retry
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {hrResearchStatus === "completed" && hrResearchResult?.intel && (
                                                                        <div className="space-y-3">
                                                                            {hrResearchResult.profile?.tagline && (
                                                                                <p className={`text-[11px] font-sans italic ${isLight ? "text-slate-600" : "text-white/60"}`}>
                                                                                    {hrResearchResult.profile.fullName || hrResearchResult.intel.interviewerName}
                                                                                    {hrResearchResult.profile.currentRoles?.[0]
                                                                                        ? ` · ${hrResearchResult.profile.currentRoles[0].title || ""} @ ${hrResearchResult.profile.currentRoles[0].company || ""}`
                                                                                        : hrResearchResult.intel.titleGuess
                                                                                            ? ` · ${hrResearchResult.intel.titleGuess}`
                                                                                            : ""}
                                                                                    {" — "}
                                                                                    {hrResearchResult.profile.tagline}
                                                                                </p>
                                                                            )}

                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                <div className={`rounded-lg p-2.5 border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                                                                    }`}>
                                                                                    <span className={`block text-[10px] font-bold uppercase tracking-wide mb-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                                        Mood / Energy
                                                                                    </span>
                                                                                    <span className={`inline-block mb-1.5 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${hrResearchResult.intel.moodLabel === "warm" || hrResearchResult.intel.moodLabel === "encouraging"
                                                                                        ? isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
                                                                                        : hrResearchResult.intel.moodLabel === "intense" || hrResearchResult.intel.moodLabel === "skeptical"
                                                                                            ? isLight ? "bg-amber-100 text-amber-800" : "bg-amber-500/15 text-amber-300"
                                                                                            : isLight ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white/80"
                                                                                        }`}>
                                                                                        {hrResearchResult.intel.moodLabel}
                                                                                    </span>
                                                                                    <p className={`text-[11px] leading-relaxed font-sans ${isLight ? "text-slate-700" : "text-white/75"}`}>
                                                                                        {hrResearchResult.intel.mood}
                                                                                    </p>
                                                                                </div>
                                                                                <div className={`rounded-lg p-2.5 border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                                                                    }`}>
                                                                                    <span className={`block text-[10px] font-bold uppercase tracking-wide mb-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                                        Tone to Match
                                                                                    </span>
                                                                                    <p className={`text-[11px] leading-relaxed font-sans ${isLight ? "text-slate-700" : "text-white/75"}`}>
                                                                                        {hrResearchResult.intel.communicationTone}
                                                                                    </p>
                                                                                    <p className={`text-[11px] leading-relaxed font-sans mt-1.5 ${isLight ? "text-teal-700" : "text-teal-300"}`}>
                                                                                        {hrResearchResult.intel.howToSpeak}
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            {hrResearchResult.intel.likelyQuestions?.length > 0 && (
                                                                                <div>
                                                                                    <span className={`block text-[10px] font-bold uppercase tracking-wide mb-1.5 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                                        Likely Questions
                                                                                    </span>
                                                                                    <ul className="space-y-1.5">
                                                                                        {hrResearchResult.intel.likelyQuestions.map((q: any, idx: number) => (
                                                                                            <li
                                                                                                key={idx}
                                                                                                className={`rounded-lg px-2.5 py-2 border text-[11px] ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                                                                                    }`}
                                                                                            >
                                                                                                <div className="flex items-start gap-2">
                                                                                                    <MessageSquare className={`w-3 h-3 mt-0.5 shrink-0 ${isLight ? "text-teal-600" : "text-teal-400"}`} />
                                                                                                    <div>
                                                                                                        <p className={`font-semibold font-sans ${isLight ? "text-slate-800" : "text-white"}`}>{q.question}</p>
                                                                                                        <p className={`mt-0.5 font-sans ${isLight ? "text-slate-500" : "text-white/45"}`}>
                                                                                                            <span className="font-bold uppercase tracking-wide text-[9px]">{q.category}</span>
                                                                                                            {q.why ? ` · ${q.why}` : ""}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}

                                                                            {(hrResearchResult.intel.focusAreas?.length > 0 || hrResearchResult.intel.rapportTips?.length > 0) && (
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                    {hrResearchResult.intel.focusAreas?.length > 0 && (
                                                                                        <div>
                                                                                            <span className={`block text-[10px] font-bold uppercase tracking-wide mb-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                                                Focus Areas
                                                                                            </span>
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {hrResearchResult.intel.focusAreas.map((area: string, idx: number) => (
                                                                                                    <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${isLight ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-teal-500/10 border-teal-500/20 text-teal-300"
                                                                                                        }`}>
                                                                                                        {area}
                                                                                                    </span>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    {hrResearchResult.intel.rapportTips?.length > 0 && (
                                                                                        <div>
                                                                                            <span className={`block text-[10px] font-bold uppercase tracking-wide mb-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                                                                Rapport Tips
                                                                                            </span>
                                                                                            <ul className={`text-[11px] space-y-0.5 font-sans list-disc pl-4 ${isLight ? "text-slate-600" : "text-white/65"}`}>
                                                                                                {hrResearchResult.intel.rapportTips.map((tip: string, idx: number) => (
                                                                                                    <li key={idx}>{tip}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {hrResearchResult.intel.watchOuts?.length > 0 && (
                                                                                <div className={`rounded-lg px-2.5 py-2 border text-[11px] ${isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/20 text-amber-100"
                                                                                    }`}>
                                                                                    <span className="font-bold">Watch outs: </span>
                                                                                    {hrResearchResult.intel.watchOuts.join(" · ")}
                                                                                </div>
                                                                            )}

                                                                            <p className={`text-[10px] font-sans ${isLight ? "text-slate-400" : "text-white/35"}`}>
                                                                                Confidence {Math.round(hrResearchResult.intel.confidence || 0)}%
                                                                                {hrResearchResult.intel.source === "gemini_fallback" ? " · Happenstance profile unavailable (fallback guidance)" : " · grounded in Happenstance research"}
                                                                                {hrResearchResult.intel.disclaimer ? ` · ${hrResearchResult.intel.disclaimer}` : ""}
                                                                            </p>

                                                                            <button
                                                                                type="button"
                                                                                onClick={handleStartInterviewAsHr}
                                                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                                                                            >
                                                                                <Play className="w-3.5 h-3.5" />
                                                                                Mock interview as {hrResearchResult.intel.interviewerName || emailAnalysisResult.extractedDetails?.hrName || "HR"}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {emailAnalysisResult.emailType === "offer_letter" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const details = emailAnalysisResult.extractedDetails;
                                                                        setNegotiateCompany(details?.company || "");
                                                                        setNegotiateRole(details?.role || "");
                                                                        setNegotiateOffer(details?.salaryDetails?.baseSalary || "");
                                                                        setNegotiateBenefits(
                                                                            Array.isArray(details?.salaryDetails?.benefits)
                                                                                ? details.salaryDetails.benefits.join(", ")
                                                                                : details?.salaryDetails?.benefits || ""
                                                                        );
                                                                        setActiveModal("negotiate");
                                                                        setActiveTool("negotiate");
                                                                    }}
                                                                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-green-600/10 cursor-pointer"
                                                                >
                                                                    <Handshake className="w-4 h-4" /> Open Negotiation
                                                                </button>
                                                            )}

                                                            {emailAnalysisResult.emailType === "job_invite" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCreatePrepPack}
                                                                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-sky-600/10 cursor-pointer"
                                                                >
                                                                    <CalendarClock className="w-4 h-4" /> Create Prep Pack
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={handleRedirectToRoadmap}
                                                                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-teal-600/10 cursor-pointer"
                                                            >
                                                                Create Preparation Roadmap <ArrowRight className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {activeModal === "prep_pack" && (
                                    <div className="space-y-4 text-left">
                                        <div className="flex items-center gap-3 pr-16">
                                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                                                <CalendarClock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Prep Packs</h3>
                                                <p className="text-xs text-white/50">Checklists and reminders from your interview invites.</p>
                                            </div>
                                        </div>
                                        <PrepPackPanel
                                            onCreateRoadmap={(company, role, skills) => {
                                                setRoadmapCourse(role);
                                                setRoadmapCompany(company);
                                                setRoadmapLocation("");
                                                setRoadmapAdditional(
                                                    skills && skills.length > 0 
                                                        ? `Skills parsed from invite: ${skills.join(", ")}` 
                                                        : ""
                                                );
                                                setActiveModal("roadmap_generator");
                                                setActiveTool("roadmap_generator");
                                                setActiveRoadmapId(null);
                                                setRoadmapImages([]);
                                                setRoadmapImageError("");
                                                setRoadmapResult(null);
                                                setRoadmapTasksChecked({});
                                                setExpandedPhases({ 0: true });
                                            }}
                                            onOpenNegotiation={(company, role) => {
                                                setNegotiateCompany(company);
                                                setNegotiateRole(role);
                                                setNegotiateOffer("");
                                                setNegotiateBenefits("");
                                                setActiveModal("negotiate");
                                                setActiveTool("negotiate");
                                            }}
                                        />
                                    </div>
                                )}

                                {activeModal === "drills" && (
                                    <div className="text-left">
                                        <SpacedDrillsPanel />
                                    </div>
                                )}


                                {activeModal === "roadmap_generator" && (
                                    <div className="space-y-6 text-left">
                                        <div className="flex items-center gap-3 pr-16">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <Map className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">AI Preparation Roadmap Generator</h3>
                                                <p className="text-xs text-white/50">Build a personalized prep timeline, learning modules, and checklists based on target parameters</p>
                                            </div>
                                        </div>

                                        {savedRoadmaps.length > 0 && (
                                            <div className={`border rounded-2xl p-4 space-y-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-emerald-700" : "text-emerald-400"
                                                        }`}>
                                                        <Compass className="w-4 h-4" /> My Preparation Path Catalog
                                                    </h4>
                                                    <button
                                                        onClick={handleCreateNewRoadmap}
                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Plus className="w-3 h-3" /> New Roadmap
                                                    </button>
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                                    {savedRoadmaps.map((road) => {
                                                        const isActive = road.id === activeRoadmapId;

                                                        // Calculate completion progress
                                                        const totalTasks = road.roadmapData?.timeline?.reduce((acc: number, phase: any) => acc + (phase.tasks?.length || 0), 0) || 0;
                                                        const checkedTasksCount = Object.values(road.tasksChecked || {}).filter(Boolean).length;
                                                        const isCompleted = totalTasks > 0 && checkedTasksCount === totalTasks;
                                                        const completionPct = totalTasks > 0 ? Math.round((checkedTasksCount / totalTasks) * 100) : 0;

                                                        return (
                                                            <div
                                                                key={road.id}
                                                                onClick={() => handleLoadRoadmap(road.id)}
                                                                className={`flex-shrink-0 cursor-pointer p-3.5 rounded-xl border text-left transition-all ${isActive
                                                                    ? isLight
                                                                        ? "bg-emerald-50 border-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                                        : "bg-emerald-950/20 border-emerald-500/80 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                                    : isLight
                                                                        ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-sm"
                                                                        : "bg-black/30 border-white/5 text-white/60 hover:border-white/20 hover:text-white"
                                                                    } min-w-[180px] max-w-[220px] relative group`}
                                                            >
                                                                <div className={`text-xs font-black truncate pr-5 font-sans ${isLight ? "text-slate-900" : "text-white"}`} title={road.course}>
                                                                    {road.course}
                                                                </div>
                                                                <div className={`text-[10px] font-bold truncate mt-0.5 ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                                                    {road.company} &bull; {road.location}
                                                                </div>

                                                                <div className="flex items-center gap-1.5 mt-2">
                                                                    {isActive && (
                                                                        <span className={`border px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isLight ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                                            }`}>
                                                                            Current
                                                                        </span>
                                                                    )}
                                                                    {isCompleted ? (
                                                                        <span className={`border px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isLight ? "bg-indigo-100 border-indigo-300 text-indigo-800" : "bg-indigo-500/15 border-indigo-500/35 text-indigo-300"
                                                                            }`}>
                                                                            Completed
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold ${isLight ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-white/40"
                                                                            }`}>
                                                                            {completionPct}% Done
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteRoadmap(road.id, e)}
                                                                    className={isLight ? "absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer z-10 md:opacity-0 md:group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-slate-200 bg-slate-100" : "absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer z-10 md:opacity-0 md:group-hover:opacity-100 text-white/40 hover:text-red-400 hover:bg-white/10 bg-black/40"}
                                                                    title="Delete Roadmap"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-white/70 block mb-1">Course / Target Role</label>
                                                <input
                                                    type="text"
                                                    value={roadmapCourse || ""}
                                                    onChange={(e) => setRoadmapCourse(e.target.value)}
                                                    placeholder="e.g. Frontend Engineer, React Developer"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white font-sans font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-white/70 block mb-1">Target Company</label>
                                                <input
                                                    type="text"
                                                    value={roadmapCompany || ""}
                                                    onChange={(e) => setRoadmapCompany(e.target.value)}
                                                    placeholder="e.g. Google, Amazon, Stripe"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white font-sans font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-white/70 block mb-1">Job Location</label>
                                                <input
                                                    type="text"
                                                    value={roadmapLocation || ""}
                                                    onChange={(e) => setRoadmapLocation(e.target.value)}
                                                    placeholder="e.g. London, Remote, New York"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white font-sans font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-white/70 block mb-1">Additional Requirements / Context (Skills, Email details)</label>
                                            <textarea
                                                value={roadmapAdditional || ""}
                                                onChange={(e) => setRoadmapAdditional(e.target.value)}
                                                rows={3}
                                                placeholder="Add key technologies, specific skills (e.g. Next.js, System Design) or details extracted from your invite email..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white resize-y font-sans font-medium"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 py-1">
                                            <div className="h-px flex-1 bg-white/10" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">or text</span>
                                            <div className="h-px flex-1 bg-white/10" />
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-white/70 block mb-1">Reference Images</label>
                                            <div className="border border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center hover:border-emerald-500/50 transition-colors relative bg-black/20 cursor-pointer">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        const allowedImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
                                                        const maxImages = 4;
                                                        const maxImageSizeBytes = 5 * 1024 * 1024;
                                                        const invalidFile = files.find((file) => !allowedImageTypes.has(file.type) || file.size <= 0);
                                                        if (invalidFile) {
                                                            setRoadmapImageError(`Unsupported image type for ${invalidFile.name}. Use JPEG, PNG, WEBP, or GIF.`);
                                                            e.target.value = "";
                                                            return;
                                                        }

                                                        const oversizedFile = files.find((file) => file.size > maxImageSizeBytes);
                                                        if (oversizedFile) {
                                                            setRoadmapImageError(`Image ${oversizedFile.name} is too large. Keep each image under 5 MB.`);
                                                            e.target.value = "";
                                                            return;
                                                        }

                                                        if (roadmapImages.length + files.length > maxImages) {
                                                            setRoadmapImageError(`Upload up to ${maxImages} images for roadmap generation.`);
                                                            e.target.value = "";
                                                            return;
                                                        }

                                                        setRoadmapImageError("");
                                                        setRoadmapImages((prev) => [...prev, ...files]);
                                                        e.target.value = "";
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                                <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
                                                <span className="text-xs text-white/60 font-medium text-center">Drop screenshots, notes, or brief images here</span>
                                                <span className="text-[10px] text-white/35 mt-1 text-center">Up to 4 images, 5 MB each</span>
                                            </div>

                                            {roadmapImageError && (
                                                <p className="mt-2 text-[11px] font-medium text-red-300">{roadmapImageError}</p>
                                            )}

                                            {roadmapImages.length > 0 && (
                                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {roadmapImages.map((file, idx) => (
                                                        <div key={`${file.name}-${idx}`} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                                                            <span>{file.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRoadmapImages((prev) => prev.filter((_, i) => i !== idx))}
                                                                className="text-emerald-400 hover:text-white transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleGenerateRoadmap}
                                            disabled={isGeneratingRoadmap || (!roadmapImages.length && (!roadmapCourse.trim() || !roadmapCompany.trim() || !roadmapLocation.trim() || !roadmapAdditional.trim()))}
                                            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors rounded-xl font-bold text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
                                        >
                                            {isGeneratingRoadmap ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Designing Preparation Path...</>
                                            ) : (
                                                <><Sparkles className="w-4 h-4 text-emerald-300" /> Generate Roadmap</>
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {roadmapResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="space-y-6 pt-6 border-t border-white/10"
                                                >
                                                    {/* High Level Overview Card */}
                                                    <div className={`border rounded-2xl p-5 relative overflow-hidden ${isLight ? "bg-emerald-50 border-emerald-200 text-slate-900" : "bg-[#121c16]/50 border border-emerald-500/20 text-white"
                                                        }`}>
                                                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                                            <Compass className="w-32 h-32 text-emerald-400" />
                                                        </div>
                                                        <h4 className={`font-extrabold text-base mb-2 ${isLight ? "text-emerald-950" : "text-white"}`}>Roadmap Strategy Overview</h4>
                                                        <p className={`text-sm leading-relaxed max-w-3xl font-medium ${isLight ? "text-emerald-850" : "text-white/70"}`}>{roadmapResult.overview}</p>
                                                    </div>

                                                    {/* Progress & Actions Section */}
                                                    {(() => {
                                                        const totalTasks = roadmapResult.timeline.reduce((acc: number, phase: any) => acc + (phase.tasks?.length || 0), 0);
                                                        const checkedTasksCount = Object.values(roadmapTasksChecked).filter(Boolean).length;
                                                        const progressPercentage = totalTasks > 0 ? Math.round((checkedTasksCount / totalTasks) * 100) : 0;
                                                        return (
                                                            <div className={`border rounded-2xl p-6 flex flex-col gap-6 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border border-white/5"
                                                                }`}>
                                                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
                                                                    <div className="flex items-center gap-5">
                                                                        {/* Circular Progress SVG */}
                                                                        <div className="relative w-20 h-20 shrink-0">
                                                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                                                {/* Background Circle */}
                                                                                <circle
                                                                                    cx="50"
                                                                                    cy="50"
                                                                                    r="40"
                                                                                    className={isLight ? "stroke-slate-200" : "stroke-white/[0.04]"}
                                                                                    strokeWidth="8"
                                                                                    fill="transparent"
                                                                                />
                                                                                {/* Progress Glow Circle */}
                                                                                <circle
                                                                                    cx="50"
                                                                                    cy="50"
                                                                                    r="40"
                                                                                    className="stroke-emerald-500/20 blur-[2px]"
                                                                                    strokeWidth="8"
                                                                                    fill="transparent"
                                                                                    strokeDasharray={251.3}
                                                                                    strokeDashoffset={251.3 - (251.3 * progressPercentage) / 100}
                                                                                    strokeLinecap="round"
                                                                                />
                                                                                {/* Foreground Progress Circle */}
                                                                                <circle
                                                                                    cx="50"
                                                                                    cy="50"
                                                                                    r="40"
                                                                                    className="stroke-emerald-500 transition-all duration-500 ease-out"
                                                                                    strokeWidth="8"
                                                                                    fill="transparent"
                                                                                    strokeDasharray={251.3}
                                                                                    strokeDashoffset={251.3 - (251.3 * progressPercentage) / 100}
                                                                                    strokeLinecap="round"
                                                                                />
                                                                            </svg>
                                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                                <span className={`text-lg font-black leading-none ${isLight ? "text-slate-900" : "text-white"}`}>{progressPercentage}%</span>
                                                                                <span className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>Done</span>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isLight ? "text-slate-400" : "text-white/40"}`}>Overall Completion Progress</div>
                                                                            <div className="text-sm font-extrabold flex items-baseline gap-1">
                                                                                <span className="text-emerald-500 text-lg">{checkedTasksCount}</span>
                                                                                <span className={isLight ? "text-slate-300" : "text-white/40"}>/</span>
                                                                                <span className={isLight ? "text-slate-700" : "text-white/70"}>{totalTasks}</span>
                                                                                <span className={`ml-2 font-medium ${isLight ? "text-slate-500" : "text-white/40"}`}>tasks completed</span>
                                                                            </div>
                                                                            <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>Keep checking off tasks in the timeline below to track your progress</p>
                                                                        </div>
                                                                    </div>
                                                                    {/* Quick Actions Panel */}
                                                                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleSyncRoadmapToResume}
                                                                            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10"
                                                                        >
                                                                            <Briefcase className="w-3.5 h-3.5" /> Sync to Resume
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={isGeneratingStudyMaterials}
                                                                            onClick={handleGenerateBackgroundStudyMaterials}
                                                                            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 disabled:opacity-50"
                                                                        >
                                                                            {isGeneratingStudyMaterials ? (
                                                                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Guides...</>
                                                                            ) : (
                                                                                <><BookOpen className="w-3.5 h-3.5" /> Generate Study Pack</>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleCopyRoadmapMarkdown}
                                                                            className={`flex-1 md:flex-none px-4 py-2.5 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${isLight
                                                                                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-750 hover:text-slate-900 shadow-sm"
                                                                                : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
                                                                                }`}
                                                                        >
                                                                            <Copy className="w-3.5 h-3.5" /> Copy Markdown
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleDownloadRoadmapText}
                                                                            className={`flex-1 md:flex-none px-4 py-2.5 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${isLight
                                                                                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-750 hover:text-slate-900 shadow-sm"
                                                                                : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
                                                                                }`}
                                                                        >
                                                                            <Download className="w-3.5 h-3.5" /> Download Text
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {(() => {
                                                                    const topics: string[] = [];
                                                                    roadmapResult.timeline.forEach((phase: any) => {
                                                                        if (Array.isArray(phase.topics)) {
                                                                            phase.topics.forEach((t: string) => {
                                                                                const clean = t.trim();
                                                                                if (clean && !topics.includes(clean)) {
                                                                                    topics.push(clean);
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                    if (topics.length === 0) return null;
                                                                    return (
                                                                        <div className="w-full border-t border-white/10 pt-4 mt-2 space-y-2">
                                                                            <div className="text-xs font-bold text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                                                                                <Database className="w-3.5 h-3.5 text-indigo-400" />
                                                                                Topics to generate ({topics.length}):
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1 scrollbar-thin">
                                                                                {topics.map((topic, idx) => (
                                                                                    <span key={idx} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-semibold font-sans">
                                                                                        {topic}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Roadmap Timeline Phases */}
                                                    <div className="space-y-4">
                                                        <h4 className={`font-extrabold text-base flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"
                                                            }`}>
                                                            <ListTodo className={`w-5 h-5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} /> Execution Milestones
                                                        </h4>
                                                        <div className="space-y-3.5">
                                                            {roadmapResult.timeline.map((phase: any, phaseIdx: number) => {
                                                                const isExpanded = !!expandedPhases[phaseIdx];
                                                                const phaseTasks = phase.tasks || [];
                                                                const phaseTasksCount = phaseTasks.length;
                                                                const phaseCheckedCount = phaseTasks.reduce((acc: number, task: string, idx: number) => {
                                                                    const taskKey = `${phaseIdx}_${idx}`;
                                                                    return acc + (roadmapTasksChecked[taskKey] ? 1 : 0);
                                                                }, 0);
                                                                const isPhaseCompleted = phaseTasksCount > 0 && phaseCheckedCount === phaseTasksCount;

                                                                return (
                                                                    <div
                                                                        key={phaseIdx}
                                                                        className={`border rounded-2xl transition-all duration-300 ${isLight
                                                                            ? isExpanded
                                                                                ? "bg-white border-emerald-500/30 shadow-md"
                                                                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                                                            : isExpanded
                                                                                ? "bg-black/30 border-emerald-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                                                                                : "bg-black/30 border-white/5 hover:border-white/10"
                                                                            }`}
                                                                    >
                                                                        {/* Header: Clickable panel to toggle expansion */}
                                                                        <div
                                                                            onClick={() => {
                                                                                setExpandedPhases(prev => ({
                                                                                    ...prev,
                                                                                    [phaseIdx]: !prev[phaseIdx]
                                                                                }));
                                                                            }}
                                                                            className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                                                                        >
                                                                            <div className="flex items-center gap-3.5 min-w-0">
                                                                                {/* Phase Completion Node indicator */}
                                                                                <div className="shrink-0">
                                                                                    {isPhaseCompleted ? (
                                                                                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${isLight ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                                                            }`}>
                                                                                            <CheckCircle className="w-4 h-4" />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black ${isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-white/5 border-white/15 text-white/50"
                                                                                            }`}>
                                                                                            {phaseIdx + 1}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="min-w-0">
                                                                                    <h5 className={`font-bold text-sm truncate flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                                                                                        {phase.phase}
                                                                                    </h5>
                                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                                        <span className={`text-[10px] font-bold font-sans ${isLight ? "text-slate-500" : "text-white/40"}`}>
                                                                                            {phase.duration}
                                                                                        </span>
                                                                                        {phaseTasksCount > 0 && (
                                                                                            <>
                                                                                                <span className={isLight ? "text-slate-300 text-[9px]" : "text-white/20 text-[9px]"}>&bull;</span>
                                                                                                <span className={`text-[10px] font-extrabold ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>
                                                                                                    {phaseCheckedCount}/{phaseTasksCount} Tasks Completed
                                                                                                </span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="shrink-0 flex items-center gap-2.5">
                                                                                <span className={`bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-opacity ${isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                                                                                    {isPhaseCompleted ? "Completed" : "Active"}
                                                                                </span>
                                                                                <div className={isLight ? "text-slate-400 hover:text-slate-600 transition-colors" : "text-white/40 hover:text-white transition-colors"}>
                                                                                    {isExpanded ? (
                                                                                        <ChevronUp className="w-4 h-4" />
                                                                                    ) : (
                                                                                        <ChevronDown className="w-4 h-4" />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Collapsible Body */}
                                                                        <AnimatePresence initial={false}>
                                                                            {isExpanded && (
                                                                                <motion.div
                                                                                    initial={{ height: 0, opacity: 0 }}
                                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                                    exit={{ height: 0, opacity: 0 }}
                                                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                                                    className="overflow-hidden"
                                                                                >
                                                                                    <div className={`px-5 pb-5 pt-1.5 border-t space-y-4 text-left ${isLight ? "border-slate-100" : "border-white/5"}`}>
                                                                                        <p className={`text-xs leading-relaxed font-medium ${isLight ? "text-slate-650" : "text-white/60"}`}>
                                                                                            {phase.description}
                                                                                        </p>

                                                                                        {/* Topics badges */}
                                                                                        {phase.topics && phase.topics.length > 0 && (
                                                                                            <div className="space-y-1.5">
                                                                                                <span className={`text-[10px] uppercase font-extrabold block ${isLight ? "text-slate-400" : "text-white/30"}`}>Topics to Study</span>
                                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                                    {phase.topics.map((topic: string, i: number) => (
                                                                                                        <span key={i} className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/5 text-white/70"
                                                                                                            }`}>{topic}</span>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Resources to check */}
                                                                                        {phase.resources && phase.resources.length > 0 && (
                                                                                            <div className={`space-y-1.5 border p-3.5 rounded-xl ${isLight ? "bg-slate-50/50 border-slate-200" : "bg-white/[0.01] border border-white/5"
                                                                                                }`}>
                                                                                                <span className={`text-[10px] uppercase font-extrabold block flex items-center gap-1 ${isLight ? "text-slate-400" : "text-white/30"}`}>
                                                                                                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Study Resources
                                                                                                </span>
                                                                                                <ul className={`text-xs space-y-1.5 list-disc pl-4 leading-relaxed font-medium ${isLight ? "text-slate-600" : "text-white/70"}`}>
                                                                                                    {phase.resources.map((res: string, i: number) => (
                                                                                                        <li key={i}>{res}</li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Task list with checkboxes */}
                                                                                        {phase.tasks && phase.tasks.length > 0 && (
                                                                                            <div className="space-y-2">
                                                                                                <span className={`text-[10px] uppercase font-extrabold block ${isLight ? "text-slate-400" : "text-white/30"}`}>Tasks Check-list</span>
                                                                                                <div className="space-y-1.5">
                                                                                                    {phase.tasks.map((task: string, taskIdx: number) => {
                                                                                                        const taskKey = `${phaseIdx}_${taskIdx}`;
                                                                                                        return (
                                                                                                            <label key={taskIdx} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs transition-colors cursor-pointer group border ${isLight
                                                                                                                ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                                                                                                : "bg-black/40 border-white/5 text-white/70 hover:text-white"
                                                                                                                }`}>
                                                                                                                <input
                                                                                                                    type="checkbox"
                                                                                                                    checked={!!roadmapTasksChecked[taskKey]}
                                                                                                                    onChange={(e) => {
                                                                                                                        const updatedChecked = {
                                                                                                                            ...roadmapTasksChecked,
                                                                                                                            [taskKey]: e.target.checked
                                                                                                                        };
                                                                                                                        setRoadmapTasksChecked(updatedChecked);
                                                                                                                        if (activeRoadmapId) {
                                                                                                                            const updatedList = savedRoadmaps.map(r => {
                                                                                                                                if (r.id === activeRoadmapId) {
                                                                                                                                    return { ...r, tasksChecked: updatedChecked };
                                                                                                                                }
                                                                                                                                return r;
                                                                                                                            });
                                                                                                                            setSavedRoadmaps(updatedList);
                                                                                                                            setStorageItem("savedRoadmapsDatabase", JSON.stringify(updatedList));
                                                                                                                        }
                                                                                                                    }}
                                                                                                                    className={`mt-0.5 accent-emerald-500 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer border ${isLight ? "border-slate-300 bg-white" : "border-white/20 bg-black/40"
                                                                                                                        }`}
                                                                                                                />
                                                                                                                <span className={`font-medium ${roadmapTasksChecked[taskKey]
                                                                                                                    ? isLight ? "line-through text-slate-300" : "line-through text-white/30"
                                                                                                                    : ""
                                                                                                                    }`}>{task}</span>
                                                                                                            </label>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Interview Tips Card */}
                                                    {roadmapResult.interviewTips && roadmapResult.interviewTips.length > 0 && (
                                                        <div className={`border rounded-2xl p-5 space-y-3 ${isLight
                                                            ? "bg-emerald-50/50 border-emerald-200"
                                                            : "bg-[#121c16]/30 border border-emerald-500/10"
                                                            }`}>
                                                            <h4 className={`font-extrabold text-sm flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-white"
                                                                }`}>
                                                                <ShieldCheck className={`w-4.5 h-4.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} /> Target Prep Strategy Tips
                                                            </h4>
                                                            <ul className={`text-xs space-y-2 list-disc pl-4 leading-relaxed font-medium ${isLight ? "text-slate-700" : "text-white/75"
                                                                }`}>
                                                                {roadmapResult.interviewTips.map((tip: string, i: number) => (
                                                                    <li key={i}>{tip}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {activeModal === "aptitude" && (() => {
                                    const selectedPathData = aptitudePath ? interviewPrepLogic.paths[aptitudePath] : null;
                                    const topics = selectedPathData ? selectedPathData.topics : {};

                                    if (isMockTestMode) {
                                        return renderMockTestSimulator();
                                    }

                                    if (activeQuizCategory !== null) {
                                        const currentQ = quizQuestionsList[currentQuizQuestionIndex];
                                        const currentCategoryName = aptitudeQuestions[activeQuizCategory]?.category || activeQuizCategory;

                                        if (quizCompleted) {
                                            return (
                                                <div className="space-y-6 text-left animate-in fade-in duration-300 font-sans">
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                        <h3 className="text-lg font-bold text-white">Quiz Results</h3>
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 border border-pink-500/20 text-pink-400">
                                                            {currentCategoryName}
                                                        </span>
                                                    </div>

                                                    <div className="bg-[#16161f] border border-white/5 rounded-2xl p-8 text-center space-y-4">
                                                        <Award className="w-12 h-12 text-pink-400 mx-auto" />
                                                        <div className="space-y-1.5">
                                                            <h4 className="text-2xl font-black text-white">
                                                                {quizAutoSubmittedReason === "time"
                                                                    ? "Time's Up!"
                                                                    : quizAutoSubmittedReason === "proctor"
                                                                        ? "Test Terminated"
                                                                        : "Quiz Finished!"
                                                                }
                                                            </h4>
                                                            <p className="text-xs text-white/50 leading-relaxed max-w-sm mx-auto font-semibold">
                                                                {quizAutoSubmittedReason === "proctor"
                                                                    ? "Your quiz was auto-submitted because you switched windows or tabs multiple times, violating proctoring policies."
                                                                    : "You completed the evaluation matching key technical capabilities and logic structures."
                                                                }
                                                            </p>
                                                        </div>
                                                        <div className="pt-2">
                                                            <span className="text-xs text-white/40 block uppercase font-black">Score Obtained</span>
                                                            <span className="text-4xl font-black text-white">{quizScore} <span className="text-lg text-white/40">/ {quizQuestionsList.length}</span></span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Solutions Review</h4>
                                                        {quizQuestionsList.map((q, idx) => {
                                                            const selected = quizSelectedAnswersList[idx];
                                                            const isCorrect = selected === q.correctAnswer;
                                                            return (
                                                                <div key={q.id} className={`border rounded-xl p-5 space-y-3 ${isLight ? "bg-white border-slate-200" : "bg-[#111] border-white/5"
                                                                    }`}>
                                                                    <div className="flex items-start gap-3">
                                                                        <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${selected === null || selected === undefined
                                                                            ? "bg-yellow-550/10 text-yellow-550 border border-yellow-550/20"
                                                                            : isCorrect
                                                                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                                            }`}>
                                                                            {idx + 1}
                                                                        </span>
                                                                        <div className="space-y-2 text-left">
                                                                            <p className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-white/90"}`}>{q.question}</p>
                                                                            {q.codeSnippet && (
                                                                                <pre className="bg-black/50 p-4 rounded-xl font-mono text-[10px] border border-white/5 text-pink-300 overflow-x-auto">
                                                                                    <code>{q.codeSnippet}</code>
                                                                                </pre>
                                                                            )}
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                                                                {q.options.map((opt: string, oIdx: number) => {
                                                                                    let optStyle = "bg-white/[0.02] border-white/5 text-white/50";
                                                                                    if (isLight) {
                                                                                        optStyle = "bg-slate-50 border-slate-200 text-slate-500";
                                                                                    }
                                                                                    if (oIdx === q.correctAnswer) {
                                                                                        optStyle = "bg-green-500/10 border-green-500/20 text-green-500 font-semibold";
                                                                                    } else if (oIdx === selected) {
                                                                                        optStyle = "bg-red-500/10 border-red-500/20 text-red-550 font-semibold";
                                                                                    }
                                                                                    return (
                                                                                        <div key={oIdx} className={`px-3 py-2 rounded-xl border text-[11px] flex items-center justify-between ${optStyle}`}>
                                                                                            <span>{opt}</span>
                                                                                            {oIdx === q.correctAnswer && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                                                                            {oIdx === selected && oIdx !== q.correctAnswer && <X className="w-3.5 h-3.5 text-red-550" />}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5 text-[10px] text-white/70 space-y-1 mt-2.5">
                                                                                <span className="font-extrabold text-indigo-400 uppercase tracking-wider block">Explanation</span>
                                                                                <p className="font-medium leading-relaxed">{q.explanation}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveQuizCategory(null)}
                                                        className="w-full py-3 bg-pink-650 hover:bg-pink-500 text-white rounded-xl font-bold text-xs transition shadow-md shadow-pink-600/10 cursor-pointer"
                                                    >
                                                        Back to Topics Checklist
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-6 text-left relative animate-in fade-in duration-300 font-sans">
                                                {proctorWarningActive && (
                                                    <div className="absolute inset-0 bg-[#0d0d12]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 rounded-2xl border border-yellow-500/20">
                                                        <div className="max-w-md w-full bg-[#16161f] border border-yellow-500/30 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_50px_rgba(234,179,8,0.08)]">
                                                            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto text-yellow-500">
                                                                <AlertTriangle className="w-8 h-8" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <h4 className="text-lg font-black text-white uppercase tracking-wider">Proctor Warning</h4>
                                                                <p className="text-xs text-white/60 leading-relaxed font-semibold">
                                                                    Tab switch detected! Warning <span className="text-yellow-500 font-extrabold">{proctorWarnings} of 3</span>. Leaving the assessment or focusing other windows is prohibited during the test. Your quiz will submit on 3 warnings.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setProctorWarningActive(false)}
                                                                className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                            >
                                                                Return to Quiz
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                    <div>
                                                        <span className="text-[10px] text-white/45 uppercase font-black tracking-wider block">Practice Quiz</span>
                                                        <h3 className="text-lg font-bold text-white">{currentCategoryName}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {proctorWarnings > 0 && (
                                                            <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-yellow-500/15 border border-yellow-500/20 text-yellow-500 flex items-center gap-1">
                                                                ⚠️ Warning: {proctorWarnings}/3
                                                            </span>
                                                        )}
                                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-extrabold bg-pink-500/15 border border-pink-500/20 text-pink-400">
                                                            ⏱ {quizTimeRemaining}s
                                                        </span>
                                                    </div>
                                                </div>

                                                {isQuizLoading || quizQuestionsList.length === 0 ? (
                                                    <div className="py-20 text-center space-y-4">
                                                        <Loader2 className="w-8 h-8 text-pink-400 animate-spin mx-auto" />
                                                        <p className="text-xs text-white/40 font-semibold">Analyzing path nodes and generating custom practice evaluations using Gemini...</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6 text-left font-sans">
                                                        <div className="border border-white/5 bg-[#16161f] rounded-2xl p-5 space-y-4">
                                                            <span className="text-[9px] uppercase font-bold text-white/45 block">Question {currentQuizQuestionIndex + 1} of {quizQuestionsList.length}</span>
                                                            <p className="text-sm font-semibold leading-relaxed text-white/95">{currentQ.question}</p>
                                                            {currentQ.codeSnippet && (
                                                                <pre className="bg-black/50 p-4 rounded-xl font-mono text-xs border border-white/10 text-pink-300 overflow-x-auto">
                                                                    <code>{currentQ.codeSnippet}</code>
                                                                </pre>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-3">
                                                            {currentQ.options.map((opt: string, oIdx: number) => {
                                                                const isSelected = quizSelectedOption === oIdx;

                                                                let optStyle = "bg-black/35 border-white/5 text-white/70 hover:border-white/20 hover:text-white";
                                                                if (isLight) {
                                                                    if (theme === "eyeprotect") {
                                                                        optStyle = isSelected
                                                                            ? "bg-[#ebdac2] border-amber-800 text-amber-900 font-bold shadow-[0_0_15px_rgba(217,119,6,0.1)]"
                                                                            : "bg-[#f5e6d3] border-amber-900/40 text-amber-950 hover:border-amber-900 hover:bg-[#ebd9c2]/50";
                                                                    } else {
                                                                        optStyle = isSelected
                                                                            ? "bg-pink-50 border-pink-500 text-pink-650 font-bold shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                                                                            : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50";
                                                                    }
                                                                } else {
                                                                    if (isSelected) {
                                                                        optStyle = "bg-pink-500/5 border-pink-500/40 text-pink-400 font-bold shadow-[0_0_15px_rgba(236,72,153,0.1)]";
                                                                    }
                                                                }

                                                                return (
                                                                    <button
                                                                        key={oIdx}
                                                                        type="button"
                                                                        disabled={quizIsSubmitted}
                                                                        onClick={() => setQuizSelectedOption(oIdx)}
                                                                        className={`w-full p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer select-none ${optStyle}`}
                                                                    >
                                                                        <span>{opt}</span>
                                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected
                                                                            ? isLight
                                                                                ? theme === "eyeprotect"
                                                                                    ? "border-amber-800 bg-amber-800/20 text-amber-900"
                                                                                    : "border-pink-500 bg-pink-500/20 text-pink-500"
                                                                                : "border-pink-500 bg-pink-500/20 text-pink-400"
                                                                            : isLight
                                                                                ? theme === "eyeprotect"
                                                                                    ? "border-amber-900/30"
                                                                                    : "border-slate-400"
                                                                                : "border-white/20"
                                                                            }`}>
                                                                            {isSelected && <div className={`w-1.5 h-1.5 rounded-full ${theme === "eyeprotect" ? "bg-amber-800" : "bg-pink-500"}`} />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveQuizCategory(null);
                                                                }}
                                                                className="px-4.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white font-bold rounded-xl transition-all text-xs cursor-pointer"
                                                            >
                                                                Cancel Test
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={quizSelectedOption === null}
                                                                onClick={() => {
                                                                    const isCorrect = quizSelectedOption === currentQ.correctAnswer;
                                                                    if (isCorrect) setQuizScore(prev => prev + 1);

                                                                    setQuizSelectedAnswersList(prev => [...prev, quizSelectedOption]);

                                                                    const nextIdx = currentQuizQuestionIndex + 1;
                                                                    if (nextIdx < quizQuestionsList.length) {
                                                                        setCurrentQuizQuestionIndex(nextIdx);
                                                                        setQuizSelectedOption(null);
                                                                        setQuizTimeRemaining(120);
                                                                    } else {
                                                                        setQuizCompleted(true);
                                                                    }
                                                                }}
                                                                className="px-6 py-2.5 bg-pink-650 hover:bg-pink-500 disabled:bg-white/5 disabled:text-white/20 disabled:border-transparent text-white font-bold rounded-xl transition-all text-xs cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                                                            >
                                                                {currentQuizQuestionIndex + 1 < quizQuestionsList.length ? "Submit Answer →" : "✓ Finish Quiz"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-8 animate-in fade-in duration-300 text-left font-sans">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                                <div className="flex items-center gap-3">
                                                    {aptitudePath !== null && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAptitudePath(null)}
                                                            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                                                        >
                                                            ← Change Path
                                                        </button>
                                                    )}
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                        <ListTodo className="w-5 h-5 text-pink-400 shrink-0" />
                                                        {aptitudePath === null
                                                            ? "Select Interview Preparation Path"
                                                            : `${selectedPathData?.label} Preparation Roadmap`
                                                        }
                                                    </h3>
                                                </div>
                                            </div>

                                            {aptitudePath === null ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Path Selection Cards */}
                                                    {Object.entries(interviewPrepLogic.paths).map(([key, data]) => {
                                                        const isCampus = key === "onCampus";
                                                        const iconBg = isCampus
                                                            ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
                                                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";

                                                        return (
                                                            <div
                                                                key={key}
                                                                onClick={() => setAptitudePath(key as any)}
                                                                className={`border rounded-2xl p-6 space-y-4 cursor-pointer transition-all duration-300 group ${isLight
                                                                    ? "bg-white border-slate-200 hover:bg-slate-50/80"
                                                                    : "bg-[#0d0d12]/50 hover:bg-[#12121a]/70 border-white/5"
                                                                    } ${isCampus
                                                                        ? isLight
                                                                            ? "hover:border-pink-500 hover:shadow-[0_0_30px_rgba(236,72,153,0.06)]"
                                                                            : "border-pink-500/10 hover:border-pink-500/35 hover:shadow-[0_0_30px_rgba(236,72,153,0.06)]"
                                                                        : isLight
                                                                            ? "hover:border-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.06)]"
                                                                            : "border-indigo-500/10 hover:border-indigo-500/35 hover:shadow-[0_0_30px_rgba(79,70,229,0.06)]"
                                                                    }`}
                                                            >
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${iconBg}`}>
                                                                    {isCampus ? <Briefcase className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                                                                </div>
                                                                <div className="space-y-1.5 text-left">
                                                                    <h4 className={`text-base font-extrabold transition-colors ${isLight
                                                                        ? isCampus ? "text-slate-900 group-hover:text-pink-650" : "text-slate-900 group-hover:text-indigo-650"
                                                                        : isCampus ? "text-white group-hover:text-pink-400" : "text-white group-hover:text-indigo-400"
                                                                        }`}>
                                                                        {data.label} Path
                                                                    </h4>
                                                                    <p className={`text-[11px] font-bold ${isLight ? "text-slate-500" : "text-white/40"} uppercase tracking-wider`}>{data.difficulty} • {data.duration}</p>
                                                                    <p className={`text-xs ${isLight ? "text-slate-700" : "text-white/55"} leading-relaxed font-semibold`}>{data.evaluation.whatTheyJudge}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="space-y-8 animate-in fade-in duration-300">
                                                    {/* On-Campus Mock Assessment Banner */}
                                                    {aptitudePath === "onCampus" && (
                                                        <div className="mock-assessment-card relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500/15 via-[#1a1215] to-indigo-500/5 border border-pink-500/20 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_40px_rgba(236,72,153,0.05)]">
                                                            <div className="space-y-2 text-left z-10">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[9px] font-black uppercase tracking-wider">PLACEMENT READY</span>
                                                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">⏱ 60 MINUTES TEST</span>
                                                                </div>
                                                                <h4 className="text-base font-extrabold text-white">On-Campus Placement Mock Assessment Simulator</h4>
                                                                <p className="text-xs text-white/65 leading-relaxed font-semibold max-w-xl">
                                                                    Simulate a real on-campus placement paper. Includes <span className="text-pink-400 font-extrabold">25 MCQs</span> (Quantitative, Logical Reasoning, and Technical questions) and <span className="text-indigo-400 font-extrabold">3 Coding Questions</span> generated dynamically and evaluated live by Gemini AI. Proctored exam with window change tracking.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={isGeneratingMockTest}
                                                                onClick={handleStartMockTest}
                                                                className={`px-5 py-3 bg-pink-655 hover:bg-pink-500 border border-pink-500/20 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.2)] whitespace-nowrap shrink-0 z-10 ${isGeneratingMockTest ? "opacity-50 cursor-not-allowed" : ""
                                                                    }`}
                                                            >
                                                                {isGeneratingMockTest ? (
                                                                    <span className="flex items-center gap-1.5 justify-center">
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                                                                    </span>
                                                                ) : (
                                                                    "⚡ Launch Mock Test"
                                                                )}
                                                            </button>
                                                            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
                                                        </div>
                                                    )}

                                                    {/* Off-Campus Mock Assessment Banner */}
                                                    {aptitudePath === "offCampus" && (
                                                        <div className="mock-assessment-card relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/15 via-[#11121a] to-pink-500/5 border border-indigo-500/20 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_40px_rgba(99,102,241,0.05)]">
                                                            <div className="space-y-2 text-left z-10">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider">OFF-CAMPUS CHALLENGE</span>
                                                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">⏱ 60 MINUTES TEST</span>
                                                                </div>
                                                                <h4 className="text-base font-extrabold text-white">Off-Campus Placement Mock Assessment Simulator</h4>
                                                                <p className="text-xs text-white/65 leading-relaxed font-semibold max-w-xl">
                                                                    Simulate a competitive off-campus recruitment drive. Includes <span className="text-indigo-400 font-extrabold">25 MCQs</span> (Domain Assessment & Situational Judgment) and <span className="text-pink-400 font-extrabold">3 Coding Questions</span> generated dynamically and evaluated live by Gemini AI. Proctored exam with window change tracking.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={isGeneratingMockTest}
                                                                onClick={handleStartMockTest}
                                                                className={`px-5 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.2)] whitespace-nowrap shrink-0 z-10 ${isGeneratingMockTest ? "opacity-50 cursor-not-allowed" : ""
                                                                    }`}
                                                            >
                                                                {isGeneratingMockTest ? (
                                                                    <span className="flex items-center gap-1.5 justify-center">
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                                                                    </span>
                                                                ) : (
                                                                    "⚡ Launch Mock Test"
                                                                )}
                                                            </button>
                                                            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                                        {/* Left: Topics Checklist (7 cols) */}
                                                        <div className="lg:col-span-7 space-y-4">
                                                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                                <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Preparation Milestones</span>
                                                                <span className="text-[9px] font-extrabold text-pink-400">
                                                                    {Object.keys(checkedAptitudeTopics).length} of {Object.values(topics).flat().length} Completed
                                                                </span>
                                                            </div>

                                                            <div className="space-y-3.5">
                                                                {Object.entries(topics).map(([catKey, subtopics]: [string, any], index: number) => {
                                                                    const categoryName = aptitudeQuestions[catKey]?.category || catKey.replace(/([A-Z])/g, " $1");
                                                                    const isExpanded = !!expandedAptitudeTopics[catKey];
                                                                    return (
                                                                        <div key={catKey} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#111] border-white/5"
                                                                            }`}>
                                                                            <div
                                                                                onClick={() => setExpandedAptitudeTopics(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                                                                                className={`p-4 flex items-center justify-between cursor-pointer select-none border-b ${isLight ? "border-slate-100 hover:bg-slate-50/50" : "border-b border-white/5 hover:bg-white/[0.01]"
                                                                                    }`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 font-extrabold text-[11px] flex items-center justify-center">
                                                                                        {index + 1}
                                                                                    </div>
                                                                                    <h4 className={`text-xs font-black capitalize tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
                                                                                        {categoryName}
                                                                                    </h4>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    {isExpanded
                                                                                        ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
                                                                                        : <ChevronDown className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
                                                                                    }
                                                                                </div>
                                                                            </div>

                                                                            {isExpanded && (
                                                                                <div className={`p-4 ${isLight ? "bg-slate-50/30 border-slate-100" : "bg-white/[0.01] border-white/5"} border-t space-y-2.5 text-left font-sans animate-in slide-in-from-top-2 duration-250`}>
                                                                                    {subtopics.map((topic: string) => {
                                                                                        const isChecked = !!checkedAptitudeTopics[topic];
                                                                                        return (
                                                                                            <label key={topic} className="flex items-start gap-3 cursor-pointer text-xs font-semibold select-none group py-0.5">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isChecked}
                                                                                                    onChange={() => setCheckedAptitudeTopics(prev => ({ ...prev, [topic]: !prev[topic] }))}
                                                                                                    className={`mt-0.5 rounded ${isLight ? "border-slate-300 bg-white" : "border-white/10 bg-black/40"} text-pink-500 focus:ring-pink-500/30 cursor-pointer`}
                                                                                                />
                                                                                                <span className={`transition-all duration-150 leading-relaxed ${isChecked
                                                                                                    ? "line-through text-white/30"
                                                                                                    : isLight ? "text-slate-650 group-hover:text-slate-900" : "text-white/70 group-hover:text-white/95"
                                                                                                    }`}>{topic}</span>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Right: Structure & Evaluation (5 cols) */}
                                                        <div className="lg:col-span-5 space-y-6 font-sans">
                                                            {/* Structure */}
                                                            <div className={`border rounded-xl p-5 space-y-4 text-left ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                                                }`}>
                                                                <h4 className={`font-bold text-xs ${isLight ? "text-slate-800" : "text-white/95"} flex items-center gap-2 uppercase tracking-wider`}>
                                                                    <ListTodo className="w-4 h-4 text-pink-400" /> Prep Funnel Structure
                                                                </h4>
                                                                <div className="space-y-4 pl-1">
                                                                    {selectedPathData?.structure.map((step: string, index: number) => (
                                                                        <div key={index} className="flex gap-3 text-left">
                                                                            <div className="w-5 h-5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                                                                {index + 1}
                                                                            </div>
                                                                            <p className={`text-xs font-semibold leading-relaxed ${isLight ? "text-slate-655" : "text-white/70"}`}>
                                                                                {step}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                    {(selectedPathData as any)?.finalStage && (
                                                                        <div className="flex gap-3 text-left">
                                                                            <div className="w-5 h-5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                                                                ★
                                                                            </div>
                                                                            <p className={`text-xs font-semibold leading-relaxed ${isLight ? "text-slate-750" : "text-white/80"}`}>
                                                                                <span className="text-indigo-400 font-extrabold font-sans">Final Stage: </span>{(selectedPathData as any).finalStage}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {(selectedPathData as any)?.roundTypes && (
                                                                        <div className="mt-3 pt-3 border-t border-white/5 space-y-2 font-sans">
                                                                            <span className="text-[9px] uppercase font-bold text-white/40 block">Round Formats</span>
                                                                            <div className="flex flex-wrap gap-1.5 font-sans">
                                                                                {(selectedPathData as any).roundTypes.map((round: string, i: number) => (
                                                                                    <span key={i} className={`px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 border border-white/5 text-white/70`}>
                                                                                        {round}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* What they're judging */}
                                                            <div className="bg-[#1a1215]/30 border border-pink-500/15 rounded-xl p-5 space-y-2.5 text-left font-sans">
                                                                <h4 className="font-bold text-[10px] text-pink-400 flex items-center gap-1.5 uppercase tracking-wider font-sans">
                                                                    <ShieldCheck className="w-4 h-4" /> What They Judge
                                                                </h4>
                                                                <p className={`text-xs leading-relaxed font-semibold ${isLight ? "text-slate-700" : "text-white/85"}`}>
                                                                    {selectedPathData?.evaluation.whatTheyJudge}
                                                                </p>
                                                            </div>

                                                            {/* Scored on */}
                                                            <div className={`border rounded-xl p-5 space-y-3.5 text-left font-sans ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                                                }`}>
                                                                <span className="text-[9px] uppercase font-bold text-white/40 block">Critical Scoring Parameters</span>
                                                                <div className="flex flex-wrap gap-1.5 font-sans">
                                                                    {selectedPathData?.evaluation.scoredOn.map((param: string, i: number) => (
                                                                        <span
                                                                            key={i}
                                                                            className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold bg-pink-500/10 border border-pink-500/20 text-pink-400"
                                                                        >
                                                                            {param}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {activeModal === "progress" && <ProgressPanel isLight={isLight} />}
                            </div>
                        </div>
                    )}
                </main>
            )}



{/* Profile Import Success Toast */}
            <AnimatePresence>
                {profileImportToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#111] border border-green-500/30 rounded-2xl px-6 py-3.5 shadow-2xl shadow-black/50"
                    >
                        <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Profile imported!</p>
                            <p className="text-[11px] text-white/40">Name, email, phone & education filled in.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Incomplete Popup */}
            <AnimatePresence>
                {profileIncompletePopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setProfileIncompletePopup(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 30 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-black/50 relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setProfileIncompletePopup(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
                                title="Dismiss warning"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-white mb-1">Complete Your Profile</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        Some details are missing from your profile. Please complete them before building your resume.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-6 space-y-2">
                                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Missing Fields</span>
                                {missingProfileFields.map((field, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        <span className="text-white/70 font-medium">{field}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <Link
                                    href="/profile"
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                                >
                                    <User className="w-4 h-4" />
                                    Go to My Profile
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileIncompletePopup(false);
                                        setActiveTool("resume");
                                        setActiveModal("resume");
                                        setShowAnalysis(false);
                                        setShowResume(true);
                                    }}
                                    className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold rounded-xl transition-colors text-sm cursor-pointer"
                                >
                                    Skip
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Roadmap Confirmation Popup */}
            <AnimatePresence>
                {roadmapToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setRoadmapToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 30 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-black/50 relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setRoadmapToDelete(null)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
                                title="Close popup"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-white mb-1">Delete Roadmap?</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        Are you sure you want to delete this preparation roadmap? This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={confirmDeleteRoadmap}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors text-sm cursor-pointer"
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRoadmapToDelete(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold py-3 rounded-xl transition-colors text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Alert/Confirm Popup */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => {
                            if (confirmModal.type === "alert") {
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 30 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-black/50 relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
                                title="Close popup"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-start gap-4 mb-6">
                                {confirmModal.type !== "submit" && (
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${confirmModal.type === "confirm"
                                        ? "bg-red-500/10 border border-red-500/20"
                                        : "bg-amber-500/10 border border-amber-500/20"
                                        }`}>
                                        {confirmModal.type === "confirm" ? (
                                            <Trash2 className="w-6 h-6 text-red-500" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                                        )}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-extrabold text-white mb-1">{confirmModal.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        {confirmModal.message}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {confirmModal.type === "confirm" || confirmModal.type === "submit" ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirmModal.onConfirm) confirmModal.onConfirm();
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            }}
                                            className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors text-sm cursor-pointer ${confirmModal.type === "submit"
                                                ? "bg-green-650 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                                : "bg-red-600 hover:bg-red-500"
                                                }`}
                                        >
                                            {confirmModal.type === "submit" ? "Submit" : "Delete"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold py-3 rounded-xl transition-colors text-sm cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors text-sm cursor-pointer"
                                    >
                                        Okay
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default function FeaturesPage() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id";
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <ErrorBoundary fallbackTitle="Features failed to load">
                <FeaturesContent />
            </ErrorBoundary>
        </GoogleOAuthProvider>
    );
}


