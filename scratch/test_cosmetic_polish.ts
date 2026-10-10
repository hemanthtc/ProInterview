import { convertLatexToPlainText, normalizeTextForExport } from "../src/utils/topicClassifier";

const testSubscripts = "Electron acceptor F_X transfers electrons to b_L and primary acceptor A_0.";
const testStrayCaret = "Primary donor P700+^ is reduced, and orientation is 360^ deg.";
const testHorizontalRule = "First section text\n\n---\n\nSecond section text";
const testArrows = "Reversible reaction: A ⇌ B. Cyclic flow: PSI ↻ PSI. Non-cyclic: PSII ➔ PSI. Branch: ⤴ and ⤵. Hook: ↪ and ↩. Counter: ↺.";

console.log("=== TEST SUBSCRIPTS ===");
console.log("Input: ", testSubscripts);
console.log("Output:", normalizeTextForExport(testSubscripts));

console.log("\n=== TEST STRAY CARET ===");
console.log("Input: ", testStrayCaret);
console.log("Output:", normalizeTextForExport(testStrayCaret));

console.log("\n=== TEST ARROWS ===");
console.log("Input: ", testArrows);
const arrowOutput = normalizeTextForExport(testArrows);
console.log("Output:", arrowOutput);
console.log("Contains '?':", arrowOutput.includes("?"));
