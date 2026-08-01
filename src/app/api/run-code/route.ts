import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

type LangKey = "js" | "ts" | "python" | "java" | "cpp" | "go";

const LANG_MAP: Record<
    LangKey,
    { language: string; version: string; filename: string }
> = {
    js: { language: "javascript", version: "18.15.0", filename: "main.js" },
    ts: { language: "typescript", version: "5.0.3", filename: "main.ts" },
    python: { language: "python", version: "3.10.0", filename: "main.py" },
    java: { language: "java", version: "15.0.2", filename: "Main.java" },
    cpp: { language: "c++", version: "10.2.0", filename: "main.cpp" },
    go: { language: "go", version: "1.16.2", filename: "main.go" },
};

function normalizeLanguage(raw: string): LangKey | null {
    const key = (raw || "").trim().toLowerCase();
    if (key === "javascript" || key === "node" || key === "nodejs") return "js";
    if (key === "typescript") return "ts";
    if (key === "py" || key === "python3") return "python";
    if (key === "c++" || key === "cplusplus" || key === "cxx") return "cpp";
    if (key === "golang") return "go";
    if (key in LANG_MAP) return key as LangKey;
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const code = typeof body.code === "string" ? body.code : "";
        const stdin = typeof body.stdin === "string" ? body.stdin : "";
        const langKey = normalizeLanguage(String(body.language || body.lang || ""));

        if (!code.trim()) {
            return NextResponse.json({ error: "code is required" }, { status: 400 });
        }
        if (!langKey) {
            return NextResponse.json(
                { error: "Unsupported language. Use js, ts, python, java, cpp, or go." },
                { status: 400 }
            );
        }

        const meta = LANG_MAP[langKey];
        const pistonRes = await fetch(PISTON_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: meta.language,
                version: meta.version,
                files: [{ name: meta.filename, content: code }],
                stdin,
                args: Array.isArray(body.args) ? body.args : [],
                compile_timeout: 10000,
                run_timeout: 10000,
            }),
        });

        if (!pistonRes.ok) {
            const errText = await pistonRes.text().catch(() => "");
            console.error("Piston error:", pistonRes.status, errText);
            return NextResponse.json(
                { error: "Code execution service unavailable", detail: errText.slice(0, 300) },
                { status: 502 }
            );
        }

        const data = await pistonRes.json();
        const run = data.run || {};
        const compile = data.compile || null;

        const stdout = String(run.stdout || "");
        const stderr = String(run.stderr || (compile?.stderr ? compile.stderr : "") || "");
        const output = String(run.output || stdout || stderr || "");

        return NextResponse.json({
            language: langKey,
            pistonLanguage: meta.language,
            version: data.version || meta.version,
            stdout,
            stderr,
            output,
            code: typeof run.code === "number" ? run.code : null,
            signal: run.signal ?? null,
            compile: compile
                ? {
                      stdout: String(compile.stdout || ""),
                      stderr: String(compile.stderr || ""),
                      code: compile.code ?? null,
                  }
                : null,
        });
    } catch (error: any) {
        console.error("run-code error:", error);
        return NextResponse.json({ error: error.message || "Failed to execute code" }, { status: 500 });
    }
}
