const fs = require('fs');
const JSZip = require('jszip');
const { extractTextFromPdfBuffer } = require('../scripts/qa-pdf.mjs');

const dir = 'C:\\Users\\cheta\\Downloads\\New folder';
const pdfFiles = [
  'karnataka_history_rashtrakuta_dynasty.pdf',
  'linux_process_management_and_ipc.pdf',
  'photosynthesis_and_light_reactions.pdf'
];
const docxFiles = [
  'karnataka_history_rashtrakuta_dynasty.docx',
  'linux_process_management_and_ipc.docx',
  'photosynthesis_and_light_reactions.docx'
];

async function extractTextFromDocx(buf) {
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('text');
  // Extract text within <w:t> tags
  const texts = [];
  const regex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(docXml)) !== null) {
    texts.push(match[1]);
  }
  return texts.join(' ');
}

function runAnalysis(filename, text, isPdf) {
  console.log(`\n======================================================`);
  console.log(`FILE: ${filename} (Text length: ${text.length})`);
  console.log(`======================================================`);

  // 1. Check for %%%
  const pct3 = (text.match(/%%%/g) || []).length;
  console.log(`1. '%%%' occurrences: ${pct3}`);

  // 2. Check for % % %
  const pctSp = (text.match(/%\s+%\s+%/g) || []).length;
  console.log(`2. '% % %' occurrences: ${pctSp}`);

  // 3. Check for corrupted approx "H
  const approxMatches = [];
  const approxRegex = /"H(?![a-zA-Z])/g;
  let m;
  while ((m = approxRegex.exec(text)) !== null) {
    approxMatches.push(text.substring(Math.max(0, m.index - 20), m.index + 20));
  }
  console.log(`3. Corrupted approx '"H' occurrences: ${approxMatches.length}`);
  if (approxMatches.length > 0) {
    console.log(`   Sample '"H':`, approxMatches.slice(0, 3));
  }

  // Check English words starting with "H (like "Heroic", "Heap")
  const englishHQuotes = (text.match(/"H[a-zA-Z]+/g) || []).length;
  console.log(`   (Legitimate English quotes like "Heroic", "Heap": ${englishHQuotes})`);

  // 4. Raw LaTeX math $...$
  const rawMath = [];
  const mathRegex = /\$([^$\n]+?)\$/g;
  while ((m = mathRegex.exec(text)) !== null) {
    const inner = m[1].trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(inner)) {
      rawMath.push(`$${inner}$`);
    }
  }
  console.log(`4. Raw LaTeX math $...$ occurrences: ${rawMath.length}`);
  if (rawMath.length > 0) {
    console.log(`   First 5 math snippets:`, rawMath.slice(0, 5));
  }

  // 5. LaTeX commands (\frac, \rightarrow, _{, ^{)
  const fracMatches = (text.match(/\\frac\b/g) || []).length;
  const arrowMatches = (text.match(/\\(?:rightarrow|leftarrow|leftrightarrow|to)\b/g) || []).length;
  const subMatches = (text.match(/_\{/g) || []).length;
  const supMatches = (text.match(/\^\{/g) || []).length;
  console.log(`5. LaTeX markers: \\frac: ${fracMatches}, arrows: ${arrowMatches}, _{: ${subMatches}, ^{: ${supMatches}`);

  // 6. Duplicate headings
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let dupHeadings = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i];
    const nxt = lines[i + 1];
    const bannerMatch = cur.match(/^(?:#+\s+|\d+[\.\-\)]\s+)(.+)$/);
    if (bannerMatch) {
      const cleanCur = bannerMatch[1].trim().toLowerCase();
      const cleanNxt = nxt.replace(/^(?:#+\s+|\d+[\.\-\)]\s+)/, '').trim().toLowerCase();
      if (cleanCur.length > 3 && (cleanNxt === cleanCur || cleanCur === nxt.toLowerCase())) {
        dupHeadings++;
        console.log(`   [Dup Heading]: "${cur}" followed by "${nxt}"`);
      }
    }
  }
  console.log(`6. Duplicate headings directly below banner: ${dupHeadings}`);

  // 7. Non-ASCII characters (for PDF)
  if (isPdf) {
    let nonAscii = 0;
    const nonAsciiSamples = new Set();
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 255) {
        nonAscii++;
        nonAsciiSamples.add(text[i]);
      }
    }
    console.log(`7. Characters > U+00FF in PDF: ${nonAscii} (sample glyphs: ${Array.from(nonAsciiSamples).slice(0, 10).join(', ')})`);
  }

  // 8. Topic fidelity (programming in non-tech)
  if (filename.includes('karnataka')) {
    const techHits = text.match(/\b(sql|database|table\s+join|python|def\s+|class\s+[A-Z]|select\s+\*|mongodb|docker)\b/gi) || [];
    console.log(`8. Technical code bias in Karnataka History: ${techHits.length} (${techHits.slice(0, 5).join(', ')})`);
  }
}

async function main() {
  console.log('=== ANALYZING UPDATED PDFS ===');
  for (const f of pdfFiles) {
    const p = dir + '\\' + f;
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      const text = extractTextFromPdfBuffer(buf);
      runAnalysis(f, text, true);
    }
  }

  console.log('\n\n=== ANALYZING UPDATED DOCX FILES ===');
  for (const f of docxFiles) {
    const p = dir + '\\' + f;
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      const text = await extractTextFromDocx(buf);
      runAnalysis(f, text, false);
    }
  }
}

main().catch(console.error);
