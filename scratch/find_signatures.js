const fs = require('fs');
const bundlePath = 'public/synthetic-data-generator/assets/index-Jk-OVQu0.js';
const code = fs.readFileSync(bundlePath, 'utf8');

const rStart = code.indexOf("static async researchTopic(e,t,n=`tabular`,r=5,i=.7){");
console.log('researchTopic index:', rStart);
console.log(code.slice(rStart, rStart + 500));

const gStart = code.indexOf("static async generateDataBatch(e,t,n,r,i,a,o,s,c=.7,l=`tabular`){if(l===`document`){");
console.log('generateDataBatch index:', gStart);
console.log(code.slice(gStart, gStart + 600));
