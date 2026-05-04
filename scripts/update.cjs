#!/usr/bin/env node
/**
 * IBERIA SELECT — Script de actualización semestral
 * ===================================================
 * Orquesta el pipeline completo de enriquecimiento de datos.
 * Ejecutar cada ~6 meses para mantener los datos frescos.
 *
 * USO:
 *   node scripts/update.cjs            — pipeline completo
 *   node scripts/update.cjs --step=1   — solo paso 1 (clima)
 *   node scripts/update.cjs --step=2   — solo paso 2 (precios Idealista)
 *   node scripts/update.cjs --merge    — solo merge final
 *   node scripts/update.cjs --status   — ver estado del ciclo actual
 *
 * PIPELINE:
 *   Paso 1: node scripts/enrich_regions.cjs     (~3h, automático)
 *   Paso 2: browser_scraper.js en consola Chrome (~40min, manual)
 *   Paso 3: node scripts/merge_all.cjs           (instantáneo)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const CYCLE = getCycle();
const ARCHIVE_DIR = path.join('data_audit', 'archive', CYCLE);

function getCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const semester = now.getMonth() < 6 ? 'S1' : 'S2';
  return `${year}-${semester}`;
}

function status() {
  console.log(`\n📅 Ciclo actual: ${CYCLE}`);
  console.log(`📁 Directorio: data_audit/\n`);

  const files = {
    'enriched_regions.json': 'Paso 1 — Clima + distancias (APIs)',
    'idealista_prices.json': 'Paso 2 — Precios Idealista (manual)',
  };

  let allReady = true;
  for (const [file, label] of Object.entries(files)) {
    const p = path.join('data_audit', file);
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      const withData = Array.isArray(data)
        ? data.filter(r => Object.values(r).some(v => v !== null && v !== undefined)).length
        : Object.keys(data).length;
      console.log(`  ✅ ${label}`);
      console.log(`     ${p} — ${withData} entradas`);
    } else {
      console.log(`  ⏳ ${label}`);
      console.log(`     ${p} — pendiente`);
      allReady = false;
    }
  }

  if (allReady) {
    console.log('\n  ✅ Todo listo → ejecuta: node scripts/update.cjs --merge');
  } else {
    console.log('\n  ℹ️  Sigue las instrucciones del README para completar los pasos pendientes.');
  }
}

function archivePrevious() {
  const files = ['enriched_regions.json', 'idealista_prices.json', 'enrich_progress.json', 'prices_progress.json'];
  const hasFiles = files.some(f => fs.existsSync(path.join('data_audit', f)));
  if (!hasFiles) return;

  // Detectar ciclo anterior
  const archives = fs.existsSync(path.join('data_audit', 'archive'))
    ? fs.readdirSync(path.join('data_audit', 'archive'))
    : [];
  const lastCycle = archives.sort().pop();

  if (lastCycle && lastCycle !== CYCLE) {
    console.log(`  📦 Archivando ciclo anterior (${lastCycle} → ya archivado)`);
    return;
  }

  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  for (const f of files) {
    const src = path.join('data_audit', f);
    if (fs.existsSync(src)) {
      fs.renameSync(src, path.join(ARCHIVE_DIR, f));
      console.log(`  📦 Archivado: ${f} → archive/${CYCLE}/`);
    }
  }
}

function runStep1() {
  console.log('\n🌤️  PASO 1: Enriquecimiento con APIs (clima + distancias)');
  console.log('  Tiempo estimado: ~3 horas (509 regiones × APIs gratuitas)\n');

  const proc = spawn('node', ['scripts/enrich_regions.cjs'], { stdio: 'inherit' });
  proc.on('close', code => {
    if (code === 0) {
      console.log('\n✅ Paso 1 completado. Ejecuta el paso 2 (browser_scraper.js).');
    } else {
      console.error('\n❌ Paso 1 falló con código:', code);
    }
  });
}

function runMerge() {
  console.log('\n🔀 MERGE: Integrando datos en regions.js...\n');
  execSync('node scripts/merge_all.cjs', { stdio: 'inherit' });
}

function printStep2Instructions() {
  console.log('\n🏠 PASO 2: Precios reales de Idealista (manual, ~40 min)');
  console.log('─'.repeat(55));
  console.log('  1. Abre Chrome → https://www.idealista.com');
  console.log('  2. F12 → pestaña Console');
  console.log('  3. Copia y pega: scripts/browser_scraper.js');
  console.log('  4. Deja correr ~40 minutos');
  console.log('  5. Se descarga idealista_prices.json automáticamente');
  console.log('  6. Mueve el archivo a data_audit/');
  console.log('  7. Ejecuta: node scripts/update.cjs --merge\n');
}

// --- Main ---
const args = process.argv.slice(2);

if (args.includes('--status')) {
  status();
} else if (args.includes('--merge')) {
  runMerge();
} else if (args.includes('--step=1')) {
  runStep1();
} else if (args.includes('--step=2')) {
  printStep2Instructions();
} else {
  // Pipeline completo
  console.log('🚀 IberiaSelect — Actualización semestral');
  console.log(`📅 Ciclo: ${CYCLE}\n`);

  archivePrevious();

  console.log('\nPIPELINE DE ACTUALIZACIÓN:');
  console.log('─'.repeat(55));

  const enriched = fs.existsSync(path.join('data_audit', 'enriched_regions.json'));
  const prices = fs.existsSync(path.join('data_audit', 'idealista_prices.json'));

  if (!enriched && !prices) {
    console.log('\n  Iniciando desde cero...');
    runStep1();
    printStep2Instructions();
  } else if (enriched && !prices) {
    console.log('  ✅ Paso 1 ya completado.');
    printStep2Instructions();
  } else if (enriched && prices) {
    console.log('  ✅ Paso 1 ya completado.');
    console.log('  ✅ Paso 2 ya completado.\n');
    runMerge();
  } else {
    status();
  }
}
