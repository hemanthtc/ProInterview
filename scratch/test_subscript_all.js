function convertSub(s) {
  let res = s;
  // 1. Single letter math subscript: \b([A-Za-z])_([A-Za-z])\b (e.g. F_X -> FX, b_L -> bL, Q_A -> QA)
  res = res.replace(/\b([A-Za-z])_([A-Za-z])\b/g, '$1$2');
  
  // 2. Multi-letter biochemical / chemical prefixes (e.g. PQH_2 -> PQH2, CF_0 -> CF0, CF_1 -> CF1, CF_0CF_1 -> CF0CF1, RuBP_2 -> RuBP2, NADP_2 -> NADP2)
  res = res.replace(/(?:\b|(?<=\d))(PQH|CF|PQ|PC|Cyt|PS|PSI|PSII|RuBP|PGA|G3P|Fd|FNR|Chl|Pheo|NADP|NADPH|ATP|ADP|CO|SO|NO|PO|OH)_(\d+)/g, '$1$2');

  // 3. Chemical formulas & numbered variables where base is a single letter at word boundary or after stoichiometric number:
  // (e.g. A_0 -> A0, H_2O -> H2O, 2H_2O -> 2H2O, O_2 -> O2, P_700 -> P700)
  res = res.replace(/(?:\b|(?<=\d))([A-Za-z])_(\d+)([A-Za-z0-9]*)/g, '$1$2$3');
  
  // 4. 2-letter chemical element (e.g. Mn_4 -> Mn4, Fe_2 -> Fe2)
  res = res.replace(/(?:\b|(?<=\d))([A-Z][a-z])_(\d+)/g, '$1$2');

  // 5. Multi-element chemical formula where an element symbol follows another element (e.g. CaO_5 -> CaO5, H2SO_4 -> H2SO4)
  res = res.replace(/(?<=[a-z0-9])([A-Z])_(\d+)/g, '$1$2');
  
  return res;
}

const tests = [
  // Multi-letter chemistry subscripts
  ['PQH_2', 'PQH2'],
  ['CF_0CF_1', 'CF0CF1'],
  ['CF_0', 'CF0'],
  ['CF_1', 'CF1'],
  ['CF_0CF_1-ATP synthase', 'CF0CF1-ATP synthase'],
  ['Plastoquinol (PQH_2)', 'Plastoquinol (PQH2)'],

  // Single-letter and basic chemistry
  ['F_X', 'FX'],
  ['A_0', 'A0'],
  ['H_2O', 'H2O'],
  ['2H_2O', '2H2O'],
  ['O_2', 'O2'],
  ['P_700', 'P700'],
  ['Mn_4CaO_5', 'Mn4CaO5'],
  ['b_L', 'bL'],

  // Constants & identifiers (MUST NOT CHANGE)
  ['ARG_1', 'ARG_1'],
  ['SIGRTMIN_1', 'SIGRTMIN_1'],
  ['PIPE_2', 'PIPE_2'],
  ['task_struct', 'task_struct'],
  ['sched_setaffinity', 'sched_setaffinity'],
  ['oom_score_adj', 'oom_score_adj'],
  ['MAX_TEXT', 'MAX_TEXT'],
  ['my_var', 'my_var']
];

let failed = 0;
for (const [input, expected] of tests) {
  const actual = convertSub(input);
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${input} -> ${actual} (expected: ${expected})`);
}

console.log(`Summary: ${tests.length - failed}/${tests.length} passed.`);
