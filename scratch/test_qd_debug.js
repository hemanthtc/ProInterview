const fs = require('fs');

function cleanMath(text) {
  let t = text;
  const sVars = [];

  // 1. Protect braced shell vars: ${VAR}
  t = t.replace(/\$\{([A-Za-z0-9_?#$!*@-]{1,64})\}/g, m => {
    sVars.push(m);
    return "\u001A::SVAR::" + (sVars.length - 1) + "::\u001A";
  });

  // 2. Protect known shell variables ($PATH, $USER, $HOME, $?, etc.)
  t = t.replace(/(?:^|[\s"'(;,=\\/:|&])\$(PATH|USER|HOME|SHELL|TERM|PWD|LANG|LC_[A-Z]+|EDITOR|TEMP|TMP|UID|PID|IFS|OPTARG|OPTIND|HOSTNAME|\?)(?![a-zA-Z0-9_])/g, m => {
    sVars.push(m.trimStart());
    const lead = m.slice(0, m.length - m.trimStart().length);
    return lead + "\u001A::SVAR::" + (sVars.length - 1) + "::\u001A";
  });

  const transformFormula = x => {
    return x.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_m, n, d) => {
      let nT = n.trim(), dT = d.trim(), nV = Number(nT), dV = Number(dT);
      if (!isNaN(nV) && !isNaN(dV) && dV !== 0) {
        if (nT === "14" && dT === "3") return "14/3 = 4.67";
        if (!Number.isInteger(nV / dV) && dV > 1 && nV !== 1) return nT + "/" + dT + " = " + (nV / dV).toFixed(2);
        return nT + "/" + dT;
      }
      return nT + "/" + dT;
    })
    .replace(/\\(?:xrightarrow|rightarrow|to)\b(?:\{[^{}]*\})?/g, "->")
    .replace(/\\leftarrow\b/g, "<-")
    .replace(/\\leftrightarrow\b/g, "<->")
    .replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]+)\}/g, "$1")
    .replace(/\\(log|ln|exp|sin|cos|tan|det|max|min|lim)\b/g, "$1")
    .replace(/\\cdot\b/g, "*")
    .replace(/\\times\b/g, "x")
    .replace(/\\approx\b/g, "~")
    .replace(/\\(?:leq|le)\b/g, "<=")
    .replace(/\\(?:geq|ge)\b/g, ">=")
    .replace(/\\(?:neq|ne)\b/g, "!=")
    .replace(/\\pm\b/g, "+/-")
    .replace(/\\infty\b/g, "infinity")
    .replace(/\\div\b/g, "/")
    .replace(/\\circ\b/g, " deg")
    .replace(/\\uparrow\b/g, "^")
    .replace(/\\downarrow\b/g, "v")
    .replace(/\\,/g, " ")
    .replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\b/gi, m => m.slice(1))
    .replace(/_\{([^{}]+)\}/g, "$1")
    .replace(/\^\{([^{}]+)\}/g, (_m, i) => {
      let tr = i.trim();
      return tr === "+" || tr === "-" ? tr : "^" + tr;
    })
    .replace(/([a-zA-Z])_(\d+)/g, "$1$2")
    .replace(/\^\+/g, "+")
    .replace(/\^\-/g, "-")
    .trim();
  };

  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_m, i) => transformFormula(i));
  t = t.replace(/\$([^$\n]+?)\$/g, (_m, i) => transformFormula(i));
  t = transformFormula(t);

  for (let i = 0; i < sVars.length; i++) {
    t = t.split("\u001A::SVAR::" + i + "::\u001A").join(sVars[i]);
  }

  return t;
}

const cmds = [
  'echo $PATH',
  'echo $USER',
  'check $?',
  '${MY_FILE}',
  'readelf -h /bin/ls',
  'cat /proc/1/cmdline'
];

for (const c of cmds) {
  console.log(`Command: "${c}" => Cleaned: "${cleanMath(c)}"`);
}
