import { NextRequest, NextResponse } from "next/server";
import { CODING_PROBLEMS, getProblemPublic, progressivePath } from "@/data/codingProblems";
import { buildFunctionHarness, compareOutputs, normalizeStdout } from "@/utils/codingHarness";
import { pickAssessmentProblems, mulberry32 } from "@/utils/pickAssessmentProblems";
import { runOnPiston } from "@/utils/piston";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

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

/** Grade submitted code against tests via sandboxed Piston only (no local eval). */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { problemId, language = "javascript", code, customStdin } = body;
        const mode = body.mode === "run" ? "run" : "submit";
        const rl = rateLimit(`coding-grade:${session.identifier}`, { limit: 40, windowMs: 15 * 60 * 1000 });
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
        if (lang === "java" && problem.ioMode !== "stdio") {
            return NextResponse.json(
                { error: "Java is available for stdin/stdout contest problems. Use JS or Python for function problems." },
                { status: 400 }
            );
        }

        if (mode === "run" && typeof customStdin === "string" && problem.ioMode === "stdio") {
            const run = await runOnPiston(lang, code, customStdin);
            if (!run.ok) {
                return NextResponse.json({ error: run.detail || "Code execution service unavailable" }, { status: 502 });
            }
            return NextResponse.json({
                mode: "run",
                custom: true,
                output: normalizeStdout(run.stdout),
                stderr: run.stderr.slice(0, 400),
            });
        }

        const allTests = [...problem.publicTests, ...problem.hiddenTests];
        const tests = mode === "run" ? problem.publicTests : allTests;

        if (problem.ioMode === "stdio") {
            const results = [];
            for (let i = 0; i < tests.length; i++) {
                const test = tests[i];
                const hidden = mode === "submit" && i >= problem.publicTests.length;
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
            const score = tests.length ? Math.round((passedCount / results.length) * 100) : 0;
            return NextResponse.json({
                mode,
                score,
                passedCount,
                total: results.length,
                results,
                nextId: mode === "submit" && score >= 70 ? problem.nextId : undefined,
                unlockedNext: Boolean(mode === "submit" && problem.nextId && score >= 70),
            });
        }

        const harness = buildFunctionHarness(problem, lang, code, tests);
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

        if (!Array.isArray(parsed) || parsed.length !== tests.length) {
            return NextResponse.json(
                { error: "Incomplete harness results", score: null, detail: run.stderr.slice(0, 400) },
                { status: 502 }
            );
        }

        const results = parsed.map((r, i) => {
            const hidden = mode === "submit" && i >= problem.publicTests.length;
            const passed = !r.error && compareOutputs(String(r.output), String(r.expected));
            return {
                passed,
                input: hidden ? "[hidden]" : tests[i].input,
                expected: hidden ? "[hidden]" : tests[i].expected,
                output: hidden && !passed ? "[hidden failure]" : r.error || r.output,
                hidden,
            };
        });

        const passedCount = results.filter((r) => r.passed).length;
        const score = Math.round((passedCount / results.length) * 100);
        const nextId = mode === "submit" && score >= 70 ? problem.nextId : undefined;

        return NextResponse.json({
            mode,
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
