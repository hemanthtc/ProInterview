"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Volume2, Loader2, AlertTriangle, ShieldAlert, Pause, Code as CodeIcon, PenTool, MessageSquare, Save, Download, Sun, Moon, Eye, Film, Share2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { marked } from "marked";
import { getStorageItem, getInterviewResumeText, setStorageItem, removeStorageItem } from "../../utils/storage";
import VoiceCoachPanel from "../../components/VoiceCoachPanel";
import { analyzeUtterance, mergeCoachStats, endCallHabits, type VoiceCoachSnapshot } from "../../utils/voiceCoach";
import { syncSessionsToCloud } from "../../utils/cloudSync";
import { buildSpacedDrills } from "../../utils/spacedDrills";
import { resolveCompanyBank } from "../../data/companyBanks";
import { speakInterviewText } from "../../utils/speakInterview";

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

    // D-ID Talking Head Avatar states
    const avatarVideoRef = useRef<HTMLVideoElement>(null);
    const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
    const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);
    const [isDidAvailable, setIsDidAvailable] = useState<boolean | null>(null);
    const [avatarType, setAvatarType] = useState<"d-id" | "svg">("svg");

    const closeDIdStream = () => {
        if (peerConnectionRef.current) {
            try { peerConnectionRef.current.close(); } catch (e) { }
            peerConnectionRef.current = null;
        }
        if (dataChannelRef.current) {
            try { dataChannelRef.current.close(); } catch (e) { }
            dataChannelRef.current = null;
        }
        streamIdRef.current = null;
        sessionIdRef.current = null;
        remoteStreamRef.current = null;
        setAvatarVideoUrl(null);
        setIsAvatarGenerating(false);
    };

    const handleSwitchAvatarType = (type: "d-id" | "svg") => {
        if (type === avatarType) return;
        setAvatarType(type);
        if (type === "svg") {
            closeDIdStream();
            setIsDidAvailable(false);
        } else {
            initializeDIdStream();
        }
    };

    // WebRTC Streaming refs
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const streamIdRef = useRef<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);

    const [interactionMode, setInteractionMode] = useState<"chat" | "code" | "draw">("chat");
    const [mobileWorkspaceView, setMobileWorkspaceView] = useState<"transcript" | "workspace">("workspace");
    const [codeContent, setCodeContent] = useState("");
    const [codeLanguage, setCodeLanguage] = useState("python");
    const [codeOutput, setCodeOutput] = useState("");
    const [codeBusy, setCodeBusy] = useState(false);
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
            const ctx = canvas.getContext("2d");
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

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore cleanup errors from speech recognition.
            }
        }

        stopCamera();

        if (avatarVideoRef.current) {
            avatarVideoRef.current.pause();
            avatarVideoRef.current.removeAttribute("src");
            avatarVideoRef.current.srcObject = null;
            avatarVideoRef.current.load();
        }

        // WebRTC stream cleanup
        if (peerConnectionRef.current) {
            try { peerConnectionRef.current.close(); } catch (e) { }
            peerConnectionRef.current = null;
        }
        if (dataChannelRef.current) {
            try { dataChannelRef.current.close(); } catch (e) { }
            dataChannelRef.current = null;
        }
        streamIdRef.current = null;
        sessionIdRef.current = null;
        remoteStreamRef.current = null;

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

        isCallEndedRef.current = false;
        const text = getInterviewResumeText();
        const levelText = getStorageItem("interviewLevel") || "intermediate";
        
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

        // Initialize D-ID WebRTC Stream session only if selected
        if (avatarType === "d-id") {
            initializeDIdStream();
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
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (isMounted) {
                    videoElementsRef.current.forEach((node) => {
                        if (node && node.isConnected) {
                            node.srcObject = stream;
                            node.play().catch(() => {});
                        }
                    });
                    setVideoActive(true);
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
        const firstMessageBase = `Please start the realistic company interview. You are a hiring manager for ${targetCompanyTxt}. The candidate is applying for the role(s) of: ${roleText}. You will conduct a full-spectrum interview consisting of behavioral questions, experience deep-dives based on my resume, and real-world scenarios, just like a real company interviewer at ${targetCompanyTxt}. Adjust the difficulty of your questions to a strictly ${levelText} level. Note: do not repeatedly welcome the user, just start.`;
        const focusedRetake = getStorageItem("focusedRetakePrompt");
        if (focusedRetake) removeStorageItem("focusedRetakePrompt");
        const firstMessage = focusedRetake
            ? `Please start a focused rematch for ${roleText} at ${targetCompanyTxt} (difficulty: ${levelText}). Briefly welcome me, then ask EXACTLY this practice question first: "${focusedRetake}". After I answer, give concise coach feedback, then continue with 2-3 related follow-ups.`
            : firstMessageBase;
        triggerAiResponse(text || "", [], firstMessage, typeText);

        return () => {
            isMounted = false;
            isCallEndedRef.current = true;
            stopCamera();
            window.speechSynthesis.cancel();
            stopFaceDetection();
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

    const initializeDIdStream = useCallback(async () => {
        try {
            console.log("Initializing D-ID WebRTC Stream...");
            const res = await fetch("/api/d-id-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create" })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to create D-ID stream session: Status ${res.status}`);
            }
            
            const data = await res.json();
            const streamId = data.id || data.streamId;
            const sessionId = data.session_id || data.sessionId;
            const offer = data.offer;
            const iceServers = data.ice_servers;

            if (!streamId || !sessionId) {
                throw new Error("Missing streamId or session_id from D-ID stream initialization.");
            }
            
            streamIdRef.current = streamId;
            sessionIdRef.current = sessionId;
            
            // 1. Create Peer Connection
            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = pc;
            
            // 2. Create Data Channel
            const dc = pc.createDataChannel("JanusAndDID", { ordered: true });
            dataChannelRef.current = dc;

            dc.onopen = () => {
                console.log("D-ID WebRTC Data Channel opened.");
            };

            dc.onmessage = (event) => {
                console.log("D-ID Data Channel Message:", event.data);
                try {
                    let parsed: any = null;
                    if (typeof event.data === "string") {
                        if (event.data.startsWith("{")) {
                            parsed = JSON.parse(event.data);
                        } else {
                            parsed = { event: event.data };
                        }
                    }
                    
                    const eventName = parsed?.event || event.data;
                    if (eventName === "talk/started") {
                        setIsSpeaking(true);
                    } else if (eventName === "talk/completed" || eventName === "talk/ended") {
                        setIsSpeaking(false);
                    }
                } catch (e) {
                    if (event.data && typeof event.data === "string") {
                        if (event.data.includes("talk/started")) {
                            setIsSpeaking(true);
                        } else if (event.data.includes("talk/completed") || event.data.includes("talk/ended")) {
                            setIsSpeaking(false);
                        }
                    }
                }
            };

            // Buffer ICE candidates until SDP answer is sent to D-ID
            let isSdpAnswerSent = false;
            const iceCandidateQueue: RTCIceCandidate[] = [];

            const sendIceCandidate = (candidateObj: RTCIceCandidate) => {
                const { candidate, sdpMid, sdpMLineIndex } = candidateObj;
                fetch("/api/d-id-stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "ice",
                        streamId,
                        sessionId,
                        candidate,
                        sdpMid,
                        sdpMLineIndex
                    })
                }).catch(err => console.warn("Failed to send ICE candidate:", err));
            };

            // 3. Handle onicecandidate
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    if (!isSdpAnswerSent) {
                        iceCandidateQueue.push(event.candidate);
                    } else {
                        sendIceCandidate(event.candidate);
                    }
                }
            };
            
            // 4. Handle ontrack
            pc.ontrack = (event) => {
                console.log("Received remote WebRTC track:", event);
                if (event.streams && event.streams[0]) {
                    const remoteStream = event.streams[0];
                    remoteStreamRef.current = remoteStream;
                    setIsDidAvailable(true);
                    if (avatarVideoRef.current) {
                        avatarVideoRef.current.srcObject = remoteStream;
                        avatarVideoRef.current.muted = false;
                        avatarVideoRef.current.play().catch(e => console.warn("Webrtc video play failed:", e));
                    }
                }
            };
            
            // 5. Set remote description
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // 6. Create local answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // 7. Send SDP answer
            const sdpRes = await fetch("/api/d-id-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sdp",
                    streamId,
                    sessionId,
                    answer
                })
            });
            if (!sdpRes.ok) {
                const errData = await sdpRes.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to send SDP answer: Status ${sdpRes.status}`);
            }

            // Mark SDP answer as sent and flush queued ICE candidates
            isSdpAnswerSent = true;
            while (iceCandidateQueue.length > 0) {
                const queuedCandidate = iceCandidateQueue.shift();
                if (queuedCandidate) {
                    sendIceCandidate(queuedCandidate);
                }
            }
            
            console.log("D-ID WebRTC Stream initialized successfully.");
            setIsDidAvailable(true);
        } catch (err) {
            console.error("D-ID WebRTC initialization failed, falling back:", err);
            setIsDidAvailable(false);
        }
    }, [avatarType]);

    const setAvatarVideoRef = useCallback((el: HTMLVideoElement | null) => {
        (avatarVideoRef as any).current = el;
        if (el) {
            if (remoteStreamRef.current) {
                console.log("Attaching remote stream to video element via callback ref");
                el.srcObject = remoteStreamRef.current;
                el.muted = false;
                el.play().catch(e => console.warn("Webrtc video play failed in callback ref:", e));
            } else if (avatarVideoUrl) {
                console.log("Loading video URL via callback ref:", avatarVideoUrl);
                el.src = avatarVideoUrl;
                el.play().catch(e => console.warn("Video url play failed in callback ref:", e));
            }
        }
    }, [avatarVideoUrl]);

    // Effect to attach/re-attach remote stream to new video element on layout switches
    useEffect(() => {
        const el = avatarVideoRef.current;
        if (isDidAvailable === true && el) {
            if (remoteStreamRef.current) {
                console.log("Attaching remote stream to video element on layout change");
                el.srcObject = remoteStreamRef.current;
                el.muted = false;
                el.play().catch(e => console.warn("Play failed on layout change:", e));
            } else if (avatarVideoUrl) {
                el.src = avatarVideoUrl;
                el.play().catch(e => console.warn("Play failed on layout change:", e));
            }
        }
    }, [interactionMode, isDidAvailable, avatarType, avatarVideoUrl]);

    const handleVoiceAndVideo = (text: string) => {
        if (avatarType === "svg") {
            // SVG Animation mode: speaks via local TTS directly, bypassing D-ID video API
            speakText(text);
        } else if (isDidAvailable === true && streamIdRef.current && sessionIdRef.current) {
            // WebRTC Stream mode: speaks and animates directly via WebRTC
            triggerDidVideo(text);
        } else {
            // Fallback/Standard mode: play local TTS instantly, then load video when D-ID talk is generated
            speakText(text);
            triggerDidVideo(text);
        }
    };

    const triggerDidVideo = (text: string) => {
        if (isDidAvailable === false) return;

        // If WebRTC stream is active, use it
        if (isDidAvailable === true && streamIdRef.current && sessionIdRef.current) {
            setIsAvatarGenerating(true);
            fetch("/api/d-id-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "speak",
                    streamId: streamIdRef.current,
                    sessionId: sessionIdRef.current,
                    text
                })
            })
            .then(async (res) => {
                if (isCallEndedRef.current) return;
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.warn("D-ID Stream speak failed. Falling back to local TTS.", errData);
                    speakText(text);
                } else {
                    console.log("D-ID Stream speak triggered successfully.");
                }
            })
            .catch((err) => {
                console.error("D-ID Stream speak error:", err);
                speakText(text);
            })
            .finally(() => {
                setIsAvatarGenerating(false);
            });
            return;
        }

        // Standard fallback polling
        setIsAvatarGenerating(true);
        fetch("/api/d-id-talk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        })
        .then(async (res) => {
            if (isCallEndedRef.current) return;
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.warn("D-ID generation failed. Falling back to SVG.", errData);
                if (res.status === 400) {
                    setIsDidAvailable(false);
                }
                return;
            }
            const videoData = await res.json();
            if (videoData.result_url) {
                console.log("D-ID video url received:", videoData.result_url);
                setIsDidAvailable(true);
                setAvatarVideoUrl(videoData.result_url);
                
                // Programmatically play video unmuted if speech synthesis is currently active
                setTimeout(() => {
                    const videoEl = avatarVideoRef.current;
                    if (videoEl) {
                        const wasSpeaking = window.speechSynthesis.speaking;
                        if (wasSpeaking) {
                            window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                            videoEl.muted = false;
                        } else {
                            videoEl.muted = true;
                        }
                        videoEl.load();
                        videoEl.play().catch(e => console.warn("Video play failed:", e));
                    }
                }, 100);
            } else {
                setIsDidAvailable(false);
            }
        })
        .catch((err) => {
            console.error("D-ID fetch error:", err);
            setIsDidAvailable(false);
        })
        .finally(() => {
            setIsAvatarGenerating(false);
        });
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
            const res = await fetch("/api/realistic-interviewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume,
                    github,
                    linkedin,
                    portfolioUrl,
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
                } else if (aiMessage.includes("[MODE:DRAW]")) {
                    setInteractionMode("draw");
                    aiMessage = aiMessage.replace("[MODE:DRAW]", "").trim();
                } else if (aiMessage.includes("[MODE:CHAT]")) {
                    setInteractionMode("chat");
                    aiMessage = aiMessage.replace("[MODE:CHAT]", "").trim();
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
                    summary: finalScores.summary || "",
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
        stopInterviewRuntime();
        setIsCallEnded(true);
        isCallEndedRef.current = true;

        setIsEvaluating(true);
        try {
            const isPortfolioScoringEnabled = getStorageItem("portfolioScoringEnabled") === "true";
            const pRatingRaw = isPortfolioScoringEnabled ? (getStorageItem("portfolioRating") || "N/A") : "N/A";
            const pRatingValue = parseInt(pRatingRaw);
            const hasPortfolio = isPortfolioScoringEnabled && !isNaN(pRatingValue);

            const res = await fetch("/api/analyze-interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: messagesRef.current, snapshots: snapshotsRef.current })
            });
            const data = await res.json();
            const tScore = typeof data.technicalRating === "number" ? Math.max(0, Math.min(100, data.technicalRating)) : 0;
            const bScore = typeof data.behavioralRating === "number" ? Math.max(0, Math.min(100, data.behavioralRating)) : 0;
            const cScore = typeof data.communicationRating === "number" ? Math.max(0, Math.min(100, data.communicationRating)) : 0;
            const sessionSummary = data.summary || "";
            const annotatedTranscript = data.annotatedTranscript || "";

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

            setFinalScores({
                interview: iScore,
                technical: tScore,
                behavioral: bScore,
                communication: cScore,
                portfolio: hasPortfolio ? pRatingValue : pRatingRaw,
                final: finalOutput,
                annotatedTranscript,
                summary: sessionSummary
            });

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
                        onClick={() => router.push("/")}
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
                                            {finalScores.summary}
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
                                        __html: marked.parse(finalScores.annotatedTranscript, { gfm: true, breaks: true }) 
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
                                const transcriptContent = finalScores?.annotatedTranscript || messages.map(m => `${m.role === 'user' ? 'YOU' : 'AI'}: ${m.content}`).join('\n\n\n\n');
                                
                                // Configure marked to handle common interview transcript formatting
                                marked.setOptions({
                                    gfm: true,
                                    breaks: true
                                });
                                
                                // Preserve the special 3-line gaps (4 newlines) by converting them to multiple BR tags before parsing
                                const formattedTranscript = transcriptContent.replace(/\n\n\n\n/g, '<br/><br/><br/><br/>');
                                const renderedTranscript = marked.parse(formattedTranscript);
                                const renderedSummary = marked.parse(finalScores?.summary || 'No summary available');

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
                            onClick={() => router.push("/")}
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

            <main className={`flex-grow flex flex-col lg:flex-row p-4 gap-4 relative ${interactionMode !== "chat" ? "max-w-none px-4 lg:px-6" : "max-w-[1600px]"} mx-auto w-full min-h-0 transition-all duration-500`}>
                {interactionMode === "chat" ? (
                    <>
                        {/* ===== LEFT SIDE: Videos + Controls (Default Chat Layout) ===== */}
                        <div className="flex flex-col gap-4 flex-1 min-h-0">
                            {/* Desktop Video Grid */}
                            <div className="hidden lg:grid gap-4 grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
                                {/* AI Video - Animated Human Face */}
                                <div className="relative bg-[#0a0a14] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(79,70,229,0.1)] flex items-center justify-center min-h-[300px]">
                                    <div className="absolute top-3 left-3 inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-xs font-semibold z-10">
                                        ProInterview <Volume2 className={`w-3 h-3 ${isSpeaking ? "text-green-400" : "text-white/40"}`} />
                                    </div>

                                    {/* Segmented Switch for D-ID vs. SVG fallback */}
                                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 p-0.5 rounded-lg text-[9px] font-bold z-30">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchAvatarType("svg")}
                                            className={`px-2 py-0.5 rounded-md transition-all ${avatarType === "svg" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"}`}
                                        >
                                            SVG Avatar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchAvatarType("d-id")}
                                            className={`px-2 py-0.5 rounded-md transition-all ${avatarType === "d-id" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"}`}
                                        >
                                            D-ID Presenter
                                        </button>
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
                                                <div className="mt-8 text-center px-4">
                                                    <h3 className="text-xs font-black tracking-widest uppercase bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Voice Synthesizer</h3>
                                                    <p className="text-white/40 text-[10px] mt-1.5 leading-relaxed max-w-xs">SVG talking head active (API-saver). Click "D-ID Presenter" at the top-right to start video stream.</p>
                                                </div>
                                            </div>
                                         ) : (
                                             <>
                                                {/* D-ID video layer — shown when available */}
                                                {isDidAvailable === true && (avatarVideoUrl || (streamIdRef.current && sessionIdRef.current)) && (
                                                    <video
                                                        ref={setAvatarVideoRef}
                                                        src={avatarVideoUrl || undefined}
                                                        className="object-cover w-full h-full absolute inset-0 z-20"
                                                        playsInline
                                                        autoPlay
                                                        onPlay={() => setIsSpeaking(true)}
                                                        onEnded={() => setIsSpeaking(false)}
                                                    />
                                                )}


                                                {/* Ultra-realistic presenter photo with speaking indicators */}
                                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0f0f24] to-[#0a0a14]">
                                                    {/* Professional presenter photo */}
                                                    <img
                                                        src="https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg"
                                                        alt="ProInterview"
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

                                                    {/* D-ID generating overlay */}
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
                                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg text-[10px] font-semibold z-10">
                                    ProInterview <Volume2 className={`w-2.5 h-2.5 ${isSpeaking ? "text-green-400" : "text-white/40"}`} />
                                </div>

                                <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 p-0.5 rounded-lg text-[8px] font-bold z-30">
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchAvatarType("svg")}
                                        className={`px-1.5 py-0.5 rounded transition-all ${avatarType === "svg" ? "bg-indigo-600 text-white" : "text-white/50"}`}
                                    >
                                        SVG
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchAvatarType("d-id")}
                                        className={`px-1.5 py-0.5 rounded transition-all ${avatarType === "d-id" ? "bg-indigo-600 text-white" : "text-white/50"}`}
                                    >
                                        D-ID
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
                                            {isDidAvailable === true && (avatarVideoUrl || (streamIdRef.current && sessionIdRef.current)) && (
                                                <video
                                                    ref={setAvatarVideoRef}
                                                    src={avatarVideoUrl || undefined}
                                                    className="object-cover w-full h-full absolute inset-0 z-20"
                                                    playsInline
                                                    autoPlay
                                                    onPlay={() => setIsSpeaking(true)}
                                                    onEnded={() => setIsSpeaking(false)}
                                                />
                                            )}
                                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0f0f24] to-[#0a0a14]">
                                                <img
                                                    src="https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg"
                                                    alt="ProInterview"
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
                    <div id="practical-split-container" className="flex-grow flex flex-col lg:flex-row gap-2 relative w-full h-full min-h-0">
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
                                            <span className="font-bold text-sm">Drawing Canvas</span>
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
                                <div className="flex-grow flex flex-col p-4 gap-3 min-h-0">
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

                            {/* Drawing Canvas Panel */}
                            {interactionMode === "draw" && (
                                <div className="flex-grow flex flex-col p-4 gap-3 min-h-0">
                                    <div className="flex-grow bg-white rounded-xl overflow-hidden border border-white/10 relative min-h-0">
                                        <canvas
                                            ref={drawCanvasRef}
                                            width={800}
                                            height={500}
                                            className="w-full h-full bg-white cursor-crosshair"
                                            onMouseDown={(e) => {
                                                setIsDrawing(true);
                                                const ctx = drawCanvasRef.current?.getContext("2d");
                                                if(ctx && drawCanvasRef.current) {
                                                    ctx.strokeStyle = "black";
                                                    ctx.lineWidth = 2;
                                                    ctx.beginPath();
                                                    const rect = drawCanvasRef.current.getBoundingClientRect();
                                                    const scaleX = drawCanvasRef.current.width / rect.width;
                                                    const scaleY = drawCanvasRef.current.height / rect.height;
                                                    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                                                }
                                            }}
                                            onMouseMove={(e) => {
                                                if (!isDrawing) return;
                                                const ctx = drawCanvasRef.current?.getContext("2d");
                                                if(ctx && drawCanvasRef.current) {
                                                    const rect = drawCanvasRef.current.getBoundingClientRect();
                                                    const scaleX = drawCanvasRef.current.width / rect.width;
                                                    const scaleY = drawCanvasRef.current.height / rect.height;
                                                    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                                                    ctx.stroke();
                                                }
                                            }}
                                            onMouseUp={() => setIsDrawing(false)}
                                            onMouseLeave={() => setIsDrawing(false)}
                                        ></canvas>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => {
                                                if(drawCanvasRef.current) {
                                                    const dataUrl = drawCanvasRef.current.toDataURL("image/png");
                                                    handleSendMessage("I have attached my drawing for the circuit/diagram.", dataUrl);
                                                    setInteractionMode("chat");
                                                }
                                            }}
                                            disabled={isLoading}
                                            className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                        >
                                            <Save className="w-4 h-4"/> Submit Drawing
                                        </button>
                                        <button
                                            onClick={() => {
                                                const ctx = drawCanvasRef.current?.getContext("2d");
                                                if(ctx && drawCanvasRef.current) {
                                                    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
                                                }
                                            }}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors cursor-pointer"
                                        >
                                            Clear
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
