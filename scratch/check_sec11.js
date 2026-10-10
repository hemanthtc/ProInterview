const fs = require('fs');
const { extractTextFromPdfBuffer } = require('../scripts/qa-pdf.mjs');

const buf = fs.readFileSync('C:\\Users\\cheta\\Downloads\\New folder\\photosynthesis_and_light_reactions.pdf');
const text = extractTextFromPdfBuffer(buf);

const idx = text.indexOf('11. Historical Milestones');
console.log('Context around section 11:');
console.log(text.substring(idx, idx + 300));
