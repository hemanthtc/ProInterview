import { NextRequest, NextResponse } from "next/server";
import { CODING_PROBLEMS, getProblemPublic, progressivePath } from "@/data/codingProblems";
import { buildFunctionHarness, compareOutputs, normalizeStdout } from "@/utils/codingHarness";
import { pickAssessmentProblems, mulberry32 } from "@/utils/pickAssessmentProblems";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

async function runOnPiston(
    language: string,
    source: string,
    stdin = ""
): Promise<{ ok: boolean; stdout: string; stderr: string; detail?: string }> {
    const pistonLang = language === "python" ? "python" : "javascript";
    const version = language === "python" ? "3.10.0" : "18.15.0";
    const filename = language === "python" ? "main.py" : "main.js";

    const pistonRes = await fetch(PISTON_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            language: pistonLang,
            version,
            files: [{ name: filename, content: source }],
            stdin,
            compile_timeout: 10000,
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

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const path = searchParams.get("path");
    const mode = searchParams.get("mode");
    if (mode === "assessment") {
        const count = Math.min(4, Math.max(1, Number(searchParams.get("count") || 3)));
        const seedRaw = searchParams.get("seed");
        const rng = seedRaw != null && seedRaw !== "" ? mulberry32(Number(seedRaw) || 1) : Math.random;
        const picked = pickAssessmentProblems(count, rng);
        return NextResponse.json({
            mode: "assessment",
            durationSec: 60 * 60,
            problems: picked.map((p) => getProblemPublic(p.id)),
        });
    }
    if (path === "1") {
        return NextResponse.json({ path: progressivePath(), problems: CODING_PROBLEMS.map((p) => getProblemPublic(p.id)) });
    }
    if (id) {
        const pub = getProblemPublic(id);
        if (!pub) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ problem: pub });
    }
    return NextResponse.json({
        problems: CODING_PROBLEMS.map((p) => getProblemPublic(p.id)),
    });
}

/** Grade submitted code against hidden tests via sandboxed Piston only (no local eval). */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { problemId, language = "javascript", code } = await req.json();
        const rl = rateLimit(`coding-grade:${session.identifier}`, { limit: 30, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const problem = CODING_PROBLEMS.find((p) => p.id === problemId);
        if (!problem) return NextResponse.json({ error: "Unknown problem" }, { status: 404 });
        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "code required" }, { status: 400 });
        }
        if (code.length > 50_000) {
            return NextResponse.json({ error: "Code too large." }, { status: 400 });
        }

        const lang = String(language || "javascript").toLowerCase();
        const allTests = [...problem.publicTests, ...problem.hiddenTests];

        if (problem.ioMode === "stdio") {
            const results = [];
            for (let i = 0; i < allTests.length; i++) {
                const test = allTests[i];
                const hidden = i >= problem.publicTests.length;
                const run = await runOnPiston(lang, code, test.input);
                if (!run.ok) {
                    return NextResponse.json(
                        { error: run.detail || "Code execution service unavailable", score: null },
                        { status: 502 }
                    );
                }
                const output = normalizeStdout(run.stdout);
                const passed = !run.stderr && compareOutputs(run.stdout, test.expected);
                results.push({
                    passed,
                    input: hidden ? "[hidden]" : test.input,
                    expected: hidden ? "[hidden]" : test.expected,
                    output: hidden && !passed ? "[hidden failure]" : run.stderr || output,
                    hidden,
                });
            }
            const passedCount = results.filter((r) => r.passed).length;
            const score = Math.round((passedCount / results.length) * 100);
            return NextResponse.json({
                score,
                passedCount,
                total: results.length,
                results,
                nextId: score >= 70 ? problem.nextId : undefined,
                unlockedNext: Boolean(problem.nextId && score >= 70),
            });
        }

        const harness = buildFunctionHarness(problem, lang, code, allTests);
        if (!harness) {
            return NextResponse.json(
                { error: "This problem/language combo is not supported by the sandboxed grader yet." },
                { status: 400 }
            );
        }

        const run = await runOnPiston(lang, harness);
        if (!run.ok) {
            return NextResponse.json(
                { error: run.detail || "Code execution service unavailable", score: null },
                { status: 502 }
            );
        }

        let parsed: { output: string; error: string | null; expected: string }[] | null = null;
        try {
            const line = run.stdout.trim().split("\n").filter(Boolean).pop() || "[]";
            parsed = JSON.parse(line);
        } catch {
            return NextResponse.json(
                {
                    error: "Harness output could not be parsed",
                    score: null,
                    detail: (run.stderr || run.stdout).slice(0, 400),
                },
                { status: 502 }
            );
        }

        if (!Array.isArray(parsed) || parsed.length !== allTests.length) {
            return NextResponse.json(
                { error: "Incomplete harness results", score: null, detail: run.stderr.slice(0, 400) },
                { status: 502 }
            );
        }

        const results = parsed.map((r, i) => {
            const hidden = i >= problem.publicTests.length;
            const passed = !r.error && compareOutputs(String(r.output), String(r.expected));
            return {
                passed,
                input: hidden ? "[hidden]" : allTests[i].input,
                expected: hidden ? "[hidden]" : allTests[i].expected,
                output: hidden && !passed ? "[hidden failure]" : r.error || r.output,
                hidden,
            };
        });

        const passedCount = results.filter((r) => r.passed).length;
        const score = Math.round((passedCount / results.length) * 100);
        const nextId = score >= 70 ? problem.nextId : undefined;

        return NextResponse.json({
            score,
            passedCount,
            total: results.length,
            results,
            nextId,
            unlockedNext: Boolean(nextId && score >= 70),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
