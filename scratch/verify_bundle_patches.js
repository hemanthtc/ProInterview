const fs = require('fs');
const bundlePath = 'public/synthetic-data-generator/assets/index-Jk-OVQu0.js';
const code = fs.readFileSync(bundlePath, 'utf8');

// 1. Math replace in qd
const qdOld = '.replace(/\\$([^$]+)\\$/g,`$1`)';
console.log('1. qdFound:', code.includes(qdOld));

// 2. Unicode box character in code blocks
const boxOld = "replace(/(\\sim|\\.{3,}|-{3,})/g,e=>`─`.repeat(e.length))";
const boxIndex = code.indexOf("`─`");
console.log('2. Unicode box `─` found:', boxIndex !== -1);
if (boxIndex !== -1) {
    console.log('   snippet:', code.slice(boxIndex - 30, boxIndex + 40));
}

// 3. Table detector in Zd
const sIndex = code.indexOf("return t.includes(`|`)&&!t.startsWith");
console.log('3. Table detector s(e) found:', sIndex !== -1);
if (sIndex !== -1) {
    console.log('   snippet:', code.slice(sIndex - 30, sIndex + 80));
}

// 4. tf banner in PDF export
const tfIndex = code.indexOf("${t+1}. ${n}");
console.log('4. tf banner found:', tfIndex !== -1);
if (tfIndex !== -1) {
    console.log('   snippet:', code.slice(tfIndex - 30, tfIndex + 40));
}

// 5. rx banner in DOCX export
const rxIndex = code.indexOf("${t+1}. ${i}");
console.log('5. rx banner found:', rxIndex !== -1);
if (rxIndex !== -1) {
    console.log('   snippet:', code.slice(rxIndex - 30, rxIndex + 40));
}

// 6. ResearchTopic prompt
const resIndex = code.indexOf("design a comprehensive structured syllabus/document outline");
console.log('6. ResearchTopic prompt found:', resIndex !== -1);

// 7. GenerateDataBatch prompt
const genIndex = code.indexOf("VISUAL JOIN DIAGRAMS: When describing database join operations");
console.log('7. GenerateDataBatch prompt found:', genIndex !== -1);
