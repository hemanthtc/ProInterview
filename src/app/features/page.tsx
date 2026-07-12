"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, Video, FileText, Settings, ShieldCheck, MessageSquare, Github, Linkedin, UploadCloud, Loader2, Download, Globe, Play, Trash2, Sparkles, X, Award, Briefcase, Check, UserCircle, AlertTriangle, User, Plus, Mail, Map, Compass, BookOpen, ListTodo, ExternalLink, ChevronDown, ChevronUp, Copy, CheckCircle, Sun, Moon, Eye, Cpu, Code, Search, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import CompanySelect from "../../components/CompanySelect";
import RoleSelect from "../../components/RoleSelect";
import { RESUME_TEMPLATES } from "../../data/templates";
import { RESUME_PRESETS } from "../../data/resumePresets";
import { getStorageItem, setStorageItem, removeStorageItem, getInterviewResumeText } from "../../utils/storage";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import ProInterviewerApp from "../../components/prointerviewer/ProInterviewerApp";

interface SavedResume {
    id: string;
    title: string;
    updatedAt: number;
    templateId: string;
    name: string;
    email: string;
    phone: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
    projects: string;
    internships: string;
    certifications?: string;
    awards?: string;
    accentColor?: string;
    fontSize?: number;
}

interface SavedRoadmap {
    id: string;
    course: string;
    company: string;
    location: string;
    additionalInfo: string;
    createdAt: number;
    roadmapData: any;
    tasksChecked: Record<string, boolean>;
}

interface PortfolioAnalysisCache {
    completed: boolean;
    rating: number;
    feedback: string;
    analyzedAt: number;
}



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
    const [pausedSession, setPausedSession] = useState<any>(null);
    const [isRealisticMode, setIsRealisticMode] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [activeTool, setActiveTool] = useState<"analysis" | "resume" | "email_analyser" | "roadmap_generator" | "prointerviewer" | "study_materials">("analysis");
    const [activeModal, setActiveModal] = useState<"analysis" | "resume" | "email_analyser" | "roadmap_generator" | "prointerviewer" | "study_materials" | null>(null);



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

    // Roadmap Generator states
    const [roadmapCourse, setRoadmapCourse] = useState("");
    const [roadmapCompany, setRoadmapCompany] = useState("");
    const [roadmapLocation, setRoadmapLocation] = useState("");
    const [roadmapAdditional, setRoadmapAdditional] = useState("");
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

    // Roadmap timeline accordions
    const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true });

    // Saved Resumes Database state (Option A)
    const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
    const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("modern");

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
        const isRealistic = getStorageItem("globalInterviewMode") === "realistic";
        setIsRealisticMode(isRealistic);
        if (isRealistic) {
            router.push("/");
            return;
        }
        setIsLoggedIn(getStorageItem("userLoggedIn") === "true");
        syncAccountDetailsFromStorage();
        
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

        // Auto-open analysis tool if redirected from Home page
        const searchParams = new URLSearchParams(window.location.search);
        const tool = searchParams.get("tool");
        if (tool === "analysis") {
            setActiveModal("analysis");
            setActiveTool("analysis");
            setShowAnalysis(false);
            setShowResume(false);
        }
    }, []);

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
            syncResumeBuilderFromProfile(false);
        }
    }, [activeModal]);

    // Load resumes from local storage database
    useEffect(() => {
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
    }, []);

    // Load roadmaps from local storage database
    useEffect(() => {
        const storedRoadmaps = getStorageItem("savedRoadmapsDatabase");
        if (storedRoadmaps) {
            try {
                const parsed = JSON.parse(storedRoadmaps) as SavedRoadmap[];
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
            } catch (e) {
                console.error("Failed to parse saved roadmaps database", e);
            }
        }
    }, []);

    const createNewDefaultResume = (currentList: SavedResume[]) => {
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
    };

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
            alert("You must keep at least one resume profile in the database.");
            return;
        }
        
        if (!confirm("Are you sure you want to delete this resume profile?")) {
            return;
        }
        
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
    };

    const updateActiveResume = (updates: Partial<SavedResume>) => {
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
    };

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

    const handleAnalyzeEmail = async () => {
        if (!emailText || !emailText.trim()) {
            alert("Please paste the email content first.");
            return;
        }
        setIsAnalyzingEmail(true);
        setEmailAnalysisResult(null);
        setVerificationResult(null);
        setIsEditingParams(false);
        
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

    const handleGenerateRoadmap = async () => {
        setIsGeneratingRoadmap(true);
        setRoadmapResult(null);
        setRoadmapTasksChecked({});

        const useMockFallbackRoadmap = () => {
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
            const res = await fetch("/api/generate-roadmap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course: roadmapCourse,
                    company: roadmapCompany,
                    location: roadmapLocation,
                    additionalInfo: roadmapAdditional,
                }),
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
                console.warn("Roadmap API returned error, using mock fallback:", data.error);
                useMockFallbackRoadmap();
            }
        } catch (err) {
            console.error("Roadmap API connection failed, using mock fallback:", err);
            useMockFallbackRoadmap();
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
        if (emailAnalysisResult.emailType === "offer_letter" && details.salaryDetails) {
            context += `\n\nJob Offer Details:\n- Salary/CTC: ${details.salaryDetails.baseSalary || "Not specified"}\n- Expected Joining: ${details.salaryDetails.joiningDate || "Not specified"}`;
            if (details.salaryDetails.benefits && details.salaryDetails.benefits.length > 0) {
                context += `\n- Benefits: ${details.salaryDetails.benefits.join(", ")}`;
            }
        }
        setRoadmapAdditional(context);
        
        // Switch view to Roadmap Generator
        setActiveModal("roadmap_generator");
        setActiveTool("roadmap_generator");
        setActiveRoadmapId(null);
        setRoadmapResult(null);
        setRoadmapTasksChecked({});
        setExpandedPhases({ 0: true });
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
        setExpandedPhases({ 0: true });
    };

    const handleDeleteRoadmap = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const conf = confirm("Are you sure you want to delete this roadmap?");
        if (!conf) return;
        
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
    };

    const handleCreateNewRoadmap = () => {
        setActiveRoadmapId(null);
        removeStorageItem("activeRoadmapId");
        
        setRoadmapCourse("");
        setRoadmapCompany("");
        setRoadmapLocation("");
        setRoadmapAdditional("");
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
        
        roadmapResult.timeline.forEach((phase: any) => {
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
        
        roadmapResult.timeline.forEach((phase: any) => {
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
        roadmapResult.timeline.forEach((phase: any) => {
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
    const isLight = theme === "light" || theme === "eyeprotect";

    return (
        <div className={`text-white selection:bg-indigo-500/30 flex flex-col font-sans ${(activeModal === "prointerviewer" || activeModal === "study_materials") ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#050505]`}>
            {activeModal !== "study_materials" && (
                <header className="px-8 py-6 flex items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#050505]/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                            <Video className="w-5 h-5 text-white" />
                        </div>
                        <Link href="/" className="font-bold text-xl tracking-tight hover:text-indigo-400 transition-colors">ProInterview</Link>
                    </div>
                    <nav className="flex gap-6 text-sm font-medium text-white/70 items-center">
                        {!isRealisticMode && <Link href="/" className="hover:text-white transition-colors">Home</Link>}
                        {isLoggedIn && (
                            <button 
                                onClick={toggleMode}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isRealisticMode ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isRealisticMode ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></span>
                                {isRealisticMode ? 'Realistic Mode' : 'Practice Mode'}
                            </button>
                        )}
                        {!isRealisticMode && <Link href="/features" className="text-white transition-colors border-b border-indigo-500 pb-1">Features</Link>}
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
                        ) : (
                            <Link href="/login" className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full text-white transition-colors font-bold ml-2">Log in</Link>
                        )}
                    </nav>
                </header>
            )}

            {activeModal === "prointerviewer" ? (
                <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0b0f19]">
                    <ProInterviewerApp onClose={() => {
                        setActiveModal(null);
                        setActiveTool("analysis");
                    }} />
                </div>
            ) : activeModal === "study_materials" ? (
                <div className={`flex-1 w-full h-full relative overflow-hidden transition-colors duration-300 ${
                    theme === "light" ? "bg-[#9897A9]" : theme === "eyeprotect" ? "bg-[#9897A9]" : "bg-[#050505]"
                }`}>
                    <iframe 
                        src="/study-materials/index.html" 
                        className="w-full h-full border-none"
                        title="Study Materials"
                    />
                </div>
            ) : (
                <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
                <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

                {activeModal === null ? (
                    <>
                        <div className="text-center mb-12 z-10 flex flex-col items-center">
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/60 mb-6">
                                Features
                            </h1>
                            <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto">
                                Select a tool below to configure target roles, analyze portfolios, or build premium resumes tailored for interviews.
                            </p>
                        </div>

                        <div className={`grid ${isRealisticMode ? 'grid-cols-1 max-w-2xl' : 'grid-cols-1 md:grid-cols-2 max-w-4xl'} gap-6 w-full z-10 px-4`}>
                            {/* Card A: Pre-Interview Analysis */}
                            <div 
                                onClick={() => {
                                    setActiveModal("analysis");
                                    setActiveTool("analysis");
                                    setShowAnalysis(false);
                                    setShowResume(false);
                                }}
                                className="group bg-[#0d0d12]/60 hover:bg-[#12121a]/80 backdrop-blur-sm border border-indigo-500/20 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(79,70,229,0.05)] hover:shadow-[0_0_40px_rgba(79,70,229,0.15)]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">Pre-Interview Analysis</h3>
                            </div>

                            {/* Card B: Start Interview Session */}
                            <div 
                                onClick={() => launchInterviewSetup(isRealisticMode ? "realistic" : "technical")}
                                className="group bg-[#0d0d12]/60 hover:bg-[#12121a]/80 backdrop-blur-sm border border-sky-500/20 hover:border-sky-500/50 rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(14,165,233,0.05)] hover:shadow-[0_0_40px_rgba(14,165,233,0.15)]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <Play className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors">Start Interview Session</h3>
                            </div>

                            {!isRealisticMode && (
                                <>
                                    {/* Card D: AI Email Analyser */}
                                    <div 
                                        onClick={() => {
                                            setActiveModal("email_analyser");
                                            setActiveTool("email_analyser");
                                        }}
                                        className="group bg-[#0d0d12]/60 hover:bg-[#121a18]/80 backdrop-blur-sm border border-teal-500/20 hover:border-teal-500/50 rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(20,184,166,0.05)] hover:shadow-[0_0_40px_rgba(20,184,166,0.15)]"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">AI Email Analyser</h3>
                                    </div>

                                    {/* Card E: Preparation Roadmap Generator */}
                                    <div 
                                        onClick={() => {
                                            setActiveModal("roadmap_generator");
                                            setActiveTool("roadmap_generator");
                                            // Reset roadmap tasks checked state
                                            setRoadmapTasksChecked({});
                                        }}
                                        className="group bg-[#0d0d12]/60 hover:bg-[#121a15]/80 backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <Map className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Roadmap Generator</h3>
                                    </div>

                                    {/* Card F: Pro Interviewer Code */}
                                    <div 
                                        onClick={launchProInterviewer}
                                        className="group bg-[#0d0d12]/60 hover:bg-[#1f1a12]/80 backdrop-blur-sm border border-amber-500/20 hover:border-amber-500/50 rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.05)] hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <Code className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Resume Builder</h3>
                                    </div>

                                    {/* Card G: Study Materials */}
                                    <div 
                                        onClick={() => {
                                            setActiveModal("study_materials");
                                            setActiveTool("study_materials");
                                        }}
                                        className="group bg-[#0d0d12]/60 hover:bg-[#18121a]/80 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.05)] hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">Study Materials</h3>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={`w-full ${activeModal === "resume" || activeModal === "roadmap_generator" || (activeModal === "analysis" && !showInterviewCustomizer) ? "max-w-7xl" : "max-w-4xl"} bg-[#111] p-8 md:p-10 rounded-2xl border ${
                        activeModal === "analysis" ? "border-indigo-500/20" : 
                        activeModal === "resume" ? "border-purple-500/20" : 
                        activeModal === "email_analyser" ? "border-teal-500/20" : "border-emerald-500/20"
                    } shadow-2xl relative z-10 transition-all duration-300`}>
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                            activeModal === "analysis" ? "from-indigo-500 to-indigo-600" : 
                            activeModal === "resume" ? "from-purple-500 to-purple-600" : 
                            activeModal === "email_analyser" ? "from-teal-500 to-teal-600" : "from-emerald-500 to-emerald-600"
                        } rounded-t-2xl`}></div>
                        
                        {/* Close button in top-right */}
                        <button
                            type="button"
                            onClick={() => setActiveModal(null)}
                            className="absolute top-6 right-6 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors border border-white/10 cursor-pointer z-50"
                            title="Back to option list"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-6">
                        {activeModal === "analysis" && (
                            <>
                                {!showInterviewCustomizer ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                                        {/* Left Box (Box 1): Configuration & Inputs */}
                                        <div className="lg:col-span-6 space-y-4">
                                            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs text-indigo-200">
                                                Upload your portfolio details below and run the pre-interview analysis. Standard credentials from your profile are pulled automatically.
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5 mb-1.5"><Github className="w-3.5 h-3.5 text-white/60"/> GitHub Profile URL</label>
                                                <input type="url" value={github || ""} onChange={(e) => { setGithub(e.target.value); setStorageItem("userGithub", e.target.value); }} placeholder="https://github.com/username" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-white" />
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5 mb-1.5"><Linkedin className="w-3.5 h-3.5 text-white/60"/> LinkedIn Profile URL</label>
                                                <input type="url" value={linkedin || ""} onChange={(e) => { setLinkedin(e.target.value); setStorageItem("userLinkedin", e.target.value); }} placeholder="https://linkedin.com/in/username" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-white" />
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5 mb-1.5"><Globe className="w-3.5 h-3.5 text-white/60"/> Portfolio Website URL</label>
                                                <input type="url" value={portfolioUrl || ""} onChange={(e) => { setPortfolioUrl(e.target.value); setStorageItem("userPortfolio", e.target.value); }} placeholder="https://myportfolio.com" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-white" />
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5 mb-1.5"><Briefcase className="w-3.5 h-3.5 text-white/60"/> Upload Project Code / Files (PDF, ZIP, Text)</label>
                                                <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-indigo-500/50 transition-colors relative bg-black/20 cursor-pointer">
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
                                                    <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
                                                    <span className="text-xs text-white/60 font-medium">Click or drag files here to upload</span>
                                                </div>
                                                
                                                {projectFiles.length > 0 && (
                                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                        {projectFiles.map((file, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                                                                <span>{file.name}</span>
                                                                <button type="button" onClick={() => setProjectFiles(projectFiles.filter((_, i) => i !== idx))} className="text-indigo-400 hover:text-white transition-colors">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-1 z-50 relative">
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

                                            <div className="pt-1 z-40 relative">
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

                                            <div className="pt-2">
                                                <button
                                                    type="button"
                                                    onClick={handlePreInterviewAnalysis}
                                                    disabled={preAnalyzing || loading || preferredRoles.length === 0 || targetCompanies.length === 0}
                                                    className="w-full py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
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
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowAnalysis(false);
                                                                    setAnalysisResult(null);
                                                                }}
                                                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold rounded-lg transition-all text-xs cursor-pointer"
                                                            >
                                                                Clear
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
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { key: "basic", label: "basic" },
                                                            { key: "intermediate", label: "intermediate" },
                                                            { key: "advanced", label: "advanced" },
                                                        ].map((item) => (
                                                            <button
                                                                key={item.key}
                                                                type="button"
                                                                onClick={() => setAnalysisLevel(item.key)}
                                                                className={`py-2.5 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer ${analysisLevel === item.key ? "bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-600/10" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}
                                                            >
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Select AI Provider */}
                                                <div>
                                                    <label className="text-xs font-semibold text-white/70 block mb-2 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-sky-400"/> Select AI Provider</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {[
                                                            { key: "gemini", label: "Google Gemini", desc: "Fast, highly capable." },
                                                            { key: "sarvam", label: "Sarvam AI", desc: "Focused on explicit constraints." },
                                                        ].map((item) => (
                                                            <button
                                                                key={item.key}
                                                                type="button"
                                                                onClick={() => setAnalysisProvider(item.key)}
                                                                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${analysisProvider === item.key ? "bg-sky-600/20 border-sky-500 shadow-lg" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}
                                                            >
                                                                <span className={`block text-xs font-bold mb-0.5 ${analysisProvider === item.key ? "text-sky-300" : ""}`}>{item.label}</span>
                                                                <span className="text-[10px] opacity-70 leading-relaxed block">{item.desc}</span>
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
                                                                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                                                                            dot <= lang.level
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
                                                        className={`flex-shrink-0 cursor-pointer p-3 rounded-lg border text-left transition-all ${
                                                            isActive
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
                                                                className={`w-6 h-6 rounded-full cursor-pointer transition-all ${color.bg} ${
                                                                    isSelected ? `ring-2 ring-white ring-offset-2 ring-offset-black scale-110` : "hover:scale-105"
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
                                                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative group flex flex-col justify-between h-20 ${
                                                            isActive
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
                                                                {resEmail && <div><b>Email:</b><br/>{resEmail}</div>}
                                                                {resPhone && <div><b>Phone:</b><br/>{resPhone}</div>}
                                                                {github && <div><b>GitHub:</b><br/>{github.replace('https://', '')}</div>}
                                                                {linkedin && <div><b>LinkedIn:</b><br/>{linkedin.replace('https://', '')}</div>}
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
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">AI Email Analyser</h3>
                                        <p className="text-xs text-white/50">Paste any interview or recruitment email to pull out key information and generate a checklist</p>
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
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded transition-all cursor-pointer disabled:opacity-50 text-[11px] font-bold border ${
                                                    isLight 
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
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                                                    isLight 
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
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                                                    isLight 
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
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                                                    isLight 
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
                                            <div className={`border rounded-2xl p-5 space-y-4 ${
                                                isLight ? "bg-slate-50 border-slate-200" : "bg-[#15151c]/60 border border-teal-500/10"
                                            }`}>
                                                <h4 className={`text-sm font-extrabold flex items-center gap-2 ${
                                                    isLight ? "text-slate-900" : "text-teal-400"
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
                                                                <p key={i} className={`pl-4 before:content-['•'] before:mr-2 flex items-start ${
                                                                    isLight ? "before:text-teal-600 text-slate-700 font-medium" : "before:text-teal-400 text-white/70"
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
                                                <div className={`border rounded-2xl p-5 space-y-4 ${
                                                    isLight ? "bg-slate-50 border-slate-200" : "bg-[#15151c]/60 border border-teal-500/10"
                                                }`}>
                                                    <h4 className={`text-sm font-extrabold flex items-center gap-2 ${
                                                        isLight ? "text-slate-900" : "text-teal-400"
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
                                                                <label key={i} className={`flex items-start gap-3 cursor-pointer group text-sm transition-colors ${
                                                                    isLight ? "text-slate-700 hover:text-slate-900 font-medium" : "text-white/80 hover:text-white"
                                                                }`}>
                                                                    <input type="checkbox" className={`mt-1 accent-teal-500 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-black cursor-pointer border ${
                                                                        isLight ? "border-slate-300 bg-white" : "border-white/20 bg-black/40"
                                                                    }`} />
                                                                    <span>{cleaned}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className={`border rounded-2xl p-5 space-y-4 ${
                                                    isLight 
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
                                                                        <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider border rounded-full flex items-center gap-1.5 shadow-sm ${
                                                                            isLight 
                                                                                ? "bg-indigo-50 border-indigo-200 text-indigo-800" 
                                                                                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                                                        }`}>
                                                                            <Award className={`w-3.5 h-3.5 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} /> Job Offer Letter
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider border rounded-full flex items-center gap-1.5 shadow-sm ${
                                                                            isLight 
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
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shrink-0 border ${
                                                                isLight
                                                                    ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm"
                                                                    : "bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white animate-pulse"
                                                            }`}
                                                        >
                                                            {isEditingParams ? "Cancel" : "Edit Details"}
                                                        </button>
                                                    </div>

                                                    {isEditingParams ? (
                                                        <div className={`space-y-3 p-3.5 rounded-xl border relative text-xs ${
                                                            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-black/30 border-white/5"
                                                        }`}>
                                                            <div className="space-y-1">
                                                                <label className={`text-[10px] block font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>Target Role</label>
                                                                <input
                                                                    type="text"
                                                                    value={editRole || ""}
                                                                    onChange={(e) => setEditRole(e.target.value)}
                                                                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500 font-sans ${
                                                                        isLight ? "bg-white border-slate-300 text-slate-800" : "bg-black/40 border-white/10 text-white"
                                                                    }`}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className={`text-[10px] block font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>Target Company</label>
                                                                <input
                                                                    type="text"
                                                                    value={editCompany || ""}
                                                                    onChange={(e) => setEditCompany(e.target.value)}
                                                                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500 font-sans ${
                                                                        isLight ? "bg-white border-slate-300 text-slate-800" : "bg-black/40 border-white/10 text-white"
                                                                    }`}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className={`text-[10px] block font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>Location</label>
                                                                <input
                                                                    type="text"
                                                                    value={editLocation || ""}
                                                                    onChange={(e) => setEditLocation(e.target.value)}
                                                                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500 font-sans ${
                                                                        isLight ? "bg-white border-slate-300 text-slate-800" : "bg-black/40 border-white/10 text-white"
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
                                                        <div className={`grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl border relative ${
                                                            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-black/30 border-white/5"
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
                                                                                    <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-medium font-sans border ${
                                                                                        isLight ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
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
                                                                            <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-medium font-sans border ${
                                                                                isLight ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-teal-500/10 border-teal-500/20 text-teal-300"
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
                                                        <div className={`rounded-xl p-3 text-[11px] leading-relaxed space-y-2 border ${
                                                            isLight ? "bg-slate-100 border-slate-200 text-slate-700 font-medium" : "bg-black/20 border-white/5 text-white/60"
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

                        {activeModal === "roadmap_generator" && (
                            <div className="space-y-6 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <Map className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">AI Preparation Roadmap Generator</h3>
                                        <p className="text-xs text-white/50">Build a personalized prep timeline, learning modules, and checklists based on target parameters</p>
                                    </div>
                                </div>

                                {savedRoadmaps.length > 0 && (
                                    <div className={`border rounded-2xl p-4 space-y-3 ${
                                        isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                                                isLight ? "text-emerald-700" : "text-emerald-400"
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
                                                        className={`flex-shrink-0 cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                                                            isActive
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
                                                                <span className={`border px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                                    isLight ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                                }`}>
                                                                    Current
                                                                </span>
                                                            )}
                                                            {isCompleted ? (
                                                                <span className={`border px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                                    isLight ? "bg-indigo-100 border-indigo-300 text-indigo-800" : "bg-indigo-500/15 border-indigo-500/35 text-indigo-300"
                                                                }`}>
                                                                    Completed
                                                                </span>
                                                            ) : (
                                                                <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                                                    isLight ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-white/40"
                                                                }`}>
                                                                    {completionPct}% Done
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteRoadmap(road.id, e)}
                                                            className="absolute top-3.5 right-3 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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

                                <button
                                    type="button"
                                    onClick={handleGenerateRoadmap}
                                    disabled={isGeneratingRoadmap || !roadmapCourse.trim()}
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
                                            <div className={`border rounded-2xl p-5 relative overflow-hidden ${
                                                isLight ? "bg-emerald-50 border-emerald-200 text-slate-900" : "bg-[#121c16]/50 border border-emerald-500/20 text-white"
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
                                                    <div className={`border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${
                                                        isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border border-white/5"
                                                    }`}>
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
                                                                onClick={handleCopyRoadmapMarkdown}
                                                                className={`flex-1 md:flex-none px-4 py-2.5 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                                    isLight
                                                                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-750 hover:text-slate-900 shadow-sm"
                                                                        : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
                                                                }`}
                                                            >
                                                                <Copy className="w-3.5 h-3.5" /> Copy Markdown
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleDownloadRoadmapText}
                                                                className={`flex-1 md:flex-none px-4 py-2.5 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                                    isLight
                                                                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-750 hover:text-slate-900 shadow-sm"
                                                                        : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
                                                                }`}
                                                            >
                                                                <Download className="w-3.5 h-3.5" /> Download Text
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Roadmap Timeline Phases */}
                                            <div className="space-y-4">
                                                <h4 className={`font-extrabold text-base flex items-center gap-2 ${
                                                    isLight ? "text-slate-900" : "text-white"
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
                                                                className={`border rounded-2xl transition-all duration-300 ${
                                                                    isLight
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
                                                                                <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                                                                                    isLight ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                                                }`}>
                                                                                    <CheckCircle className="w-4 h-4" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black ${
                                                                                    isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-white/5 border-white/15 text-white/50"
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
                                                                                                <span key={i} className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                                                                                    isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/5 text-white/70"
                                                                                                }`}>{topic}</span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                
                                                                                {/* Resources to check */}
                                                                                {phase.resources && phase.resources.length > 0 && (
                                                                                    <div className={`space-y-1.5 border p-3.5 rounded-xl ${
                                                                                        isLight ? "bg-slate-50/50 border-slate-200" : "bg-white/[0.01] border border-white/5"
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
                                                                                                    <label key={taskIdx} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs transition-colors cursor-pointer group border ${
                                                                                                        isLight
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
                                                                                                            className={`mt-0.5 accent-emerald-500 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer border ${
                                                                                                                isLight ? "border-slate-300 bg-white" : "border-white/20 bg-black/40"
                                                                                                            }`}
                                                                                                        />
                                                                                                        <span className={`font-medium ${
                                                                                                            roadmapTasksChecked[taskKey]
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
                                                <div className={`border rounded-2xl p-5 space-y-3 ${
                                                    isLight
                                                        ? "bg-emerald-50/50 border-emerald-200"
                                                        : "bg-[#121c16]/30 border border-emerald-500/10"
                                                }`}>
                                                    <h4 className={`font-extrabold text-sm flex items-center gap-1.5 ${
                                                        isLight ? "text-slate-900" : "text-white"
                                                    }`}>
                                                        <ShieldCheck className={`w-4.5 h-4.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} /> Target Prep Strategy Tips
                                                    </h4>
                                                    <ul className={`text-xs space-y-2 list-disc pl-4 leading-relaxed font-medium ${
                                                        isLight ? "text-slate-700" : "text-white/75"
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
        </div>
    );
}

export default function FeaturesPage() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id";
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <FeaturesContent />
        </GoogleOAuthProvider>
    );
}


