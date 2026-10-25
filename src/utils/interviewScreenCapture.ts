/**
 * Utility to capture a high-fidelity visual screenshot of the entire interview room window.
 * Captures the full active workspace: top header, problem statement, video webcam,
 * voice coach HUD, and the full Design Lab / Whiteboard or Code Editor.
 */

interface CaptureOptions {
    containerId?: string;
    whiteboardFallbackDataUrl?: string | null;
}

let html2canvasLoadingPromise: Promise<any> | null = null;

function loadHtml2CanvasScript(): Promise<any> {
    if (typeof window === "undefined") return Promise.resolve(null);
    if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);

    if (html2canvasLoadingPromise) return html2canvasLoadingPromise;

    html2canvasLoadingPromise = new Promise((resolve) => {
        const existing = document.querySelector('script[data-id="html2canvas-loader"]');
        if (existing) {
            existing.addEventListener("load", () => resolve((window as any).html2canvas));
            setTimeout(() => resolve((window as any).html2canvas || null), 1000);
            return;
        }

        const script = document.createElement("script");
        script.setAttribute("data-id", "html2canvas-loader");
        // Prefer local bundled static script first (0ms latency, no CDN blocking)
        script.src = "/vendor/html2canvas.min.js";
        script.async = true;

        const timeout = setTimeout(() => {
            if ((window as any).html2canvas) {
                resolve((window as any).html2canvas);
            } else {
                // Secondary CDN fallback if local script fails
                const cdnScript = document.createElement("script");
                cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                cdnScript.onload = () => resolve((window as any).html2canvas || null);
                cdnScript.onerror = () => resolve(null);
                document.head.appendChild(cdnScript);
            }
        }, 1500);

        script.onload = () => {
            clearTimeout(timeout);
            resolve((window as any).html2canvas);
        };
        script.onerror = () => {
            clearTimeout(timeout);
            const cdnScript = document.createElement("script");
            cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
            cdnScript.onload = () => resolve((window as any).html2canvas || null);
            cdnScript.onerror = () => resolve(null);
            document.head.appendChild(cdnScript);
        };

        document.head.appendChild(script);
    });

    return html2canvasLoadingPromise;
}

/**
 * Fallback visual compositor when external script is unavailable or blocked.
 * Synthesizes active video elements, nested canvases, SVGs, and text into a complete snapshot.
 */
function compositeFallbackScreenshot(container: HTMLElement, whiteboardFallback?: string | null): string {
    try {
        const rect = container.getBoundingClientRect();
        const width = Math.max(320, Math.floor(rect.width || window.innerWidth));
        const height = Math.max(240, Math.floor(rect.height || window.innerHeight));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return whiteboardFallback || "";

        // Fill background based on current body theme
        const isLight = document.documentElement.classList.contains("theme-light");
        const isEye = document.documentElement.classList.contains("theme-eyeprotect");
        ctx.fillStyle = isEye ? "#fffcf5" : isLight ? "#f8fafc" : "#050510";
        ctx.fillRect(0, 0, width, height);

        // Header bar representation
        ctx.fillStyle = isEye ? "#f5ebd9" : isLight ? "#e2e8f0" : "#0f172a";
        ctx.fillRect(0, 0, width, 56);
        ctx.fillStyle = isEye ? "#451a03" : isLight ? "#0f172a" : "#f8fafc";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("ProInterview Room — Live Diagnostic Snapshot", 20, 34);

        // Draw active video feeds (webcam, avatar)
        const videos = container.querySelectorAll("video");
        videos.forEach((vid) => {
            try {
                if (vid.videoWidth > 0 && vid.videoHeight > 0) {
                    const vRect = vid.getBoundingClientRect();
                    const rx = vRect.left - rect.left;
                    const ry = vRect.top - rect.top;
                    ctx.drawImage(vid, rx, ry, vRect.width, vRect.height);
                }
            } catch { /* ignore cross-origin video drawing errors */ }
        });

        // Draw child canvases (freehand whiteboard drawing canvas, face canvas)
        const childCanvases = container.querySelectorAll("canvas");
        childCanvases.forEach((c) => {
            if (c === canvas) return;
            try {
                const cRect = c.getBoundingClientRect();
                const rx = cRect.left - rect.left;
                const ry = cRect.top - rect.top;
                if (cRect.width > 0 && cRect.height > 0) {
                    ctx.drawImage(c, rx, ry, cRect.width, cRect.height);
                }
            } catch { /* ignore */ }
        });

        // If whiteboard PNG data exists, draw it at the whiteboard bounds
        if (whiteboardFallback && typeof whiteboardFallback === "string") {
            const img = new Image();
            img.src = whiteboardFallback;
            const boardW = Math.floor(width * 0.65);
            const boardH = Math.floor(height * 0.7);
            ctx.drawImage(img, width - boardW - 20, 70, boardW, boardH);
        }

        // Watermark with timestamp
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.fillRect(width - 240, height - 32, 230, 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.fillText(`ROOM SNAPSHOT • ${new Date().toLocaleTimeString()}`, width - 230, height - 16);

        return canvas.toDataURL("image/jpeg", 0.85);
    } catch (e) {
        console.warn("Fallback composite screenshot failed:", e);
        return whiteboardFallback || "";
    }
}

/**
 * Captures the entire interview room interface as a crystal-clear base64 JPEG image.
 */
export async function captureInterviewRoomScreenshot(options?: CaptureOptions): Promise<string> {
    if (typeof window === "undefined") return "";

    const containerId = options?.containerId || "interview-room-container";
    const container = document.getElementById(containerId) || document.body;

    const isLight = document.documentElement.classList.contains("theme-light");
    const isEyeProtect = document.documentElement.classList.contains("theme-eyeprotect");
    const bgColor = isEyeProtect ? "#fdfbf7" : isLight ? "#f8fafc" : "#050510";

    try {
        const html2canvas = await loadHtml2CanvasScript();
        if (html2canvas && typeof html2canvas === "function") {
            const canvas = await html2canvas(container, {
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: bgColor,
                scale: Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5)), // 1.5x resolution for ultra-sharp snapshot
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                ignoreElements: (element: Element) => {
                    return (
                        element.getAttribute("data-modal-ignore") === "true" ||
                        element.classList.contains("report-issue-modal-overlay")
                    );
                },
                onclone: (clonedDoc: Document) => {
                    const clonedContainer = clonedDoc.getElementById(containerId);
                    if (clonedContainer) {
                        clonedContainer.style.overflow = "visible";
                        clonedContainer.style.transform = "none";
                    }

                    // 1. Copy live video frames into cloned video positions using canvas elements
                    const originalVideos = container.querySelectorAll("video");
                    const clonedVideos = clonedDoc.querySelectorAll("video");
                    originalVideos.forEach((origVid, i) => {
                        const clonedVid = clonedVideos[i];
                        if (clonedVid && origVid.videoWidth > 0 && origVid.videoHeight > 0) {
                            try {
                                const vCanvas = clonedDoc.createElement("canvas");
                                vCanvas.width = origVid.videoWidth;
                                vCanvas.height = origVid.videoHeight;
                                vCanvas.className = clonedVid.className;
                                vCanvas.style.cssText = clonedVid.style.cssText;
                                vCanvas.style.width = "100%";
                                vCanvas.style.height = "100%";
                                vCanvas.style.objectFit = "cover";
                                const vCtx = vCanvas.getContext("2d");
                                vCtx?.drawImage(origVid, 0, 0, origVid.videoWidth, origVid.videoHeight);
                                clonedVid.parentNode?.replaceChild(vCanvas, clonedVid);
                            } catch (e) {
                                console.warn("Failed to copy video frame to clone:", e);
                            }
                        }
                    });

                    // 2. Synchronize all active canvas contents (freehand ink, grid, shapes) to cloned canvases
                    const originalCanvases = container.querySelectorAll("canvas");
                    const clonedCanvases = clonedDoc.querySelectorAll("canvas");
                    originalCanvases.forEach((origCanvas, i) => {
                        const clonedCanvas = clonedCanvases[i];
                        if (clonedCanvas && origCanvas.width > 0 && origCanvas.height > 0) {
                            try {
                                clonedCanvas.width = origCanvas.width;
                                clonedCanvas.height = origCanvas.height;
                                const cCtx = clonedCanvas.getContext("2d");
                                cCtx?.drawImage(origCanvas, 0, 0);
                            } catch (e) {
                                console.warn("Failed to synchronize canvas to clone:", e);
                            }
                        }
                    });
                },
            });

            return canvas.toDataURL("image/jpeg", 0.88);
        }
    } catch (err) {
        console.warn("html2canvas capture had an issue, falling back to composite:", err);
    }

    return compositeFallbackScreenshot(container, options?.whiteboardFallbackDataUrl);
}
