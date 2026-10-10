const fs = require('fs');

const bundlePath = 'public/synthetic-data-generator/assets/index-Jk-OVQu0.js';
fs.copyFileSync(
    'public/synthetic-data-generator/assets/index-Jk-OVQu0.js.bak',
    bundlePath
);
let code = fs.readFileSync(bundlePath, 'utf8');

// Patch 1: qd math replace
const qdOld = '.replace(/\\$([^$]+)\\$/g,`$1`)';
const qdNew = '.replace(/\\$([^$\\n]+?)\\$/g,(e,t)=>/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t.trim())?e:/[=+\\-*/^_<>≤≥±≈·\\\\%]/.test(t)||/^\\s*[a-zA-Z]\\s*$/.test(t)?t:e)';
if (!code.includes(qdOld)) throw new Error('qdOld target not found');
code = code.replace(qdOld, qdNew);
console.log('✓ Patch 1 applied.');

// Patch 2: Code block Unicode box character replaced with plain ASCII hyphen
const boxOld = '.replace(/(\\.{3,}|-{3,})/g,e=>`─`.repeat(e.length))';
const boxNew = '.replace(/(\\.{3,}|-{3,})/g,e=>`-`.repeat(e.length))';
if (!code.includes(boxOld)) throw new Error('boxOld target not found');
code = code.replace(boxOld, boxNew);
console.log('✓ Patch 2 applied.');

// Patch 3: Table detector in Zd
const sOld = ',s=e=>{if(!e)return!1;let t=e.trim();return t.includes(`|`)&&!t.startsWith("```")&&!t.match(/^#{1,6}\\s+/)}';
const sNew = ',s=e=>{if(!e)return!1;let t=e.trim();return(t.startsWith(`|`)&&t.endsWith(`|`)&&t.length>2||t.split(`|`).length>2)&&!t.startsWith("```")&&!t.match(/^#{1,6}\\s+/)}';
if (!code.includes(sOld)) throw new Error('sOld target not found');
code = code.replace(sOld, sNew);
console.log('✓ Patch 3 applied.');

// Patch 4: PDF export heading deduplication in tf
const tfOld = 'let n=e.title||`Section ${t+1}`,i=e.content||``;r.setFontSize(11),r.setFont(`helvetica`,`bold`);let s=r.splitTextToSize(`${t+1}. ${n}`,o-8)';
const tfNew = 'let n=(e.title||`Section ${t+1}`).replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim()||`Section ${t+1}`,i=e.content||``,firstH1Pdf=!1;r.setFontSize(11),r.setFont(`helvetica`,`bold`);let s=r.splitTextToSize(`${t+1}. ${n}`,o-8)';
if (!code.includes(tfOld)) throw new Error('tfOld target not found');
code = code.replace(tfOld, tfNew);

const tfHeadingOld = 'if(l+12>a-16&&(r.addPage(),l=20),e.type===`heading`){let t=[13,11.5,10.5,9.5,9,8.5][Math.min(e.level-1,5)];';
const tfHeadingNew = 'if(l+12>a-16&&(r.addPage(),l=20),e.type===`heading`){let cleanH=e.text.replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim().toLowerCase();if(!firstH1Pdf&&e.level===1&&(cleanH===n.toLowerCase()||n.toLowerCase().includes(cleanH))){firstH1Pdf=!0;return}firstH1Pdf=!0;let t=[13,11.5,10.5,9.5,9,8.5][Math.min(e.level-1,5)];';
if (!code.includes(tfHeadingOld)) throw new Error('tfHeadingOld target not found');
code = code.replace(tfHeadingOld, tfHeadingNew);
console.log('✓ Patch 4 applied.');

// Patch 5: DOCX export heading deduplication in rx
const rxOld = 'n.push(new Qg({text:`${t+1}. ${i}`,heading:Tg.HEADING_2,spacing:{before:240,after:120}})),Zd(a).forEach(e=>{if(e.type===`heading`){let t=r[Math.min(e.level-1,5)];n.push(new Qg({text:e.text,heading:t,spacing:{before:160,after:60}}))}';
const rxNew = 'let cleanRx=(i||`Section ${t+1}`).replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim()||`Section ${t+1}`,firstH1Docx=!1;n.push(new Qg({text:`${t+1}. ${cleanRx}`,heading:Tg.HEADING_2,spacing:{before:240,after:120}})),Zd(a).forEach(e=>{if(e.type===`heading`){let cleanH=e.text.replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,``).trim().toLowerCase();if(!firstH1Docx&&e.level===1&&(cleanH===cleanRx.toLowerCase()||cleanRx.toLowerCase().includes(cleanH))){firstH1Docx=!0;return}firstH1Docx=!0;let t=r[Math.min(e.level-1,5)];n.push(new Qg({text:e.text,heading:t,spacing:{before:160,after:60}}))}';
if (!code.includes(rxOld)) throw new Error('rxOld target not found');
code = code.replace(rxOld, rxNew);
console.log('✓ Patch 5 applied.');

// Patch 6: Markdown / TXT export in Zx
const zxStart = 'if(e.contentType===`document`||e.format===`markdown`)return(e.data||[]).map(e=>e.content?String(e.content):`# ${e.title||e.section||`Section`}`).join(';
const zxEnd = ');if(Array.isArray(e.data)&&e.data.length>0){';
const zxStartIdx = code.indexOf(zxStart);
if (zxStartIdx === -1) throw new Error('zxStart not found');
const zxEndIdx = code.indexOf(zxEnd, zxStartIdx);
if (zxEndIdx === -1) throw new Error('zxEnd not found');

const zxReplacement = `if(e.contentType===\`document\`||e.format===\`markdown\`)return(e.data||[]).map(e=>{if(!e.content)return\`# \${e.title||e.section||\`Section\`}\`;let t=(e.title||'').replace(/^\\s*\\d+[\\.\\-\\)]\\s*/,'').trim().toLowerCase(),n=String(e.content).split('\\n');if(n.length>0&&n[0].trim().startsWith('# ')){let r=n[0].trim().replace(/^#\\s+(\\d+[\\.\\-\\)]\\s*)?/,'').trim().toLowerCase();if(r===t||t.includes(r)||r.includes(t))n.shift()}return n.join('\\n').trim()}).join('\\n\\n---\\n\\n')`;
code = code.slice(0, zxStartIdx) + zxReplacement + code.slice(zxEndIdx + 1);
console.log('✓ Patch 6 applied.');

// Patch 7: researchTopic prompt
const resStart = 'static async researchTopic(e,t,n=`tabular`,r=5,i=.7){let a=n===`document`?`You are an expert technical writer and curriculum designer agent.';
const resEnd = ':`You are an expert data architect and researcher agent.';
const resStartIdx = code.indexOf(resStart);
if (resStartIdx === -1) throw new Error('resStart not found');
const resEndIdx = code.indexOf(resEnd, resStartIdx);
if (resEndIdx === -1) throw new Error('resEnd not found');

const resReplacement = `static async researchTopic(e,t,n=\`tabular\`,r=5,i=.7){let isTechTopic=/\\b(sql|mysql|postgresql|sqlite|mongodb|redis|database|query|queries|python|javascript|typescript|java|c\\+\\+|c#|\\.net|golang|rust|ruby|php|swift|kotlin|scala|react|angular|vue|nextjs|node|express|django|flask|spring|docker|kubernetes|k8s|git|devops|aws|azure|gcp|cloud|linux|unix|bash|shell|powershell|api|rest|graphql|html|css|compiler|data\\s*structures?|algorithms?|cryptography|tcp\\/ip|http|websocket|system\\s*design|concurrency|multithreading|machine\\s*learning|deep\\s*learning|pytorch|tensorflow)\\b/i.test(e);let a=n===\`document\`?(isTechTopic?\`You are an expert technical writer, systems architect, and computer science curriculum designer.\\nYour task is to conduct an extremely thorough research study on the technical topic: "\${e}" and design a comprehensive structured syllabus outline.\\nCover: key concepts, standard terminology, implementation details, design patterns, programming syntax, prerequisites, and production architecture.\\nSuggest EXACTLY \${r} logical outline sections in 'fields'. Each section must have: name, label (WITHOUT leading numbers), type ('section'), description, rules.\\nReturn valid JSON: { "researchNotes": "markdown report", "fields": [{ "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }] }\`:\`You are an expert academic researcher, curriculum designer, and subject matter specialist.\\nYour task is to conduct an extremely thorough research study on the topic: "\${e}" and design a comprehensive structured syllabus outline.\\nTOPIC FIDELITY RULE: This topic is non-technical. DO NOT include programming code, software classes, database diagrams, or coding errors. Focus exclusively on genuine historical, academic, scientific, or humanities concepts.\\nCover: key concepts, historical/domain context, core principles, standard terminology, progression of lessons, verified facts, and comprehensive mastery.\\nSuggest EXACTLY \${r} logical outline sections in 'fields'. Each section must have: name, label (WITHOUT leading numbers), type ('section'), description, rules.\\nReturn valid JSON: { "researchNotes": "markdown report", "fields": [{ "name": "...", "label": "...", "type": "section", "description": "...", "rules": "..." }] }\`)`;
code = code.slice(0, resStartIdx) + resReplacement + code.slice(resEndIdx);
console.log('✓ Patch 7 applied.');

// Patch 8: generateDataBatch prompt
const genStart = 'static async generateDataBatch(e,t,n,r,i,a,o,s,c=.7,l=`tabular`){if(l===`document`){let r=n.filter(e=>e.isActive)[i];if(!r)throw Error(`Current section is undefined in generator`);let a=`You are an expert technical writer and programmer agent.';
const genEnd = '9. Return the raw markdown content ONLY. Do not wrap the response in JSON, HTML, or conversational text. Start writing the markdown directly.`;let l=await this.callAPI(a,!1,s,c);return[{section:r.name,title:r.label,content:l.trim()}]}';

const genStartIdx = code.indexOf(genStart);
if (genStartIdx === -1) throw new Error('genStart not found');
const genEndIdx = code.indexOf(genEnd, genStartIdx);
if (genEndIdx === -1) throw new Error('genEnd not found');

const genReplacement = `static async generateDataBatch(e,t,n,r,i,a,o,s,c=.7,l=\`tabular\`){if(l===\`document\`){let r=n.filter(e=>e.isActive)[i];if(!r)throw Error(\`Current section is undefined in generator\`);let isTechSec=/\\b(sql|mysql|postgresql|sqlite|mongodb|redis|database|query|queries|python|javascript|typescript|java|c\\+\\+|c#|\\.net|golang|rust|ruby|php|swift|kotlin|scala|react|angular|vue|nextjs|node|express|django|flask|spring|docker|kubernetes|k8s|git|devops|aws|azure|gcp|cloud|linux|unix|bash|shell|powershell|api|rest|graphql|html|css|compiler|data\\s*structures?|algorithms?|cryptography|tcp\\/ip|http|websocket|system\\s*design|concurrency|multithreading|machine\\s*learning|deep\\s*learning|pytorch|tensorflow)\\b/i.test(e);let a=isTechSec?\`You are an expert technical writer and software engineering educator.\`:\`You are an expert academic writer, educator, and subject matter specialist.\`;a+=\`\\nYour task is to generate realistic, comprehensive, and highly-detailed educational course/guide content for a specific section of a document.\\n\\nMain Topic: \${e}\\n\\nDomain Research & Syllabus Context:\\n\${t}\\n\\nTarget Section to Generate:\\n- Title: \${r.label} (key: \${r.name})\\n- Overview of what to cover: \${r.description}\\n- Requirements & Formatting Rules: \${r.rules}\\n\\nPrevious Chapters / Content Context (for continuity and flow):\\n\`;o&&o.length>0?(a+=\`Below is the outline and contents of the previous sections generated. Read them carefully so you maintain continuity, refer back to already-declared concepts where logical, and avoid repeating definitions or introductory paragraphs:\\n\\n\`,a+=o.map((e,t)=>\`[Section \${t+1}: \${e.title}]\\n\${e.content}\\n---\`).join(\`\\n\\n\`)):a+=\`This is the very first section. Provide a strong opening or initial setup, then dive straight into the topic.\`;a+=\`\\n\\nInstructions:\\n1. Write the section content in beautiful, valid Markdown. Do not repeat the section title as an H1 heading.\\n2. Use clear formatting, paragraphs, bullet points, and markdown tables where appropriate.\\n3. NO DECORATIVE ASCII ART BOXES: Do not draw decorative ASCII frame boxes or wireframes (such as "+---+"). Standard pipe characters (| and ||) and dollar signs ($) are completely legitimate and must be freely used inside tables, code blocks, shell commands, and logical expressions. Never replace pipes, dollars, or syntax symbols with placeholders like %%%.\\n\`;isTechSec?a+=\`4. Provide rich code blocks with syntax highlighting showing clear, correct, and readable examples. Include comments inside code examples to explain syntax.\\n5. If describing relational database join operations (INNER, LEFT, RIGHT, FULL), you may optionally include a \\\`\\\`\\\`json-diagram block.\\n\`:a+=\`4. STRICT DOMAIN FIDELITY: This topic is non-technical. Do NOT write programming code, Python classes, or database diagrams. Focus on rigorous domain analysis, factual accuracy, and detailed historical or scientific narrative.\\n\`;a+=\`6. Markdown tables: Ensure all markdown tables follow standard syntax with pipe characters and a header separator row.\\n7. Formatting integrity: Preserve all legitimate characters (|, ||, $, %, &, <, >, \\\\). Never introduce placeholder corruption like %%%.\\n8. Dive deep: provide comprehensive explanations, historical/technical depth, definitions, and practical context.\\n9. ACCURACY RULES: Adhere strictly to verified facts, avoid false precision, hedge unverified estimates, and maintain internal consistency.\\n10. Return the raw markdown content ONLY. Do not wrap the response in JSON or conversational text. Start writing the markdown directly.\`;let l=await this.callAPI(a,!1,s,c);if(l.includes("%%%"))console.warn('[Synthetic Studio Guard] Output contains %%% placeholder; preserved without guessing.');return[{section:r.name,title:r.label,content:l.trim()}]}`;

code = code.slice(0, genStartIdx) + genReplacement + code.slice(genEndIdx + genEnd.length);
console.log('✓ Patch 8 applied.');

fs.writeFileSync(bundlePath, code, 'utf8');
console.log('All 8 patches successfully applied to:', bundlePath);
console.log('Final code length:', code.length);
