let s = 'CF_0CF_1';
s1 = s.replace(/\b(PQH|CF)_(\d+)/g, '$1$2');
console.log('Pass 1 with \\b only:', s1);
s2 = s1.replace(/(?:\b|(?<=\d))(PQH|CF)_(\d+)/g, '$1$2');
console.log('Pass 2 with (?<=\\d):', s2);
