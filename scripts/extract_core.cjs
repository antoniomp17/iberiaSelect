const fs = require('fs');
const content = fs.readFileSync('iberia_select.jsx', 'utf8');

function extract(startStr, endStr) {
  let startIdx = 0;
  if (startStr) {
    startIdx = content.indexOf(startStr);
    if (startIdx === -1) throw new Error('Not found: ' + startStr);
  }
  let endIdx = content.length;
  if (endStr) {
    endIdx = content.indexOf(endStr, startIdx);
    if (endIdx === -1) throw new Error('Not found end: ' + endStr);
  }
  return content.slice(startIdx, endIdx).trim();
}

// 1. theme.js
const themeStr = extract('const S = {', '/* ====');
fs.writeFileSync('src/config/theme.js', 'export ' + themeStr + '\n');

// 2. scoring.js
// includes calcTotalCost, scorePrecio, etc.
let scoringStr = extract('const calcTotalCost', '// INE province code');
scoringStr = scoringStr.replace(/const /g, 'export const ');
const scoringImports = 'import { REFORM_COST_M2 } from \"./constants.js\";\n\n';
fs.writeFileSync('src/utils/scoring.js', scoringImports + 'export ' + scoringStr + '\n');

// 3. constants.js
let constStr = extract('// INE province code', 'const S = {');
constStr = constStr.replace(/const /g, 'export const ');
// Add REFORM_COST_M2 and REFORM_LABELS since they were imported from src/data/constants.js
const constantsImports = 'export { REFORM_COST_M2, REFORM_LABELS, DEFAULT_WEIGHTS } from \"../data/constants.js\";\n\n';
fs.writeFileSync('src/config/constants.js', constantsImports + constStr + '\n');

// 4. AppContext.jsx
let ctxStr = extract('const Ctx = createContext(null);', 'const AppHeader = () => {');
ctxStr = ctxStr.replace('const Ctx = createContext(null);', 'export const Ctx = createContext(null);');
ctxStr = ctxStr.replace('const useCtx = () => useContext(Ctx);', 'export const useCtx = () => useContext(Ctx);');
ctxStr = ctxStr.replace('const useLocalStorage', 'export const useLocalStorage');
ctxStr = ctxStr.replace('const SimilarRegions', 'export const SimilarRegions');

const importsCtx = `import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, Filter } from "lucide-react";
import { provinceUrl } from "../config/constants.js";
import { S } from "../config/theme.js";

`;
fs.writeFileSync('src/context/AppContext.jsx', importsCtx + ctxStr + '\n');

console.log('Successfully created config, utils, context');
