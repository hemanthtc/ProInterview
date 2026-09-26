import type { CodingProblem } from "@/data/codingProblems";

export function normalizeStdout(raw: string): string {
    return raw.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

export function buildFunctionHarness(
    problem: CodingProblem,
    language: string,
    code: string,
    tests: { input: string; expected: string }[]
): string | null {
    const lang = language === "js" ? "javascript" : language;
    const invoke = problem.invoke?.[lang === "python" ? "python" : "javascript"];
    if (!invoke || invoke.includes("NotImplementedError")) return null;

    if (lang === "javascript" || lang === "js") {
        const cases = JSON.stringify(tests);
        return `${code}
const __tests = ${cases};
const __results = [];
for (const t of __tests) {
  let out = "";
  let err = null;
  try {
    ${invoke}
  } catch (e) {
    err = String(e && e.message ? e.message : e);
  }
  __results.push({ output: out, error: err, expected: t.expected });
}
console.log(JSON.stringify(__results));
`;
    }

    if (lang === "python") {
        const cases = JSON.stringify(tests);
        return `import json
${code}
__tests = json.loads(${JSON.stringify(cases)})
__results = []
for t in __tests:
    out = ""
    err = None
    try:
        ${invoke}
    except Exception as e:
        err = str(e)
    __results.append({"output": out, "error": err, "expected": t["expected"]})
print(json.dumps(__results))
`;
    }

    return null;
}

export function compareOutputs(actual: string, expected: string): boolean {
    return normalizeStdout(actual) === normalizeStdout(expected);
}
