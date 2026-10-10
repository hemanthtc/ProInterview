const fs = require('fs');
const { extractTextFromPdfBuffer } = require('../scripts/qa-pdf.mjs');

const buf = fs.readFileSync('C:\\Users\\cheta\\Downloads\\New folder\\photosynthesis_and_light_reactions.pdf');
const text = extractTextFromPdfBuffer(buf);
const matches = [];
const r = /\$([^$\n]+?)\$/g;
let m;
while ((m = r.exec(text)) !== null) {
  matches.push(m[0]);
}

console.log('Total matches in photosynthesis PDF:', matches.length);
for (const x of matches) {
  console.log('  -', x);
}
