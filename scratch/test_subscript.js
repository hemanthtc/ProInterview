function convertSub(s) {
  let res = s;
  // 1. Single letter math subscript: \b([A-Za-z])_([A-Za-z])\b (e.g. F_X -> FX, b_L -> bL, Q_A -> QA)
  res = res.replace(/\b([A-Za-z])_([A-Za-z])\b/g, '$1$2');
  
  // 2. Chemical formulas & numbered variables where base is a single letter at word boundary or after stoichiometric number:
  // (e.g. A_0 -> A0, H_2O -> H2O, 2H_2O -> 2H2O, O_2 -> O2, P_700 -> P700)
  res = res.replace(/(?:\b|(?<=\d))([A-Za-z])_(\d+)([A-Za-z0-9]*)/g, '$1$2$3');
  
  // 3. 2-letter chemical element (e.g. Mn_4 -> Mn4, Fe_2 -> Fe2)
  res = res.replace(/(?:\b|(?<=\d))([A-Z][a-z])_(\d+)/g, '$1$2');

  // 4. Multi-element chemical formula where an element symbol follows another element (e.g. CaO_5 -> CaO5, H2SO_4 -> H2SO4)
  // Preceded by lowercase letter (end of previous element like Ca) or digit (like 2 in H2)
  res = res.replace(/(?<=[a-z0-9])([A-Z])_(\d+)/g, '$1$2');
  
  return res;
}

const tests = [
  'F_X',
  'A_0',
  'H_2O',
  '2H_2O',
  'O_2',
  'P_700',
  'Mn_4CaO_5',
  'ARG_1',
  'SIGRTMIN_1',
  'PIPE_2',
  'task_struct',
  'sched_setaffinity',
  'oom_score_adj',
  'MAX_TEXT',
  'my_var'
];

for (const t of tests) {
  console.log(`${t} -> ${convertSub(t)}`);
}
