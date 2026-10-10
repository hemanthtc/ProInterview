function normalizeDiagram(text) {
  let res = text;

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

  // Code point logging on leftovers > U+00FF
  const leftovers = [];
  res = res.replace(/[^\u0000-\u00FF]/g, (char) => {
    const hex = char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    leftovers.push({ char, code: `U+${hex}` });
    return "?";
  });
  if (leftovers.length > 0) {
    console.warn("[Unicode Normalizer] Replaced character(s) above U+00FF with '?':", leftovers);
  }

  return res;
}

const sample = [
  "+---------► Returns to [ P700+ ]",
  "+---------▸ Returns to [ P700+ ]",
  "+---------→ Returns to [ P700+ ]",
  "[ Cytochrome b6f Complex ] --► (H+ pumped into lumen)",
  "[ Cytochrome b6f Complex ] --→ (H+ pumped into lumen)",
  "|",
  "▼",
  "|",
  "▾",
  "|",
  "↓",
  "[ P700 ]",
  "• Genetic Repository: The stroma houses the chloroplast’s circular DNA"
].join("\n");

console.log("Input:\n" + sample);
console.log("\nNormalized:\n" + normalizeDiagram(sample));
