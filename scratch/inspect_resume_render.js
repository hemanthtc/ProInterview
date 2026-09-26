const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'prointerviewer', 'ResumePreview.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find lines containing ".workExperience" or ".education" or similar
const lines = content.split('\n');
console.log('Searching map/render patterns:');
lines.forEach((line, idx) => {
  if (line.includes('workExperience') || line.includes('education') || line.includes('projects') || line.includes('skills')) {
    if (line.includes('map') || line.includes('render') || line.includes('Section') || line.includes('length')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
