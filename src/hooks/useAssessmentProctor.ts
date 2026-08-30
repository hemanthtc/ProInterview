"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureJpegDataUrl, estimateFaceFromImageData } from "@/utils/localFacePresence";

export const MAX_INTEGRITY_WARNINGS = 3;

export type ProctorExpression =
    | "neutral"
    | "focused"
    | "smiling"
    | "frowning"
    | "surprised"
    | "looking_away"
    | "no_face";

export interface IntegrityEvent {
    at: number;
    reason: string;
}

export function useAssessmentProctor(active: boolean) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const warningCountRef = useRef(0);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [expression, setExpression] = useState<ProctorExpression>("neutral");
    const [faceVisible, setFaceVisible] = useState(true);
    const [attention, setAttention] = useState<"on_screen" | "away" | "unknown">("unknown");
    const [warningCount, setWarningCount] = useState(0);
    const [lastWarning, setLastWarning] = useState("");
    const [events, setEvents] = useState<IntegrityEvent[]>([]);
    const [terminated, setTerminated] = useState(false);
    const [noFaceStreak, setNoFaceStreak] = useState(0);

    const armedAtRef = useRef(0);

    const addWarning = useCallback((reason: string) => {
        if (!active || terminated) return;
        if (Date.now() - armedAtRef.current < 2000) return;
        warningCountRef.current += 1;
        const count = warningCountRef.current;
        setWarningCount(count);
        setLastWarning(reason);
        setEvents((prev) => [...prev.slice(-19), { at: Date.now(), reason }]);
        if (count >= MAX_INTEGRITY_WARNINGS) {
            setTerminated(true);
        }
    }, [active, terminated]);

    const startCamera = useCallback(async () => {
        setCameraError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
            setCameraReady(true);
            return true;
        } catch {
            setCameraError("Camera access is required to start this timed assessment.");
            setCameraReady(false);
            return false;
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraReady(false);
    }, []);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (!active || terminated) return;
        armedAtRef.current = Date.now();

        const onVisibility = () => {
            if (document.hidden) {
                addWarning("Tab switch detected. Stay on this assessment page.");
            }
        };
        const onBlur = () => {
            addWarning("Window focus lost. Do not leave the assessment window.");
        };
        const onFullscreen = () => {
            if (!document.fullscreenElement) {
                addWarning("Fullscreen exited. Return to fullscreen to continue.");
            }
        };
        const onCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            addWarning("Copy is disabled during the assessment.");
        };
        const onPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            addWarning("Paste is disabled during the assessment.");
        };
        const onContext = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("blur", onBlur);
        document.addEventListener("fullscreenchange", onFullscreen);
        document.addEventListener("copy", onCopy);
        document.addEventListener("paste", onPaste);
        document.addEventListener("contextmenu", onContext);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("blur", onBlur);
            document.removeEventListener("fullscreenchange", onFullscreen);
            document.removeEventListener("copy", onCopy);
            document.removeEventListener("paste", onPaste);
            document.removeEventListener("contextmenu", onContext);
        };
    }, [active, terminated, addWarning]);

    useEffect(() => {
        if (!active || terminated || !cameraReady) return;
        let cancelled = false;
        let geminiTick = 0;

        const tick = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || cancelled) return;
            const ctx = canvas.getContext("2d");
            if (!ctx || !video.videoWidth) return;
            canvas.width = 160;
            canvas.height = 120;
            ctx.drawImage(video, 0, 0, 160, 120);
            const local = estimateFaceFromImageData(ctx.getImageData(0, 0, 160, 120));
            setFaceVisible(local.faceVisible);
            if (!local.faceVisible) {
                setExpression("no_face");
                setNoFaceStreak((n) => {
                    const next = n + 1;
                    if (next >= 3) {
                        addWarning("No face detected. Keep your face visible on camera.");
                        return 0;
                    }
                    return next;
                });
            } else {
                setNoFaceStreak(0);
                setExpression((prev) => (prev === "no_face" ? "focused" : prev));
            }

            geminiTick += 1;
            if (geminiTick % 4 === 0) {
                const image = captureJpegDataUrl(video, canvas);
                if (!image) return;
                try {
                    const res = await fetch("/api/proctor/expression", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ image }),
                    });
                    if (!res.ok) return;
                    const data = (await res.json()) as {
                        expression?: ProctorExpression;
                        faceVisible?: boolean;
                        attention?: "on_screen" | "away" | "unknown";
                        source?: string;
                    };
                    if (data.expression) setExpression(data.expression);
                    if (typeof data.faceVisible === "boolean") setFaceVisible(data.faceVisible);
                    if (data.attention) setAttention(data.attention);
                    if (
                        data.source === "gemini" &&
                        (data.expression === "looking_away" || data.attention === "away")
                    ) {
                        addWarning("Looking away from the screen was detected.");
                    }
                } catch {
                    /* local monitor still runs */
                }
            }
        };

        const id = window.setInterval(() => {
            void tick();
        }, 2500);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [active, terminated, cameraReady, addWarning]);

    const requestFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
            return true;
        } catch {
            return false;
        }
    }, []);

    return {
        videoRef,
        canvasRef,
        cameraReady,
        cameraError,
        expression,
        faceVisible,
        attention,
        warningCount,
        lastWarning,
        events,
        terminated,
        noFaceStreak,
        startCamera,
        stopCamera,
        requestFullscreen,
        addWarning,
        MAX_INTEGRITY_WARNINGS,
    };
}
