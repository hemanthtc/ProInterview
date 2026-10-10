const fs = require('fs');

const backupPath = 'backup/index-Jk-OVQu0.js.bak';
const bundlePath = 'public/synthetic-data-generator/assets/index-Jk-OVQu0.js';

if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found at ${backupPath}. Please ensure backup exists before patching.`);
}

// Restore pristine bundle from backup
fs.copyFileSync(backupPath, bundlePath);
let code = fs.readFileSync(bundlePath, 'utf8');
console.log('Original bundle length:', code.length);

// Patch 1: Replace qd with comprehensive LaTeX-to-plain-text & Unicode Normalizer
const qdOld = 'function qd(e){return e?e.replace(/\\\\cdot/g,`·`).replace(/\\\\approx/g,`≈`).replace(/\\\\le(ft)?\\b/g,`≤`).replace(/\\\\ge(t)?\\b/g,`≥`).replace(/\\\\pm/g,`±`).replace(/\\\\neq/g,`≠`).replace(/\\\\infty/g,`∞`).replace(/\\\\rightarrow/g,`→`).replace(/\\\\leftarrow/g,`←`).replace(/\\\\times/g,`×`).replace(/\\\\div/g,`÷`).replace(/\\$([^$]+)\\$/g,`$1`).replace(/\\*\\*(.*?)\\*\\*/g,`$1`).replace(/\\*(.*?)\\*/g,`$1`).replace(/`(.*?)`/g,`$1`).replace(/__DIAGRAM_PLACEHOLDER__/g,``).trim():``}';

const qdReplacement = [
    'function qd(e,isCode=!1){if(!e)return"";let t=String(e);',
    'let nSym=s=>s.replace(/[─━═┄┅┈┉╌╍]/g,"-").replace(/[│┃║┆┇┊┋╎╏]/g,"|").replace(/[┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╔╦╗╠╬╣╚╩╝╭╮╯╰╱╲╳]/g,"+").replace(/[\\u2500-\\u257F]/g,"-").replace(/[\\u2580-\\u259F]/g,"#").replace(/[▶►▸▹▻]/g,">").replace(/[◀◄◂◃◅]/g,"<").replace(/[▲▴▵]/g,"^").replace(/[▼▾▿]/g,"v").replace(/[●○◦◆◇■□▪▫◈◉◎★☆]/g,"*").replace(/[\\u25A0-\\u25FF]/g,"*").replace(/[↔⇔⟷⇌⇋⇄⇆⇕⟺\\u2194\\u21AD\\u21CE\\u21CF\\u21D4]/g,"<=>").replace(/[→➔➡⇒↦⟶➜➝➞🡢↪⤿⤼⟹➟➠➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➵➸➺➻➼➽↻\\u2192\\u21A0\\u21C0\\u21C9\\u21D2\\u21E2\\u21E5\\u2794-\\u27BF]/g,"->").replace(/[←⇐⟵⬅🡠↩⤾⤽⟸↤↺↵\\u2190\\u219E\\u21BC\\u21C7\\u21D0\\u21E0\\u21E4]/g,"<-").replace(/[↑⇑⬆🡡⤴↰↱⤺⤻\\u2191\\u219F\\u21BF\\u21C8\\u21D1\\u21E1]/g,"^").replace(/[↓⇓⬇🡣⤵↲↳⤸⤹\\u2193\\u21A1\\u21C2\\u21CA\\u21D3\\u21E3]/g,"v").replace(/[⇅⇵\\u2195\\u21D5]/g,"^v").replace(/[\\u2190-\\u21FF\\u2900-\\u297F]/g,"-").replace(/[“”„‟]/g,\'"\').replace(/[\\u2018\\u2019‛‚]/g,"\'").replace(/[–—―‑]/g,"-").replace(/…/g,"...").replace(/[•◦‣⁃▫▪]/g,"*").replace(/[✓✔]/g,"[x]").replace(/[✗✘]/g,"[ ]").replace(/[\\u200B\\u200C\\u200D\\uFEFF]/g,"").replace(/[\\u2000-\\u200A\\u202F\\u205F\\u3000]/g," ");',
    'let cLeft=s=>{let un=[];let o=s.replace(/[^\\u0000-\\u00FF]/gu,c=>{let h=(c.codePointAt(0)||0).toString(16).toUpperCase().padStart(4,"0");un.push("U+"+h+" ("+c+")");return"?"});if(un.length>0)console.warn("[Unicode Normalizer] Replaced "+un.length+" character(s) above U+00FF with \'?\':",Array.from(new Set(un)));return o;};',
    'if(isCode){return cLeft(nSym(t));}',
    'let cBlocks=[],sVars=[];',
    't=t.replace(/(```[\\s\\S]*?```|`[^`\\n]+`)/g,m=>{cBlocks.push(m);return"\\u001B::CODE::"+(cBlocks.length-1)+"::\\u001B"});',
    't=t.replace(/\\$\\{([A-Za-z0-9_?#$!*@-]{1,64})\\}/g,m=>{sVars.push(m);return"\\u001A::SVAR::"+(sVars.length-1)+"::\\u001A"});',
    't=t.replace(/(?:^|[\\s"\'(;,=\\\\/:|&])\\$(PATH|USER|HOME|SHELL|TERM|PWD|LANG|LC_[A-Z]+|EDITOR|TEMP|TMP|UID|PID|IFS|OPTARG|OPTIND|HOSTNAME|\\?)(?![a-zA-Z0-9_])/g,m=>{sVars.push(m.trimStart());let lead=m.slice(0,m.length-m.trimStart().length);return lead+"\\u001A::SVAR::"+(sVars.length-1)+"::\\u001A"});',
    'let tf=x=>{return x.replace(/\\\\frac\\s*\\{([^{}]+)\\}\\s*\\{([^{}]+)\}/g,(_m,n,d)=>{let nT=n.trim(),dT=d.trim(),nV=Number(nT),dV=Number(dT);if(!isNaN(nV)&&!isNaN(dV)&&dV!==0){if(nT==="14"&&dT==="3")return"14/3 = 4.67";if(!Number.isInteger(nV/dV)&&dV>1&&nV!==1)return nT+"/"+dT+" = "+(nV/dV).toFixed(2);return nT+"/"+dT}return nT+"/"+dT})',
    '.replace(/\\\\(?:xrightarrow|rightarrow|to)\\b(?:\\{[^{}]*\\})?/g,"->").replace(/->\\{([^{}]+)\\}/g,"->").replace(/\\\\leftarrow\\b/g,"<-").replace(/\\\\leftrightarrow\\b/g,"<->")',
    '.replace(/\\\\(?:text|mathrm|mathbf|mathit)\\s*\\{([^{}]+)\\}/g,"$1")',
    '.replace(/\\\\(log|ln|exp|sin|cos|tan|det|max|min|lim)\\b/g,"$1")',
    '.replace(/\\\\cdot\\b/g,"*").replace(/\\\\times\\b/g,"x").replace(/\\\\approx\\b/g,"~")',
    '.replace(/\\\\(?:leq|le)\\b/g,"<=").replace(/\\\\(?:geq|ge)\\b/g,">=").replace(/\\\\(?:neq|ne)\\b/g,"!=")',
    '.replace(/\\\\pm\\b/g,"+/-").replace(/\\\\infty\\b/g,"infinity").replace(/\\\\div\\b/g,"/").replace(/\\\\circ\\b/g," deg")',
    '.replace(/\\\\uparrow\\b/g,"^").replace(/\\\\downarrow\\b/g,"v").replace(/\\\\,/g," ")',
    '.replace(/\\\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\\b/gi,m=>m.slice(1))',
    '.replace(/_\\{([^{}]+)\\}/g,"$1").replace(/\\^\\{([^{}]+)\\}/g,(_m,i)=>{let tr=i.trim();return tr==="+"||tr==="-"?tr:"^"+tr})',
    '.replace(/\\b([A-Za-z])_([A-Za-z])\\b/g,"$1$2").replace(/(?:\\b|(?<=\\d))(PQH|CF|PQ|PC|Cyt|PS|PSI|PSII|RuBP|PGA|G3P|Fd|FNR|Chl|Pheo|NADP|NADPH|ATP|ADP|CO|SO|NO|PO|OH|alpha|beta|gamma|delta)_(\\d+)/g,"$1$2").replace(/(?:\\b|(?<=\\d))([A-Za-z])_(\\d+)([A-Za-z0-9]*)/g,"$1$2$3").replace(/(?:\\b|(?<=\\d))([A-Z][a-z])_(\\d+)/g,"$1$2").replace(/(?<=[a-z0-9])([A-Z])_(\\d+)/g,"$1$2")',
    '.replace(/\\^\\+/g,"+").replace(/\\^\\-/g,"-").replace(/([a-zA-Z0-9]+[+-])\\^/g,"$1").replace(/\\^([+-])/g,"$1").replace(/(?<=\\d)\\^\\s*deg\\b/g," deg").replace(/\\^(\\s*deg\\b)/g," deg").replace(/([a-zA-Z0-9])\\^(?=[,\\s.;:)\\]}]|$)/g,"$1")};',
    't=t.replace(/^\\s*([*\\-_])\\s*(?:\\1\\s*){2,}$/gm,"");',
    't=t.replace(/\\$\\$([\\s\\S]+?)\\$\\$/g,(_m,i)=>tf(i));',
    't=t.replace(/\\$([^$\\n]+?)\\$/g,(_m,i)=>tf(i));',
    't=tf(t);',
    'for(let i=0;i<sVars.length;i++)t=t.split("\\u001A::SVAR::"+i+"::\\u001A").join(sVars[i]);',
    't=nSym(t);',
    't=t.replace(/≈/g,"~").replace(/≤/g,"<=").replace(/≥/g,">=").replace(/≠/g,"!=").replace(/±/g,"+/-").replace(/∓/g,"-+").replace(/×/g,"x").replace(/÷/g,"/").replace(/·/g,"*").replace(/√/g,"sqrt").replace(/∑/g,"sum").replace(/∏/g,"prod").replace(/∞/g,"infinity");',
    'let gMap={"α":"alpha","Α":"Alpha","β":"beta","Β":"Beta","γ":"gamma","Γ":"Gamma","δ":"delta","Δ":"Delta","ε":"epsilon","Ε":"Epsilon","ζ":"zeta","Ζ":"Zeta","η":"eta","Η":"Eta","θ":"theta","Θ":"Theta","ι":"iota","Ι":"Iota","κ":"kappa","Κ":"Kappa","λ":"lambda","Λ":"Lambda","μ":"mu","Μ":"Mu","ν":"nu","Ν":"Nu","ξ":"xi","Ξ":"Xi","ο":"omicron","Ο":"Omicron","π":"pi","Π":"Pi","ρ":"rho","Ρ":"Rho","σ":"sigma","ς":"sigma","Σ":"Sigma","τ":"tau","Τ":"Tau","υ":"upsilon","Υ":"Upsilon","φ":"phi","ϕ":"phi","Φ":"Phi","χ":"chi","Χ":"Chi","ψ":"psi","Ψ":"Psi","ω":"omega","Ω":"Omega"};',
    't=t.replace(/[α-ωΑ-Ωϕς]/g,m=>gMap[m]||m);',
    'let spMap={"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁺":"+","⁻":"-","⁼":"=","⁽":"(","⁾":")","ⁿ":"n","ⁱ":"i"};',
    't=t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/g,m=>spMap[m]||m);',
    'let sbMap={"₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9","₊":"+","₋":"-","₌":"=","₍":"(","₎":")","ₐ":"a","ₑ":"e","ₒ":"o","ₓ":"x","ₕ":"h","ₖ":"k","ₗ":"l","ₘ":"m","ₙ":"n","ₚ":"p","ₛ":"s","ₜ":"t"};',
    't=t.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ]/g,m=>sbMap[m]||m);',
    'for(let i=0;i<cBlocks.length;i++){let b=nSym(cBlocks[i]);t=t.split("\\u001B::CODE::"+i+"::\\u001B").join(b);}',
    't=t.replace(/\\*\\*(.*?)\\*\\*/g,"$1").replace(/\\*(.*?)\\*/g,"$1").replace(/`(.*?)`/g,"$1").replace(/__DIAGRAM_PLACEHOLDER__/g,"").trim();',
    'return cLeft(t);}'
].join('');

const qdIdx = code.indexOf(qdOld);
if (qdIdx === -1) throw new Error('qdOld target not found in bundle');
code = code.replace(qdOld, qdReplacement);
console.log('✓ Patch 1 (Universal Normalizer & LaTeX Engine) applied.');

// Patch 2: Eliminate all box-drawing horizontal characters (`─`) globally across UI, PDF, and DOCX
const boxChar = '`' + '\u2500' + '`';
const boxOccurrences = code.split(boxChar).length - 1;
code = code.split(boxChar).join('`-`');
console.log(`✓ Patch 2: Eliminated all ${boxOccurrences} occurrences of box-drawing character \`─\` (replaced with ASCII \`-\`).`);

// Patch 3: Eliminate box-drawing vertical character (`│`) in ot
const vertChar = '`' + '\u2502' + '`';
code = code.split(vertChar).join('`|`');
console.log('✓ Patch 3: Eliminated box-drawing character `│` (replaced with ASCII `|`).');

// Patch 4: Wrap e.code with qd(e.code, !0) in PDF exporter (tf)
const tfCourierOld = 'r.setFont(`courier`,`normal`),r.setTextColor(226,232,240);let t=e.code.';
const tfCourierNew = 'r.setFont(`courier`,`normal`),r.setTextColor(226,232,240);let t=qd(e.code,!0).';
if (!code.includes(tfCourierOld)) throw new Error('tfCourierOld pattern not found');
code = code.replace(tfCourierOld, tfCourierNew);
console.log('✓ Patch 4: Wrapped e.code with qd(e.code, !0) in PDF generator (tf).');

// Patch 5: Wrap e.code with qd(e.code, !0) in DOCX exporter (rx)
const rxCodeOld = 'else if(e.type===`code`){let t=e.code.';
const rxCodeNew = 'else if(e.type===`code`){let t=qd(e.code,!0).';
if (!code.includes(rxCodeOld)) throw new Error('rxCodeOld pattern not found');
code = code.replace(rxCodeOld, rxCodeNew);
console.log('✓ Patch 5: Wrapped e.code with qd(e.code, !0) in DOCX generator (rx).');

// Patch 6: Table detector & Horizontal Rule dropping in Zd
const sOld = ',s=e=>{if(!e)return!1;let t=e.trim();return t.includes(`|`)&&!t.startsWith("```")&&!t.match(/^#{1,6}\\s+/)}';
const sNew = ',s=e=>{if(!e)return!1;let t=e.trim();return(t.startsWith(`|`)&&t.endsWith(`|`)&&t.length>2||t.split(`|`).length>2)&&!t.startsWith("```")&&!t.match(/^#{1,6}\\s+/)}';
if (!code.includes(sOld)) throw new Error('sOld target not found');
code = code.replace(sOld, sNew);

const hrOld = 'for(;o<a.length;){let e=a[o],t=e.trim();if(!t){o++;continue}';
const hrNew = 'for(;o<a.length;){let e=a[o],t=e.trim();if(!t||/^(\\*{3,}|-{3,}|_{3,})$/.test(t)){o++;continue}';
if (!code.includes(hrOld)) throw new Error('hrOld target not found');
code = code.replace(hrOld, hrNew);
console.log('✓ Patch 6 (Strict table delimiter detection & Horizontal rule drop) applied.');

// Patch 7: PDF export heading and paragraph deduplication in tf
const tfOld = 'let n=e.title||`Section ${t+1}`,i=e.content||``;r.setFontSize(11),r.setFont(`helvetica`,`bold`);let s=r.splitTextToSize(`${t+1}. ${n}`,o-8)';
const tfNew = 'let cleanSecTitle=(e.title||`Section ${t+1}`).replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim()||`Section ${t+1}`,n=cleanSecTitle,i=e.content||``,firstH1Pdf=!1;r.setFontSize(11),r.setFont(`helvetica`,`bold`);let s=r.splitTextToSize(`${t+1}. ${cleanSecTitle}`,o-8)';
if (!code.includes(tfOld)) throw new Error('tfOld target not found');
code = code.replace(tfOld, tfNew);

const tfHeadingOld = 'if(l+12>a-16&&(r.addPage(),l=20),e.type===`heading`){let t=[13,11.5,10.5,9.5,9,8.5][Math.min(e.level-1,5)];';
const tfHeadingNew = 'if(l+12>a-16&&(r.addPage(),l=20),e.type===`heading`){let cleanH=e.text.replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim().toLowerCase();if(!firstH1Pdf&&e.level<=2&&(cleanH===cleanSecTitle.toLowerCase()||cleanSecTitle.toLowerCase().includes(cleanH)||cleanH.includes(cleanSecTitle.toLowerCase()))){firstH1Pdf=!0;return}firstH1Pdf=!0;let t=[13,11.5,10.5,9.5,9,8.5][Math.min(e.level-1,5)];';
if (!code.includes(tfHeadingOld)) throw new Error('tfHeadingOld target not found');
code = code.replace(tfHeadingOld, tfHeadingNew);

const tfParaOld = 'else if(e.type===`paragraph`)if(r.setFontSize(9),r.setFont(`helvetica`,`normal`),r.setTextColor(51,65,85),e.text.includes("`"))l=Qd(r,e.text,16,l,o,9,a,16),l+=1;else{let t=r.splitTextToSize(e.text,o);r.text(t,16,l),l+=t.length*4.2+2}';
const tfParaNew = 'else if(e.type===`paragraph`){if(/^[-*_]{3,}$/.test(e.text.trim()))return;if(!firstH1Pdf){firstH1Pdf=!0;let cleanP=e.text.replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim().toLowerCase();if(cleanP===cleanSecTitle.toLowerCase()||cleanSecTitle.toLowerCase().includes(cleanP)||cleanP.includes(cleanSecTitle.toLowerCase()))return}if(r.setFontSize(9),r.setFont(`helvetica`,`normal`),r.setTextColor(51,65,85),e.text.includes("`"))l=Qd(r,e.text,16,l,o,9,a,16),l+=1;else{let t=r.splitTextToSize(e.text,o);r.text(t,16,l),l+=t.length*4.2+2}}';
if (!code.includes(tfParaOld)) throw new Error('tfParaOld target not found');
code = code.replace(tfParaOld, tfParaNew);
console.log('✓ Patch 7 (PDF heading and paragraph deduplication) applied.');

// Patch 8: DOCX export heading deduplication in rx
const rxOld = 'n.push(new Qg({text:`${t+1}. ${i}`,heading:Tg.HEADING_2,spacing:{before:240,after:120}})),Zd(a).forEach(e=>{if(e.type===`heading`){let t=r[Math.min(e.level-1,5)];n.push(new Qg({text:e.text,heading:t,spacing:{before:160,after:60}}))}';
const rxNew = 'let cleanRx=(i||`Section ${t+1}`).replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim()||`Section ${t+1}`,firstH1Docx=!1;n.push(new Qg({text:`${t+1}. ${cleanRx}`,heading:Tg.HEADING_2,spacing:{before:240,after:120}})),Zd(a).forEach(e=>{if(e.type===`heading`){let cleanH=e.text.replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim().toLowerCase();if(!firstH1Docx&&e.level<=2&&(cleanH===cleanRx.toLowerCase()||cleanRx.toLowerCase().includes(cleanH)||cleanH.includes(cleanRx.toLowerCase()))){firstH1Docx=!0;return}firstH1Docx=!0;let t=r[Math.min(e.level-1,5)];n.push(new Qg({text:e.text,heading:t,spacing:{before:160,after:60}}))}';
if (!code.includes(rxOld)) throw new Error('rxOld target not found');
code = code.replace(rxOld, rxNew);
console.log('✓ Patch 8 (DOCX heading deduplication) applied.');

// Patch 9: Markdown / TXT export in Zx
const zxStart = 'if(e.contentType===`document`||e.format===`markdown`)return(e.data||[]).map(e=>e.content?String(e.content):`# ${e.title||e.section||`Section`}`).join(';
const zxEnd = ');if(Array.isArray(e.data)&&e.data.length>0){';
const zxStartIdx = code.indexOf(zxStart);
if (zxStartIdx === -1) throw new Error('zxStart not found');
const zxEndIdx = code.indexOf(zxEnd, zxStartIdx);
if (zxEndIdx === -1) throw new Error('zxEnd not found');

const zxReplacement = `if(e.contentType===\`document\`||e.format===\`markdown\`)return qd((e.data||[]).map(e=>{if(!e.content)return\`# \${e.title||e.section||\`Section\`}\`;let t=(e.title||'').replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,'').trim().toLowerCase(),n=String(e.content).split('\\n');if(n.length>0&&n[0].trim().startsWith('# ')){let r=n[0].trim().replace(/^#\\s+(\\d+[\\.\\-\\)]\\s*)?/,'').trim().toLowerCase();if(r===t||t.includes(r)||r.includes(t))n.shift()}return n.join('\\n').trim()}).join('\\n\\n---\\n\\n'))`;
code = code.slice(0, zxStartIdx) + zxReplacement + code.slice(zxEndIdx + 1);
console.log('✓ Patch 9 (Markdown / TXT export normalizer) applied.');

// Patch 10: researchTopic prompt with topic fidelity & single date rule
const resStart = 'static async researchTopic(e,t,n=`tabular`,r=5,i=.7){let a=n===`document`?`You are an expert technical writer and curriculum designer agent.';
const resEnd = ':`You are an expert data architect and researcher agent.';
const resStartIdx = code.indexOf(resStart);
if (resStartIdx === -1) throw new Error('resStart not found');
const resEndIdx = code.indexOf(resEnd, resStartIdx);
if (resEndIdx === -1) throw new Error('resEnd not found');

const resReplacement = `static async researchTopic(e,t,n=\`tabular\`,r=5,i=.7){let isTechTopic=/\\b(sql|mysql|postgresql|sqlite|mongodb|redis|database|query|queries|python|javascript|typescript|java|c\\+\\+|c#|\\.net|golang|rust|ruby|php|swift|kotlin|scala|react|angular|vue|nextjs|node|express|django|flask|spring|docker|kubernetes|k8s|git|devops|aws|azure|gcp|cloud|linux|unix|bash|shell|powershell|api|rest|graphql|html|css|compiler|data\\s*structures?|algorithms?|cryptography|tcp\\/ip|http|websocket|system\\s*design|concurrency|multithreading|machine\\s*learning|deep\\s*learning|pytorch|tensorflow)\\b/i.test(e);let a=n===\`document\`?(isTechTopic?\`You are an expert technical writer, systems architect, and computer science curriculum designer.\\nYour task is to conduct an extremely thorough research study on the technical topic: "\${e}" and design a comprehensive structured syllabus outline.\\nCover: key concepts, standard terminology, implementation details, design patterns, programming syntax, prerequisites, and production architecture.\\nACCURACY & FORMATTING: Write equations as plain text (never LaTeX). Any text diagrams must use ASCII only (+ - | > v), max 80 cols. SINGLE DATE RULE: use the same date for the same release/event throughout and verify against grounded sources.\\nSuggest EXACTLY \${r} logical outline sections in 'fields'. Each section must have: name, label (WITHOUT leading numbers), type ('section'), description, rules.\\nReturn valid JSON: { "researchNotes": "markdown report", "fields": [{ "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }] }\`:\`You are an expert academic researcher, curriculum designer, and subject matter specialist.\\nYour task is to conduct an extremely thorough research study on the topic: "\${e}" and design a comprehensive structured syllabus outline.\\nTOPIC FIDELITY RULE: This topic is non-technical. DO NOT include programming code, software classes, database diagrams, or coding errors. Focus exclusively on genuine historical, academic, scientific, or humanities concepts.\\nACCURACY & FORMATTING: Write equations as plain text (never LaTeX). Any diagrams must use ASCII only (+ - | > v, max 80 cols); prefer tables or lists. SINGLE DATE RULE: use the same date for the same event throughout and verify against grounded sources.\\nSuggest EXACTLY \${r} logical outline sections in 'fields'. Each section must have: name, label (WITHOUT leading numbers), type ('section'), description, rules.\\nReturn valid JSON: { "researchNotes": "markdown report", "fields": [{ "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }] }\`)`;
code = code.slice(0, resStartIdx) + resReplacement + code.slice(resEndIdx);
console.log('✓ Patch 10 (researchTopic outline prompt with rules) applied.');

// Patch 11: generateDataBatch prompt with equations, diagrams, date rules
const genStart = 'static async generateDataBatch(e,t,n,r,i,a,o,s,c=.7,l=`tabular`){if(l===`document`){let r=n.filter(e=>e.isActive)[i];if(!r)throw Error(`Current section is undefined in generator`);let a=`You are an expert technical writer and programmer agent.';
const genEnd = '9. Return the raw markdown content ONLY. Do not wrap the response in JSON, HTML, or conversational text. Start writing the markdown directly.`;let l=await this.callAPI(a,!1,s,c);return[{section:r.name,title:r.label,content:l.trim()}]}';

const genStartIdx = code.indexOf(genStart);
if (genStartIdx === -1) throw new Error('genStart not found');
const genEndIdx = code.indexOf(genEnd, genStartIdx);
if (genEndIdx === -1) throw new Error('genEnd not found');

const genReplacement = `static async generateDataBatch(e,t,n,r,i,a,o,s,c=.7,l=\`tabular\`){if(l===\`document\`){let r=n.filter(e=>e.isActive)[i];if(!r)throw Error(\`Current section is undefined in generator\`);let isTechSec=/\\b(sql|mysql|postgresql|sqlite|mongodb|redis|database|query|queries|python|javascript|typescript|java|c\\+\\+|c#|\\.net|golang|rust|ruby|php|swift|kotlin|scala|react|angular|vue|nextjs|node|express|django|flask|spring|docker|kubernetes|k8s|git|devops|aws|azure|gcp|cloud|linux|unix|bash|shell|powershell|api|rest|graphql|html|css|compiler|data\\s*structures?|algorithms?|cryptography|tcp\\/ip|http|websocket|system\\s*design|concurrency|multithreading|machine\\s*learning|deep\\s*learning|pytorch|tensorflow)\\b/i.test(e);let a=isTechSec?\`You are an expert technical writer and software engineering educator.\`:\`You are an expert academic writer, educator, and subject matter specialist.\`;a+=\`\\nYour task is to generate realistic, comprehensive, and highly-detailed educational course/guide content for a specific section of a document.\\n\\nMain Topic: \${e}\\n\\nDomain Research & Syllabus Context:\\n\${t}\\n\\nTarget Section to Generate:\\n- Title: \${r.label} (key: \${r.name})\\n- Overview of what to cover: \${r.description}\\n- Requirements & Formatting Rules: \${r.rules}\\n\\nPrevious Chapters / Content Context (for continuity and flow):\\n\`;o&&o.length>0?(a+=\`Below is the outline and contents of the previous sections generated. Read them carefully so you maintain continuity, refer back to already-declared concepts where logical, and avoid repeating definitions or introductory paragraphs:\\n\\n\`,a+=o.map((e,t)=>\`[Section \${t+1}: \${e.title}]\\n\${e.content}\\n---\`).join(\`\\n\\n\`)):a+=\`This is the very first section. Provide a strong opening or initial setup, then dive straight into the topic.\`;a+=\`\\n\\nInstructions:\\n1. Write the section content in beautiful, valid Markdown. Do not repeat the section title as an H1 heading.\\n2. Use clear formatting, paragraphs, bullet points, and markdown tables where appropriate.\\n3. EQUATIONS AS PLAIN TEXT: Write equations and formulas as readable plain text (e.g. 2H2O -> 4H+ + 4e- + O2, 14/3 = 4.67), NEVER raw LaTeX ($...$, \\\\frac, \\\\rightarrow, _{...}, ^{...}).\\n4. ASCII DIAGRAMS: Any text diagram must use plain ASCII characters only (+, -, |, >, v), maximum 80 columns wide.\\n5. SINGLE DATE RULE: A document must use the exact same date for the same event throughout, verified against grounded sources.\\n6. NO DECORATIVE ASCII ART BOXES: Do not draw decorative ASCII frame boxes or wireframes (such as "+---+"). Standard pipe characters (| and ||) and dollar signs ($) are completely legitimate and must be freely used inside tables, code blocks, shell commands, and logical expressions. Never replace pipes, dollars, or syntax symbols with placeholders like %%%.\\n\`;isTechSec?a+=\`7. Provide rich code blocks with syntax highlighting showing clear, correct, and readable examples. Include comments inside code examples to explain syntax.\\n8. If describing relational database join operations (INNER, LEFT, RIGHT, FULL), you may optionally include a \\\`\\\`\\\`json-diagram block.\\n\`:a+=\`7. STRICT DOMAIN FIDELITY: This topic is non-technical. Do NOT write programming code, Python classes, or database diagrams. Focus on rigorous domain analysis, factual accuracy, and detailed historical or scientific narrative.\\n8. PREFER TABLES OR LISTS: Non-technical topics must prefer a clean markdown table or structured list over a drawn diagram.\\n\`;a+=\`9. Markdown tables: Ensure all markdown tables follow standard syntax with pipe characters and a header separator row.\\n10. Formatting integrity: Preserve all legitimate characters (|, ||, $, %, &, <, >, \\\\). Never introduce placeholder corruption like %%%.\\n11. Dive deep: provide comprehensive explanations, historical/technical depth, definitions, and practical context.\\n12. ACCURACY RULES: Adhere strictly to verified facts, avoid false precision, hedge unverified estimates, and maintain internal consistency.\\n13. Return the raw markdown content ONLY. Do not wrap the response in JSON or conversational text. Start writing the markdown directly.\`;let l=await this.callAPI(a,!1,s,c);if(l.includes("%%%"))console.warn('[Synthetic Studio Guard] Output contains %%% placeholder; preserved without guessing.');return[{section:r.name,title:r.label,content:l.trim()}]}`;

code = code.slice(0, genStartIdx) + genReplacement + code.slice(genEndIdx + genEnd.length);
console.log('✓ Patch 11 (generateDataBatch section prompt with rules) applied.');

fs.writeFileSync(bundlePath, code, 'utf8');
console.log('All patches successfully applied to:', bundlePath);
console.log('Final code length:', code.length);
