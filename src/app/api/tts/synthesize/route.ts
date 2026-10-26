import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { sarvamTextToSpeech, getSarvamKey } from "@/utils/sarvam";

interface SynthesizeRequestBody {
    text?: string;
    speed?: number;
}

const STANDALONE_PORT = process.env.TTS_PORT || "8001";
const STANDALONE_BASE = process.env.TTS_SERVER_URL || process.env.PIPER_TTS_URL || `http://127.0.0.1:${STANDALONE_PORT}`;
const STANDALONE_ENDPOINT = `${STANDALONE_BASE}/api/tts/synthesize`;
const STANDALONE_HEALTH = `${STANDALONE_BASE}/api/tts/health`;
const HUMAN_AI_ENDPOINT = "http://127.0.0.1:8000/api/speech/synthesize";

let isSpawningDaemon = false;
let lastSpawnAttempt = 0;

/**
 * Resolves the Python executable path across local dev and production environments.
 */
function resolvePythonPath(): string | null {
    if (process.env.TTS_PYTHON_PATH && fs.existsSync(/*turbopackIgnore: true*/ process.env.TTS_PYTHON_PATH)) {
        return process.env.TTS_PYTHON_PATH;
    }

    const candidates = [
        path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
        path.join(process.cwd(), "venv", "Scripts", "python.exe"),
        path.join(process.cwd(), ".venv", "bin", "python"),
        path.join(process.cwd(), "venv", "bin", "python"),
        path.join(process.cwd(), "..", "realestic avatar", "HumanAI-Lab", "backend", "venv", "Scripts", "python.exe"),
        "C:\\Users\\cheta\\Downloads\\hemanth\\realestic avatar\\HumanAI-Lab\\backend\\venv\\Scripts\\python.exe",
        "python",
        "python3",
    ];

    for (const p of candidates) {
        if (p === "python" || p === "python3") {
            return p;
        }
        if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
            return p;
        }
    }
    return null;
}

/**
 * Resolves the standalone_tts_server.py script location.
 */
function resolveScriptPath(): string | null {
    if (process.env.TTS_SCRIPT_PATH && fs.existsSync(/*turbopackIgnore: true*/ process.env.TTS_SCRIPT_PATH)) {
        return process.env.TTS_SCRIPT_PATH;
    }

    const candidates = [
        path.join(process.cwd(), "server", "tts", "standalone_tts_server.py"),
        path.join(process.cwd(), "..", "realestic avatar", "HumanAI-Lab", "portable_avatar_speech_kit", "backend", "standalone_tts_server.py"),
        "C:\\Users\\cheta\\Downloads\\hemanth\\realestic avatar\\HumanAI-Lab\\portable_avatar_speech_kit\\backend\\standalone_tts_server.py",
    ];

    for (const p of candidates) {
        if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
            return p;
        }
    }
    return null;
}

/**
 * Auto-spawns the standalone Piper TTS microservice if offline.
 */
function ensureTtsDaemonRunning(): boolean {
    const now = Date.now();
    if (isSpawningDaemon || now - lastSpawnAttempt < 12000) return isSpawningDaemon;

    const pythonPath = resolvePythonPath();
    const scriptPath = resolveScriptPath();

    if (pythonPath && scriptPath) {
        isSpawningDaemon = true;
        lastSpawnAttempt = now;
        try {
            const child = spawn(/*turbopackIgnore: true*/ pythonPath, [scriptPath, "--port", STANDALONE_PORT], {
                detached: true,
                stdio: "ignore",
                cwd: path.dirname(scriptPath),
                windowsHide: true,
            });
            child.unref();
            setTimeout(() => {
                isSpawningDaemon = false;
            }, 6000);
            return true;
        } catch (e) {
            console.warn("[TTS API Proxy] Failed to auto-spawn TTS daemon:", e);
            isSpawningDaemon = false;
        }
    }
    return false;
}

/**
 * Polls the TTS server health endpoint until ready or timeout.
 */
async function waitForServerReady(healthUrl: string, maxWaitMs = 2800): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        try {
            const r = await fetch(healthUrl, { signal: AbortSignal.timeout(300) });
            if (r.ok) return true;
        } catch {
            // Keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
}

/**
 * Converts text into phonetically timed visemes for cloud fallbacks.
 */
function generateFallbackVisemes(text: string, durationSec: number): Array<{ viseme: string; time: number; intensity: number }> {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
    const visemes: Array<{ viseme: string; time: number; intensity: number }> = [];
    if (words.length === 0 || durationSec <= 0) return visemes;

    const wordDuration = durationSec / words.length;
    let currentTime = 0;

    for (const word of words) {
        const step = wordDuration / Math.max(word.length, 1);
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const next = word[i + 1] || "";
            let target = "aa";
            let intensity = 0.6;

            if (char === "a" || (char === "a" && next === "r")) {
                target = "aa";
                intensity = 0.7;
            } else if (char === "e" || char === "i") {
                target = "ee";
                intensity = 0.6;
            } else if (char === "o" || char === "u") {
                target = "oo";
                intensity = 0.65;
            } else if (char === "f" || char === "v") {
                target = "fv";
                intensity = 0.5;
            } else if (char === "m" || char === "b" || char === "p") {
                target = "mbp";
                intensity = 0.55;
            } else {
                target = "ch";
                intensity = 0.45;
            }

            visemes.push({
                viseme: target,
                time: Math.round(currentTime * 1000) / 1000,
                intensity,
            });
            currentTime += step;
        }
    }
    return visemes;
}

export async function POST(req: NextRequest) {
    try {
        const body: SynthesizeRequestBody = await req.json().catch(() => ({}));
        const rawText = body.text || "";
        const cleanText = rawText
            .replace(/\[MODE:(?:CHAT|CODE|DRAW)\]/gi, "")
            .replace(/\[TERMINATE\]/gi, "")
            .trim();

        if (!cleanText) {
            return NextResponse.json({ error: "Text cannot be empty" }, { status: 400 });
        }

        const speed = typeof body.speed === "number" ? body.speed : 1.0;

        // 1. Primary dedicated engine: Standalone Piper TTS Microservice
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(STANDALONE_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleanText, speed }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.audio_base64) {
                    return NextResponse.json(data);
                }
            }
        } catch {
            // Port 8001 offline; trigger background auto-spawn and await readiness
            const spawned = ensureTtsDaemonRunning();
            if (spawned) {
                const ready = await waitForServerReady(STANDALONE_HEALTH, 3000);
                if (ready) {
                    try {
                        const retryRes = await fetch(STANDALONE_ENDPOINT, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: cleanText, speed }),
                            signal: AbortSignal.timeout(5000),
                        });
                        if (retryRes.ok) {
                            const data = await retryRes.json();
                            if (data.audio_base64) {
                                return NextResponse.json(data);
                            }
                        }
                    } catch {}
                }
            }
        }

        // 2. Secondary engine: HumanAI Lab full server (port 8000)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res8000 = await fetch(HUMAN_AI_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleanText, speed }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res8000.ok) {
                const data = await res8000.json();
                if (data.audio_base64) {
                    return NextResponse.json(data);
                }
            }
        } catch {
            // Port 8000 not reachable
        }

        // 3. Cloud neural fallback: Sarvam AI TTS (if configured in production/cloud)
        if (getSarvamKey()) {
            try {
                const sarvamRes = await sarvamTextToSpeech(cleanText, "en-IN");
                if (sarvamRes?.audioBase64) {
                    const estimatedDuration = Math.max(1.0, cleanText.split(/\s+/).length * 0.35);
                    const visemes = generateFallbackVisemes(cleanText, estimatedDuration);
                    return NextResponse.json({
                        audio_base64: sarvamRes.audioBase64,
                        sample_rate: 22050,
                        duration_seconds: estimatedDuration,
                        visemes,
                        elapsed_sec: 0.2,
                        engine: "Sarvam Neural TTS",
                    });
                }
            } catch (sarvamErr) {
                console.warn("[TTS API Proxy] Sarvam fallback failed:", sarvamErr);
            }
        }

        // 4. Return graceful response without triggering uncaught 503 exceptions
        return NextResponse.json({
            audio_base64: "",
            visemes: [],
            message: "Neural speech engine starting up or busy. Please ensure the TTS service is running on port 8001.",
            fallback: false,
        });
    } catch (err: unknown) {
        console.error("[TTS API Proxy] Error during speech synthesis routing:", err);
        return NextResponse.json({
            audio_base64: "",
            visemes: [],
            error: err instanceof Error ? err.message : String(err),
            fallback: false,
        });
    }
}

export async function GET() {
    // Health probe and pre-warmer for local TTS engines
    let standaloneOnline = false;
    let primaryOnline = false;

    try {
        const r1 = await fetch(STANDALONE_HEALTH, { signal: AbortSignal.timeout(1500) });
        standaloneOnline = r1.ok;
    } catch {
        ensureTtsDaemonRunning();
    }

    try {
        const r2 = await fetch("http://127.0.0.1:8000/api/health", { signal: AbortSignal.timeout(1000) });
        primaryOnline = r2.ok;
    } catch {}

    // Pre-warm the neural model in RAM if standalone engine is online
    if (standaloneOnline) {
        fetch(STANDALONE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "ready", speed: 1.0 }),
        }).catch(() => {});
    }

    return NextResponse.json({
        standaloneEngine8001: standaloneOnline ? "online" : "offline",
        primaryEngine8000: primaryOnline ? "online" : "offline",
        ready: standaloneOnline || primaryOnline,
        endpoint: STANDALONE_ENDPOINT,
    });
}
