const fs = require('fs');
const { extractTextFromPdfBuffer } = require('../scripts/qa-pdf.mjs');

const files = [
  'karnataka_history_rashtrakuta_dynasty.pdf',
  'linux_process_management_and_ipc.pdf',
  'photosynthesis_and_light_reactions.pdf'
];

for (const file of files) {
  const fullPath = 'C:\\Users\\cheta\\Downloads\\New folder\\' + file;
  if (!fs.existsSync(fullPath)) {
    console.log('Not found:', fullPath);
    continue;
  }
  const buf = fs.readFileSync(fullPath);
  const text = extractTextFromPdfBuffer(buf);
  console.log(`\n======================================================`);
  console.log(`FILE: ${file} (size: ${buf.length}, text length: ${text.length})`);
  console.log(`======================================================`);

  // 1. Check for "H
  let idx = 0;
  let hCount = 0;
  while ((idx = text.indexOf('"H', idx + 1)) !== -1) {
    hCount++;
    if (hCount <= 5) {
      console.log(`[Defect: "H] at ${idx}: ...${JSON.stringify(text.substring(Math.max(0, idx - 30), idx + 35))}...`);
    }
  }
  console.log(`Total "H count: ${hCount}`);

  // 2. Check for %%%
  let pctCount = 0;
  idx = 0;
  while ((idx = text.indexOf('%%%', idx + 1)) !== -1) {
    pctCount++;
    if (pctCount <= 5) {
      console.log(`[Defect: %%%] at ${idx}: ...${JSON.stringify(text.substring(Math.max(0, idx - 30), idx + 35))}...`);
    }
  }
  console.log(`Total %%% count: ${pctCount}`);

  // 3. Check for alternating "% % %"
  let spPctCount = 0;
  idx = 0;
  while ((idx = text.indexOf('% % %', idx + 1)) !== -1) {
    spPctCount++;
    if (spPctCount <= 5) {
      console.log(`[Defect: % % %] at ${idx}: ...${JSON.stringify(text.substring(Math.max(0, idx - 30), idx + 35))}...`);
    }
  }
  console.log(`Total '% % %' count: ${spPctCount}`);

  // 4. Check for $
  let dollarMatches = text.match(/\$[^$\n]+\$/g) || [];
  console.log(`Total $...$ matches: ${dollarMatches.length}`);
  if (dollarMatches.length > 0) {
    console.log(`First 5 $...$ matches:`, dollarMatches.slice(0, 5));
  }

  // 5. Check for repeated headings
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let dupHeadings = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i];
    const nxt = lines[i + 1];
    const m = cur.match(/^(?:#+\s+|\d+[\.\-\)]\s+)(.+)$/);
    if (m) {
      const cleanCur = m[1].trim().toLowerCase();
      const cleanNxt = nxt.replace(/^(?:#+\s+|\d+[\.\-\)]\s+)/, '').trim().toLowerCase();
      if (cleanCur.length > 3 && (cleanNxt === cleanCur || cleanCur === nxt.toLowerCase())) {
        dupHeadings++;
        console.log(`[Defect: Dup Heading]: "${cur}" followed by "${nxt}"`);
      }
    }
  }
  console.log(`Total duplicate headings: ${dupHeadings}`);
}
