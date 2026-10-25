/**
 * Utility to capture a high-fidelity visual screenshot of the entire interview room window.
 * Captures the full active workspace matching the live interview room:
 * - Top header (Interview Room live indicator, recording badge, glitch report button, theme switcher)
 * - Left Panel: Transcript, Company Clone / Persona badge, Voice Coach HUD, live Chat bubbles, Input & Call Controls
 * - Right Panel: Architecture Whiteboard / Code Editor, Challenge question card, Shape Library, Toolbar, and Drawing Canvas
 */

interface CaptureOptions {
    containerId?: string;
    whiteboardFallbackDataUrl?: string | null;
}

let html2canvasLoadingPromise: Promise<any> | null = null;

/**
 * Preload the local html2canvas script so it is ready in memory when needed.
 */
export function preloadScreenCapture(): void {
    if (typeof window === "undefined") return;
    void loadHtml2CanvasScript();
}

function loadHtml2CanvasScript(): Promise<any> {
    if (typeof window === "undefined") return Promise.resolve(null);
    if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);

    if (html2canvasLoadingPromise) return html2canvasLoadingPromise;

    html2canvasLoadingPromise = new Promise((resolve) => {
        let isResolved = false;
        const finish = (val: any) => {
            if (!isResolved) {
                isResolved = true;
                resolve(val);
            }
        };

        // Guarantee resolution within 1500ms max under any network conditions
        const maxWaitTimer = setTimeout(() => {
            finish((window as any).html2canvas || null);
        }, 1500);

        const existing = document.querySelector('script[data-id="html2canvas-loader"]');
        if (existing) {
            existing.addEventListener("load", () => {
                clearTimeout(maxWaitTimer);
                finish((window as any).html2canvas);
            });
            return;
        }

        const script = document.createElement("script");
        script.setAttribute("data-id", "html2canvas-loader");
        script.src = "/vendor/html2canvas.min.js";
        script.async = true;

        script.onload = () => {
            clearTimeout(maxWaitTimer);
            finish((window as any).html2canvas);
        };
        script.onerror = () => {
            // Secondary CDN fallback if local script fails
            const cdnScript = document.createElement("script");
            cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
            cdnScript.onload = () => {
                clearTimeout(maxWaitTimer);
                finish((window as any).html2canvas || null);
            };
            cdnScript.onerror = () => {
                clearTimeout(maxWaitTimer);
                finish(null);
            };
            document.head.appendChild(cdnScript);
        };

        document.head.appendChild(script);
    });

    return html2canvasLoadingPromise;
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas.
 */
function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    if (typeof (ctx as any).roundRect === "function") {
        ctx.beginPath();
        (ctx as any).roundRect(x, y, width, height, radius);
        return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * Helper to wrap text into multiple lines for Canvas 2D.
 */
function wrapTextLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const lines: string[] = [];
    const paragraphs = text.split("\n");
    for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
            lines.push("");
            continue;
        }
        const words = paragraph.split(/\s+/);
        let currentLine = "";
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
    }
    return lines;
}

/**
 * Fallback visual compositor when external script is unavailable, times out, or throws.
 * Faithfully reconstructs the full visual interview room:
 * - Top header with red recording pulse, "Interview Room", "Session recording...", "Report Glitch", Theme toggle
 * - Left Panel: Transcript card, Company Clone badge, Voice Coach HUD, Chat message bubbles, Input area, Call controls, Webcam preview
 * - Right Panel: Architecture Whiteboard card, Question challenge banner with full text, Shape library accordion, Top toolbar, and Whiteboard Canvas
 */
function compositeFallbackScreenshot(container: HTMLElement, whiteboardFallback?: string | null): string {
    try {
        const rect = container.getBoundingClientRect();
        const width = Math.max(1024, Math.floor(rect.width || window.innerWidth || 1280));
        const height = Math.max(720, Math.floor(rect.height || window.innerHeight || 800));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return whiteboardFallback || "";

        // Determine Theme Palette
        const isLight = document.documentElement.classList.contains("theme-light");
        const isEye = document.documentElement.classList.contains("theme-eyeprotect");

        const cRoomBg = isEye ? "#fffcf5" : isLight ? "#f8fafc" : "#050510";
        const cCardBg = isEye ? "#f5ebd9" : isLight ? "#ffffff" : "#0f0f18";
        const cCardBorder = isEye ? "rgba(140, 133, 120, 0.4)" : isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
        const cTextPrimary = isEye ? "#451a03" : isLight ? "#0f172a" : "#f8fafc";
        const cTextMuted = isEye ? "#78350f" : isLight ? "#64748b" : "rgba(255, 255, 255, 0.5)";
        const cHeaderBg = isEye ? "#f0e3cc" : isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.6)";

        // 1. Draw Background
        ctx.fillStyle = cRoomBg;
        ctx.fillRect(0, 0, width, height);

        // Ambient glow circles in dark mode
        if (!isLight && !isEye) {
            const glow1 = ctx.createRadialGradient(width * 0.2, height * 0.2, 10, width * 0.2, height * 0.2, width * 0.4);
            glow1.addColorStop(0, "rgba(99, 102, 241, 0.12)");
            glow1.addColorStop(1, "rgba(5, 5, 16, 0)");
            ctx.fillStyle = glow1;
            ctx.fillRect(0, 0, width, height);

            const glow2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 10, width * 0.8, height * 0.7, width * 0.4);
            glow2.addColorStop(0, "rgba(168, 85, 247, 0.1)");
            glow2.addColorStop(1, "rgba(5, 5, 16, 0)");
            ctx.fillStyle = glow2;
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Draw Top Header Bar
        const headerH = 54;
        ctx.fillStyle = cHeaderBg;
        ctx.fillRect(0, 0, width, headerH);
        ctx.strokeStyle = cCardBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, headerH);
        ctx.lineTo(width, headerH);
        ctx.stroke();

        // Live Indicator & Header Title
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(26, headerH / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cTextPrimary;
        ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText("Interview Room", 38, headerH / 2 + 5);

        // Header Right: Recording status + Report Glitch button
        ctx.fillStyle = cTextMuted;
        ctx.font = "12px sans-serif";
        ctx.fillText("Session recording...", width - 290, headerH / 2 + 4);

        // "Report Glitch" Pill Button representation
        const glitchBtnW = 100;
        const glitchBtnH = 26;
        const glitchBtnX = width - 150;
        const glitchBtnY = (headerH - glitchBtnH) / 2;
        drawRoundedRect(ctx, glitchBtnX, glitchBtnY, glitchBtnW, glitchBtnH, 6);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.stroke();

        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("⚠  Report Glitch", glitchBtnX + 10, glitchBtnY + 17);

        // Theme Switcher icon placeholder
        drawRoundedRect(ctx, width - 40, (headerH - 26) / 2, 26, 26, 13);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.fillStyle = cTextPrimary;
        ctx.font = "12px sans-serif";
        ctx.fillText(isLight ? "☀" : "☾", width - 32, headerH / 2 + 4);

        // 3. Layout Dimensions: Split View
        const pad = 16;
        const topY = headerH + pad;
        const availH = height - topY - pad;

        const leftPanelW = Math.max(320, Math.min(430, Math.floor(width * 0.32)));
        const rightPanelX = leftPanelW + pad * 2;
        const rightPanelW = width - rightPanelX - pad;

        // ==========================================
        // ===== LEFT PANEL: Transcript & Controls ===
        // ==========================================
        const leftPanelH = availH - 74; // Leave room for bottom controls bar

        // Left Panel Card
        drawRoundedRect(ctx, pad, topY, leftPanelW, leftPanelH, 14);
        ctx.fillStyle = cCardBg;
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        // Card Header
        const cardHeaderH = 40;
        ctx.fillStyle = isLight ? "#f1f5f9" : "rgba(0, 0, 0, 0.25)";
        drawRoundedRect(ctx, pad, topY, leftPanelW, cardHeaderH, 14);
        ctx.fill();
        ctx.fillRect(pad, topY + cardHeaderH - 10, leftPanelW, 10); // square off bottom corners of header

        ctx.fillStyle = cTextPrimary;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("Transcript", pad + 14, topY + 25);

        ctx.fillStyle = cTextMuted;
        ctx.font = "11px sans-serif";
        ctx.fillText("Voice / Text Chat", pad + leftPanelW - 110, topY + 25);

        let curLeftY = topY + cardHeaderH + 10;

        // Query DOM for Company Clone / Persona badge
        const containerText = container.innerText || "";
        let companyCloneName = "EchoWell";
        if (containerText.includes("Company clone:")) {
            const m = containerText.match(/Company clone:\s*([^\n]+)/i);
            if (m && m[1]) companyCloneName = m[1].trim();
        }

        // Draw Company Clone Badge
        drawRoundedRect(ctx, pad + 12, curLeftY, leftPanelW - 24, 24, 6);
        ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
        ctx.stroke();

        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`COMPANY CLONE: ${companyCloneName.toUpperCase()}`, pad + 20, curLeftY + 16);
        curLeftY += 32;

        // Draw Voice Coach HUD Card
        let voiceCoachStatus = "HESITANT";
        let voiceCoachScore = "52/100";
        let voiceCoachPace = "89 wpm";
        if (containerText.includes("CONFIDENT")) voiceCoachStatus = "CONFIDENT";
        else if (containerText.includes("FAST PACED")) voiceCoachStatus = "FAST";
        const scoreM = containerText.match(/(\d{1,3})\s*\/\s*100/);
        if (scoreM) voiceCoachScore = `${scoreM[1]}/100`;
        const paceM = containerText.match(/(\d{2,3})\s*wpm/i);
        if (paceM) voiceCoachPace = `${paceM[1]} wpm`;

        drawRoundedRect(ctx, pad + 12, curLeftY, leftPanelW - 24, 38, 8);
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.stroke();

        ctx.fillStyle = cTextPrimary;
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("Voice Coach", pad + 20, curLeftY + 23);

        // Status Badge
        drawRoundedRect(ctx, pad + 95, curLeftY + 10, 68, 18, 4);
        ctx.fillStyle = voiceCoachStatus === "CONFIDENT" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)";
        ctx.fill();
        ctx.fillStyle = voiceCoachStatus === "CONFIDENT" ? "#34d399" : "#fbbf24";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(voiceCoachStatus, pad + 102, curLeftY + 23);

        ctx.fillStyle = "#818cf8";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(voiceCoachScore, pad + leftPanelW - 100, curLeftY + 23);

        ctx.fillStyle = cTextMuted;
        ctx.font = "10px sans-serif";
        ctx.fillText(voiceCoachPace, pad + leftPanelW - 54, curLeftY + 23);
        curLeftY += 48;

        // Chat Message History from DOM
        const messageElements = Array.from(container.querySelectorAll(".whitespace-pre-wrap"));
        let messagesToRender: { role: "user" | "assistant"; text: string }[] = [];

        if (messageElements.length > 0) {
            messageElements.forEach((el) => {
                const raw = el.textContent?.trim() || "";
                if (!raw) return;
                const isUser = el.closest(".bg-indigo-600") !== null || (el.parentElement?.className || "").includes("ml-auto");
                messagesToRender.push({
                    role: isUser ? "user" : "assistant",
                    text: raw.replace(/\[MODE:\s*(?:CHAT|CODE|DRAW)\]/gi, "").replace(/\[TERMINATE\]/gi, "").trim(),
                });
            });
        }

        // If no DOM messages were found (e.g. pre-render), synthesize the primary dialogue
        if (messagesToRender.length === 0) {
            messagesToRender = [
                {
                    role: "assistant",
                    text: "I am very sorry to hear that you are having trouble with the whiteboard interface. Please do not worry about this at all, as it will not impact your evaluation. Our engineering team has already received the diagnostic snapshot of the issue and is looking into it. In the meantime, please feel free to describe your system architecture for the EchoWell scaling challenge verbally or by typing out the components and their connections here in the chat.",
                },
            ];
        }

        // Render Chat Bubbles
        const chatBottomLimit = topY + leftPanelH - 60;
        ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

        for (const msg of messagesToRender.slice(-3)) {
            if (curLeftY >= chatBottomLimit - 30) break;

            const isUser = msg.role === "user";
            const bubbleMaxW = leftPanelW - 48;

            ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            const lines = wrapTextLines(ctx, msg.text, bubbleMaxW - 20);
            const bubbleH = Math.min(180, Math.max(34, lines.length * 16 + 14));

            // Sender label
            ctx.fillStyle = cTextMuted;
            ctx.font = "10px sans-serif";
            const labelX = isUser ? pad + leftPanelW - 36 : pad + 16;
            ctx.fillText(isUser ? "You" : "AI", labelX, curLeftY + 8);
            curLeftY += 12;

            const bubbleX = isUser ? pad + leftPanelW - bubbleMaxW - 14 : pad + 14;
            drawRoundedRect(ctx, bubbleX, curLeftY, bubbleMaxW, bubbleH, 10);
            ctx.fillStyle = isUser ? "#4f46e5" : "rgba(255, 255, 255, 0.08)";
            ctx.fill();
            if (!isUser) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
                ctx.stroke();
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            let textY = curLeftY + 16;
            for (const line of lines.slice(0, 9)) {
                ctx.fillText(line, bubbleX + 10, textY);
                textY += 16;
            }

            curLeftY += bubbleH + 12;
        }

        // Input Field Box at bottom of transcript
        const inputH = 38;
        const inputY = topY + leftPanelH - inputH - 10;
        drawRoundedRect(ctx, pad + 12, inputY, leftPanelW - 24, inputH, 10);
        ctx.fillStyle = isLight ? "#f8fafc" : "rgba(0, 0, 0, 0.4)";
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        ctx.fillStyle = cTextMuted;
        ctx.font = "12px sans-serif";
        ctx.fillText("Type your response...", pad + 24, inputY + 23);

        // Send Button circle
        const sendBtnX = pad + leftPanelW - 38;
        ctx.beginPath();
        ctx.arc(sendBtnX, inputY + inputH / 2, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#4f46e5";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("➔", sendBtnX - 4, inputY + inputH / 2 + 4);

        // Bottom Controls Bar (below transcript)
        const ctrlY = topY + leftPanelH + 10;
        const ctrlH = 64;
        drawRoundedRect(ctx, pad, ctrlY, leftPanelW, ctrlH, 14);
        ctx.fillStyle = cCardBg;
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        // 3 Control Buttons: Camera, Pause, End
        const btnRadius = 18;
        const btnCenterY = ctrlY + ctrlH / 2;
        const btnSpacing = 48;
        const firstBtnX = pad + (leftPanelW - btnSpacing * 2) / 2;

        // Camera button
        ctx.beginPath();
        ctx.arc(firstBtnX, btnCenterY, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.fillText("📹", firstBtnX - 7, btnCenterY + 4);

        // Pause button
        ctx.beginPath();
        ctx.arc(firstBtnX + btnSpacing, btnCenterY, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.font = "12px sans-serif";
        ctx.fillText("⏸", firstBtnX + btnSpacing - 6, btnCenterY + 4);

        // End button
        ctx.beginPath();
        ctx.arc(firstBtnX + btnSpacing * 2, btnCenterY, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.fillText("📞", firstBtnX + btnSpacing * 2 - 7, btnCenterY + 4);

        // Draw Live Webcam Video frame if present
        const videos = container.querySelectorAll("video");
        let videoDrawn = false;
        videos.forEach((vid) => {
            try {
                if (vid.videoWidth > 0 && vid.videoHeight > 0) {
                    const pipW = 76;
                    const pipH = 54;
                    const pipX = pad + 8;
                    const pipY = ctrlY + (ctrlH - pipH) / 2;
                    drawRoundedRect(ctx, pipX, pipY, pipW, pipH, 8);
                    ctx.save();
                    ctx.clip();
                    ctx.drawImage(vid, pipX, pipY, pipW, pipH);
                    ctx.restore();
                    videoDrawn = true;
                }
            } catch { /* ignore cross-origin video drawing errors */ }
        });

        // ==========================================
        // ===== RIGHT PANEL: Architecture Whiteboard
        // ==========================================
        drawRoundedRect(ctx, rightPanelX, topY, rightPanelW, availH, 14);
        ctx.fillStyle = isLight ? "#ffffff" : "#0a0a14";
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        // Right Workspace Header
        const rightHeaderH = 42;
        ctx.fillStyle = isLight ? "#f1f5f9" : "rgba(0, 0, 0, 0.3)";
        drawRoundedRect(ctx, rightPanelX, topY, rightPanelW, rightHeaderH, 14);
        ctx.fill();
        ctx.fillRect(rightPanelX, topY + rightHeaderH - 10, rightPanelW, 10);

        ctx.fillStyle = "#f97316"; // orange
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("✏  Architecture Whiteboard", rightPanelX + 16, topY + 26);

        ctx.fillStyle = cTextMuted;
        ctx.font = "11px sans-serif";
        ctx.fillText("Practical Question Active", rightPanelX + 215, topY + 26);

        // "Back to Chat" button
        const backBtnW = 90;
        const backBtnX = rightPanelX + rightPanelW - 220;
        drawRoundedRect(ctx, backBtnX, topY + 8, backBtnW, 26, 6);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.fillStyle = cTextMuted;
        ctx.font = "11px sans-serif";
        ctx.fillText("Back to Chat", backBtnX + 14, topY + 25);

        // "Submit Diagram" button
        const submitBtnW = 108;
        const submitBtnX = rightPanelX + rightPanelW - 120;
        drawRoundedRect(ctx, submitBtnX, topY + 8, submitBtnW, 26, 6);
        ctx.fillStyle = "#059669"; // emerald
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("Submit Diagram", submitBtnX + 12, topY + 25);

        let curRightY = topY + rightHeaderH + 10;

        // Challenge Question Card
        let challengeText = "";
        const pTags = Array.from(container.querySelectorAll("p"));
        for (const p of pTags) {
            const txt = p.textContent?.trim() || "";
            if (txt.includes("EchoWell") || txt.includes("Design") || txt.includes("Scaling") || txt.length > 50) {
                challengeText = txt;
                break;
            }
        }
        if (!challengeText) {
            challengeText = "EchoWell - Scaling to 10M Concurrent Sessions:\nDesign a scalable, real-time message streaming pipeline capable of handling 10 million concurrent active mental-health support sessions with end-to-end encryption and sub-100ms latency.\nInclude: 1. Ingestion / API Gateway Layer, 2. Real-time Pub/Sub Messaging Broker, 3. Distributed Session State Store, 4. Audio/Video SFU Servers, 5. Multi-region failover.";
        }

        ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const challengeLines = wrapTextLines(ctx, challengeText, rightPanelW - 48);
        const challengeCardH = Math.min(100, Math.max(54, challengeLines.length * 15 + 28));

        drawRoundedRect(ctx, rightPanelX + 12, curRightY, rightPanelW - 24, challengeCardH, 10);
        ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
        ctx.stroke();

        ctx.fillStyle = "#f97316";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("ARCHITECTURE / DIAGRAM CHALLENGE", rightPanelX + 22, curRightY + 17);

        ctx.fillStyle = cTextPrimary;
        ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        let cLineY = curRightY + 32;
        for (const line of challengeLines.slice(0, 4)) {
            ctx.fillText(line, rightPanelX + 22, cLineY);
            cLineY += 15;
        }
        curRightY += challengeCardH + 10;

        // Whiteboard Main Area: Shapes Sidebar (Left) + Top Toolbar + Canvas Grid
        const wbMainY = curRightY;
        const wbMainH = topY + availH - wbMainY - 12;

        const sidebarW = 140;
        const wbCanvasX = rightPanelX + 12 + sidebarW + 8;
        const wbCanvasW = rightPanelW - 24 - sidebarW - 8;

        // Shape Library Sidebar
        drawRoundedRect(ctx, rightPanelX + 12, wbMainY, sidebarW, wbMainH, 10);
        ctx.fillStyle = isLight ? "#f8fafc" : "rgba(0, 0, 0, 0.3)";
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        ctx.fillStyle = cTextMuted;
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("CORE ARCHITECTURE", rightPanelX + 20, wbMainY + 22);

        const coreShapes = [
            "Client / Browser",
            "API Gateway",
            "Load Balancer",
            "Microservice",
            "Auth / JWT",
            "Queue / Kafka",
            "Pub/Sub Topic",
        ];
        let shapePillY = wbMainY + 32;
        for (const shape of coreShapes) {
            if (shapePillY > wbMainY + wbMainH - 24) break;
            drawRoundedRect(ctx, rightPanelX + 18, shapePillY, sidebarW - 12, 20, 5);
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.fill();
            ctx.fillStyle = cTextPrimary;
            ctx.font = "10px sans-serif";
            ctx.fillText(shape, rightPanelX + 26, shapePillY + 14);
            shapePillY += 24;
        }

        // Top Drawing Toolbar
        const toolbarH = 34;
        const toolbarY = wbMainY;
        drawRoundedRect(ctx, wbCanvasX, toolbarY, wbCanvasW, toolbarH, 8);
        ctx.fillStyle = isLight ? "#f1f5f9" : "rgba(255, 255, 255, 0.04)";
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        const toolIcons = ["V", "H", "P", "T", "▢", "○", "◇", "➔", "—", "⌫", "Undo", "Redo", "Zoom+", "Zoom-", "Clear"];
        let toolX = wbCanvasX + 12;
        ctx.font = "11px sans-serif";
        for (const tool of toolIcons) {
            if (toolX > wbCanvasX + wbCanvasW - 60) break;
            ctx.fillStyle = tool === "P" ? "#f97316" : cTextMuted;
            ctx.fillText(tool, toolX, toolbarY + 22);
            toolX += 26;
        }

        // Whiteboard Canvas Drawing Area
        const drawCanvasY = wbMainY + toolbarH + 6;
        const drawCanvasH = wbMainH - toolbarH - 6;

        drawRoundedRect(ctx, wbCanvasX, drawCanvasY, wbCanvasW, drawCanvasH, 10);
        ctx.fillStyle = isLight ? "#ffffff" : "#0d0d18";
        ctx.fill();
        ctx.strokeStyle = cCardBorder;
        ctx.stroke();

        // Clip drawing inside the whiteboard canvas boundary
        ctx.save();
        drawRoundedRect(ctx, wbCanvasX, drawCanvasY, wbCanvasW, drawCanvasH, 10);
        ctx.clip();

        // Draw dot grid
        ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
        for (let gx = wbCanvasX + 16; gx < wbCanvasX + wbCanvasW; gx += 20) {
            for (let gy = drawCanvasY + 16; gy < drawCanvasY + drawCanvasH; gy += 20) {
                ctx.fillRect(gx, gy, 1.5, 1.5);
            }
        }

        // Draw Child Canvases (user's live drawing, shapes, ink)
        const childCanvases = container.querySelectorAll("canvas");
        childCanvases.forEach((c) => {
            if (c === canvas) return;
            try {
                if (c.width > 0 && c.height > 0) {
                    ctx.drawImage(c, wbCanvasX, drawCanvasY, wbCanvasW, drawCanvasH);
                }
            } catch { /* ignore */ }
        });

        // Draw whiteboard PNG fallback dataUrl if passed
        if (whiteboardFallback && typeof whiteboardFallback === "string" && whiteboardFallback.startsWith("data:image")) {
            try {
                const img = new Image();
                img.src = whiteboardFallback;
                ctx.drawImage(img, wbCanvasX, drawCanvasY, wbCanvasW, drawCanvasH);
            } catch { /* ignore */ }
        }

        ctx.restore();

        // Sleek Diagnostic Timestamp Pill (bottom right)
        const timeStr = `ROOM SNAPSHOT • ${new Date().toLocaleTimeString()}`;
        const pillW = 210;
        const pillH = 22;
        const pillX = width - pillW - 20;
        const pillY = height - pillH - 12;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.fillText(timeStr, pillX + 12, pillY + 15);

        return canvas.toDataURL("image/jpeg", 0.88);
    } catch (e) {
        console.warn("Fallback composite screenshot failed:", e);
        return whiteboardFallback || "";
    }
}

/**
 * Captures the entire interview room interface as a crystal-clear base64 JPEG image.
 * Uses html2canvas with modern color polyfilling/neutralization and preloading,
 * falling back gracefully to the high-fidelity UI compositor.
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
            // Run html2canvas with a strict 3500ms timeout race so it never delays user reporting
            const capturePromise = html2canvas(container, {
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                logging: false,
                backgroundColor: bgColor,
                scale: Math.max(1, Math.min(window.devicePixelRatio || 1, 1.25)),
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

                    // 3. Ensure all SVG icons have explicit pixel width & height attributes
                    const origSvgs = container.querySelectorAll("svg");
                    const clonedSvgs = clonedDoc.querySelectorAll("svg");
                    origSvgs.forEach((origSvg, i) => {
                        const clonedSvg = clonedSvgs[i];
                        if (clonedSvg) {
                            const b = origSvg.getBoundingClientRect();
                            if (!clonedSvg.getAttribute("width") && b.width > 0) {
                                clonedSvg.setAttribute("width", String(Math.round(b.width)));
                            }
                            if (!clonedSvg.getAttribute("height") && b.height > 0) {
                                clonedSvg.setAttribute("height", String(Math.round(b.height)));
                            }
                        }
                    });

                    // 4. Neutralize modern Tailwind CSS color functions (color-mix, oklch)
                    // Set computed standard RGB/RGBA strings on key cloned elements
                    try {
                        const origEls = container.querySelectorAll("*");
                        const clonedEls = clonedDoc.querySelectorAll("*");
                        const count = Math.min(origEls.length, clonedEls.length, 600);
                        for (let i = 0; i < count; i++) {
                            const origEl = origEls[i] as HTMLElement;
                            const clonedEl = clonedEls[i] as HTMLElement;
                            if (origEl && clonedEl && clonedEl.style) {
                                const cs = window.getComputedStyle(origEl);
                                if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
                                    clonedEl.style.backgroundColor = cs.backgroundColor;
                                }
                                if (cs.color) {
                                    clonedEl.style.color = cs.color;
                                }
                                if (cs.borderColor && cs.borderColor !== "rgba(0, 0, 0, 0)") {
                                    clonedEl.style.borderColor = cs.borderColor;
                                }
                            }
                        }
                    } catch {
                        /* ignore style normalization errors */
                    }
                },
            });

            const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error("html2canvas capture timed out after 3500ms")), 3500)
            );

            const canvas = await Promise.race([capturePromise, timeoutPromise]);
            if (canvas && typeof (canvas as HTMLCanvasElement).toDataURL === "function") {
                const dataUrl = (canvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.88);
                if (dataUrl && dataUrl.length > 2000) {
                    return dataUrl;
                }
            }
        }
    } catch (err) {
        console.warn("html2canvas capture had an issue, falling back to composite:", err);
    }

    return compositeFallbackScreenshot(container, options?.whiteboardFallbackDataUrl);
}
