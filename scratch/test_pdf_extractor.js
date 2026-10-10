const zlib = require('zlib');

function extractPdfText(pdfBuffer) {
  let text = '';
  let offset = 0;
  while (offset < pdfBuffer.length) {
    const streamStart = pdfBuffer.indexOf('stream', offset);
    if (streamStart === -1) break;

    let contentStart = streamStart + 6;
    if (pdfBuffer[contentStart] === 0x0d) contentStart++;
    if (pdfBuffer[contentStart] === 0x0a) contentStart++;

    const streamEnd = pdfBuffer.indexOf('endstream', contentStart);
    if (streamEnd === -1) break;

    const streamData = pdfBuffer.slice(contentStart, streamEnd);
    offset = streamEnd + 9;

    let contentStr = '';
    try {
      contentStr = zlib.inflateSync(streamData).toString('latin1');
    } catch {
      contentStr = streamData.toString('latin1');
    }

    const tjRegex = /\[(.*?)\]\s*TJ/gs;
    let match;
    while ((match = tjRegex.exec(contentStr)) !== null) {
      const inner = match[1];
      const strRegex = /\((.*?)\)/g;
      let sMatch;
      let line = '';
      while ((sMatch = strRegex.exec(inner)) !== null) {
        line += sMatch[1].replace(/\\([\\()])/g, '$1');
      }
      text += line + '\n';
    }

    const tSingleRegex = /\((.*?)\)\s*Tj/g;
    while ((match = tSingleRegex.exec(contentStr)) !== null) {
      text += match[1].replace(/\\([\\()])/g, '$1') + '\n';
    }
  }
  return text;
}

const rawContent = 'BT\n/F1 12 Tf\n(%%%) Tj\nT*\n("H) Tj\nT*\n(14/3 = 4.67) Tj\nET\n';
const streamLen = Buffer.byteLength(rawContent);
const pdf = '%PDF-1.4\n1 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + rawContent + 'endstream\nendobj\ntrailer << /Root 1 0 R >>\n%%EOF';
const extracted = extractPdfText(Buffer.from(pdf));
console.log('Extracted text:\n' + extracted);
