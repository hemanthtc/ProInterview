const fs = require('fs');
let code = fs.readFileSync('backup/index-Jk-OVQu0.js.bak', 'utf8');
const needle = 'else if(e.type===`code`){let t=e.code.';
console.log('Found rx code block needle:', code.indexOf(needle));
