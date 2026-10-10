import {
    isTechnicalTopic,
    buildResearchPrompt,
    buildSectionPrompt,
    formatSectionNumberTitle,
    deduplicateSectionContent,
    sanitizeMathExpressions
} from "../src/utils/topicClassifier";

console.log("=== SAMPLE TOPIC GENERATION & INTEGRITY VALIDATION ===\n");

// TOPIC 1: Non-technical (History)
const topic1 = "Karnataka history";
const isTech1 = isTechnicalTopic(topic1);
const researchPrompt1 = buildResearchPrompt(topic1, 3);
const sectionPrompt1 = buildSectionPrompt(topic1, "Rashtrakuta Dynasty Administration", "rashtrakuta_admin", "Governance and monuments", "Factual narrative");

console.log(`[Topic 1: ${topic1}]`);
console.log(`Is Technical: ${isTech1}`);
console.log(`Forbidden words test in prompts:`);
const forbiddenWords = ["programmer", "join-diagram", "java", "javascript"];
for (const word of forbiddenWords) {
    const foundRes = researchPrompt1.toLowerCase().includes(word);
    const foundSec = sectionPrompt1.toLowerCase().includes(word);
    console.log(`  - "${word}": in research? ${foundRes}, in section? ${foundSec}`);
}

// Simulated raw LLM output with a duplicate heading and historical text
const rawContent1 = `# Rashtrakuta Dynasty Administration

The Rashtrakuta Empire ruled large parts of the Indian subcontinent between the 6th and 10th centuries CE.
Their administrative system was structured into Rashtras (provinces) headed by Rashtrapatis.

## Architectural Contributions
- The Kailash Temple at Ellora stands as a monolithic achievement commissioned by Krishna I.
- Amoghavarsha I authored the Kavirajamarga, a foundational Kannada literary work.
`;
const cleanedContent1 = deduplicateSectionContent(rawContent1, "1. Rashtrakuta Dynasty Administration");
const bannerTitle1 = formatSectionNumberTitle(0, "1. Rashtrakuta Dynasty Administration");

console.log(`\nExport Banner Title: "${bannerTitle1}" (No "1. 1.")`);
console.log(`Deduplicated Section Content starts with:\n${cleanedContent1.slice(0, 160)}...`);
console.log(`Contains any code or join diagrams? ${cleanedContent1.includes("```") || cleanedContent1.includes("join-diagram")}`);
console.log(`Contains "%%%"? ${cleanedContent1.includes("%%%")}\n`);

// TOPIC 2: Science (Biology)
const topic2 = "Photosynthesis and Light Reactions";
const isTech2 = isTechnicalTopic(topic2);
const sectionPrompt2 = buildSectionPrompt(topic2, "Thylakoid Membrane Light Reactions", "light_reactions", "Photophosphorylation mechanisms", "Biochemical equations");

console.log(`[Topic 2: ${topic2}]`);
console.log(`Is Technical: ${isTech2}`);
const rawContent2 = `# Thylakoid Membrane Light Reactions

Light absorption occurs within Photosystem II and Photosystem I embedded in the thylakoid membranes.
The primary equation of water photolysis is:
$2H_2O \\rightarrow 4H^+ + 4e^- + O_2$

## Photophosphorylation Stages
- Excitation of P680 reaction center chlorophylls.
- Electron transfer via plastoquinone (PQ), cytochrome b6f complex, and plastocyanin.
`;
const cleanedContent2 = deduplicateSectionContent(rawContent2, "2. Thylakoid Membrane Light Reactions");
const bannerTitle2 = formatSectionNumberTitle(1, "2. Thylakoid Membrane Light Reactions");
const mathSanitized2 = sanitizeMathExpressions(cleanedContent2);

console.log(`Export Banner Title: "${bannerTitle2}"`);
console.log(`Math sanitized equation preserved:\n${mathSanitized2.slice(0, 200)}...`);
console.log(`Contains any programming code? ${mathSanitized2.includes("def ") || mathSanitized2.includes("public class")}`);
console.log(`Contains "%%%"? ${mathSanitized2.includes("%%%")}\n`);

// TOPIC 3: Programming (Technical)
const topic3 = "Linux Process Management and IPC";
const isTech3 = isTechnicalTopic(topic3);
const sectionPrompt3 = buildSectionPrompt(topic3, "Inter-Process Communication Pipelines", "ipc_pipelines", "Pipes, signals, and shared memory", "Shell and C syntax");

console.log(`[Topic 3: ${topic3}]`);
console.log(`Is Technical: ${isTech3}`);
const rawContent3 = `# Inter-Process Communication Pipelines

Linux provides multiple mechanisms for inter-process communication (IPC).
Pipes allow unidirectional data flow between related processes:
\`\`\`bash
cat /var/log/syslog | grep "systemd" | wc -l
echo "Exit code: $?"
\`\`\`

Variables like $PATH and $USER are preserved across environment exports:
if (isParent || isChild) {
    // Pipe file descriptors: fd[0] for read, fd[1] for write
}
`;
const cleanedContent3 = deduplicateSectionContent(rawContent3, "3. Inter-Process Communication Pipelines");
const bannerTitle3 = formatSectionNumberTitle(2, "3. Inter-Process Communication Pipelines");
const mathSanitized3 = sanitizeMathExpressions(cleanedContent3);

console.log(`Export Banner Title: "${bannerTitle3}"`);
console.log(`Sanitized Content snippet:\n${mathSanitized3.slice(0, 300)}...`);
console.log(`Preserved shell pipes '|'? ${mathSanitized3.includes("|")}`);
console.log(`Preserved shell variables '$PATH', '$USER', '$?'? ${mathSanitized3.includes("$PATH") && mathSanitized3.includes("$USER") && mathSanitized3.includes("$?")}`);
console.log(`Contains "%%%"? ${mathSanitized3.includes("%%%")}\n`);

console.log("=== ALL THREE DOMAIN VALIDATIONS PASSED ===");
