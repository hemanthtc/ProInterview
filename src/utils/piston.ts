const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

export function pistonLangConfig(language: string): { language: string; version: string; filename: string } {
    const lang = language.toLowerCase();
    if (lang === "python") {
        return { language: "python", version: "3.10.0", filename: "main.py" };
    }
    if (lang === "java") {
        return { language: "java", version: "15.0.2", filename: "Main.java" };
    }
    if (lang === "cpp" || lang === "c++") {
        return { language: "c++", version: "10.2.0", filename: "main.cpp" };
    }
    return { language: "javascript", version: "18.15.0", filename: "main.js" };
}

export async function runOnPiston(
    language: string,
    source: string,
    stdin = ""
): Promise<{ ok: boolean; stdout: string; stderr: string; detail?: string }> {
    const cfg = pistonLangConfig(language);
    const pistonRes = await fetch(PISTON_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            language: cfg.language,
            version: cfg.version,
            files: [{ name: cfg.filename, content: source }],
            stdin,
            compile_timeout: 12000,
            run_timeout: 10000,
        }),
    }).catch(() => null);

    if (!pistonRes) {
        return { ok: false, stdout: "", stderr: "", detail: "Code execution service unreachable" };
    }
    if (!pistonRes.ok) {
        const errText = await pistonRes.text().catch(() => "");
        return { ok: false, stdout: "", stderr: "", detail: errText.slice(0, 300) || "Code execution service unavailable" };
    }

    const data = await pistonRes.json();
    return {
        ok: true,
        stdout: String(data?.run?.stdout || data?.run?.output || ""),
        stderr: String(data?.run?.stderr || data?.compile?.stderr || ""),
    };
}
