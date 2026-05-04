const fs = require('fs');
const content = fs.readFileSync('iberia_select.jsx', 'utf8');

function extract(startStr, endStr) {
  let startIdx = content.indexOf(startStr);
  if (startIdx === -1) throw new Error('Not found: ' + startStr);
  let endIdx = endStr ? content.indexOf(endStr, startIdx) : content.length;
  if (endIdx === -1) throw new Error('Not found end: ' + endStr);
  return content.slice(startIdx, endIdx).trim();
}

const importsCommon = `import { useState, useMemo, useEffect, useCallback, useContext } from "react";
import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
`;

const lucideImport = `import {
  Sun, Users, Home, Wifi, TrendingUp, ChevronRight, ChevronLeft, Star,
  Filter, MapPin, Euro, ArrowUpRight, ArrowDownRight, AlertTriangle,
  Sparkles, Mountain, Hospital, ExternalLink, Database, Search, Cloud, Droplets, Waves,
  BookmarkCheck, StickyNote, Trash2, CheckCircle2, Eye, Calculator,
  Building2, Hammer, Map
} from "lucide-react";
`;

// Extract AppHeader
const headerStr = extract('const AppHeader = () => {', '/* ====');
fs.writeFileSync('src/components/AppHeader.jsx', importsCommon + lucideImport + 'export ' + headerStr + '\n');

// Extract MapView
const mapImports = importsCommon + lucideImport + `import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { METRIC_OPTIONS, INE_TO_PROVINCE, ineToRegionsProvinces } from "../config/constants.js";
import { calcFinalScore, allStats } from "../utils/scoring.js";\n`;
const mapStr = extract('const METRIC_OPTIONS = [', 'const IntroView = () => {');
fs.writeFileSync('src/views/MapView.jsx', mapImports + 'export ' + mapStr.replace('const MapView', 'export const MapView') + '\n');

// Extract IntroView
const introStr = extract('const IntroView = () => {', 'const SettingsView = () => {');
fs.writeFileSync('src/views/IntroView.jsx', importsCommon + lucideImport + 'export ' + introStr + '\n');

// Extract SettingsView
const settingsImports = importsCommon + lucideImport + `import { REFORM_LABELS } from "../config/constants.js";\nimport { calcTotalCost } from "../utils/scoring.js";\n`;
const settingsStr = extract('const SettingsView = () => {', 'const GameView = () => {');
fs.writeFileSync('src/views/SettingsView.jsx', settingsImports + 'export ' + settingsStr + '\n');

// Extract GameView
const gameImports = importsCommon + lucideImport + `import { calcTotalCost, scorePlayas, allStats } from "../utils/scoring.js";
import { provinceUrl } from "../config/constants.js";\n`;
const gameStr = extract('const GameView = () => {', 'const RankingView = () => {');
fs.writeFileSync('src/views/GameView.jsx', gameImports + 'export ' + gameStr + '\n');

// Extract RankingView
const rankingImports = importsCommon + lucideImport + `import { provinceUrl } from "../config/constants.js";
import { calcTotalCost, allStats } from "../utils/scoring.js";\n`;
const rankingStr = extract('const RankingView = () => {', 'const CompareBar = () => {');
fs.writeFileSync('src/views/RankingView.jsx', rankingImports + 'export ' + rankingStr + '\n');

// Extract CompareBar
const compareBarStr = extract('const CompareBar = () => {', 'const CompareView = () => {');
fs.writeFileSync('src/components/CompareBar.jsx', importsCommon + lucideImport + 'export ' + compareBarStr + '\n');

// Extract CompareView
const compareImports = importsCommon + lucideImport + `import { calcTotalCost, allStats, calcFinalScore } from "../utils/scoring.js";\n`;
const compareViewStr = extract('const CompareView = () => {', 'const App = () => {');
fs.writeFileSync('src/views/CompareView.jsx', compareImports + 'export ' + compareViewStr + '\n');

// Extract App
const appImports = importsCommon + `import { Ctx, useLocalStorage } from "./context/AppContext.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { CompareBar } from "./components/CompareBar.jsx";
import { MapView } from "./views/MapView.jsx";
import { IntroView } from "./views/IntroView.jsx";
import { SettingsView } from "./views/SettingsView.jsx";
import { GameView } from "./views/GameView.jsx";
import { RankingView } from "./views/RankingView.jsx";
import { CompareView } from "./views/CompareView.jsx";
import { DEFAULT_WEIGHTS } from "./config/constants.js";
import { calcTotalCost, calcFinalScore, allStats } from "./utils/scoring.js";
`;
let appStr = extract('const App = () => {', null);
fs.writeFileSync('src/App.jsx', appImports + '\n' + appStr + '\n');

console.log('Successfully created components and views');
