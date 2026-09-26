const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'prointerviewer', 'ProInterviewerApp.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Searching autofill/upload/parser patterns:');
lines.forEach((line, idx) => {
  if (line.includes('autofill') || line.includes('parse') || line.includes('upload') || line.includes('AI') || line.includes('Resume') || line.includes('generate')) {
    if (line.includes('function') || line.includes('const ') || line.includes('fetch') || line.includes('Modal') || line.includes('Dialog')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
