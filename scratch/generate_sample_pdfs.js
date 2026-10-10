const fs = require('fs');

function generatePdf(lines) {
  let stream = 'BT\n/F1 12 Tf\n20 750 Td\n16 TL\n';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    stream += '(' + escaped + ') Tj\nT*\n';
  }
  stream += 'ET';
  const len = Buffer.byteLength(stream, 'latin1');
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length ' + len + ' >>\nstream\n' + stream + '\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000227 00000 n \n0000000300 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n370\n%%EOF', 'latin1');
}

const goodPdf = generatePdf([
  '# System Architecture',
  '+--------------+',
  '| Worker A     |',
  '+--------------+',
  'Worker A -> Worker B',
  'Efficiency ~ 98.5%',
  '10 <= x and y >= 50, error != 0',
  'alpha = 0.05, beta = 0.99',
  '2H2O -> 4H+ + 4e- + O2',
  'Mn4CaO5 and P700, Mn^2+',
  '14/3 = 4.67',
  'echo $PATH',
  'echo $USER'
]);

fs.writeFileSync('scratch/sample_pass.pdf', goodPdf);

const badPdf = generatePdf([
  '# System Architecture',
  '# System Architecture',
  '%%%',
  'Value is "H 98.5%',
  '$Mn_4CaO_5$',
  'Donor P_{700}',
  'Catalyst Mn^{2+}'
]);

fs.writeFileSync('scratch/sample_fail.pdf', badPdf);
console.log('Sample PDFs generated in scratch.');
