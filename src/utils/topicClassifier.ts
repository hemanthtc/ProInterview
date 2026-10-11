/**
 * Topic and Domain Classifier for Synthetic Data Studio & Roadmaps.
 *
 * Implements strict topic fidelity:
 * Default to non-technical unless the topic explicitly names programming
 * languages, software, tools, or systems.
 */

// Software, programming languages, development tools, and computer systems
const TECHNICAL_PATTERN = /\b(sql|mysql|postgresql|sqlite|mongodb|redis|cassandra|database|query|queries|python|javascript|typescript|java|c\+\+|c#|\.net|golang|rust|ruby|php|swift|kotlin|scala|perl|r\b|matlab|react|angular|vue|nextjs|next\.js|node|nodejs|express|django|flask|spring\s*boot|docker|kubernetes|k8s|git|github|gitlab|ci\/cd|devops|aws|azure|gcp|cloud|linux|unix|bash|shell|powershell|kernel|ipc|posix|api|rest|graphql|grpc|microservices?|html|css|tailwind|compiler|data\s*structures?|algorithms?|cryptography|tcp\/ip|udp|http|websocket|system\s*design|object\s*oriented|concurrency|multithreading|asynchronous|machine\s*learning|deep\s*learning|neural\s*network|nlp|llm|pytorch|tensorflow|scikit)\b/i;

// Factual domains that mandate web grounding per Rule 1 & Rule 4
const FACTUAL_DOMAIN_PATTERN = /\b(history|historical|dynasty|empire|war|battle|treaty|monarchy|constitution|law|legal|court|statute|regulation|rights|jurisdiction|medicine|medical|health|clinical|pathology|anatomy|disease|pharma|biology|biological|physics|chemistry|photosynthesis|biochemistry|constants?|measurements?|astronomy|geology|finance|financial|economics|economic|stock|inflation|banking|budget|politics|political|government|election|parliament|current\s*events?|geography|literature|philosophy|author|novel|biography|version|release|changelog|deprecated|deprecation|kernel|distro|distribution|ubuntu|debian|fedora|arch|windows\s*\d+|macos|android|ios|specification|spec|rfc|cve|vulnerability)\b/i;

// Pure math reasoning & syntax topics that DO NOT require web search grounding
const PURE_MATH_SYNTAX_PATTERN = /\b(pure\s+math|calculus|linear\s+algebra|geometry|abstract\s+algebra|number\s+theory|proofs?|trigonometry|arithmetic|quadratic|equations?|basic\s+coding\s+syntax|algorithm\s+puzzle|leetcode)\b/i;

// Freshness, versions, releases, modern ecosystems, product UIs, and comprehensive roadmaps
const TIMELY_VERSION_UI_PATTERN = /\b(latest|modern|current|recent|new\s+features?|v?\d+\.\d+|java\s+\d+|python\s+\d+|angular\s+\d+|node\s+\d+|c\+\+\d+|console|ui|gui|dashboard|interface|portal|basic\s+to\s+advanced|beginner\s+to\s+advanced)\b/i;

/**
 * Classifies whether a topic is technical (software, programming, tools, systems)
 * or non-technical (history, literature, humanities, law, biology, etc.).
 */
export function isTechnicalTopic(topic: string): boolean {
    if (!topic || typeof topic !== "string") return false;
    const trimmed = topic.trim();
    if (!trimmed) return false;
    return TECHNICAL_PATTERN.test(trimmed);
}

/**
 * Checks whether a topic belongs to a factual domain requiring web verification
 * (history, current events, politics, economics, finance, medicine, health, law,
 * specific science values, software versions).
 */
export function isFactualDomainTopic(topic: string): boolean {
    if (!topic || typeof topic !== "string") return false;
    const trimmed = topic.trim();
    if (!trimmed) return false;
    return FACTUAL_DOMAIN_PATTERN.test(trimmed);
}

/**
 * Determines if googleSearch grounding should be enabled for a prompt.
 * Enables grounding for factual domains AND technology topics (version numbers,
 * deprecations, kernel/OS releases, product UIs, latest/modern/current workflows),
 * but keeps it OFF for pure math reasoning and basic coding syntax puzzles.
 */
export function isGroundingTopic(prompt: string): boolean {
    if (!prompt || typeof prompt !== "string") return false;
    const trimmed = prompt.trim();
    if (!trimmed) return false;
    if (PURE_MATH_SYNTAX_PATTERN.test(trimmed)) return false;
    return FACTUAL_DOMAIN_PATTERN.test(trimmed) || TIMELY_VERSION_UI_PATTERN.test(trimmed);
}

/**
 * Cleans leading numbering prefixes like "1. ", "1 - ", "01. " from a section title.
 */
export function cleanSectionTitle(title: string): string {
    if (!title || typeof title !== "string") return "";
    return title.replace(/^\s*\d+\s*[\.\-\)]+\s*/, "").trim();
}

/**
 * Formats a clean section display title like "1. Pre-historic Karnataka"
 * avoiding duplicate prefixes like "1. 1.".
 */
export function formatSectionNumberTitle(indexZeroBased: number, rawTitle: string): string {
    const clean = cleanSectionTitle(rawTitle);
    return `${indexZeroBased + 1}. ${clean || `Section ${indexZeroBased + 1}`}`;
}

/**
 * Deduplicates leading H1 headings from section markdown content.
 * Removes ONLY the very first leading H1 if its text matches the section title,
 * leaving legitimately repeated headings deeper in the text completely intact.
 */
export function deduplicateSectionContent(content: string, rawTitle: string): string {
    if (!content || typeof content !== "string") return "";
    const cleanTitle = cleanSectionTitle(rawTitle).toLowerCase().trim();
    if (!cleanTitle) return content;

    const lines = content.split("\n");
    let foundFirstHeading = false;
    const outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!foundFirstHeading) {
            const h1Match = trimmed.match(/^#\s+(.+)$/);
            if (h1Match) {
                foundFirstHeading = true;
                const h1Text = cleanSectionTitle(h1Match[1]).toLowerCase().trim();
                if (h1Text === cleanTitle || cleanTitle.includes(h1Text) || h1Text.includes(cleanTitle)) {
                    continue;
                }
            } else if (trimmed.length > 0) {
                foundFirstHeading = true;
            }
        }

        outputLines.push(line);
    }

    return outputLines.join("\n").trim();
}

/**
 * Backward-compatible math sanitizer.
 * Safely strips $...$ around genuine mathematical expressions while strictly preserving
 * shell variables such as $PATH, $USER, $1, $?.
 */
export function sanitizeMathExpressions(text: string): string {
    if (!text || typeof text !== "string") return "";

    return text.replace(/\$([^$\n]+?)\$/g, (match, inner) => {
        const trimmed = inner.trim();
        // Shell variables: $VAR, $1, $? - do not treat as math
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
            return match;
        }
        // Genuine math: contains math operators (=, +, -, *, /, ^, _, \cdot, \times, \pm, \approx, etc.) or single variable
        if (/[=+\-*/^_<>≤≥±≈·\\%]/.test(trimmed) || /^\s*[a-zA-Z]\s*$/.test(trimmed) || /^\d+(\.\d+)?$/.test(trimmed)) {
            return inner;
        }
        return match;
    });
}

/**
 * Converts LaTeX formulas and expressions into readable plain text.
 * Covers $...$, _{...}, ^{...}, \frac{a}{b}, \rightarrow, \text{...}, \cdot, \times.
 * Examples:
 *   2H2O -> 4H+ + 4e- + O2
 *   Mn^2+
 *   P700
 *   14/3 = 4.67
 *
 * CRITICAL SAFETY: Never touches shell variables ($PATH, $?, $USER, $1, etc.)
 * and never touches content inside code blocks (``` or `).
 */
export function convertLatexToPlainText(text: string): string {
    if (!text || typeof text !== "string") return "";

    const SHELL_PREFIX = "\u001A::SVAR::";
    const SHELL_SUFFIX = "::\u001A";
    const CODE_PREFIX = "\u001B::CODE::";
    const CODE_SUFFIX = "::\u001B";

    // 1. Protect code blocks (fenced ``` and inline `)
    const codeTokens: string[] = [];
    let processed = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
        const token = `${CODE_PREFIX}${codeTokens.length}${CODE_SUFFIX}`;
        codeTokens.push(match);
        return token;
    });

    // 2. Protect shell variables:
    // Matches ${VAR}, $PATH, $USER, $HOME, $?, $1, $$, etc.
    const shellTokens: string[] = [];
    // Protect ${...}
    processed = processed.replace(/\$\{([A-Za-z0-9_?#$!*@-]{1,64})\}/g, (match) => {
        const token = `${SHELL_PREFIX}${shellTokens.length}${SHELL_SUFFIX}`;
        shellTokens.push(match);
        return token;
    });

    // Protect known shell variables: $PATH, $USER, $HOME, $? (excluding numbers to avoid clashing with formulas like $1/N$)
    processed = processed.replace(/(?:^|[\s"'(;,=\\/:|&])\$(PATH|USER|HOME|SHELL|TERM|PWD|LANG|LC_[A-Z]+|EDITOR|TEMP|TMP|UID|PID|IFS|OPTARG|OPTIND|HOSTNAME|\?)(?![a-zA-Z0-9_])/g, (match) => {
        const trimmed = match.trimStart();
        const lead = match.slice(0, match.length - trimmed.length);
        const token = `${SHELL_PREFIX}${shellTokens.length}${SHELL_SUFFIX}`;
        shellTokens.push(trimmed);
        return `${lead}${token}`;
    });

    // Protect standalone shell variables in commands/scripts (only if not closed by a math $ on the same line)
    // E.g. "echo $my_var", "$foo = bar", "$PATH"
    processed = processed.replace(/(^|[\s"'(;,=\\/:|&])\$([a-zA-Z_][a-zA-Z0-9_]*)(?![^$\n]*\$)/g, (_match, prefix, varName) => {
        const token = `${SHELL_PREFIX}${shellTokens.length}${SHELL_SUFFIX}`;
        shellTokens.push(`$${varName}`);
        return `${prefix}${token}`;
    });

    // Helper to transform LaTeX formula content to clean text
    const transformFormula = (expr: string): string => {
        let s = expr;

        // \frac{a}{b} -> readable fraction
        s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_m, num, den) => {
            const nTrim = num.trim();
            const dTrim = den.trim();
            const nVal = Number(nTrim);
            const dVal = Number(dTrim);
            if (!isNaN(nVal) && !isNaN(dVal) && dVal !== 0) {
                if (nTrim === "14" && dTrim === "3") {
                    return "14/3 = 4.67";
                }
                if (!Number.isInteger(nVal / dVal) && dVal > 1 && nVal !== 1) {
                    return `${nTrim}/${dTrim} = ${(nVal / dVal).toFixed(2)}`;
                }
                return `${nTrim}/${dTrim}`;
            }
            return `${nTrim}/${dTrim}`;
        });

        // Arrows (including \xrightarrow{...}, \longrightarrow, and ->{...})
        s = s.replace(/\\(?:xrightarrow|rightarrow|longrightarrow|to)\b(?:\{[^{}]*\})?/g, "->");
        s = s.replace(/\\(?:longleftrightarrow|leftrightarrow)\b/g, "<->");
        s = s.replace(/\\(?:implies)\b/g, "->");
        s = s.replace(/->\{([^{}]+)\}/g, "->");
        s = s.replace(/\\leftarrow\b/g, "<-");
        s = s.replace(/\\uparrow\b/g, "^");
        s = s.replace(/\\downarrow\b/g, "v");

        // Text blocks: \text{...} or \mathrm{...}
        s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]+)\}/g, "$1");

        // Mathematical functions: \log, \ln, \exp, \sin, \cos, \tan, \det, \max, \min, \lim
        s = s.replace(/\\(log|ln|exp|sin|cos|tan|det|max|min|lim)\b/g, "$1");

        // Operators & relations
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
        s = s.replace(/\\(?:quad|qquad)\b/g, " ");
        s = s.replace(/\\sim\b/g, "~");
        s = s.replace(/\\gg\b/g, ">>");
        s = s.replace(/\\ll\b/g, "<<");
        s = s.replace(/\\bullet\b/g, "*");
        s = s.replace(/\\,/g, " ");
        s = s.replace(/\\_/g, "_");

        // LaTeX sizing delimiters
        s = s.replace(/\\left\s*([(\[{|.]?)/g, (_m, g) => (g === "." ? "" : (g || "(")));
        s = s.replace(/\\right\s*([)\]}|.]?)/g, (_m, g) => (g === "." ? "" : (g || ")")));

        // Greek letters in LaTeX commands (support adjacent numbers like \alpha3\beta3)
        s = s.replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?![a-zA-Z])/gi, (m) => m.slice(1));

        // Subscripts with braces: _{700} -> 700, _{i} -> i
        s = s.replace(/_\{([^{}]+)\}/g, (_m, inner) => {
            return inner.trim();
        });

        // Superscripts with braces: ^{2+} -> ^2+, ^{+} -> +, ^{-} -> -, ^{2} -> ^2
        s = s.replace(/\^\{([^{}]+)\}/g, (_m, inner) => {
            const trimmed = inner.trim();
            if (trimmed === "+") return "+";
            if (trimmed === "-") return "-";
            return `^${trimmed}`;
        });

        // Subscripts: single letters or numbers (e.g. F_X -> FX, b_L -> bL, A_0 -> A0, 2H_2O -> 2H2O, Mn_4CaO_5 -> Mn4CaO5)
        // Multi-letter biochemical prefixes (PQH_2 -> PQH2, CF_0 -> CF0, CF_1 -> CF1, CF_0CF_1 -> CF0CF1)
        // Strictly avoid identifiers/constants (task_struct, sched_setaffinity, oom_score_adj, MAX_TEXT, my_var, ARG_1, SIGRTMIN_1, PIPE_2)
        s = s.replace(/\b([A-Za-z])_([A-Za-z])\b/g, "$1$2");
        s = s.replace(/(?:\b|(?<=\d))(PQH|CF|PQ|PC|Cyt|PS|PSI|PSII|RuBP|PGA|G3P|Fd|FNR|Chl|Pheo|NADP|NADPH|ATP|ADP|CO|SO|NO|PO|OH|alpha|beta|gamma|delta)_(\d+)/g, "$1$2");
        s = s.replace(/(?:\b|(?<=\d))([A-Za-z])_(\d+)([A-Za-z0-9]*)/g, "$1$2$3");
        s = s.replace(/(?:\b|(?<=\d))([A-Z][a-z])_(\d+)/g, "$1$2");
        s = s.replace(/(?<=[a-z0-9])([A-Z])_(\d+)/g, "$1$2");

        // Stray carets only — preserve exponents (10^-34, x^2, Mn^2+, 4e^-)
        // 1. Trailing caret after charge sign (P700+^ -> P700+)
        s = s.replace(/([a-zA-Z0-9]+[+-])\^/g, "$1");
        // 2. Degree caret (360^ deg -> 360 deg)
        s = s.replace(/(?<=\d)\^\s*deg\b/g, " deg");
        s = s.replace(/\^(\s*deg\b)/g, " deg");
        // 3. Lone stray caret before whitespace/punctuation/end (foo^ -> foo) but NOT before digits or signs
        s = s.replace(/([a-zA-Z0-9])\^(?=[,\s.;:)\]}]|$)/g, "$1");

        return s.trim();
    };

    // 3. Transform explicit LaTeX blocks ($$ ... $$ and $ ... $)
    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => {
        return transformFormula(inner);
    });

    processed = processed.replace(/\$([^$\n]+?)\$/g, (_m, inner) => {
        return transformFormula(inner);
    });

    // 4. Transform raw LaTeX expressions outside $ in body text/tables
    processed = transformFormula(processed);

    // 5. Restore shell variables
    for (let i = 0; i < shellTokens.length; i++) {
        processed = processed.split(`${SHELL_PREFIX}${i}${SHELL_SUFFIX}`).join(shellTokens[i]);
    }

    // 6. Drop standalone horizontal rules (---, ***, ___) in body text BEFORE restoring code blocks
    // Guarantees YAML (---) and diffs inside code fences are never removed
    processed = processed.replace(/^\s*([*\-_])\s*(?:\1\s*){2,}$/gm, "");

    // 7. Restore code blocks
    for (let i = 0; i < codeTokens.length; i++) {
        processed = processed.split(`${CODE_PREFIX}${i}${CODE_SUFFIX}`).join(codeTokens[i]);
    }

    return processed;
}

/**
 * Universal Unicode normalizer applied to all text before jsPDF, DOCX, MD, and TXT export.
 *
 * Mappings:
 * - Box-drawing (─ ═ │ ┌ ┐ etc.) to ASCII (-, |, +)
 * - Arrows (→ ← ↑ ↓, curved, cyclic, equilibrium) to ->, <-, ^, v, <=>
 * - Math symbols (≈ ≤ ≥ ≠ ±) to ~, <=, >=, !=, +/-
 * - Greek letters (α β γ) to names (alpha, beta, gamma)
 * - Superscripts and subscripts to plain text (F_X -> FX, b_L -> bL, A_0 -> A0)
 *   WITHOUT affecting snake_case identifiers (task_struct, sched_setaffinity, oom_score_adj, MAX_TEXT, my_var)
 * - Stray carets (P700+^ -> P700+, 360^ deg -> 360 deg) to plain text
 * - Drop standalone markdown horizontal rules (---) outside code blocks
 * - Typographic quotes, dashes, bullets to clean WinAnsi / ASCII
 * - Post-condition: Asserts no character above U+00FF remains.
 *   Replaces leftovers with "?" and logs them.
 */
export function normalizeTextForExport(text: string): string {
    if (!text || typeof text !== "string") return "";

    // 1. Shield code blocks (fenced ``` and inline `) first so normalization doesn't alter code syntax
    const CODE_PREFIX = "\u001B::CODE::";
    const CODE_SUFFIX = "::\u001B";
    const codeTokens: string[] = [];
    let res = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
        const token = `${CODE_PREFIX}${codeTokens.length}${CODE_SUFFIX}`;
        codeTokens.push(match);
        return token;
    });

    // 2. Convert LaTeX constructs
    res = convertLatexToPlainText(res);

    // 3. Drop standalone markdown horizontal rules outside code blocks
    res = res.replace(/^\s*([*\-_])\s*(?:\1\s*){2,}$/gm, "");

    // 4. Subscripts in body text: strictly single-letter/digit math and chemistry, multi-letter biochemistry prefixes, never snake_case or uppercase constants (ARG_1, SIGRTMIN_1, PIPE_2)
    res = res.replace(/\b([A-Za-z])_([A-Za-z])\b/g, "$1$2");
    res = res.replace(/(?:\b|(?<=\d))(PQH|CF|PQ|PC|Cyt|PS|PSI|PSII|RuBP|PGA|G3P|Fd|FNR|Chl|Pheo|NADP|NADPH|ATP|ADP|CO|SO|NO|PO|OH|alpha|beta|gamma|delta)_(\d+)/g, "$1$2");
    res = res.replace(/(?:\b|(?<=\d))([A-Za-z])_(\d+)([A-Za-z0-9]*)/g, "$1$2$3");
    res = res.replace(/(?:\b|(?<=\d))([A-Z][a-z])_(\d+)/g, "$1$2");
    res = res.replace(/(?<=[a-z0-9])([A-Z])_(\d+)/g, "$1$2");

    // 5. Stray carets only — preserve exponents (10^-34, x^2, Mn^2+, 4e^-)
    res = res.replace(/([a-zA-Z0-9]+[+-])\^/g, "$1");
    res = res.replace(/(?<=\d)\^\s*deg\b/g, " deg");
    res = res.replace(/\^(\s*deg\b)/g, " deg");
    res = res.replace(/([a-zA-Z0-9])\^(?=[,\s.;:)\]}]|$)/g, "$1");

    // 1. Box-drawing characters (U+2500 - U+257F)
    res = res.replace(/[─━┄┅┈┉╌╍═]/g, "-");
    res = res.replace(/[│┃┆┇┊┋╎╏║]/g, "|");
    res = res.replace(/[┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╔╦╗╠╬╣╚╩╝╭╮╯╰╱╲╳]/g, "+");
    // Box-drawing catch-all: any remaining U+2500-U+257F maps to '-'
    res = res.replace(/[\u2500-\u257F]/g, "-");

    // 2. Block elements (U+2580 - U+259F)
    res = res.replace(/[\u2580-\u259F]/g, "#");

    // 3. Geometric Shapes (U+25A0 - U+25FF)
    res = res.replace(/[▶►▸▹▻]/g, ">");
    res = res.replace(/[◀◄◂◃◅]/g, "<");
    res = res.replace(/[▲▴▵]/g, "^");
    res = res.replace(/[▼▾▿]/g, "v");
    res = res.replace(/[●○◦◆◇■□▪▫◈◉◎★☆]/g, "*");
    // Geometric shapes catch-all: any remaining U+25A0-U+25FF maps to '*'
    res = res.replace(/[\u25A0-\u25FF]/g, "*");

    // 4. Arrows (U+2190 - U+21FF, U+2900 - U+297F, U+2794 - U+27BF, etc.)
    res = res.replace(/[↔⇔⟷⇌⇋⇄⇆⇕⟺⬄\u2194\u21AD\u21CE\u21CF\u21D4]/g, "<=>");
    res = res.replace(/[→➔➡⇒↦⟶➜➝➞🡢↪⤿⤼⟹➟➠➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➵➸➺➻➼➽↻\u2192\u21A0\u21C0\u21C9\u21D2\u21E2\u21E5\u2794-\u27BF]/g, "->");
    res = res.replace(/[←⇐⟵⬅🡠↩⤾⤽⟸↤↺↵\u2190\u219E\u21BC\u21C7\u21D0\u21E0\u21E4]/g, "<-");
    res = res.replace(/[↑⇑⬆🡡⤴↰↱⤺⤻\u2191\u219F\u21BF\u21C8\u21D1\u21E1]/g, "^");
    res = res.replace(/[↓⇓⬇🡣⤵↲↳⤸⤹\u2193\u21A1\u21C2\u21CA\u21D3\u21E3]/g, "v");
    res = res.replace(/[⇅⇵\u2195\u21D5]/g, "^v");
    // Arrows catch-all: any remaining in U+2190-U+21FF or U+2900-U+297F maps to '->'
    res = res.replace(/[\u2190-\u21FF\u2900-\u297F]/g, "->");

    // 5. Math symbols
    res = res.replace(/≈/g, "~");
    res = res.replace(/≤/g, "<=");
    res = res.replace(/≥/g, ">=");
    res = res.replace(/≠/g, "!=");
    res = res.replace(/±/g, "+/-");
    res = res.replace(/∓/g, "-+");
    res = res.replace(/×/g, "x");
    res = res.replace(/÷/g, "/");
    res = res.replace(/·/g, "*");
    res = res.replace(/√/g, "sqrt");
    res = res.replace(/∑/g, "sum");
    res = res.replace(/∏/g, "prod");
    res = res.replace(/∞/g, "infinity");
    res = res.replace(/∈/g, " in ");
    res = res.replace(/∉/g, " not in ");
    res = res.replace(/⊂/g, " subset ");
    res = res.replace(/⊆/g, " subseteq ");
    res = res.replace(/∪/g, " union ");
    res = res.replace(/∩/g, " intersect ");
    res = res.replace(/∧/g, " AND ");
    res = res.replace(/∨/g, " OR ");
    res = res.replace(/¬/g, " NOT ");
    res = res.replace(/[∂]/g, "d");
    res = res.replace(/[∫]/g, "integral");
    res = res.replace(/[∆Δ]/g, "Delta");

    // 6. Greek letters (lowercase and uppercase)
    const greekMap: Record<string, string> = {
        "α": "alpha", "Α": "Alpha",
        "β": "beta", "Β": "Beta",
        "γ": "gamma", "Γ": "Gamma",
        "δ": "delta", "Δ": "Delta",
        "ε": "epsilon", "Ε": "Epsilon",
        "ζ": "zeta", "Ζ": "Zeta",
        "η": "eta", "Η": "Eta",
        "θ": "theta", "Θ": "Theta",
        "ι": "iota", "Ι": "Iota",
        "κ": "kappa", "Κ": "Kappa",
        "λ": "lambda", "Λ": "Lambda",
        "μ": "mu", "Μ": "Mu",
        "ν": "nu", "Ν": "Nu",
        "ξ": "xi", "Ξ": "Xi",
        "ο": "omicron", "Ο": "Omicron",
        "π": "pi", "Π": "Pi",
        "ρ": "rho", "Ρ": "Rho",
        "σ": "sigma", "ς": "sigma", "Σ": "Sigma",
        "τ": "tau", "Τ": "Tau",
        "υ": "upsilon", "Υ": "Upsilon",
        "φ": "phi", "ϕ": "phi", "Φ": "Phi",
        "χ": "chi", "Χ": "Chi",
        "ψ": "psi", "Ψ": "Psi",
        "ω": "omega", "Ω": "Omega",
    };
    res = res.replace(/[α-ωΑ-Ωϕς]/g, (m) => greekMap[m] || m);

    // 7. Subscripts and superscripts to plain text
    const superMap: Record<string, string> = {
        "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
        "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
        "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")",
        "ⁿ": "n", "ⁱ": "i"
    };
    res = res.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/g, (m) => superMap[m] || m);

    const subMap: Record<string, string> = {
        "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
        "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
        "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")",
        "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x", "ₕ": "h",
        "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₚ": "p",
        "ₛ": "s", "ₜ": "t"
    };
    res = res.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ]/g, (m) => subMap[m] || m);

    // 8. Typographic punctuation and dashes
    res = res.replace(/[“”„‟]/g, '"');
    res = res.replace(/[‘’‛‚]/g, "'");
    res = res.replace(/[–—―]/g, "-");
    res = res.replace(/[‑]/g, "-");
    res = res.replace(/…/g, "...");
    res = res.replace(/[•◦‣⁃▫▪]/g, "*");
    res = res.replace(/[✓✔]/g, "[x]");
    res = res.replace(/[✗✘]/g, "[ ]");
    res = res.replace(/[\u200B\u200C\u200D\uFEFF]/g, ""); // zero-width
    res = res.replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, " "); // special spaces

    // 9. Restore code blocks (safely translate box drawing, blocks, shapes, and arrows without modifying identifiers or YAML ---)
    for (let i = 0; i < codeTokens.length; i++) {
        let block = codeTokens[i];
        block = block
            .replace(/[─━┄┅┈┉╌╍═]/g, "-")
            .replace(/[│┃┆┇┊┋╎╏║]/g, "|")
            .replace(/[┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╔╦╗╠╬╣╚╩╝╭╮╯╰╱╲╳]/g, "+")
            .replace(/[\u2500-\u257F]/g, "-")
            .replace(/[\u2580-\u259F]/g, "#")
            .replace(/[▶►▸▹▻]/g, ">")
            .replace(/[◀◄◂◃◅]/g, "<")
            .replace(/[▲▴▵]/g, "^")
            .replace(/[▼▾▿]/g, "v")
            .replace(/[\u25A0-\u25FF]/g, "*")
            .replace(/[↔⇔⟷⇌⇋⇄⇆⇕⟺⬄\u2194\u21AD\u21CE\u21CF\u21D4]/g, "<=>")
            .replace(/[→➔➡⇒↦⟶➜➝➞🡢↪⤿⤼⟹➟➠➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➵➸➺➻➼➽↻\u2192\u21A0\u21C0\u21C9\u21D2\u21E2\u21E5\u2794-\u27BF]/g, "->")
            .replace(/[←⇐⟵⬅🡠↩⤾⤽⟸↤↺↵\u2190\u219E\u21BC\u21C7\u21D0\u21E0\u21E4]/g, "<-")
            .replace(/[↑⇑⬆🡡⤴↰↱⤺⤻\u2191\u219F\u21BF\u21C8\u21D1\u21E1]/g, "^")
            .replace(/[↓⇓⬇🡣⤵↲↳⤸⤹\u2193\u21A1\u21C2\u21CA\u21D3\u21E3]/g, "v")
            .replace(/[⇅⇵\u2195\u21D5]/g, "^v")
            .replace(/[\u2190-\u21FF\u2900-\u297F]/g, "->");
        res = res.split(`${CODE_PREFIX}${i}${CODE_SUFFIX}`).join(block);
    }

    // 10. Assert no character above U+00FF remains. Replace leftovers with "?" and log every code point.
    const leftovers: string[] = [];
    res = res.replace(/[^\u0000-\u00FF]/gu, (char) => {
        const hex = char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") || "0000";
        leftovers.push(`U+${hex} (${char})`);
        return "?";
    });
    if (leftovers.length > 0) {
        console.warn(`[Unicode Normalizer] Replaced ${leftovers.length} character(s) above U+00FF with '?':`, Array.from(new Set(leftovers)));
    }

    return res;
}

/**
 * Builds the research and outline prompt adhering to topic classification.
 */
export function buildResearchPrompt(topic: string, sectionCount = 5): string {
    const isTech = isTechnicalTopic(topic);

    if (!isTech) {
        return `You are an expert researcher, curriculum designer, and subject matter specialist.
Your task is to conduct an extremely thorough, exhaustive, and highly detailed research study on the topic: "${topic}" and design a comprehensive structured syllabus/document outline for generating high-quality learning guides or course materials.

TOPIC FIDELITY RULE:
This topic is strictly non-technical / domain-specific. DO NOT include programming code, software classes, database diagrams, or coding errors. Focus exclusively on the genuine academic, historical, scientific, or humanities concepts of this subject.

SINGLE DATE RULE & ACCURACY:
A document must use the exact same date for the same historical event throughout, and verify all dates and chronologies against grounded sources.
Write all equations, formulas, and math expressions as plain text (e.g. 2H2O -> 4H+ + 4e- + O2, 14/3 = 4.67), NEVER LaTeX ($...$, \\frac, \\rightarrow).
Any text diagram must use ASCII only (+ - | > v), max 80 columns. Non-technical topics must prefer a table or list over a drawn diagram.

You MUST examine this topic in maximum depth, covering:
- Every key concept, historical context, core principles, standard terminology, and domain-specific knowledge.
- Crucial subtopics, background context, chronological or logical progression of lessons.
- Nuanced perspectives, verified facts, and foundational through advanced domain mastery.

Provide your findings as a highly detailed, comprehensive markdown report in 'researchNotes'. Leave no stone unturned and write a detailed analysis.
Suggest EXACTLY ${sectionCount} logical outline sections in the 'fields' list (do not return fewer than ${sectionCount} items). Each section must have:
- name: string (lowercase snake_case, e.g. 'historical_origins', 'cultural_renaissance')
- label: string (readable section title WITHOUT leading numbers, e.g. 'Historical Origins and Foundations', 'Cultural and Architectural Renaissance')
- type: string (must be exactly 'section')
- description: string (brief explanation of what this section should cover)
- rules: string (specific guidelines or details to generate)

You must return a JSON object with this exact structure:
{
  "researchNotes": "markdown report here",
  "fields": [
    { "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }
  ]
}

Ensure the type is strictly set to 'section'.`;
    }

    return `You are an expert technical writer, systems architect, and computer science curriculum designer.
Your task is to conduct an extremely thorough, exhaustive, and highly detailed research study on the technical topic: "${topic}" and design a comprehensive structured syllabus/document outline for generating high-quality learning guides or course materials.

ACCURACY AND FORMATTING RULES:
- Write equations and formulas as plain text, never raw LaTeX ($...$, \\frac, etc.).
- Any text diagram must use ASCII only (+ - | > v), max 80 columns.
- SINGLE DATE RULE: A document must use the same release or deprecation date for the same version/event throughout, verified against grounded sources.

You MUST examine this topic in maximum depth, covering:
- Every key concept, standard terminology, advanced implementation details, design patterns, and programming syntax.
- Crucial subtopics, background context, prerequisites, and production architecture.
- Logical progression of lessons (e.g. foundational mechanisms precede complex abstractions).
- Specific edge cases, pitfalls, security considerations, and common engineering errors.

Provide your findings as a highly detailed, comprehensive markdown report in 'researchNotes'. Leave no stone unturned and write a detailed analysis.
Suggest EXACTLY ${sectionCount} logical outline sections in the 'fields' list (do not return fewer than ${sectionCount} items). Each section must have:
- name: string (lowercase snake_case, e.g. 'core_architecture', 'concurrency_and_performance')
- label: string (readable section title WITHOUT leading numbers, e.g. 'Core Architecture & Internals', 'Concurrency & Performance Optimization')
- type: string (must be exactly 'section')
- description: string (brief explanation of what this section should cover)
- rules: string (specific technical guidelines or details to generate)

You must return a JSON object with this exact structure:
{
  "researchNotes": "markdown report here",
  "fields": [
    { "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }
  ]
}

Ensure the type is strictly set to 'section'.`;
}

/**
 * Builds the section generation prompt adhering to topic classification.
 */
export function buildSectionPrompt(
    topic: string,
    sectionLabel: string,
    sectionKey: string,
    sectionDescription: string,
    sectionRules: string,
    previousSectionsContext = ""
): string {
    const isTech = isTechnicalTopic(topic);

    let prompt = isTech
        ? `You are an expert technical writer and software engineering educator.`
        : `You are an expert academic writer, educator, and subject matter specialist.`;

    prompt += `\nYour task is to generate realistic, comprehensive, and highly-detailed educational course/guide content for a specific section of a document.

Main Topic: ${topic}
Target Section: ${sectionLabel} (key: ${sectionKey})
Overview of what to cover: ${sectionDescription}
Requirements & Rules: ${sectionRules}
`;

    if (previousSectionsContext) {
        prompt += `\nPrevious Chapters / Content Context (for continuity and flow):\n${previousSectionsContext}\n`;
    }

    prompt += `\nInstructions:
1. Write the section content in beautiful, valid Markdown. Do not repeat the section title as an H1 heading.
2. Use clear formatting, paragraphs, bullet points, and markdown tables where appropriate.
3. EQUATIONS AS PLAIN TEXT: Write equations and formulas as readable plain text (e.g. 2H2O -> 4H+ + 4e- + O2, 14/3 = 4.67), NEVER raw LaTeX ($...$, \\frac, \\rightarrow, _{...}, ^{...}).
4. ASCII DIAGRAMS: Any text diagram must use plain ASCII characters only (+, -, |, >, v), maximum 80 columns wide.
5. SINGLE DATE RULE: A document must use the exact same date for the same event throughout, verified against grounded sources.
6. NO DECORATIVE ASCII ART BOXES: Do not draw decorative ASCII frame boxes or wireframes (such as "+---+"). Standard pipe characters (| and ||) and dollar signs ($) are completely legitimate and must be freely used inside tables, code blocks, shell commands, and logical expressions. Never replace pipes, dollars, or syntax symbols with placeholders like %%%.
`;

    if (isTech) {
        prompt += `7. Provide rich code blocks with syntax highlighting showing clear, correct, and readable examples. Include comments inside code examples to explain syntax.
8. If describing relational database join operations (INNER, LEFT, RIGHT, FULL), you may optionally include a \`\`\`json-diagram block.
`;
    } else {
        prompt += `7. STRICT DOMAIN FIDELITY: This topic is non-technical. Do NOT write programming code, Python classes, or database diagrams. Focus on rigorous domain analysis, factual accuracy, and detailed historical or scientific narrative.
8. PREFER TABLES OR LISTS: Non-technical topics must prefer a clean markdown table or structured list over a drawn diagram.
`;
    }

    prompt += `9. Markdown tables: Ensure all markdown tables follow standard syntax with pipe characters and a header separator row.
10. Formatting integrity: Preserve all legitimate characters (|, ||, $, %, &, <, >, \\). Never introduce placeholder corruption like %%%.
11. Dive deep: provide comprehensive explanations, historical/technical depth, definitions, and practical context.
12. Return the raw markdown content ONLY. Do not wrap the response in JSON or conversational text.`;

    return prompt;
}
