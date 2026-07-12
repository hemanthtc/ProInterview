"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Volume2, Loader2, AlertTriangle, ShieldAlert, Pause, Code as CodeIcon, PenTool, MessageSquare, Save, Download, Sun, Moon, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { marked } from "marked";
import { getStorageItem, getInterviewResumeText, setStorageItem, removeStorageItem } from "../../utils/storage";

export default function InterviewRoom() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const [interactionMode, setInteractionMode] = useState<"chat" | "code" | "draw">("chat");
    const [codeContent, setCodeContent] = useState("");

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
            if (!videoRef.current || !canvasRef.current || isCallEnded) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx || video.videoWidth === 0) return;

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

        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }

        setVideoActive(false);
        setIsListening(false);
    }, [stopFaceDetection]);

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

        isCallEndedRef.current = false;
        const text = getInterviewResumeText();
        const levelText = getStorageItem("interviewLevel") || "intermediate";
        
        const savedTheme = localStorage.getItem("globalTheme") as any;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
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

        let isMounted = true;
        const videoNode = videoRef.current;

        // Camera setup
        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn("Camera API not available.");
                    if (isMounted) setVideoActive(false);
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (isMounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setVideoActive(true);
                } else {
                    stream.getTracks().forEach(track => track.stop());
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                let latestTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                   latestTranscript += event.results[i][0].transcript;
                }
                setUserInput(prev => prev + latestTranscript + " ");
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
        const firstMessage = typeText === "technical" 
            ? `Please start the technical interview by welcoming me. You will conduct a highly technical interview focusing strictly on coding, architecture, and logic matching the engineering standards of ${targetCompanyTxt}. I am specifically applying for the role(s) of: ${roleText}. Adjust the technical difficulty and depth of your questions to a strictly ${levelText} level.`
            : `Please start the realistic company interview by welcoming me. You will conduct a full-spectrum interview consisting of behavioral questions, experience deep-dives based on my resume, and real-world scenarios, just like a real company interviewer. I am specifically applying for the role(s) of: ${roleText}. Adjust the difficulty of your questions to a strictly ${levelText} level.`;
        triggerAiResponse(text || "", [], firstMessage, typeText);

        return () => {
            isMounted = false;
            isCallEndedRef.current = true;
            if (videoNode) {
                const stream = videoNode.srcObject as MediaStream;
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }
                videoNode.srcObject = null;
            }
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
            const res = await fetch("/api/interviewer", {
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
                    level
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
                    speakText(cleanMessage);
                    // End call automatically when the AI signals it's time
                    setTimeout(() => endCall(), 3000);
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: aiMessage }]);
                    speakText(aiMessage);
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
        if ("speechSynthesis" in window) {
            if (isListeningRef.current) {
                // Do not speak if the user is already activating the microphone to talk
                return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);

            const setVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.lang === "en-US" && v.name.includes("Google")) || voices[0];
                if (preferredVoice) utterance.voice = preferredVoice;
                utterance.onstart = () => {
                    setIsSpeaking(true);
                };
                utterance.onend = () => {
                    setIsSpeaking(false);
                };
                utterance.rate = 1.05;
                window.speechSynthesis.speak(utterance);
            };

            if (window.speechSynthesis.getVoices().length > 0) {
                setVoice();
            } else {
                window.speechSynthesis.onvoiceschanged = setVoice;
            }
        }
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
        if (videoRef.current && canvasRef.current && videoActive) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth || 640;
                canvasRef.current.height = videoRef.current.videoHeight || 480;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
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
                setUserInput(prev => prev + latestTranscript + " ");
            };
            recognitionRef.current.onend = () => {
                setIsListening(false);
                // Automatic send is removed here so the user has to click "Send" manually
            };
        }
    });

    // Toggle Mic function removed because we replaced it with manual toggle button inside text input!


    const toggleVideo = async () => {
        if (videoActive) {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
                videoRef.current.srcObject = null;
            }
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
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
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
            mode: "technical",
            messages: messagesRef.current,
            resumeText: resumeTextRef.current,
            portfolioRating: getStorageItem("portfolioRating"),
            savedAt: Date.now()
        };
        setStorageItem("pausedInterviewSession", JSON.stringify(sessionToSave));
        // Stop stream
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
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
                transcript: finalTranscriptText
            };
            setStorageItem("interviewSessions", JSON.stringify([newSession, ...oldSessions]));
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
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl text-center">
                    <h2 className="text-3xl font-bold mb-4">Interview Completed</h2>
                    
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
                                    <span className="text-white/70">Technical Interview Score</span>
                                    <span className="font-mono font-medium">{finalScores.interview} / 100</span>
                                </div>
                                <div className="h-px w-full bg-white/10 mb-4"></div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg text-white">
                                        {typeof finalScores.portfolio === 'number' ? 'Weighted Final Rating' : 'Final Interview Rating'}
                                    </span>
                                    <span className="font-bold text-2xl text-indigo-400">{finalScores.final} / 100</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 my-6">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                        <span className="text-xs font-bold text-white/50 block mb-1">Technical</span>
                                        <span className="text-xl font-bold text-white/90">{finalScores.technical}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                        <span className="text-xs font-bold text-white/50 block mb-1">Behavioral</span>
                                        <span className="text-xl font-bold text-white/90">{finalScores.behavioral}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                        <span className="text-xs font-bold text-white/50 block mb-1">Communication</span>
                                        <span className="text-xl font-bold text-white/90">{finalScores.communication}</span>
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

                    <div className="flex gap-4 justify-center">
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
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl font-medium flex items-center gap-2"
                        >
                            <Download className="w-5 h-5" /> Download Report (.doc)
                        </button>
                        <button
                            onClick={() => router.push("/")}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl font-medium"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---- MAIN INTERVIEW UI ----
    return (
        <div className="min-h-screen bg-[#050510] text-white flex flex-col font-sans relative overflow-hidden">
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

            <main className={`flex-1 flex flex-col lg:flex-row p-6 gap-6 relative ${interactionMode !== "chat" ? "max-w-none px-6" : "max-w-7xl"} mx-auto w-full`}>
                {interactionMode === "chat" ? (
                    <>
                        {/* Videos Section */}
                        <div className="flex-1 flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                                {/* AI Video */}
                                <div className="relative bg-[#0a0a14] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(79,70,229,0.1)] flex items-center justify-center min-h-[300px]">
                                    <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold z-10">
                                        ProInterview <Volume2 className={`w-3 h-3 ${isSpeaking ? "text-green-400" : "text-white/40"}`} />
                                    </div>

                                    <div className="relative flex items-center justify-center z-0">
                                        {isSpeaking && (
                                            <motion.div
                                                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                                className="absolute w-48 h-48 bg-indigo-500/30 rounded-full blur-2xl"
                                            />
                                        )}
                                        <div className={`w-28 h-28 z-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-5xl shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all duration-300 ${isSpeaking ? "scale-110 shadow-[0_0_100px_rgba(79,70,229,0.9)] border-4 border-white/20" : "border-2 border-white/10"}`}>
                                            🤖
                                        </div>
                                    </div>
                                </div>

                                {/* User Video */}
                                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/5 shadow-xl min-h-[300px]">
                                    <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold">
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

                            {/* Controls */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-6">
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={toggleVideo}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${videoActive ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 text-red-500"}`}
                                    >
                                        {videoActive ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                                    </button>
                                    <span className="text-[10px] text-white/40 font-medium">Camera</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={pauseCall}
                                        className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500"
                                    >
                                        <Pause className="w-6 h-6" />
                                    </button>
                                    <span className="text-[10px] text-white/40 font-medium">Pause</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={endCall}
                                        className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] text-white"
                                    >
                                        <PhoneOff className="w-6 h-6" />
                                    </button>
                                    <span className="text-[10px] text-white/40 font-medium">End</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat / Transcript Panel */}
                        <div className="lg:w-96 flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden h-[600px] lg:h-auto">
                            <div className="p-4 border-b border-white/10 bg-black/20 font-semibold mb-2 flex items-center justify-between">
                                <span>Transcript</span>
                                <span className="text-xs font-normal text-white/40 flex items-center gap-1.5">
                                    <Mic className="w-3 h-3 text-white/40" /> Voice/Text Chat
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth">
                                {(() => {
                                    const lastAssistantIndex = messages.map(m => m.role).lastIndexOf("assistant");
                                    const displayMessages = lastAssistantIndex >= 0 ? messages.slice(lastAssistantIndex) : messages;
                                    return displayMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                                            <span className="text-xs text-white/40 mb-1 px-1">{msg.role === "user" ? "You" : "AI"}</span>
                                            <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden transition-all duration-300 ${msg.role === "user" ? "bg-indigo-600 rounded-br-none" : "bg-white/10 rounded-bl-none"} ${(msg.role !== 'user' && isSpeaking && idx === displayMessages.length - 1) ? "shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50" : "border border-transparent"}`}>
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
                                        <span className="text-xs text-white/40 mb-1 px-1">AI</span>
                                        <div className="p-4 rounded-xl bg-white/5 rounded-bl-none flex items-center gap-2 text-white/60 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input area */}
                            <div className="p-4 bg-black/20 border-t border-white/10 relative">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                        placeholder="Type your answer or use the microphone..."
                                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={() => {
                                            if (isListening) {
                                                recognitionRef.current?.stop();
                                                setIsListening(false);
                                            } else {
                                                window.speechSynthesis.cancel();
                                                setIsSpeaking(false);
                                                recognitionRef.current?.start();
                                                setIsListening(true);
                                            }
                                        }}
                                        className={`p-2.5 rounded-xl shrink-0 transition-colors ${isListening ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 animate-pulse" : "bg-white/10 hover:bg-white/20"}`}
                                    >
                                        <Mic className={`w-5 h-5 ${isListening ? "text-black" : "text-white"}`} />
                                    </button>
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!userInput.trim() || isLoading}
                                        className="p-2.5 rounded-xl shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                                {isListening && (
                                    <div className="text-xs text-green-400 mt-2 ml-1 animate-pulse flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Listening...</div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div id="practical-split-container" className="flex-1 flex flex-row gap-2 relative w-full h-full min-h-[600px]">
                        {/* ===== LEFT SIDE: Transcript & Controls (Width: practicalPanelRatio%) ===== */}
                        <div style={{ width: `${practicalPanelRatio}%` }} className="flex flex-col gap-3 h-full shrink-0 min-w-[200px]">
                            {/* Chat / Transcript Panel (Compact) */}
                            <div className="flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden flex-1 min-h-0">
                                <div className="p-3 border-b border-white/10 bg-black/20 font-semibold flex items-center justify-between shrink-0">
                                    <span className="text-sm">Transcript</span>
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
                                <div className="p-3 bg-black/20 border-t border-white/10 relative shrink-0">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                                        />
                                        <button
                                            onClick={() => {
                                                if (isListening) {
                                                    recognitionRef.current?.stop();
                                                    setIsListening(false);
                                                } else {
                                                    window.speechSynthesis.cancel();
                                                    setIsSpeaking(false);
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
                                        <div className="text-xs text-green-400 mt-1.5 ml-1 animate-pulse flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Listening...</div>
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
                            className="w-1.5 hover:w-2 bg-white/10 hover:bg-indigo-500/50 cursor-col-resize transition-all h-auto self-stretch rounded-full mx-1 z-30 flex items-center justify-center group shrink-0"
                            title="Drag to resize panels"
                        >
                            <div className="w-1 h-8 rounded-full bg-white/20 group-hover:bg-white/50" />
                        </div>

                        {/* ===== RIGHT SIDE: Workspace Panel (Code / Canvas) (Flex-1) ===== */}
                        <div className="flex-1 flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-w-0 h-full relative">
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
                                <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
                                    <textarea
                                        value={codeContent}
                                        onChange={(e) => setCodeContent(e.target.value)}
                                        placeholder="Write your code solution here..."
                                        className="flex-1 min-h-0 bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed text-white"
                                        spellCheck={false}
                                    />
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => {
                                                const codeMsg = `Here is my code:\n\`\`\`\n${codeContent}\n\`\`\``;
                                                handleSendMessage(codeMsg);
                                                setCodeContent("");
                                                setInteractionMode("chat");
                                            }}
                                            disabled={!codeContent.trim() || isLoading}
                                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                        >
                                            <Save className="w-4 h-4"/> Submit Code
                                        </button>
                                        <button
                                            onClick={() => setCodeContent("")}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Drawing Canvas Panel */}
                            {interactionMode === "draw" && (
                                <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
                                    <div className="flex-1 bg-white rounded-xl overflow-hidden border border-white/10 relative min-h-0">
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
                )}      </main>
        </div>
    );
}
