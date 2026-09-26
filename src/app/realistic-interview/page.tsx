"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Video, VideoOff, PhoneOff, Send, Volume2, Loader2, AlertTriangle, ShieldAlert, Pause, Code as CodeIcon, PenTool, MessageSquare, Save, Download, Sun, Moon, Eye, Film, Share2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Script from "next/script";
import { getStorageItem, getInterviewResumeText, setStorageItem, removeStorageItem } from "../../utils/storage";
import VoiceCoachPanel from "../../components/VoiceCoachPanel";
import SessionRecorder from "../../components/SessionRecorder";
import { analyzeUtterance, mergeCoachStats, endCallHabits, type VoiceCoachSnapshot } from "../../utils/voiceCoach";
import { syncSessionsToCloud } from "../../utils/cloudSync";
import { buildSpacedDrills } from "../../utils/spacedDrills";
import { resolveCompanyBank } from "../../data/companyBanks";
import { speakInterviewText, stopSpeechInterviewText } from "../../utils/speakInterview";
import InteractiveWhiteboard, { type InteractiveWhiteboardHandle } from "@/components/system-design/InteractiveWhiteboard";
import type { BoardShape } from "@/utils/systemDesignBoard";

export default function RealisticInterviewRoom() {
    const router = useRouter();
    const videoElementsRef = useRef<Set<HTMLVideoElement>>(new Set());
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        videoElementsRef.current.forEach((el) => {
            el.srcObject = null;
        });
    }, []);

    const videoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node) {
            videoElementsRef.current.add(node);
            if (streamRef.current) {
                node.srcObject = streamRef.current;
                node.play().catch(() => {});
            }
        }
    }, []);

    const [messages, setMessages] = useState<{ role: "assistant" | "user"; content: string; attachment?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isCallEnded, setIsCallEnded] = useState(false);
    const isCallEndedRef = useRef(false);
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [userInput, setUserInput] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [videoActive, setVideoActive] = useState(false);
    const [finalScores, setFinalScores] = useState<{interview: number, technical: number, behavioral: number, communication: number, portfolio: number | string, final: number, annotatedTranscript?: string, summary?: string} | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // Tavus Talking Head Avatar states
    const avatarVideoRef = useRef<HTMLVideoElement>(null);
    const avatarVideoElementsRef = useRef<Set<HTMLVideoElement>>(new Set());
    const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
    const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);
    const [isDidAvailable, setIsDidAvailable] = useState<boolean | null>(null);
    const [avatarType, setAvatarType] = useState<"tavus" | "svg">(() => {
        const saved = getStorageItem("tavusSelectedAvatarType");
        return saved === "tavus" ? "tavus" : "svg";
    });
    const [selectedReplicaId, setSelectedReplicaId] = useState<string>("r67d1c9cac37");
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const tavusTalkAbortControllerRef = useRef<AbortController | null>(null);
    const isTavusInitializingRef = useRef<boolean>(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

    const startSessionRecording = useCallback((stream: MediaStream) => {
        try {
            recordedChunksRef.current = [];
            let options = { mimeType: "video/webm;codecs=vp9,opus" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: "video/webm;codecs=vp8,opus" };
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: "video/webm" };
            }
            let rec: MediaRecorder;
            try {
                rec = new MediaRecorder(stream, options);
            } catch {
                rec = new MediaRecorder(stream);
            }
            mediaRecorderRef.current = rec;
            rec.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };
            rec.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                setRecordedBlobUrl(URL.createObjectURL(blob));
            };
            rec.start(1000);
        } catch (err) {
            console.error("Instant Recording start failed:", err);
        }
    }, []);

    const closeTavusStream = () => {
        if (tavusTalkAbortControllerRef.current) {
            tavusTalkAbortControllerRef.current.abort();
            tavusTalkAbortControllerRef.current = null;
        }
        if (conversationIdRef.current) {
            fetch("/api/tavus-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end", conversationId: conversationIdRef.current })
            }).catch(() => {});
        }
        const existingCall = dailyCallRef.current || (typeof window !== "undefined" && (window as any).DailyIframe?.getCallInstance());
        if (existingCall) {
            try { existingCall.leave(); existingCall.destroy(); } catch (e) { }
            dailyCallRef.current = null;
        }
        conversationIdRef.current = null;
        conversationUrlRef.current = null;
        remoteStreamRef.current = null;
        setAvatarVideoUrl(null);
        setIsAvatarGenerating(false);
    };

    const handleSwitchAvatarType = (type: "tavus" | "svg") => {
        if (type === avatarType) return;
        setAvatarType(type);
        setStorageItem("tavusSelectedAvatarType", type);
        if (type === "tavus") {
            initializeTavusStream();
        } else {
            closeTavusStream();
            setIsDidAvailable(false);
        }
    };

    const handleSelectPresenterPersona = (newReplicaId: string) => {
        closeTavusStream();
        setStorageItem("tavusSelectedReplicaId", newReplicaId);
        setStorageItem("tavusSelectedAvatarType", "tavus");
        setSelectedReplicaId(newReplicaId);
        setAvatarType("tavus");
        setTimeout(() => {
            initializeTavusStream(newReplicaId);
        }, 150);
    };

    // Tavus WebRTC Streaming refs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyCallRef = useRef<any>(null);
    const conversationIdRef = useRef<string | null>(null);
    const conversationUrlRef = useRef<string | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);

    const [interactionMode, setInteractionMode] = useState<"chat" | "code" | "draw">("chat");
    const [activePracticalTask, setActivePracticalTask] = useState<{ type: "code" | "draw"; questionText: string } | null>(null);
    const [mobileWorkspaceView, setMobileWorkspaceView] = useState<"transcript" | "workspace">("workspace");
    const [codeContent, setCodeContent] = useState("");
    const [codeLanguage, setCodeLanguage] = useState("python");
    const [codeOutput, setCodeOutput] = useState("");
    const [codeBusy, setCodeBusy] = useState(false);

    // System Design Whiteboard states
    const whiteboardRef = useRef<InteractiveWhiteboardHandle>(null);
    const [boardShapes, setBoardShapes] = useState<BoardShape[]>([]);
    const [boardHasFreehand, setBoardHasFreehand] = useState(false);
    const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
    const [voiceCoach, setVoiceCoach] = useState<VoiceCoachSnapshot | null>(null);
    const [shareUrl, setShareUrl] = useState("");
    const [shareBusy, setShareBusy] = useState(false);
    const [hrPersonaName, setHrPersonaName] = useState("");
    const [companyCloneName, setCompanyCloneName] = useState("");
    const lastSpeechAtRef = useRef<number>(Date.now());
    const speechStartedAtRef = useRef<number | null>(null);
    const lastSavedSessionTsRef = useRef<number | null>(null);
    const voiceCoachRef = useRef<VoiceCoachSnapshot | null>(null);

    // Resizable split-pane logic for practical modes
    const [practicalPanelRatio, setPracticalPanelRatio] = useState(30);
    const isDraggingRef = useRef(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const container = document.getElementById("practical-split-container");
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(15, Math.min(60, percentage));
        setPracticalPanelRatio(clamped);
    }, []);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);

    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    // Drawing states
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Suspicious activity detection
    const [warningCount, setWarningCount] = useState(0);
    const [suspiciousMessage, setSuspiciousMessage] = useState("");
    const [terminatedForCheating, setTerminatedForCheating] = useState(false);
    const warningCountRef = useRef(0);
    const MAX_WARNINGS = 3;

    // Face detection
    const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const noFaceFramesRef = useRef(0);
    const NO_FACE_THRESHOLD = 5; // consecutive frames with no face before warning

    // Web Speech API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    // ---- Suspicious Activity Detection ----
    const addWarning = useCallback((reason: string) => {
        warningCountRef.current += 1;
        const currentCount = warningCountRef.current;
        setWarningCount(currentCount);
        setSuspiciousMessage(`⚠️ Warning ${currentCount}/${MAX_WARNINGS}: ${reason}`);

        if (currentCount >= MAX_WARNINGS) {
            // Auto-terminate
            setTerminatedForCheating(true);
            setIsCallEnded(true);
            isCallEndedRef.current = true;
            stopInterviewRuntime();
        }

        // Clear message after 4 seconds
        setTimeout(() => setSuspiciousMessage(""), 4000);
    }, []);

    // Detect tab switch and window blur
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isCallEnded) {
                addWarning("Tab switch detected! Stay on this page during the interview.");
            }
        };

        const handleWindowBlur = () => {
            if (!isCallEnded) {
                addWarning("Window focus lost! Do not switch to other applications.");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [isCallEnded, addWarning]);

    // Face detection using canvas analysis
    const startFaceDetection = useCallback(() => {
        if (faceDetectionIntervalRef.current) {
            clearInterval(faceDetectionIntervalRef.current);
        }

        faceDetectionIntervalRef.current = setInterval(() => {
            if (!canvasRef.current || isCallEnded) return;

            let video: HTMLVideoElement | null = null;
            for (const el of videoElementsRef.current) {
                if (el && el.isConnected && el.videoWidth > 0 && el.videoHeight > 0) {
                    video = el;
                    break;
                }
            }

            if (!video) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;

            canvas.width = 160;
            canvas.height = 120;
            ctx.drawImage(video, 0, 0, 160, 120);

            const imageData = ctx.getImageData(0, 0, 160, 120);
            const data = imageData.data;

            // Analyze center region for skin-tone pixels (basic face presence detection)
            const centerX = 40, centerY = 20, regionW = 80, regionH = 80;
            let skinPixels = 0;
            let totalPixels = 0;

            for (let y = centerY; y < centerY + regionH; y++) {
                for (let x = centerX; x < centerX + regionW; x++) {
                    const idx = (y * 160 + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];

                    // Simple skin color detection (works for various skin tones)
                    if (r > 60 && g > 40 && b > 20 &&
                        r > g && r > b &&
                        Math.abs(r - g) > 15 &&
                        r - b > 15) {
                        skinPixels++;
                    }
                    totalPixels++;
                }
            }

            const skinRatio = skinPixels / totalPixels;

            if (skinRatio < 0.05) {
                // Very few skin pixels — likely no face in frame
                noFaceFramesRef.current++;
                if (noFaceFramesRef.current >= NO_FACE_THRESHOLD) {
                    addWarning("No face detected! Keep your face visible in the camera.");
                    noFaceFramesRef.current = 0;
                }
            } else {
                noFaceFramesRef.current = 0;
            }
        }, 2000); // Check every 2 seconds
    }, [isCallEnded, addWarning]);

    const stopFaceDetection = useCallback(() => {
        if (faceDetectionIntervalRef.current) {
            clearInterval(faceDetectionIntervalRef.current);
            faceDetectionIntervalRef.current = null;
        }
        noFaceFramesRef.current = 0;
    }, []);

    const stopInterviewRuntime = useCallback(() => {
        stopFaceDetection();
        window.speechSynthesis.cancel();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
                mediaRecorderRef.current.stop();
            } catch (err) {
                console.error("Error stopping session recording:", err);
            }
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore cleanup errors from speech recognition.
            }
        }

        stopCamera();
        stopSpeechInterviewText();

        if (avatarVideoRef.current) {
            avatarVideoRef.current.pause();
            avatarVideoRef.current.removeAttribute("src");
            avatarVideoRef.current.srcObject = null;
            avatarVideoRef.current.load();
        }

        // Tavus WebRTC stream cleanup
        closeTavusStream();

        setAvatarVideoUrl(null);
        setVideoActive(false);
        setIsListening(false);
        setIsAvatarGenerating(false);
    }, [stopFaceDetection, stopCamera]);

    useEffect(() => {
        if (isCallEnded || terminatedForCheating) {
            stopInterviewRuntime();
        }
    }, [isCallEnded, terminatedForCheating, stopInterviewRuntime]);

    useEffect(() => {
        const isLoggedIn = getStorageItem("userLoggedIn") === "true";
        if (!isLoggedIn) {
            router.push("/login");
            return;
        }
        setIsAuthChecked(true);

        // Check if user reloaded while viewing an ended or completed realistic interview session
        const isEnded = sessionStorage.getItem("prointerview_realistic_session_ended") === "true";
        const savedCompleted = sessionStorage.getItem("prointerview_completed_realistic_session");
        if (isEnded || savedCompleted) {
            setIsCallEnded(true);
            isCallEndedRef.current = true;
            stopSpeechInterviewText();
            if (savedCompleted) {
                try {
                    const parsed = JSON.parse(savedCompleted);
                    if (parsed?.scores) {
                        const s = parsed.scores;
                        setFinalScores({
                            ...s,
                            summary: Array.isArray(s.summary) ? s.summary.join('\n\n') : typeof s.summary === 'string' ? s.summary : (s.summary ? JSON.stringify(s.summary) : ''),
                            annotatedTranscript: Array.isArray(s.annotatedTranscript) ? s.annotatedTranscript.join('\n\n') : typeof s.annotatedTranscript === 'string' ? s.annotatedTranscript : (s.annotatedTranscript ? JSON.stringify(s.annotatedTranscript) : '')
                        });
                    }
                    if (parsed?.messages) setMessages(parsed.messages);
                    if (parsed?.blobUrl) setRecordedBlobUrl(parsed.blobUrl);
                } catch (e) {
                    console.warn("Failed to restore completed realistic interview session:", e);
                }
            }
            return; // Do not initialize camera or Tavus WebRTC stream
        }

        isCallEndedRef.current = false;
        const text = getInterviewResumeText();
        
        const savedTheme = localStorage.getItem("globalTheme") as any;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
            document.documentElement.style.colorScheme = savedTheme === "eyeprotect" ? "light" : savedTheme;
        }

        const github = getStorageItem("userGithub") || "";
        const linkedin = getStorageItem("userLinkedin") || "";
        const portfolio = getStorageItem("userPortfolio") || "";
        const hasPortfolio = Boolean(github || linkedin || portfolio);

        if (!text && !hasPortfolio) {
            router.push("/setup");
            return;
        }

        setResumeText(text || "");

        // Initialize Tavus WebRTC Stream only if user explicitly saved 'tavus' in their preferences
        const savedAvatarType = getStorageItem("tavusSelectedAvatarType");
        if (savedAvatarType === "tavus") {
            initializeTavusStream();
        }

        let isMounted = true;

        // Camera setup
        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn("Camera API not available.");
                    if (isMounted) setVideoActive(false);
                    return;
                }
                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                } catch {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    } catch {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    }
                }
                streamRef.current = stream;
                if (isMounted) {
                    videoElementsRef.current.forEach((node) => {
                        if (node && node.isConnected) {
                            node.srcObject = stream;
                            node.play().catch(() => {});
                        }
                    });
                    setVideoActive(true);
                    startSessionRecording(stream);
                } else if (!isMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if (isMounted) setVideoActive(false);
            }
        };
        startCamera();

        // Speech recognition setup
        if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            // Changed to continuous so the mic doesn't automatically cut off when they pause
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = getStorageItem("voiceLanguage") || "en-IN";

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                let latestTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                   latestTranscript += event.results[i][0].transcript;
                }
                if (latestTranscript.trim()) {
                    const now = Date.now();
                    const silenceMs = Math.max(0, now - (lastSpeechAtRef.current || now));
                    const started = speechStartedAtRef.current ?? now - Math.max(latestTranscript.trim().split(/\s+/).length * 350, 800);
                    const durationMs = Math.max(now - started, 500);
                    const snap = analyzeUtterance({ text: latestTranscript.trim(), durationMs, silenceMs });
                    setVoiceCoach((prev) => {
                        const merged = mergeCoachStats(prev, snap);
                        voiceCoachRef.current = merged;
                        return merged;
                    });
                    lastSpeechAtRef.current = now;
                    speechStartedAtRef.current = now;
                    userInputRef.current = latestTranscript.trim();
                    setUserInput(latestTranscript.trim());
                }
            };
            recognitionRef.current.onerror = (event: any) => {
                const err = event?.error;
                if (err === "no-speech" || err === "aborted") {
                    return;
                }
                if (err === "not-allowed" || err === "audio-capture") {
                    setIsListening(false);
                    isListeningRef.current = false;
                }
            };
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        // Check for resume flagged by setup page
        const resumeFlag = getStorageItem("resumeFromPaused") === "true";
        if (resumeFlag) {
            const stored = getStorageItem("pausedInterviewSession");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.messages) setMessages(parsed.messages);
                if (parsed.resumeText) {
                    setResumeText(parsed.resumeText);
                } 
                if (parsed.portfolioRating !== undefined) {
                    setStorageItem("portfolioRating", parsed.portfolioRating);
                }
                removeStorageItem("resumeFromPaused"); // consume it
                setIsLoading(false);
                
                // Prompt AI to continue
                triggerAiResponse(parsed.resumeText || text, parsed.messages || [], "I am back, please continue the interview from where we left off.", getStorageItem("interviewType") || "realistic");
                
                return () => { isMounted = false; stopFaceDetection(); window.speechSynthesis.cancel(); };
            }
        }

        // Start interview
        const typeText = getStorageItem("interviewType") || "realistic";
        const targetCompanyTxt = getStorageItem("targetCompany") || "a technology company";
        const roleText = getStorageItem("preferredRoles") || "Software Engineer";
        const firstMessageBase = `Please start the realistic company interview. You are a hiring manager for ${targetCompanyTxt}. The candidate is applying for the role(s) of: ${roleText}. Conduct a full-spectrum interview grounded strictly in my resume — my education background, skills, projects, preferred role, and the target company. Ask a natural, unpredictable MIX of practical, theoretical, and challenging questions. There is NO fixed difficulty level. Note: do not repeatedly welcome the user, just start.`;
        const focusedRetake = getStorageItem("focusedRetakePrompt");
        if (focusedRetake) removeStorageItem("focusedRetakePrompt");
        const firstMessage = focusedRetake
            ? `Please start a focused rematch for ${roleText} at ${targetCompanyTxt}. Briefly welcome me, then ask EXACTLY this practice question first: "${focusedRetake}". After I answer, give concise coach feedback, then continue with 2-3 related follow-ups.`
            : firstMessageBase;
        triggerAiResponse(text || "", [], firstMessage, typeText);

        return () => {
            isMounted = false;
            isCallEndedRef.current = true;
            stopSpeechInterviewText();
            stopCamera();
            stopFaceDetection();
            closeTavusStream();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Start/stop face detection when video toggles
    useEffect(() => {
        if (videoActive) {
            // Small delay to let video stream initialize
            const timer = setTimeout(() => startFaceDetection(), 3000);
            return () => clearTimeout(timer);
        } else {
            stopFaceDetection();
        }
    }, [videoActive, startFaceDetection, stopFaceDetection]);

    const cycleTheme = () => {
        let nextTheme: "dark" | "light" | "eyeprotect" = "dark";
        if (theme === "dark") nextTheme = "light";
        else if (theme === "light") nextTheme = "eyeprotect";
        
        setTheme(nextTheme);
        localStorage.setItem("globalTheme", nextTheme);
        document.documentElement.className = nextTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${nextTheme}`;
        document.documentElement.style.colorScheme = nextTheme === "eyeprotect" ? "light" : nextTheme;
    };

    const TAVUS_PERSONAS = [
        { id: "r67d1c9cac37", name: "Alex", title: "Tech Lead" },
        { id: "r9d30b0e55ac", name: "Luna", title: "Director" },
        { id: "re6220ec0195", name: "Marcus", title: "Architect" },
    ] as const;

    const initializeTavusStream = useCallback(async (customReplicaId?: string) => {
        if (isTavusInitializingRef.current || conversationIdRef.current) {
            console.log("Tavus stream initialization already in progress or session active.");
            return;
        }
        isTavusInitializingRef.current = true;
        try {
            // Determine replica to use (user selected or dynamic session rotation)
            let replicaToUse = customReplicaId || getStorageItem("tavusSelectedReplicaId");
            if (!replicaToUse || replicaToUse === "dynamic" || !TAVUS_PERSONAS.some(p => p.id === replicaToUse)) {
                const randomIdx = Math.floor(Math.random() * TAVUS_PERSONAS.length);
                replicaToUse = TAVUS_PERSONAS[randomIdx].id;
                console.log(`Dynamic session rotation selected persona: ${TAVUS_PERSONAS[randomIdx].name} (${replicaToUse})`);
            }
            setSelectedReplicaId(replicaToUse);

            console.log(`Initializing Tavus WebRTC stream with replica ${replicaToUse}...`);
            const res = await fetch("/api/tavus-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create", replica_id: replicaToUse })
            });
            
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.warn("Tavus WebRTC initialization returned status:", res.status, data.error);
                setIsDidAvailable(false);
                closeTavusStream();
                setAvatarType("svg");
                const isCreditError = data?.error?.includes("credits") || res.status === 402;
                setAvatarError(
                    isCreditError
                        ? "Tavus conversational credits exhausted. Switched to built-in SVG voice avatar."
                        : (data?.error || "Tavus stream connection failed. Using SVG fallback.")
                );
                setTimeout(() => setAvatarError(null), 8000);
                return;
            }
            
            const conversationUrl = data.conversation_url;
            const conversationId = data.conversation_id;

            if (!conversationUrl) {
                console.warn("Missing conversation_url from Tavus stream initialization.");
                setIsDidAvailable(false);
                closeTavusStream();
                setAvatarType("svg");
                return;
            }
            
            conversationIdRef.current = conversationId;
            conversationUrlRef.current = conversationUrl;

            // Ensure Daily SDK is ready
            if (typeof window === "undefined" || !(window as any).DailyIframe) {
                let attempts = 0;
                while (attempts < 20 && !(window as any).DailyIframe) {
                    await new Promise(r => setTimeout(r, 200));
                    attempts++;
                }
            }

            const DailyIframe = (window as any).DailyIframe;
            if (typeof window === "undefined" || !DailyIframe) {
                throw new Error("DailyIframe SDK script failed to load. Please refresh and try again.");
            }

            // Clean up any pre-existing Daily CallObject instance to prevent duplicate instance errors
            const existingCall = dailyCallRef.current || DailyIframe.getCallInstance();
            if (existingCall) {
                try {
                    await existingCall.leave();
                    await existingCall.destroy();
                } catch (e) {}
                dailyCallRef.current = null;
                await new Promise(r => setTimeout(r, 100));
            }

            // Create Daily CallObject
            const call = DailyIframe.createCallObject({
                subscribeToTracksAutomatically: true,
                videoSource: false,
                audioSource: false,
                allowMultipleCallInstances: true,
            });
            dailyCallRef.current = call;

            const attachTracks = (participant: any, track?: any) => {
                if (!participant || participant.local) return;
                console.log("Attaching Tavus remote tracks from participant:", participant.session_id);
                setIsDidAvailable(true);
                
                let stream = remoteStreamRef.current;
                if (!stream) {
                    stream = new MediaStream();
                    remoteStreamRef.current = stream;
                }

                // Add explicit track if passed
                if (track && !stream.getTracks().some((t: any) => t.id === track.id)) {
                    stream.addTrack(track);
                }

                // Also pull any persistent tracks from participant object
                const videoTrack = participant.tracks?.video?.persistentTrack;
                const audioTrack = participant.tracks?.audio?.persistentTrack;
                if (videoTrack && !stream.getTracks().some((t: any) => t.id === videoTrack.id)) {
                    stream.addTrack(videoTrack);
                }
                if (audioTrack && !stream.getTracks().some((t: any) => t.id === audioTrack.id)) {
                    stream.addTrack(audioTrack);
                }

                // Bind to all active video elements (desktop and mobile/responsive views)
                avatarVideoElementsRef.current.forEach((videoEl) => {
                    if (videoEl && videoEl.srcObject !== stream) {
                        videoEl.srcObject = stream;
                        videoEl.muted = false;
                        videoEl.play().catch((e) => {
                            if (e?.name === "AbortError") return;
                            console.warn("Unmuted play blocked by browser policy, attempting muted play:", e);
                            videoEl.muted = true;
                            videoEl.play().catch(() => {});
                        });
                    }
                });
            };

            call.on("track-started", (event: any) => {
                console.log("Daily WebRTC track started:", event);
                attachTracks(event.participant, event.track);
            });

            call.on("participant-joined", (event: any) => {
                console.log("Daily WebRTC participant joined:", event);
                attachTracks(event.participant);
            });

            call.on("participant-updated", (event: any) => {
                console.log("Daily WebRTC participant updated:", event);
                attachTracks(event.participant);
            });

            call.on("app-message", (event: any) => {
                console.log("Daily WebRTC app-message received:", event);
                const data = event?.data;
                const eventType = data?.event_type || data?.event;
                if (eventType === "conversation.speaking_started" || eventType === "speech_started") {
                    setIsSpeaking(true);
                } else if (eventType === "conversation.speaking_stopped" || eventType === "speech_stopped" || eventType === "talk/ended") {
                    setIsSpeaking(false);
                }
            });

            call.on("error", (event: any) => {
                console.error("Daily WebRTC error:", event);
            });

            await call.join({ url: conversationUrl });
            console.log("Tavus WebRTC Stream initialized successfully.");
            setIsDidAvailable(true);

            // Check existing participants right after joining
            const participants = call.participants();
            if (participants) {
                Object.values(participants).forEach((p: any) => attachTracks(p));
            }
        } catch (err: any) {
            console.warn("Tavus WebRTC stream initialization unavailable:", err?.message || err);
            setIsDidAvailable(false);
            closeTavusStream();
            setAvatarType("svg");
            const isCreditError = err?.message?.includes("credits") || err?.message?.includes("402");
            setAvatarError(
                isCreditError
                    ? "Tavus conversational credits exhausted. Switched to built-in SVG voice avatar."
                    : (err?.message || "Tavus stream connection failed. Using SVG fallback.")
            );
            setTimeout(() => setAvatarError(null), 8000);
        } finally {
            isTavusInitializingRef.current = false;
        }
    }, [avatarType]);

    const setAvatarVideoRef = useCallback((el: HTMLVideoElement | null) => {
        if (el) {
            avatarVideoElementsRef.current.add(el);
            (avatarVideoRef as any).current = el;
            if (remoteStreamRef.current) {
                console.log("Attaching remote stream to video element via callback ref");
                el.srcObject = remoteStreamRef.current;
                el.muted = false;
                el.play().catch((e) => {
                    if (e?.name === "AbortError") return;
                    console.warn("Webrtc video play with sound blocked, trying muted:", e);
                    el.muted = true;
                    el.play().catch(() => {});
                });
            } else if (avatarVideoUrl) {
                console.log("Loading video URL via callback ref:", avatarVideoUrl);
                el.src = avatarVideoUrl;
                el.play().catch(() => {});
            }
        }
    }, [avatarVideoUrl]);

    // Effect to attach/re-attach remote stream to all video elements on layout switches
    useEffect(() => {
        if (isDidAvailable === true) {
            avatarVideoElementsRef.current.forEach((el) => {
                if (el) {
                    if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                        console.log("Attaching remote stream to video element on layout change");
                        el.srcObject = remoteStreamRef.current;
                        el.muted = false;
                        el.play().catch((e) => {
                            if (e?.name === "AbortError") return;
                            console.warn("Play failed on layout change:", e);
                        });
                    } else if (avatarVideoUrl && el.src !== avatarVideoUrl) {
                        el.src = avatarVideoUrl;
                        el.play().catch((e) => {
                            if (e?.name === "AbortError") return;
                            console.warn("Play failed on layout change:", e);
                        });
                    }
                }
            });
        }
    }, [interactionMode, isDidAvailable, avatarType, avatarVideoUrl]);

    const handleVoiceAndVideo = (text: string) => {
        if (isCallEndedRef.current) return;
        if (avatarType === "svg") {
            speakText(text);
        } else {
            triggerTavusVideo(text);
        }
    };

    const triggerTavusVideo = async (text: string) => {
        if (isCallEndedRef.current || terminatedForCheating) return;

        const cleanText = text.replace(/\[MODE:[A-Z]+\]/g, "").replace(/\[TERMINATE\]/g, "").trim();
        if (!cleanText) return;

        setIsAvatarGenerating(true);

        try {
            // Cancel local browser speech synthesis immediately so native avatar voice is heard
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }

            // Ensure Daily CallObject is joined AND Tavus remote participant has joined the room
            let attempts = 0;
            while (attempts < 60) {
                if (isCallEndedRef.current || terminatedForCheating) return;
                const currentCall = dailyCallRef.current;
                const participants = currentCall?.participants?.();
                const hasRemote = participants && Object.values(participants).some((p: any) => !p.local);
                if (currentCall && currentCall.meetingState?.() === "joined-meeting" && (hasRemote || isDidAvailable)) {
                    break;
                }
                await new Promise(r => setTimeout(r, 250));
                attempts++;
            }

            const call = dailyCallRef.current;
            const convId = conversationIdRef.current;

            if (call && call.meetingState?.() === "joined-meeting" && convId) {
                console.log("Attempting to send conversation.echo to Tavus via Daily CallObject:", cleanText);
                let messageDelivered = false;

                // Retry loop with 500ms backoff to allow WebRTC data channel to finish connection setup
                for (let retry = 0; retry < 12; retry++) {
                    if (isCallEndedRef.current || terminatedForCheating) break;
                    try {
                        call.sendAppMessage({
                            message_type: "conversation",
                            event_type: "conversation.echo",
                            conversation_id: convId,
                            properties: {
                                text: cleanText
                            }
                        }, "*");
                        console.log(`Tavus conversation.echo dispatched successfully on attempt ${retry + 1}.`);
                        messageDelivered = true;
                        break;
                    } catch (sendErr: any) {
                        console.warn(`sendAppMessage attempt ${retry + 1} waiting for data channel (${sendErr?.message || sendErr}), retrying in 500ms...`);
                        await new Promise(r => setTimeout(r, 500));
                    }
                }

                if (!messageDelivered && !isCallEndedRef.current && !terminatedForCheating) {
                    console.warn("Tavus data channel handshake timed out. Falling back to speech synthesis.");
                    speakText(text);
                }
            } else {
                console.warn("Daily CallObject not connected. Falling back to speech synthesis.");
                speakText(text);
            }
        } catch (err) {
            console.error("Tavus Stream speak error:", err);
            speakText(text);
        } finally {
            setIsAvatarGenerating(false);
        }
    };

    const triggerAiResponse = async (resume: string, history: { role: string, content: string, attachment?: string }[], nextMessage: string, forceType?: string, attachment?: string) => {
        setIsLoading(true);
        try {
            const interviewType = forceType || getStorageItem("interviewType") || "realistic";
            const provider = getStorageItem("aiProvider") || "gemini";
            const targetCompany = getStorageItem("targetCompany") || "Generic Tech Company";
            const preferredRoles = getStorageItem("preferredRoles") || "Software Engineer";
            const level = getStorageItem("interviewLevel") || "intermediate";
            const github = getStorageItem("userGithub") || "";
            const linkedin = getStorageItem("userLinkedin") || "";
            const portfolioUrl = getStorageItem("userPortfolio") || "";
            let activeHrIntel: any = null;
            try {
                const rawHr = getStorageItem("activeHrIntel");
                if (rawHr) activeHrIntel = JSON.parse(rawHr);
            } catch { /* ignore */ }
            const companyCloneMode = getStorageItem("companyCloneMode") !== "false";
            const bank = companyCloneMode ? resolveCompanyBank(targetCompany) : null;
            if (activeHrIntel?.interviewerName) {
                setHrPersonaName(String(activeHrIntel.interviewerName));
            }
            setCompanyCloneName(bank?.name || "");
            let portfolioRating = "";
            let portfolioFeedback = "";
            try {
                const rawAnalysis = getStorageItem("portfolioAnalysisResult");
                if (rawAnalysis) {
                    const parsed = JSON.parse(rawAnalysis);
                    portfolioRating = parsed.rating?.toString() || "";
                    portfolioFeedback = parsed.feedback || "";
                }
            } catch { /* ignore */ }
            if (!portfolioRating) {
                const pR = getStorageItem("portfolioRating");
                if (pR && pR !== "N/A") portfolioRating = pR;
            }

            const res = await fetch("/api/realistic-interviewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume,
                    github,
                    linkedin,
                    portfolioUrl,
                    portfolioRating,
                    portfolioFeedback,
                    history,
                    message: nextMessage,
                    attachment,
                    type: interviewType,
                    provider,
                    company: targetCompany,
                    roles: preferredRoles,
                    level,
                    voiceLanguage: getStorageItem("voiceLanguage") || "en-IN",
                    hrIntel: activeHrIntel || undefined,
                    companyClone: companyCloneMode,
                }),
            });
            const data = await res.json();

            if (isCallEndedRef.current) return;

            if (data.message) {
                let aiMessage = data.message;
                
                if (aiMessage.includes("[MODE:CODE]")) {
                    setInteractionMode("code");
                    aiMessage = aiMessage.replace("[MODE:CODE]", "").trim();
                    const codeBlockMatch = aiMessage.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/);
                    if (codeBlockMatch && codeBlockMatch[1]) {
                        const starter = codeBlockMatch[1].trim();
                        if (starter) {
                            setCodeContent(starter);
                        }
                    }
                    setActivePracticalTask({ type: "code", questionText: aiMessage });
                } else if (aiMessage.includes("[MODE:DRAW]")) {
                    setInteractionMode("draw");
                    aiMessage = aiMessage.replace("[MODE:DRAW]", "").trim();
                    setActivePracticalTask({ type: "draw", questionText: aiMessage });
                } else if (aiMessage.includes("[MODE:CHAT]")) {
                    setInteractionMode("chat");
                    aiMessage = aiMessage.replace("[MODE:CHAT]", "").trim();
                    setActivePracticalTask(null);
                }

                if (aiMessage.includes("[TERMINATE]")) {
                    const cleanMessage = aiMessage.replace("[TERMINATE]", "").trim();
                    setMessages(prev => [...prev, { role: "assistant", content: cleanMessage }]);
                    handleVoiceAndVideo(cleanMessage);
                    // End call automatically when the AI signals it's time
                    setTimeout(() => endCall(), 3000);
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: aiMessage }]);
                    handleVoiceAndVideo(aiMessage);
                }
            } else if (data.error) {
                const errorMsg = "API Error: " + data.error;
                setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
                speakText("I encountered an error connecting to the AI. Please check your API key and server logs.");
            }
        } catch (err) {
            console.error("Error fetching AI response", err);
            if (isCallEndedRef.current) return;
            setMessages(prev => [...prev, { role: "assistant", content: "Network error: " + (err as Error).message }]);
        } finally {
            if (!isCallEndedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const speakText = (text: string) => {
        if (isCallEndedRef.current) return;
        void speakInterviewText(text, {
            provider: getStorageItem("aiProvider") || "gemini",
            voiceLanguage: getStorageItem("voiceLanguage") || "en-IN",
            isListening: () => isListeningRef.current,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
        });
    };

    // Keep refs for fresh state
    const userInputRef = useRef(userInput);
    const messagesRef = useRef(messages);
    const isLoadingRef = useRef(isLoading);
    const resumeTextRef = useRef(resumeText);
    const isListeningRef = useRef(isListening);
    const snapshotsRef = useRef<string[]>([]);

    useEffect(() => {
        userInputRef.current = userInput;
        messagesRef.current = messages;
        isLoadingRef.current = isLoading;
        resumeTextRef.current = resumeText;
        isListeningRef.current = isListening;
    }, [userInput, messages, isLoading, resumeText, isListening]);

    const handleSendMessage = async (forceText?: string, attachment?: string) => {
        const textToSend = forceText !== undefined ? forceText : userInputRef.current;
        if (!textToSend.trim() && !attachment) return;
        if (isLoadingRef.current) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);

        // Take a camera snapshot if video is active
        let activeVideoEl: HTMLVideoElement | null = null;
        for (const el of videoElementsRef.current) {
            if (el && el.isConnected && el.videoWidth > 0 && el.videoHeight > 0) {
                activeVideoEl = el;
                break;
            }
        }
        if (activeVideoEl && canvasRef.current && videoActive) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = activeVideoEl.videoWidth || 640;
                canvasRef.current.height = activeVideoEl.videoHeight || 480;
                context.drawImage(activeVideoEl, 0, 0, canvasRef.current.width, canvasRef.current.height);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
                if (snapshotsRef.current.length < 15) { 
                    snapshotsRef.current.push(dataUrl.split(',')[1]);
                }
            }
        }

        const newHistory = [...messagesRef.current, { role: "user" as const, content: textToSend.trim(), attachment }];
        setMessages(newHistory);
        setUserInput("");
        setIsListening(false);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
        }

        await triggerAiResponse(resumeTextRef.current, messagesRef.current, textToSend.trim(), undefined, attachment);
    };

    // Update recognition callbacks every render for fresh refs
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onerror = (event: any) => {
                const err = event?.error;
                if (err === "no-speech" || err === "aborted") return;
                if (err === "not-allowed" || err === "audio-capture") {
                    setIsListening(false);
                    isListeningRef.current = false;
                    return;
                }
                console.warn("Speech recognition notice:", err);
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                let latestTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                   latestTranscript += event.results[i][0].transcript;
                }
                if (latestTranscript.trim()) {
                    const now = Date.now();
                    const silenceMs = Math.max(0, now - (lastSpeechAtRef.current || now));
                    const started = speechStartedAtRef.current ?? now - Math.max(latestTranscript.trim().split(/\s+/).length * 350, 800);
                    const durationMs = Math.max(now - started, 500);
                    const snap = analyzeUtterance({ text: latestTranscript.trim(), durationMs, silenceMs });
                    setVoiceCoach((prev) => {
                        const merged = mergeCoachStats(prev, snap);
                        voiceCoachRef.current = merged;
                        return merged;
                    });
                    lastSpeechAtRef.current = now;
                    speechStartedAtRef.current = now;
                }
                setUserInput(prev => prev + latestTranscript + " ");
            };
            recognitionRef.current.onend = () => {
                setIsListening(false);
                // Automatic send is removed here so the user has to click "Send" manually
            };
        }
    });

    // Toggle Mic function removed because we replaced it with manual toggle button inside text input!


    const runCode = async () => {
        if (!codeContent.trim() || codeBusy) return;
        setCodeBusy(true);
        setCodeOutput("Running...");
        try {
            const res = await fetch("/api/run-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: codeContent, language: codeLanguage }),
            });
            const data = await res.json();
            if (!res.ok) {
                setCodeOutput(data.error || "Run failed");
            } else {
                const parts = [
                    data.stdout ? `stdout:\n${data.stdout}` : "",
                    data.stderr ? `stderr:\n${data.stderr}` : "",
                    data.compile?.stderr ? `compile:\n${data.compile.stderr}` : "",
                    !data.stdout && !data.stderr && data.output ? String(data.output) : "",
                ].filter(Boolean);
                setCodeOutput(parts.join("\n\n") || "(no output)");
            }
        } catch (e) {
            setCodeOutput(`Error: ${(e as Error).message}`);
        } finally {
            setCodeBusy(false);
        }
    };

    const gradeAndSubmitCode = async () => {
        if (!codeContent.trim() || codeBusy) return;
        setCodeBusy(true);
        try {
            const lastAi = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
            const questionDescription = lastAi?.content || "Coding challenge";
            const questionTitle = questionDescription.split("\n")[0].slice(0, 120) || "Coding Challenge";
            const res = await fetch("/api/grade-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionTitle,
                    questionDescription,
                    code: codeContent,
                    language: codeLanguage,
                }),
            });
            const data = await res.json();
            const feedback = data.error
                ? `Grading failed: ${data.error}\n\nMy code (${codeLanguage}):\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\``
                : `Code graded (${data.status || "Reviewed"}): score ${data.score ?? "?"}/10.\nCorrectness: ${data.correctness || "n/a"}\nTime: ${data.timeComplexity || "n/a"} | Space: ${data.spaceComplexity || "n/a"}\nFeedback: ${data.feedback || ""}\n\nMy code (${codeLanguage}):\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\``;
            await handleSendMessage(feedback);
            setCodeContent("");
            setCodeOutput("");
            setActivePracticalTask(null);
            setInteractionMode("chat");
        } catch (e) {
            setCodeOutput(`Grade error: ${(e as Error).message}`);
        } finally {
            setCodeBusy(false);
        }
    };

    const shareScorecard = async () => {
        if (!finalScores || shareBusy) return;
        setShareBusy(true);
        try {
            const res = await fetch("/api/scorecard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateName: getStorageItem("userName") || "Candidate",
                    company: getStorageItem("targetCompany") || "",
                    role: getStorageItem("preferredRoles") || "",
                    finalScore: finalScores.final,
                    technicalRating: finalScores.technical,
                    behavioralRating: finalScores.behavioral,
                    communicationRating: finalScores.communication,
                    portfolioRating: finalScores.portfolio,
                    summary: Array.isArray(finalScores.summary) ? finalScores.summary.join('\n\n') : String(finalScores.summary || ""),
                    highlights: endCallHabits(voiceCoachRef.current || voiceCoach),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Share failed");
            const url = data.url?.startsWith("http")
                ? data.url
                : `${window.location.origin}${data.url || `/scorecard/${data.shareId}`}`;
            setShareUrl(url);
            try {
                await navigator.clipboard.writeText(url);
            } catch { /* ignore */ }
        } catch (e) {
            console.error(e);
            setShareUrl("");
        } finally {
            setShareBusy(false);
        }
    };

    const toggleVideo = async () => {
        if (videoActive) {
            stopCamera();
            setVideoActive(false);
        } else {
            setVideoActive(true);
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn("Camera API not available.");
                    setVideoActive(false);
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                videoElementsRef.current.forEach((node) => {
                    if (node && node.isConnected) {
                        node.srcObject = stream;
                        node.play().catch(() => {});
                    }
                });
            } catch (err) {
                console.error("Camera access error:", err);
                setVideoActive(false);
            }
        }
    };

    const pauseCall = () => {
        isCallEndedRef.current = true;
        stopInterviewRuntime();
        const sessionToSave = {
            mode: "realistic",
            messages: messagesRef.current,
            resumeText: resumeTextRef.current,
            portfolioRating: getStorageItem("portfolioRating"),
            savedAt: Date.now()
        };
        setStorageItem("pausedInterviewSession", JSON.stringify(sessionToSave));
        stopCamera();
        router.push("/");
    };

    const endCall = async () => {
        isCallEndedRef.current = true;
        setIsCallEnded(true);
        stopSpeechInterviewText();
        stopInterviewRuntime();
        try {
            sessionStorage.setItem("prointerview_realistic_session_ended", "true");
            sessionStorage.setItem("prointerview_completed_realistic_session", JSON.stringify({
                scores: finalScores || null,
                messages: messagesRef.current,
                blobUrl: recordedBlobUrl
            }));
        } catch { /* ignore */ }

        setIsEvaluating(true);
        try {
            const isPortfolioScoringEnabled = getStorageItem("portfolioScoringEnabled") === "true";
            const pRatingRaw = isPortfolioScoringEnabled ? (getStorageItem("portfolioRating") || "N/A") : "N/A";
            const pRatingValue = parseInt(pRatingRaw);
            const hasPortfolio = isPortfolioScoringEnabled && !isNaN(pRatingValue);

            const res = await fetch("/api/analyze-interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messagesRef.current,
                    snapshots: snapshotsRef.current,
                    company: getStorageItem("targetCompany") || "Generic Tech Company",
                    roles: getStorageItem("preferredRoles") || "Software Engineer",
                    level: getStorageItem("interviewLevel") || "intermediate",
                    companyClone: getStorageItem("companyCloneMode") !== "false",
                })
            });
            const data = await res.json();
            const tScore = typeof data.technicalRating === "number" ? Math.max(0, Math.min(100, data.technicalRating)) : 0;
            const bScore = typeof data.behavioralRating === "number" ? Math.max(0, Math.min(100, data.behavioralRating)) : 0;
            const cScore = typeof data.communicationRating === "number" ? Math.max(0, Math.min(100, data.communicationRating)) : 0;
            const sessionSummary = Array.isArray(data.summary)
                ? data.summary.map((s: any) => (typeof s === 'string' ? s : JSON.stringify(s))).join('\n\n')
                : typeof data.summary === 'string'
                    ? data.summary
                    : (data.summary ? JSON.stringify(data.summary) : "");
            const annotatedTranscript = Array.isArray(data.annotatedTranscript)
                ? data.annotatedTranscript.map((t: any) => (typeof t === 'string' ? t : JSON.stringify(t))).join('\n\n')
                : typeof data.annotatedTranscript === 'string'
                    ? data.annotatedTranscript
                    : (data.annotatedTranscript ? JSON.stringify(data.annotatedTranscript) : "");

            // Dynamic weighting: reflect the candidate's actual profile
            // Technical gets more weight if scores vary a lot (differentiates strong vs weak candidates)
            // If all sub-scores are similar, weight evenly. If technical is very strong/weak, it drives more.
            const spread = Math.max(tScore, bScore, cScore) - Math.min(tScore, bScore, cScore);
            let tW: number, bW: number, cW: number;
            if (spread < 10) {
                // Scores are close — weight evenly
                tW = 0.40; bW = 0.30; cW = 0.30;
            } else {
                // Scores differ significantly — let the dominant dimension matter more (technical still anchors)
                const total = tScore + bScore + cScore;
                if (total === 0) {
                    tW = 0.40; bW = 0.30; cW = 0.30;
                } else {
                    // Each score's proportion of the total determines its extra weight, anchored around base weights
                    tW = 0.30 + 0.20 * (tScore / total);
                    bW = 0.20 + 0.20 * (bScore / total);
                    cW = 0.20 + 0.20 * (cScore / total);
                    // Normalize so they sum to 1
                    const wSum = tW + bW + cW;
                    tW /= wSum; bW /= wSum; cW /= wSum;
                }
            }

            const iScore = Math.round(tScore * tW + bScore * bW + cScore * cW);
            
            let finalOutput = iScore;
            if (hasPortfolio) {
                finalOutput = Math.round(pRatingValue * 0.35 + iScore * 0.65);
            }
            // Clamp to valid range
            finalOutput = Math.max(0, Math.min(100, finalOutput));

            const scoresToSave = {
                interview: iScore,
                technical: tScore,
                behavioral: bScore,
                communication: cScore,
                portfolio: hasPortfolio ? pRatingValue : pRatingRaw,
                final: finalOutput,
                annotatedTranscript,
                summary: sessionSummary
            };

            setFinalScores(scoresToSave);

            const oldSessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
            const finalTranscriptText = annotatedTranscript || messagesRef.current.map(m => `${m.role === 'user' ? 'YOU' : 'AI'}: ${m.content}`).join("\n\n");
            const coachSnap = voiceCoachRef.current || voiceCoach;
            const newSession = {
                userName: getStorageItem("userName") || "Guest",
                userIdentifier: getStorageItem("userIdentifier") || getStorageItem("userName") || "Guest",
                timestamp: Date.now(),
                interviewRating: iScore,
                technicalRating: tScore,
                behavioralRating: bScore,
                communicationRating: cScore,
                portfolioRating: hasPortfolio ? pRatingValue : pRatingRaw,
                finalScore: finalOutput,
                summary: sessionSummary,
                transcript: finalTranscriptText,
                company: getStorageItem("targetCompany") || "",
                role: getStorageItem("preferredRoles") || "",
                voiceCoach: coachSnap || undefined,
            };
            const updatedSessions = [newSession, ...oldSessions];
            setStorageItem("interviewSessions", JSON.stringify(updatedSessions));
            lastSavedSessionTsRef.current = newSession.timestamp;
            try {
                const drills = buildSpacedDrills(updatedSessions);
                setStorageItem("spacedDrills", JSON.stringify(drills));
            } catch { /* ignore */ }
            removeStorageItem("activeHrIntel");
            try {
                sessionStorage.setItem("prointerview_realistic_session_ended", "true");
                sessionStorage.setItem("prointerview_completed_realistic_session", JSON.stringify({
                    scores: scoresToSave,
                    messages: messagesRef.current,
                    blobUrl: recordedBlobUrl
                }));
            } catch { /* ignore */ }
            void syncSessionsToCloud();
        } catch (e) {
            console.error(e);
        }
        setIsEvaluating(false);
    };

    // ---- TERMINATED FOR CHEATING SCREEN ----
    if (terminatedForCheating) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-[#111] p-8 rounded-2xl border border-red-500/30 shadow-2xl text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-red-400">Interview Terminated</h2>
                    <p className="text-white/60 mb-4">
                        Your interview session was terminated due to suspicious activity.
                    </p>
                    <p className="text-white/40 text-sm mb-8">
                        Multiple violations were detected including tab switching, window focus loss, or face not visible on camera.
                        This is recorded as a failed interview attempt.
                    </p>

                    <div className="text-left bg-black/50 rounded-xl p-4 max-h-[300px] overflow-y-auto border border-white/5 mb-8">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-indigo-300' : 'text-white'}`}>
                                <span className="font-bold text-xs uppercase tracking-wider opacity-50 block mb-1">
                                    {msg.role === 'user' ? 'You' : 'Interviewer'}
                                </span>
                                {msg.content}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            stopSpeechInterviewText();
                            sessionStorage.removeItem("prointerview_realistic_session_ended");
                            sessionStorage.removeItem("prointerview_completed_realistic_session");
                            router.push("/");
                        }}
                        className="px-8 py-3 bg-red-600 hover:bg-red-500 transition-colors rounded-xl font-medium"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // ---- CALL ENDED NORMALLY ----
    if (isCallEnded) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
                <div className="max-w-2xl w-full bg-[#111] p-4 sm:p-8 rounded-2xl border border-white/10 shadow-2xl text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">Interview Completed</h2>
                    
                    {isEvaluating ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
                            <p className="text-white/60">Analyzing interview performance and calculating final scores...</p>
                        </div>
                    ) : finalScores ? (
                        <div className="mb-6">
                            <div className="mb-4">
                                <SessionRecorder
                                    title="ProInterview Mock Interview"
                                    blobUrl={recordedBlobUrl}
                                    transcript={
                                        finalScores.annotatedTranscript ||
                                        messages.map((m) => `${m.role === "user" ? "YOU" : "AI"}: ${m.content}`).join("\n\n")
                                    }
                                />
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-left">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Final Evaluation</h3>
                                {typeof finalScores.portfolio === 'number' && (
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-white/70">Portfolio & Projects Score</span>
                                        <span className="font-mono font-medium">{finalScores.portfolio} / 100</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs sm:text-sm text-white/70">Technical Interview Score</span>
                                    <span className="font-mono font-medium text-sm sm:text-base">{finalScores.interview} / 100</span>
                                </div>
                                <div className="h-px w-full bg-white/10 mb-4"></div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm sm:text-lg text-white">
                                        {typeof finalScores.portfolio === 'number' ? 'Weighted Final Rating' : 'Final Interview Rating'}
                                    </span>
                                    <span className="font-bold text-xl sm:text-2xl text-indigo-400">{finalScores.final} / 100</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-1.5 sm:gap-4 my-6">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4 text-center">
                                        <span className="text-[10px] sm:text-xs font-bold text-white/50 block mb-1 truncate">Technical</span>
                                        <span className="text-lg sm:text-xl font-bold text-white/90">{finalScores.technical}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4 text-center">
                                        <span className="text-[10px] sm:text-xs font-bold text-white/50 block mb-1 truncate">Behavioral</span>
                                        <span className="text-lg sm:text-xl font-bold text-white/90">{finalScores.behavioral}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4 text-center">
                                        <span className="text-[10px] sm:text-xs font-bold text-white/50 block mb-1 truncate">Communication</span>
                                        <span className="text-lg sm:text-xl font-bold text-white/90">{finalScores.communication}</span>
                                    </div>
                                </div>

                                {finalScores.summary && (
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 mb-6 text-left">
                                        <h3 className="text-sm font-bold text-indigo-300 mb-3 block">What you should improve:</h3>
                                        <div className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
                                            {Array.isArray(finalScores.summary)
                                                ? (finalScores.summary as any[]).join('\n\n')
                                                : typeof finalScores.summary === 'object'
                                                    ? JSON.stringify(finalScores.summary, null, 2)
                                                    : String(finalScores.summary)}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-left">
                                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">3 habits to fix next</h3>
                                    <ol className="space-y-2 list-decimal list-inside text-sm text-white/80">
                                        {endCallHabits(voiceCoachRef.current || voiceCoach).map((habit, i) => (
                                            <li key={i}>{habit}</li>
                                        ))}
                                    </ol>
                                    {(voiceCoachRef.current || voiceCoach) && (
                                        <div className="mt-4 flex items-end gap-1 h-10" aria-hidden>
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const conf = (voiceCoachRef.current || voiceCoach)?.confidence ?? 50;
                                                const h = 20 + ((conf + i * 7) % 60);
                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex-1 rounded-sm bg-indigo-500/60"
                                                        style={{ height: `${h}%`, opacity: 0.45 + (conf / 200) }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const t = lastSavedSessionTsRef.current;
                                            router.push(t ? `/film-room?t=${t}` : "/film-room");
                                        }}
                                        className="w-full py-2.5 sm:py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                                    >
                                        <Film className="w-4 h-4" /> Film Room
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void shareScorecard()}
                                        disabled={shareBusy}
                                        className="w-full py-2.5 sm:py-2 bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-50 transition-colors rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                                    >
                                        {shareBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                        Share Scorecard
                                    </button>
                                </div>
                                {shareUrl && (
                                    <p className="text-xs text-emerald-400/90 mb-4 break-all text-left">
                                        Copied: {shareUrl}
                                    </p>
                                )}

                                <p className="text-white/50 text-sm mb-4">Review your annotated transcript below.</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-white/60 mb-8">Great job! Here is a summary of your session.</p>
                    )}

                        <div 
                            className="text-left rounded-xl p-8 max-h-[500px] overflow-y-auto border mb-8 text-sm leading-relaxed whitespace-normal font-sans shadow-inner transcript-container"
                            style={{
                                backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : '#ffffff',
                                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
                                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#334155'
                            }}
                        >
                            {finalScores?.annotatedTranscript ? (
                                <div 
                                    className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-sm max-w-none transcript-display`}
                                    dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(String(marked.parse(
                                            typeof finalScores.annotatedTranscript === 'string'
                                                ? finalScores.annotatedTranscript
                                                : Array.isArray(finalScores.annotatedTranscript)
                                                ? (finalScores.annotatedTranscript as any[]).join('\n\n')
                                                : String(finalScores.annotatedTranscript || ''),
                                            { gfm: true, breaks: true }
                                        )))
                                    }}
                                />
                            ) : (
                                <div className="space-y-6">
                                    {messages.map((msg, idx) => (
                                        <div 
                                            key={idx} 
                                            className="p-4 rounded-lg border transition-colors"
                                            style={{
                                                backgroundColor: theme === 'dark' 
                                                    ? (msg.role === 'user' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.05)') 
                                                    : (msg.role === 'user' ? '#e0e7ff' : '#f1f5f9'),
                                                borderColor: theme === 'dark'
                                                    ? (msg.role === 'user' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)')
                                                    : (msg.role === 'user' ? '#a5b4fc' : '#cbd5e1'),
                                                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1e293b'
                                            }}
                                        >
                                            <span className="font-bold text-[10px] uppercase tracking-widest opacity-40 block mb-2">
                                                {msg.role === 'user' ? 'Candidate' : 'Interviewer'}
                                            </span>
                                            <div>{msg.content}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <style jsx>{`
                            .transcript-display :global(pre) {
                                background: #1a1a1a;
                                padding: 1rem;
                                border-radius: 0.5rem;
                                border: 1px solid #333;
                                overflow-x: auto;
                                margin: 1.5rem 0;
                            }
                            .transcript-display :global(code) {
                                font-family: 'Consolas', 'Monaco', monospace;
                                color: #a5b4fc;
                            }
                            .transcript-display :global(p) {
                                margin-bottom: 1.5rem;
                            }
                            .transcript-display :global(strong) {
                                color: #818cf8;
                            }
                        `}</style>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
                        <button
                            onClick={() => {
                                const rawTranscript = finalScores?.annotatedTranscript || messages.map(m => `${m.role === 'user' ? 'YOU' : 'AI'}: ${m.content}`).join('\n\n\n\n');
                                const transcriptContent = Array.isArray(rawTranscript)
                                    ? rawTranscript.join('\n\n\n\n')
                                    : typeof rawTranscript === 'string'
                                        ? rawTranscript
                                        : String(rawTranscript || '');
                                
                                // Configure marked to handle common interview transcript formatting
                                marked.setOptions({
                                    gfm: true,
                                    breaks: true
                                });
                                
                                // Preserve the special 3-line gaps (4 newlines) by converting them to multiple BR tags before parsing
                                const formattedTranscript = transcriptContent.replace(/\n\n\n\n/g, '<br/><br/><br/><br/>');
                                const renderedTranscript = marked.parse(formattedTranscript);

                                const rawSummary = finalScores?.summary || 'No summary available';
                                const summaryContent = Array.isArray(rawSummary)
                                    ? rawSummary.join('\n\n')
                                    : typeof rawSummary === 'string'
                                        ? rawSummary
                                        : (rawSummary ? JSON.stringify(rawSummary) : 'No summary available');
                                const renderedSummary = marked.parse(summaryContent);

                                const htmlContent = `
                                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                                    <head>
                                        <meta charset='utf-8'>
                                        <title>Interview Session Report</title>
                                        <style>
                                            body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #333; }
                                            h1 { color: #2c3e50; border-bottom: 2px solid #34495e; padding-bottom: 10px; }
                                            .header-info { background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; margin-bottom: 20px; }
                                            /* Ensure the transcript preserves its monospaced layout where needed */
                                            .transcript { font-size: 11pt; }
                                            .transcript p { margin-bottom: 15px; }
                                            /* Fix for "codes mixed up" - use monospaced fonts for all code */
                                            code, pre { font-family: 'Consolas', 'Courier New', monospace; background: #eee; padding: 10px; border: 1px solid #ccc; display: block; white-space: pre-wrap; }
                                        </style>
                                    </head>
                                    <body>
                                        <h1>Interview Session Report</h1>
                                        <div class="header-info">
                                            <p><b>Date:</b> ${new Date().toLocaleString()}</p>
                                            <p><b>Final Rating:</b> ${finalScores?.final || 'N/A'}/100</p>
                                            <p><b>Technical:</b> ${finalScores?.technical || 'N/A'} | <b>Behavioral:</b> ${finalScores?.behavioral || 'N/A'} | <b>Communication:</b> ${finalScores?.communication || 'N/A'}</p>
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
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `interview-report-${Date.now()}.doc`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="w-full sm:w-auto flex-1 py-3 px-5 bg-white/10 hover:bg-white/20 transition-all rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-white/10"
                        >
                            <Download className="w-4 h-4 text-indigo-400" /> Download Report (.doc)
                        </button>
                        <button
                            onClick={() => {
                                stopSpeechInterviewText();
                                sessionStorage.removeItem("prointerview_realistic_session_ended");
                                sessionStorage.removeItem("prointerview_completed_realistic_session");
                                router.push("/");
                            }}
                            className="w-full sm:w-auto flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 transition-all rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---- MAIN INTERVIEW UI ----
    if (!isAuthChecked) return null;

    return (
        <div className="min-h-screen lg:h-screen bg-[#050510] text-white flex flex-col font-sans relative overflow-hidden">
            <Script src="https://unpkg.com/@daily-co/daily-js" strategy="afterInteractive" />
            {/* Ambient dynamic glassmorphism background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen opacity-50 animate-[pulse_8s_ease-in-out_infinite]"></div>
                <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] bg-purple-500/10 blur-[150px] rounded-full mix-blend-screen opacity-40"></div>
            </div>

            {/* Hidden canvas for face detection */}
            <canvas ref={canvasRef} className="hidden" />

            <header className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-xl z-10">
                <h1 className="font-bold text-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    Interview Room
                </h1>
                <div className="flex items-center gap-4">
                    {/* Warning counter */}
                    {warningCount > 0 && (
                        <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                            <AlertTriangle className="w-4 h-4" />
                            {warningCount}/{MAX_WARNINGS} Warnings
                        </div>
                    )}
                    <div className="text-white/50 text-sm">Session recording...</div>
                    
                    {/* Return to Practical Button (only active when candidate stepped back to chat) */}
                    {activePracticalTask && interactionMode === "chat" && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={() => setInteractionMode(activePracticalTask.type)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/40 transition-all cursor-pointer animate-pulse shrink-0"
                            title="Resume active practical problem"
                        >
                            {activePracticalTask.type === "code" ? (
                                <>
                                    <CodeIcon className="w-3.5 h-3.5" />
                                    <span>Resume Code Editor</span>
                                </>
                            ) : (
                                <>
                                    <PenTool className="w-3.5 h-3.5" />
                                    <span>Resume Whiteboard</span>
                                </>
                            )}
                        </motion.button>
                    )}

                    {/* Theme Toggle Button */}
                    <button 
                        onClick={cycleTheme}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title={`Current Theme: ${theme}. Click to switch.`}
                    >
                        {theme === "dark" && <Moon className="w-4 h-4" />}
                        {theme === "light" && <Sun className="w-4 h-4" />}
                        {theme === "eyeprotect" && <Eye className="w-4 h-4 text-amber-400" />}
                    </button>
                </div>
            </header>

            {/* Suspicious activity warning banner */}
            {suspiciousMessage && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="bg-red-600/90 backdrop-blur text-white text-center py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 z-20"
                >
                    <ShieldAlert className="w-5 h-5" />
                    {suspiciousMessage}
                </motion.div>
            )}

            {/* Avatar Error / Fallback Notification Banner */}
            <AnimatePresence>
                {avatarError && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 border-b shadow-md z-30 transition-colors ${
                            theme === "light"
                                ? "bg-amber-100 border-amber-300 text-amber-950"
                                : theme === "eyeprotect"
                                ? "bg-amber-950/80 border-amber-500/40 text-amber-200"
                                : "bg-amber-950/90 border-amber-500/50 text-amber-100"
                        }`}
                    >
                        <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
                            <span className="text-base shrink-0">⚠️</span>
                            <span className="leading-snug">{avatarError}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAvatarError(null)}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                theme === "light"
                                    ? "hover:bg-amber-200 text-amber-900"
                                    : "hover:bg-white/10 text-amber-300 hover:text-white"
                            }`}
                            title="Dismiss"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className={`flex-grow flex flex-col lg:flex-row p-4 gap-4 relative ${interactionMode !== "chat" ? "max-w-none px-4 lg:px-6 lg:overflow-hidden" : "max-w-[1600px]"} mx-auto w-full min-h-0 transition-all duration-500`}>
                {interactionMode === "chat" ? (
                    <>
                        {/* ===== LEFT SIDE: Videos + Controls (Default Chat Layout) ===== */}
                        <div className="flex flex-col gap-4 flex-1 min-h-0">
                            {/* Desktop Video Grid */}
                            <div className="hidden lg:grid gap-4 grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
                                {/* AI Video - Animated Human Face */}
                                <div className="relative bg-[#0a0a14] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(79,70,229,0.1)] flex items-center justify-center min-h-[300px]">
                                    {avatarError && (
                                        <div className={`absolute top-12 right-3 left-3 backdrop-blur-sm p-2 rounded-lg z-30 flex items-center justify-between shadow-lg text-[10px] font-medium transition-colors ${
                                            theme === "light"
                                                ? "bg-amber-50/95 border border-amber-300 text-amber-950 shadow-amber-950/10"
                                                : theme === "eyeprotect"
                                                ? "bg-amber-950/90 border border-amber-500/40 text-amber-200"
                                                : "bg-red-950/90 border border-red-500/40 text-red-200"
                                        }`}>
                                            <span className="leading-snug">⚠️ {avatarError}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setAvatarError(null)} 
                                                className={`ml-2 text-xs font-bold cursor-pointer transition-colors ${
                                                    theme === "light"
                                                        ? "text-amber-800 hover:text-black"
                                                        : "text-red-400 hover:text-white"
                                                }`}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 inline-flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl text-xs font-semibold z-20 shadow-lg">
                                        <span>ProInterview</span>
                                        <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "text-emerald-400" : "text-white/40"}`} />
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            avatarType === "svg"
                                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                                : "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                        }`}>
                                            {avatarType === "svg" ? "0 Credits • SVG Active" : "Live Video Active"}
                                        </span>
                                    </div>

                                    {/* Persona & Avatar Switcher Toolbar */}
                                    <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-white/10 p-1 rounded-xl text-[10px] font-bold z-30 shadow-xl">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchAvatarType("svg")}
                                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                                avatarType === "svg"
                                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 font-extrabold"
                                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                            title="Default mode: SVG Voice AI (0 API Credits consumed)"
                                        >
                                            <span>⚡ SVG Avatar</span>
                                            <span className="text-[9px] opacity-75 font-normal">(0 Credits)</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSwitchAvatarType("tavus")}
                                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                                avatarType === "tavus"
                                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-extrabold"
                                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                            title="Live AI Video Stream (Tavus WebRTC - consumes credits)"
                                        >
                                            <span>🎥 Live Video</span>
                                        </button>

                                        {avatarType === "tavus" && (
                                            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                                                {[
                                                    { id: "r67d1c9cac37", label: "Alex" },
                                                    { id: "r9d30b0e55ac", label: "Luna" },
                                                    { id: "re6220ec0195", label: "Marcus" }
                                                ].map((persona) => (
                                                    <button
                                                        key={persona.id}
                                                        type="button"
                                                        onClick={() => handleSelectPresenterPersona(persona.id)}
                                                        className={`px-1.5 py-0.5 rounded text-[9px] transition-all cursor-pointer ${
                                                            selectedReplicaId === persona.id
                                                                ? "bg-white/20 text-white font-black"
                                                                : "text-white/40 hover:text-white"
                                                        }`}
                                                        title={`Switch to ${persona.label}`}
                                                    >
                                                        {persona.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative flex items-center justify-center z-0 w-full h-full">
                                        {avatarType === "svg" ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0d0d1e] to-[#0a0a14] p-6 overflow-hidden">
                                                {/* Futuristic Orb Animation */}
                                                <div className="relative w-44 h-44 flex items-center justify-center">
                                                    {/* Pulsing Outer Ring */}
                                                    <motion.div
                                                        className="absolute inset-0 rounded-full border border-indigo-500/25"
                                                        animate={isSpeaking ? { scale: [1, 1.35, 1], opacity: [0.15, 0.45, 0.15] } : { scale: 1, opacity: 0.08 }}
                                                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                                    />
                                                    {/* Orbiting Ring */}
                                                    <motion.div
                                                        className="absolute inset-2 rounded-full border-t-2 border-indigo-500/40 border-r-2 border-purple-500/40 border-b-2 border-transparent"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                                                    />
                                                    {/* Glowing Core */}
                                                    <motion.div
                                                        className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.35)] relative z-10"
                                                        animate={isSpeaking ? { scale: [1, 1.1, 1], boxShadow: ["0 0 50px rgba(99, 102, 241, 0.35)", "0 0 80px rgba(99, 102, 241, 0.7)", "0 0 50px rgba(99, 102, 241, 0.35)"] } : { scale: 1 }}
                                                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                                    >
                                                        <Volume2 className="w-10 h-10 text-white animate-pulse" />
                                                    </motion.div>
                                                </div>
                                                <div className="mt-8 text-center px-4 space-y-2">
                                                    <h3 className="text-xs font-black tracking-widest uppercase bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                                        AI Voice Synthesizer Active
                                                    </h3>
                                                    <p className="text-white/50 text-[11px] leading-relaxed max-w-xs">
                                                        Default credit-saving mode. Full speech & audio interview capabilities active without consuming video API credits.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSwitchAvatarType("tavus")}
                                                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-indigo-300 hover:text-white transition-all cursor-pointer shadow-md"
                                                    >
                                                        <span>🎥 Switch to Live Video Avatar</span>
                                                    </button>
                                                </div>
                                            </div>
                                         ) : (
                                             <>
                                                {/* Tavus video layer — always rendered when Tavus is selected */}
                                                <video
                                                    ref={setAvatarVideoRef}
                                                    src={avatarVideoUrl || undefined}
                                                    className={`object-cover w-full h-full absolute inset-0 z-20 transition-opacity duration-500 ${isDidAvailable ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                                    playsInline
                                                    autoPlay
                                                    onPlay={() => setIsSpeaking(true)}
                                                    onEnded={() => setIsSpeaking(false)}
                                                />


                                                {/* Ultra-realistic presenter photo with speaking indicators */}
                                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0f0f24] to-[#0a0a14]">
                                                    {/* Professional presenter photo */}
                                                    <img
                                                        src={theme === "light" ? "/ai-avatar-light.jpg" : theme === "eyeprotect" ? "/ai-avatar-eyeprotect.jpg" : "/tavus-avatar.jpg"}
                                                        alt="ProInterview Tavus Presenter"
                                                        className={`object-cover w-full h-full transition-all duration-700 ${isSpeaking ? "brightness-110 contrast-105" : "brightness-90 contrast-100"}`}
                                                    />

                                                    {/* Subtle cinematic vignette overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                                                    {/* Speaking glow ring around the frame */}
                                                    {isSpeaking && (
                                                        <motion.div
                                                            className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                                                            style={{ boxShadow: "inset 0 0 30px rgba(99, 102, 241, 0.3), 0 0 40px rgba(99, 102, 241, 0.15)" }}
                                                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                                                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                                        />
                                                    )}

                                                    {/* Audio waveform visualizer at bottom */}
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-[3px] z-10">
                                                        {[...Array(9)].map((_, i) => (
                                                            <motion.div
                                                                key={i}
                                                                className="w-[3px] rounded-full bg-gradient-to-t from-indigo-400 to-purple-400"
                                                                animate={isSpeaking
                                                                    ? { height: [4, 12 + Math.random() * 16, 6, 18 + Math.random() * 10, 4], opacity: [0.6, 1, 0.7, 1, 0.6] }
                                                                    : { height: [3, 5, 3], opacity: [0.2, 0.35, 0.2] }
                                                                }
                                                                transition={isSpeaking
                                                                    ? { repeat: Infinity, duration: 0.4 + Math.random() * 0.3, ease: "easeInOut", delay: i * 0.05 }
                                                                    : { repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: i * 0.15 }
                                                                }
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Tavus generating overlay */}
                                                    {isAvatarGenerating && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                                                            <span className="text-[10px] text-white/80 font-medium bg-black/60 px-2.5 py-1 rounded-md border border-white/10 animate-pulse">Generating video response...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* User Video */}
                                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/5 shadow-xl min-h-[300px]">
                                    <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-semibold">
                                        You
                                        {videoActive && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Proctoring active"></span>
                                        )}
                                    </div>
                                    <video ref={videoRef} autoPlay playsInline muted className={`object-cover w-full h-full transform scale-x-[-1] absolute inset-0 ${videoActive ? "block" : "hidden"}`} />
                                    {!videoActive && (
                                        <div className="w-full h-full flex items-center justify-center text-white/20 relative z-0">
                                            <VideoOff className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile/Tablet Video Frame (Picture in Picture) */}
                            <div className="lg:hidden relative w-full h-[220px] sm:h-[280px] bg-[#0a0a14] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(79,70,229,0.1)] flex items-center justify-center shrink-0">
                                {avatarError && (
                                    <div className={`absolute top-12 right-3 left-3 backdrop-blur-sm p-2 rounded-lg z-30 flex items-center justify-between shadow-lg text-[10px] font-medium transition-colors ${
                                        theme === "light"
                                            ? "bg-amber-50/95 border border-amber-300 text-amber-950 shadow-amber-950/10"
                                            : theme === "eyeprotect"
                                            ? "bg-amber-950/90 border border-amber-500/40 text-amber-200"
                                            : "bg-red-950/90 border border-red-500/40 text-red-200"
                                    }`}>
                                        <span className="leading-snug">⚠️ {avatarError}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setAvatarError(null)} 
                                            className={`ml-2 text-xs font-bold cursor-pointer transition-colors ${
                                                theme === "light"
                                                    ? "text-amber-800 hover:text-black"
                                                    : "text-red-400 hover:text-white"
                                            }`}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg text-[10px] font-semibold z-10">
                                    ProInterview <Volume2 className={`w-2.5 h-2.5 ${isSpeaking ? "text-green-400" : "text-white/40"}`} />
                                </div>

                                <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 p-0.5 rounded-lg text-[8px] font-bold z-30 shadow-md">
                                    {[
                                        { id: "r67d1c9cac37", label: "Alex" },
                                        { id: "r9d30b0e55ac", label: "Luna" },
                                        { id: "re6220ec0195", label: "Marcus" }
                                    ].map((persona) => (
                                        <button
                                            key={persona.id}
                                            type="button"
                                            onClick={() => handleSelectPresenterPersona(persona.id)}
                                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                                avatarType === "tavus" && selectedReplicaId === persona.id
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-white/50 hover:text-white"
                                            }`}
                                        >
                                            {persona.label}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchAvatarType("svg")}
                                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${avatarType === "svg" ? "bg-purple-600 text-white shadow-sm" : "text-white/50 hover:text-white"}`}
                                    >
                                        SVG
                                    </button>
                                </div>

                                <div className="relative flex items-center justify-center z-0 w-full h-full">
                                    {avatarType === "svg" ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0d0d1e] to-[#0a0a14] p-4 overflow-hidden">
                                            <div className="relative w-28 h-28 flex items-center justify-center">
                                                <motion.div
                                                    className="absolute inset-0 rounded-full border border-indigo-500/25"
                                                    animate={isSpeaking ? { scale: [1, 1.3, 1], opacity: [0.15, 0.45, 0.15] } : { scale: 1, opacity: 0.08 }}
                                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                                />
                                                <motion.div
                                                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.35)] relative z-10"
                                                    animate={isSpeaking ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                                                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                                >
                                                    <Volume2 className="w-6 h-6 text-white animate-pulse" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <video
                                                ref={setAvatarVideoRef}
                                                src={avatarVideoUrl || undefined}
                                                className={`object-cover w-full h-full absolute inset-0 z-20 transition-opacity duration-500 ${isDidAvailable ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                                playsInline
                                                autoPlay
                                                onPlay={() => setIsSpeaking(true)}
                                                onEnded={() => setIsSpeaking(false)}
                                            />
                                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0f0f24] to-[#0a0a14]">
                                                <img
                                                    src={theme === "light" ? "/ai-avatar-light.jpg" : theme === "eyeprotect" ? "/ai-avatar-eyeprotect.jpg" : "/tavus-avatar.jpg"}
                                                    alt="ProInterview Tavus Presenter"
                                                    className={`object-cover w-full h-full transition-all duration-700 ${isSpeaking ? "brightness-110 contrast-105" : "brightness-90 contrast-100"}`}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                                                {isAvatarGenerating && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-1" />
                                                        <span className="text-[9px] text-white/80 bg-black/60 px-2 py-0.5 rounded animate-pulse">Generating...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* User Video Overlay */}
                                <div className="absolute bottom-3 right-3 w-20 sm:w-28 h-28 sm:h-36 rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20 bg-black">
                                    <video ref={videoRef} autoPlay playsInline muted className={`object-cover w-full h-full transform scale-x-[-1] absolute inset-0 ${videoActive ? "block" : "hidden"}`} />
                                    {!videoActive && (
                                        <div className="w-full h-full flex items-center justify-center text-white/20 relative z-0">
                                            <VideoOff className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-3 sm:p-4 flex items-center justify-center gap-4 sm:gap-6 shrink-0">
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={toggleVideo}
                                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${videoActive ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 text-red-500"}`}
                                    >
                                        {videoActive ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                                    </button>
                                    <span className="text-[9px] sm:text-[10px] text-white/40 font-medium">Camera</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={pauseCall}
                                        className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500"
                                    >
                                        <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>
                                    <span className="text-[9px] sm:text-[10px] text-white/40 font-medium">Pause</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={endCall}
                                        className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] text-white"
                                    >
                                        <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>
                                    <span className="text-[9px] sm:text-[10px] text-white/40 font-medium">End</span>
                                </div>
                            </div>
                        </div>

                        {/* ===== RIGHT SIDE: Chat / Transcript Panel ===== */}
                        <div className="flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden w-full lg:w-96 h-[360px] lg:h-auto min-h-0 flex-1 lg:flex-initial">
                            <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20 font-semibold flex items-center justify-between shrink-0">
                                <span className="text-sm">Transcript</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-normal text-white/40 flex items-center gap-1.5">
                                        <Mic className="w-3 h-3 text-white/40" /> Voice/Text
                                    </span>
                                </div>
                            </div>
                            {activePracticalTask && interactionMode === "chat" && (
                                <div className="mx-3 mt-3 p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between gap-2 shrink-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                        <span className="text-xs text-indigo-200 font-medium truncate">
                                            {activePracticalTask.type === "code" ? "Coding problem active" : "Whiteboard task active"}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setInteractionMode(activePracticalTask.type)}
                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                                    >
                                        Return to {activePracticalTask.type === "code" ? "Editor" : "Whiteboard"}
                                    </button>
                                </div>
                            )}
                            {(hrPersonaName || companyCloneName) && (
                                <div className="px-3 pt-3 space-y-1.5 shrink-0">
                                    {hrPersonaName && (
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-teal-300/90 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 py-1.5">
                                            Persona: {hrPersonaName}
                                        </div>
                                    )}
                                    {companyCloneName && (
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                                            Company clone: {companyCloneName}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="px-3 pt-3 shrink-0">
                                <VoiceCoachPanel snapshot={voiceCoach} compact className="!p-3" />
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scroll-smooth">
                                {(() => {
                                    const lastAssistantIndex = messages.map(m => m.role).lastIndexOf("assistant");
                                    const displayMessages = lastAssistantIndex >= 0 ? messages.slice(lastAssistantIndex) : messages;
                                    return displayMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col max-w-[90%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                                            <span className="text-[10px] text-white/40 mb-0.5 px-1">{msg.role === "user" ? "You" : "AI"}</span>
                                            <div className={`p-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden transition-all duration-300 ${msg.role === "user" ? "bg-indigo-600 rounded-br-none" : "bg-white/10 rounded-bl-none"} ${(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) ? "shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50" : "border border-transparent"}`}>
                                                {(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) && (
                                                    <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
                                                )}
                                                {msg.attachment && (
                                                    <img src={msg.attachment} alt="Attachment" className="max-w-full h-auto rounded-xl mb-2 border border-white/20" />
                                                )}
                                                <span className={(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) ? "relative z-10 text-white drop-shadow-md" : ""}>{msg.content}</span>
                                            </div>
                                        </div>
                                    ));
                                })()}
                                {isLoading && (
                                    <div className="mr-auto items-start max-w-[80%] flex flex-col">
                                        <span className="text-[10px] text-white/40 mb-0.5 px-1">AI</span>
                                        <div className="p-3 rounded-xl bg-white/5 rounded-bl-none flex items-center gap-2 text-white/60 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input area */}
                            <div className="p-3 bg-black/20 border-t border-white/10 relative">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                        placeholder="Type your answer or use the microphone..."
                                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
                                    />
                                    <button
                                        onClick={() => {
                                            if (isListening) {
                                                recognitionRef.current?.stop();
                                                setIsListening(false);
                                            } else {
                                                window.speechSynthesis.cancel();
                                                setIsSpeaking(false);
                                                speechStartedAtRef.current = Date.now();
                                                recognitionRef.current?.start();
                                                setIsListening(true);
                                            }
                                        }}
                                        className={`p-2 rounded-xl shrink-0 transition-colors ${isListening ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 animate-pulse" : "bg-white/10 hover:bg-white/20"}`}
                                    >
                                        <Mic className={`w-4 h-4 ${isListening ? "text-black" : "text-white"}`} />
                                    </button>
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!userInput.trim() || isLoading}
                                        className="p-2 rounded-xl shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                {isListening && (
                                    <div className="text-xs text-green-400 mt-1.5 ml-1 animate-pulse flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Listening...</div>
                                )}
                            </div>
                        </div>
                    </>
                          ) : (
                    <div id="practical-split-container" className="flex-grow flex flex-col lg:flex-row gap-2 relative w-full h-full min-h-0 lg:overflow-hidden">
                        {/* Mobilized toggle tabs for workspace modes */}
                        <div className="lg:hidden flex border border-white/10 rounded-xl overflow-hidden mb-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setMobileWorkspaceView("transcript")}
                                className={`flex-grow py-2 text-xs font-bold transition-all cursor-pointer ${mobileWorkspaceView === "transcript" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60"}`}
                            >
                                Show Transcript
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileWorkspaceView("workspace")}
                                className={`flex-grow py-2 text-xs font-bold transition-all cursor-pointer ${mobileWorkspaceView === "workspace" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60"}`}
                            >
                                Show Editor / Canvas
                            </button>
                        </div>

                        {/* ===== LEFT SIDE: Transcript & Controls ===== */}
                        <div 
                            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${practicalPanelRatio}%` : undefined }} 
                            className={`flex-col gap-3 h-full shrink-0 lg:min-w-[200px] w-full lg:w-auto min-h-0 ${mobileWorkspaceView === "transcript" ? "flex" : "hidden lg:flex"}`}
                        >
                            {/* Chat / Transcript Panel (Compact) */}
                            <div className="flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden flex-grow min-h-0">
                                <div className="p-3 border-b border-white/10 bg-black/20 font-semibold flex items-center justify-between shrink-0">
                                    <span className="text-sm">Transcript</span>
                                </div>
                                {(hrPersonaName || companyCloneName) && (
                                    <div className="px-3 pt-2 space-y-1 shrink-0">
                                        {hrPersonaName && (
                                            <div className="text-[10px] font-semibold text-teal-300/90 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2 py-1">
                                                Persona: {hrPersonaName}
                                            </div>
                                        )}
                                        {companyCloneName && (
                                            <div className="text-[10px] font-semibold text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                                                Company clone: {companyCloneName}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="px-3 pt-2 shrink-0">
                                    <VoiceCoachPanel snapshot={voiceCoach} compact className="!p-2.5" />
                                </div>
                                <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-3 scroll-smooth min-h-0">
                                    {(() => {
                                        const lastAssistantIndex = messages.map(m => m.role).lastIndexOf("assistant");
                                        const displayMessages = lastAssistantIndex >= 0 ? messages.slice(lastAssistantIndex) : messages;
                                        return displayMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex flex-col max-w-[90%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                                                <span className="text-[10px] text-white/40 mb-0.5 px-1">{msg.role === "user" ? "You" : "AI"}</span>
                                                <div className={`p-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden transition-all duration-300 ${msg.role === "user" ? "bg-indigo-600 rounded-br-none" : "bg-white/10 rounded-bl-none"} ${(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) ? "shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50" : "border border-transparent"}`}>
                                                    {(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) && (
                                                        <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
                                                    )}
                                                    {msg.attachment && (
                                                        <img src={msg.attachment} alt="Attachment" className="max-w-full h-auto rounded-xl mb-2 border border-white/20" />
                                                    )}
                                                    <span className={(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) ? "relative z-10 text-white drop-shadow-md" : ""}>{msg.content}</span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                    {isLoading && (
                                        <div className="mr-auto items-start max-w-[80%] flex flex-col">
                                            <span className="text-[10px] text-white/40 mb-0.5 px-1">AI</span>
                                            <div className="p-3 rounded-xl bg-white/5 rounded-bl-none flex items-center gap-2 text-white/60 text-xs sm:text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input area */}
                                <div className="p-3 bg-black/20 border-t border-white/10 relative shrink-0">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-grow min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 text-white"
                                        />
                                        <button
                                            onClick={() => {
                                                if (isListening) {
                                                    recognitionRef.current?.stop();
                                                    setIsListening(false);
                                                } else {
                                                    window.speechSynthesis.cancel();
                                                    setIsSpeaking(false);
                                                    speechStartedAtRef.current = Date.now();
                                                    recognitionRef.current?.start();
                                                    setIsListening(true);
                                                }
                                            }}
                                            className={`p-2 rounded-xl shrink-0 transition-colors ${isListening ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 animate-pulse" : "bg-white/10 hover:bg-white/20"}`}
                                        >
                                            <Mic className={`w-3.5 h-3.5 ${isListening ? "text-black" : "text-white"}`} />
                                        </button>
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={!userInput.trim() || isLoading}
                                            className="p-2 rounded-xl shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {isListening && (
                                        <div className="text-[10px] sm:text-xs text-green-400 mt-1.5 ml-1 animate-pulse flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Listening...</div>
                                    )}
                                </div>
                            </div>

                            {/* Controls (Compact) */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-3 flex items-center justify-center gap-4 shrink-0">
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={toggleVideo}
                                        className={`rounded-full flex items-center justify-center transition-all w-10 h-10 ${videoActive ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 text-red-500"}`}
                                    >
                                        {videoActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={pauseCall}
                                        className="rounded-full flex items-center justify-center transition-all bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500 w-10 h-10"
                                    >
                                        <Pause className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={endCall}
                                        className="rounded-full flex items-center justify-center transition-all bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] text-white w-10 h-10"
                                    >
                                        <PhoneOff className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ===== RESIZER DIVIDER BAR ===== */}
                        <div 
                            onMouseDown={handleMouseDown} 
                            className="hidden lg:flex w-1.5 hover:w-2 bg-white/10 hover:bg-indigo-500/50 cursor-col-resize transition-all h-auto self-stretch rounded-full mx-1 z-30 items-center justify-center group shrink-0"
                            title="Drag to resize panels"
                        >
                            <div className="w-1 h-8 rounded-full bg-white/20 group-hover:bg-white/50" />
                        </div>

                        {/* ===== RIGHT SIDE: Workspace Panel (Code / Canvas) (Flex-1) ===== */}
                        <div className={`flex-grow flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-w-0 h-full relative min-h-0 ${mobileWorkspaceView === "workspace" ? "flex" : "hidden lg:flex"}`}>
                            {/* Code/Draw Header */}
                            <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    {interactionMode === "code" ? (
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <CodeIcon className="w-4 h-4" />
                                            <span className="font-bold text-sm">Code Editor</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-400">
                                            <PenTool className="w-4 h-4" />
                                            <span className="font-bold text-sm">Architecture Whiteboard</span>
                                        </div>
                                    )}
                                    <span className="text-xs text-white/30 ml-2">Practical Question Active</span>
                                </div>
                                <button
                                    onClick={() => setInteractionMode("chat")}
                                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    <MessageSquare className="w-3 h-3" /> Back to Chat
                                </button>
                            </div>

                            {/* Code Editor Panel */}
                            {interactionMode === "code" && (
                                <div className="flex-grow flex flex-col p-4 gap-3 min-h-0 overflow-y-auto">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <label className="text-xs text-white/50 font-medium">Language</label>
                                        <select
                                            value={codeLanguage}
                                            onChange={(e) => setCodeLanguage(e.target.value)}
                                            className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="python">Python</option>
                                            <option value="js">JavaScript</option>
                                            <option value="ts">TypeScript</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="go">Go</option>
                                        </select>
                                    </div>
                                    <textarea
                                        value={codeContent}
                                        onChange={(e) => setCodeContent(e.target.value)}
                                        placeholder="Write your code solution here..."
                                        className="flex-grow min-h-0 bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed text-white"
                                        spellCheck={false}
                                    />
                                    {codeOutput && (
                                        <pre className="shrink-0 max-h-36 overflow-y-auto bg-black/60 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap">
                                            {codeOutput}
                                        </pre>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => void runCode()}
                                            disabled={!codeContent.trim() || codeBusy}
                                            className="px-4 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                                        >
                                            {codeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                            Run
                                        </button>
                                        <button
                                            onClick={() => void gradeAndSubmitCode()}
                                            disabled={!codeContent.trim() || codeBusy || isLoading}
                                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                                        >
                                            <Save className="w-4 h-4"/> Grade & Submit
                                        </button>
                                        <button
                                            onClick={() => {
                                                const codeMsg = `Here is my code:\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\``;
                                                handleSendMessage(codeMsg);
                                                setCodeContent("");
                                                setCodeOutput("");
                                                setActivePracticalTask(null);
                                                setInteractionMode("chat");
                                            }}
                                            disabled={!codeContent.trim() || isLoading}
                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors cursor-pointer text-sm disabled:opacity-50"
                                        >
                                            Submit
                                        </button>
                                        <button
                                            onClick={() => { setCodeContent(""); setCodeOutput(""); }}
                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors cursor-pointer text-sm"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Architecture & System Design Whiteboard Panel */}
                            {interactionMode === "draw" && (
                                <div className="flex-grow flex flex-col p-3 sm:p-4 gap-3 min-h-0 overflow-y-auto">
                                    {/* Single active question banner */}
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 shrink-0 flex flex-col gap-1.5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <PenTool className="w-4 h-4 text-orange-400" />
                                                <span className="text-xs font-bold text-orange-300 uppercase tracking-wider">
                                                    Architecture / Diagram Challenge
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsQuestionCollapsed(!isQuestionCollapsed)}
                                                className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                                {isQuestionCollapsed ? (
                                                    <>
                                                        <span>Show Question</span>
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Collapse</span>
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {!isQuestionCollapsed && (
                                            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                                                {activePracticalTask?.questionText ||
                                                    [...messages].reverse().find(m => m.role === "assistant")?.content ||
                                                    "Please draw the requested architecture or diagram on the whiteboard below."}
                                            </p>
                                        )}
                                    </div>

                                    {/* Interactive Whiteboard Canvas */}
                                    <div className="flex-grow rounded-xl overflow-hidden border border-white/10 relative min-h-[380px] flex flex-col bg-slate-950">
                                        <InteractiveWhiteboard
                                            ref={whiteboardRef}
                                            shapes={boardShapes}
                                            onShapesChange={setBoardShapes}
                                            onFreehandChange={setBoardHasFreehand}
                                            theme={theme}
                                            isLight={theme === "light"}
                                        />
                                    </div>

                                    {/* Bottom Action Controls */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const dataUrl = whiteboardRef.current?.getPngDataUrl();
                                                if (dataUrl) {
                                                    handleSendMessage("I have completed and attached my architectural diagram / schematic for review.", dataUrl);
                                                } else {
                                                    handleSendMessage("I have completed the diagram on the whiteboard.");
                                                }
                                                setBoardShapes([]);
                                                setActivePracticalTask(null);
                                                setInteractionMode("chat");
                                            }}
                                            disabled={isLoading}
                                            className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm text-white shadow-lg shadow-orange-600/25"
                                        >
                                            <Save className="w-4 h-4" /> Submit Diagram to Interviewer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBoardShapes([])}
                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors cursor-pointer text-sm text-white/80"
                                        >
                                            Clear Board
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Hidden video element to keep background proctoring active */}
                            <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none" }} />
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
