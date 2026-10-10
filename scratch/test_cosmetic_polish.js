function testPolish(text) {
  let s = text;

  // 1. Single letter / number subscripts: F_X, b_L, A_0
  s = s.replace(/([a-zA-Z0-9])_([a-zA-Z0-9])\b/g, "$1$2");

  // 2. Stray carets: P700+^, 360^ deg
  s = s.replace(/([a-zA-Z0-9]+[+-])\^/g, "$1");
  s = s.replace(/\^([+-])/g, "$1");
  s = s.replace(/\^(\s*deg\b)/g, " deg");
  s = s.replace(/(?<=\d)\^\s*deg\b/g, " deg");
  s = s.replace(/([a-zA-Z0-9])\^(?=[,\s.;:)\]}]|$)/g, "$1");

  // 3. Drop horizontal rules
  s = s.replace(/^\s*([*\-_])\s*(?:\1\s*){2,}$/gm, "");

  // 4. Missing arrows
  s = s.replace(/[↔⇔⟷⇌⇋⇄⇆⇕⟺]/g, "<=>");
  s = s.replace(/[→➔➡⇒↦⟶➜➝➞🡢↪⤿⤼⟹➟➠➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➵➸➺➻➼➽↻]/g, "->");
  s = s.replace(/[←⇐⟵⬅🡠↩⤾⤽⟸↤↺↵]/g, "<-");
  s = s.replace(/[↑⇑⬆🡡⤴↰↱⤺⤻]/g, "^");
  s = s.replace(/[↓⇓⬇🡣⤵↲↳⤸⤹]/g, "v");
  s = s.replace(/[⇅⇵]/g, "^v");

  const leftovers = [];
  s = s.replace(/[^\u0000-\u00FF]/g, c => {
    leftovers.push(c);
    return "?";
  });

  return { result: s.trim(), leftovers };
}

const tests = [
  "Electron acceptor F_X transfers electrons to b_L and primary acceptor A_0.",
  "Primary donor P700+^ is reduced, and orientation is 360^ deg.",
  "First section\n\n---\n\nSecond section",
  "Reversible reaction: A ⇌ B. Cyclic flow: PSI ↻ PSI. Non-cyclic: PSII ➔ PSI. Branch: ⤴ and ⤵. Hook: ↪ and ↩. Counter: ↺. Two-way: ⇄ and ⇆."
];

for (const t of tests) {
  const { result, leftovers } = testPolish(t);
  console.log("INPUT: \n", t);
  console.log("OUTPUT:\n", result);
  console.log("LEFTOVERS > U+00FF:", leftovers);
  console.log("-----------------------------------------");
}
