// Factual domains that mandate web grounding per Rule 1 & Rule 4
const FACTUAL_DOMAIN_PATTERN = /\b(history|historical|dynasty|empire|war|battle|treaty|monarchy|constitution|law|legal|court|statute|regulation|rights|jurisdiction|medicine|medical|health|clinical|pathology|anatomy|disease|pharma|biology|biological|physics|chemistry|photosynthesis|biochemistry|constants?|measurements?|astronomy|geology|finance|financial|economics|economic|stock|inflation|banking|budget|politics|political|government|election|parliament|current\s*events?|geography|literature|philosophy|author|novel|biography|version|release|changelog|deprecated|deprecation|kernel|distro|distribution|ubuntu|debian|fedora|arch|windows\s*\d+|macos|android|ios|specification|spec|rfc|cve|vulnerability)\b/i;

// Freshness, versions, releases, modern ecosystems, product UIs, and comprehensive roadmaps
const TIMELY_VERSION_UI_PATTERN = /\b(latest|modern|current|recent|new\s+features?|v?\d+\.\d+|java\s+\d+|python\s+\d+|angular\s+\d+|node\s+\d+|c\+\+\d+|console|ui|gui|dashboard|interface|portal|basic\s+to\s+advanced|beginner\s+to\s+advanced)\b/i;

// Pure math reasoning & syntax topics that DO NOT require web search grounding
const PURE_MATH_SYNTAX_PATTERN = /\b(pure\s+math|calculus|linear\s+algebra|geometry|abstract\s+algebra|number\s+theory|proofs?|trigonometry|arithmetic|quadratic|equations?|basic\s+coding\s+syntax|algorithm\s+puzzle|leetcode)\b/i;

function isGroundingTopic(prompt: string): boolean {
    if (!prompt || typeof prompt !== "string") return false;
    const trimmed = prompt.trim();
    if (!trimmed) return false;
    if (PURE_MATH_SYNTAX_PATTERN.test(trimmed)) return false;
    return FACTUAL_DOMAIN_PATTERN.test(trimmed) || TIMELY_VERSION_UI_PATTERN.test(trimmed);
}

const testCases = [
  { topic: "AWS Console latest UI", expected: true },
  { topic: "Java 21 modern features", expected: true },
  { topic: "Python 3.13 new features", expected: true },
  { topic: "Java from basic to advanced", expected: true },
  { topic: "Docker Compose current workflow", expected: true },
  { topic: "Binary search implementation in Java", expected: false },
  { topic: "Solve quadratic equations", expected: false },
  { topic: "Karnataka History", expected: true },
  { topic: "Linux kernel scheduling", expected: true },
  { topic: "Photosynthesis constants", expected: true }
];

let allPassed = true;
for (const tc of testCases) {
  const result = isGroundingTopic(tc.topic);
  const ok = result === tc.expected;
  if (!ok) allPassed = false;
  console.log(`${ok ? "✓" : "✗"} "${tc.topic}" => ${result} (expected ${tc.expected})`);
}

console.log("All passed:", allPassed);
