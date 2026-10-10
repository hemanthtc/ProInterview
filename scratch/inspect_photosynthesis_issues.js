const fs = require('fs');
const JSZip = require('jszip');
const { extractTextFromPdfBuffer } = require('../scripts/qa-pdf.mjs');

async function main() {
  const pdfPath = 'C:\\Users\\cheta\\Downloads\\New folder\\photosynthesis_and_light_reactions.pdf';
  const docxPath = 'C:\\Users\\cheta\\Downloads\\New folder\\photosynthesis_and_light_reactions.docx';

  if (fs.existsSync(pdfPath)) {
    const pdfBuf = fs.readFileSync(pdfPath);
    const pdfText = extractTextFromPdfBuffer(pdfBuf);
    console.log('=== PDF ANALYSIS ===');
    const lines = pdfText.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('?') && !l.includes('? ') && !l.endsWith('?') && !l.includes('what') && !l.includes('how') && !l.includes('why')) {
        console.log(`Line ${idx}: ${l}`);
      }
      if (l.includes('PQH') || l.includes('CF_')) {
        console.log(`Subscript line ${idx}: ${l}`);
      }
    });
  }

  if (fs.existsSync(docxPath)) {
    const docxBuf = fs.readFileSync(docxPath);
    const zip = await JSZip.loadAsync(docxBuf);
    const docXml = await zip.file('word/document.xml').async('text');
    console.log('=== DOCX ANALYSIS ===');
    // Find all non-ascii characters in docXml
    const nonAscii = new Set();
    for (let i = 0; i < docXml.length; i++) {
      const code = docXml.charCodeAt(i);
      if (code > 255) {
        nonAscii.add(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (${docXml[i]})`);
      }
    }
    console.log('Non-ASCII characters in DOCX:', Array.from(nonAscii));

    // Check occurrences of PQH and CF
    const pqhMatches = docXml.match(/[A-Za-z0-9_]*PQH[A-Za-z0-9_]*/g) || [];
    console.log('PQH occurrences in DOCX:', Array.from(new Set(pqhMatches)));
    const cfMatches = docXml.match(/[A-Za-z0-9_]*CF[A-Za-z0-9_]*/g) || [];
    console.log('CF occurrences in DOCX:', Array.from(new Set(cfMatches)));
    
    // Look for lines in DOCX around ? in diagrams
    const textPieces = [];
    const r = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let m;
    while ((m = r.exec(docXml)) !== null) {
      textPieces.push(m[1]);
    }
    const fullDocText = textPieces.join('\n');
    fullDocText.split('\n').forEach((l, idx) => {
      if (l.includes('Returns to') || l.includes('P700+') || (l.includes('?') && (l.includes('+') || l.includes('|') || l.includes('-')))) {
        console.log(`Diagram line in docx: ${l}`);
      }
    });
  }
}

main().catch(console.error);
