const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'prointerviewer', 'ResumePreview.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchTerms = ['experience', 'education', 'project', 'skill', 'social', 'phone'];
searchTerms.forEach(term => {
  let idx = -1;
  let count = 0;
  while ((idx = content.toLowerCase().indexOf(term, idx + 1)) !== -1) {
    count++;
    if (count === 1) {
      console.log(`Found "${term}" first occurrence at index ${idx}:`);
      console.log(content.substring(idx - 50, idx + 150));
    }
  }
  console.log(`Total occurrences of "${term}": ${count}`);
});
