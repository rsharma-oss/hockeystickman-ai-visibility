#!/usr/bin/env node
// Renders the HSM proposal builder's fillTemplate() output to static HTML.
import fs from 'fs';

const src = fs.readFileSync('/Users/rahulsharma/hockeystickman-ai-visibility/proposal.html', 'utf8');

// Pull blocks we need from the builder source. Use regex with `[\s\S]*?` (lazy) to grab function/object bodies.
function extract(re) {
  const m = src.match(re);
  if (!m) throw new Error('Pattern not found: ' + re);
  return m[0];
}

// 1) The PREFILL object literal — used as the D values when rendering
const prefillStr = extract(/^const PREFILL = \{[\s\S]*?^\};?/m);

// 2) D object declaration (we'll re-bind D from PREFILL after parsing)
const dDeclStr = extract(/^const D = \{[\s\S]*?^\};?/m);

// 3) Helpers: tok, deriveColors, fillTemplate
const tokStr = extract(/^function tok\([\s\S]*?\}\s*$/m);
const hexToRgbStr = extract(/^function hexToRgb\([\s\S]*?\}\s*\n/m);
const rgbToHexStr = extract(/^function rgbToHex\([\s\S]*?\}\s*\n/m);
const deriveStr = extract(/^function deriveColors\(hex\) \{[\s\S]*?^\}/m);
const fillStr = extract(/^function fillTemplate\(\)[\s\S]*?^\}\s*$/m);

// Compose a self-contained module that returns the rendered HTML.
const code = `
${dDeclStr}
${prefillStr}
Object.assign(D, PREFILL);
${tokStr}
${hexToRgbStr}
${rgbToHexStr}
${deriveStr}
${fillStr}
process.stdout.write(fillTemplate());
`;

// Write to a temp file and eval as a module via dynamic import-from-string.
import('node:vm').then(({ Script }) => {
  const sandbox = { console, process };
  sandbox.global = sandbox;
  const script = new Script(code);
  const vm = require('node:vm');
  const context = vm.createContext(sandbox);
  script.runInContext(context);
}).catch(err => {
  // Fallback to plain eval
  eval(code);
});
