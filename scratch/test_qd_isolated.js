const fs = require('fs');
const code = fs.readFileSync('public/synthetic-data-generator/assets/index-Jk-OVQu0.js', 'utf8');
const qdMarker = 'function qd(e){if(!e)return"";';
const qdStart = code.indexOf(qdMarker);
const qdEnd = code.indexOf('return t;}', qdStart) + 10;
const qdStr = code.substring(qdStart, qdEnd);
const fn = new Function('e', qdStr.substring(qdStr.indexOf('{') + 1, qdStr.lastIndexOf('}')));

const tests = [
  '$readelf -h /bin/ls # View the Program Headers$',
  '$cat /proc/1/cmdline$',
  '$E = hc/lambda$',
  '$1/N$',
  '$6CO2 + 6H2O + light energy ->{chlorophyll} C6H12O6 + 6O2$',
  'Where: • E is the energy of the photon. • h is Planck?s constant ($J*s). • c is the speed of light ($m/s).',
  '$6.626 x 10-34$',
  '$3.0 x 10^8$',
  '$10-12$',
  '$2H2O -> 4H+ + 4e- + O2$',
  '11. Historical Milestones and Experimentation\nHistorical Milestones and Experimentation'
];

for (const t of tests) {
  console.log('INPUT: ', t);
  console.log('OUTPUT:', fn(t));
  console.log('---');
}
