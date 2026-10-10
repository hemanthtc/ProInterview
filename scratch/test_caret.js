const testCases = [
  '10^-34',
  '6.626 x 10^-34 J*s',
  '4e^-',
  '2e^-',
  'Mn^2+',
  'x^2',
  'y^3',
  'P700+^',
  '360^ deg',
  '4H^+',
  'foo^ bar'
];

function testNormalize(s) {
  let res = s;
  // LaTeX ^{...}
  res = res.replace(/\^\{([^{}]+)\}/g, (_m, inner) => '^' + inner.trim());
  
  // Stray carets:
  // 1. Trailing caret after charge sign (P700+^ -> P700+)
  res = res.replace(/([a-zA-Z0-9]+[+-])\^/g, '$1');
  
  // 2. Stray caret before deg (360^ deg -> 360 deg)
  res = res.replace(/(?<=\d)\^\s*deg\b/g, ' deg');
  res = res.replace(/\^(\s*deg\b)/g, ' deg');
  
  // 3. Lone stray caret after alphanumeric followed by whitespace/end without sign or exponent
  res = res.replace(/([a-zA-Z0-9])\^(?=[,\s.;:)\]}]|$)/g, '$1');
  
  return res;
}

for (const tc of testCases) {
  console.log(`${tc} -> ${testNormalize(tc)}`);
}
