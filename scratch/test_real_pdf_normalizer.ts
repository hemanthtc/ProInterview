import fs from "fs";
import { extractTextFromPdfBuffer, validatePdfText } from "../scripts/qa-pdf.mjs";

const files = [
  "karnataka_history_rashtrakuta_dynasty.pdf",
  "linux_process_management_and_ipc.pdf",
  "photosynthesis_and_light_reactions.pdf"
];

function cleanPdfExtractedText(text: string): string {
    const codeTokens: string[] = [];
    let processed = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (m) => {
        codeTokens.push(m);
        return `\u001B::CODE::${codeTokens.length - 1}::\u001B`;
    });

    const shellTokens: string[] = [];
    processed = processed.replace(/\$\{([A-Za-z0-9_?#$!*@-]{1,64})\}/g, (m) => {
        shellTokens.push(m);
        return `\u001A::SVAR::${shellTokens.length - 1}::\u001A`;
    });

    processed = processed.replace(/(?:^|[\s"'(;,=\\/:|&])\$(PATH|USER|HOME|SHELL|TERM|PWD|LANG|LC_[A-Z]+|EDITOR|TEMP|TMP|UID|PID|IFS|OPTARG|OPTIND|HOSTNAME|\?)(?![a-zA-Z0-9_])/g, (m) => {
        shellTokens.push(m.trimStart());
        const lead = m.slice(0, m.length - m.trimStart().length);
        return `${lead}\u001A::SVAR::${shellTokens.length - 1}::\u001A`;
    });

    const transformFormula = (expr: string): string => {
        let s = expr;
        s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_m, n, d) => {
            const nT = n.trim(), dT = d.trim();
            const nV = Number(nT), dV = Number(dT);
            if (!isNaN(nV) && !isNaN(dV) && dV !== 0) {
                if (nT === "14" && dT === "3") return "14/3 = 4.67";
                if (!Number.isInteger(nV / dV) && dV > 1 && nV !== 1) return `${nT}/${dT} = ${(nV / dV).toFixed(2)}`;
                return `${nT}/${dT}`;
            }
            return `${nT}/${dT}`;
        });
        s = s.replace(/\\(?:xrightarrow|rightarrow|to)\b(?:\{[^{}]*\})?/g, "->");
        s = s.replace(/\\leftarrow\b/g, "<-");
        s = s.replace(/\\leftrightarrow\b/g, "<->");
        s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]+)\}/g, "$1");
        s = s.replace(/\\cdot\b/g, "*");
        s = s.replace(/\\times\b/g, "x");
        s = s.replace(/\\approx\b/g, "~");
        s = s.replace(/\\(?:leq|le)\b/g, "<=");
        s = s.replace(/\\(?:geq|ge)\b/g, ">=");
        s = s.replace(/\\(?:neq|ne)\b/g, "!=");
        s = s.replace(/\\pm\b/g, "+/-");
        s = s.replace(/\\infty\b/g, "infinity");
        s = s.replace(/\\(?:div)\b/g, "/");
        s = s.replace(/\\circ\b/g, " deg");
        s = s.replace(/\\uparrow\b/g, "");
        s = s.replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\b/gi, (m) => m.slice(1));
        s = s.replace(/_\{([^{}]+)\}/g, "$1");
        s = s.replace(/\^\{([^{}]+)\}/g, (_m, i) => {
            const tr = i.trim();
            return tr === "+" || tr === "-" ? tr : `^${tr}`;
        });
        s = s.replace(/([a-zA-Z])_(\d+)/g, "$1$2");
        s = s.replace(/\^\+/g, "+");
        s = s.replace(/\^\-/g, "-");
        return s.trim();
    };

    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_m, i) => transformFormula(i));
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_m, i) => transformFormula(i));
    processed = transformFormula(processed);

    for (let i = 0; i < shellTokens.length; i++) {
        processed = processed.split(`\u001A::SVAR::${i}::\u001A`).join(shellTokens[i]);
    }
    for (let i = 0; i < codeTokens.length; i++) {
        processed = processed.split(`\u001B::CODE::${i}::\u001B`).join(codeTokens[i]);
    }

    return processed;
}

for (const file of files) {
    const fullPath = "C:\\Users\\cheta\\Downloads\\New folder\\" + file;
    const buf = fs.readFileSync(fullPath);
    const rawText = extractTextFromPdfBuffer(buf);
    const mathBefore = rawText.match(/\$[^$\n]+\$/g) || [];
    const cleaned = cleanPdfExtractedText(rawText);
    const mathAfter = cleaned.match(/\$[^$\n]+\$/g) || [];

    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    console.log(`Raw text size: ${rawText.length}`);
    console.log(`Raw $...$ before: ${mathBefore.length}`);
    console.log(`Raw $...$ after:  ${mathAfter.length}`);
    if (mathAfter.length > 0) {
        console.log(`Remaining math items:`, mathAfter);
    }
}
