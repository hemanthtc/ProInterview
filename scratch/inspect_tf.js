const fs = require('fs');
const code = fs.readFileSync('public/synthetic-data-generator/assets/index-Jk-OVQu0.js', 'utf8');
const tfIdx = code.indexOf('function tf(');
console.log('tfIdx:', tfIdx);
const nextFunc = code.indexOf('function ', tfIdx + 20);
console.log('nextFunc:', nextFunc);
console.log(code.substring(tfIdx, nextFunc));
