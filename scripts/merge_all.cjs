/**
 * IBERIA SELECT — Merge maestro
 * Integra todos los datos enriquecidos en src/data/regions.js.
 *
 * Fuentes (en orden de prioridad, la última gana):
 *   1. data_audit/enriched_regions.json   — clima + distancias (APIs)
 *   2. data_audit/idealista_prices.json   — precios reales Idealista
 *
 * USO: node scripts/merge_all.cjs
 */

const fs = require('fs');
const path = require('path');

const REGIONS_FILE = path.join('src', 'data', 'regions.js');

const SOURCES = [
  {
    file: path.join('data_audit', 'enriched_regions.json'),
    fields: ['tempAvg', 'sunHours', 'rainfall', 'hospitalKm', 'airportKm', 'beachKm'],
    label: 'Clima + distancias (APIs)',
  },
  {
    file: path.join('data_audit', 'idealista_prices.json'),
    fields: ['priceM2'],
    filter: r => r.priceM2 && r.priceM2 > 0,
    transform: r => ({ priceM2: r.priceM2 }),
    label: 'Precios Idealista',
  },
];

function loadRegions() {
  const code = fs.readFileSync(REGIONS_FILE, 'utf8');
  const match = code.match(/export const REGIONS_DATA\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('No se encontró REGIONS_DATA en regions.js');
  return { code, match, regions: eval(match[1]) }; // eslint-disable-line no-eval
}

function saveRegions(code, match, regions) {
  const backup = REGIONS_FILE + '.bak.' + Date.now();
  fs.copyFileSync(REGIONS_FILE, backup);
  const newContent =
    code.slice(0, code.indexOf(match[0])) +
    match[1] +
    JSON.stringify(regions, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:') +
    ';';
  fs.writeFileSync(REGIONS_FILE, newContent, 'utf8');
  return backup;
}

async function main() {
  console.log('🔀 IberiaSelect — Merge maestro\n');

  const { code, match, regions } = loadRegions();
  const regionMap = {};
  for (const r of regions) regionMap[r.id] = { ...r };

  for (const source of SOURCES) {
    if (!fs.existsSync(source.file)) {
      console.log(`⚠️  ${source.label}: archivo no encontrado (${source.file}), saltando.`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(source.file, 'utf8'));
    const filtered = source.filter ? data.filter(source.filter) : data;
    let updated = 0;

    for (const entry of filtered) {
      if (!regionMap[entry.id]) continue;
      const patch = source.transform ? source.transform(entry) : entry;
      for (const field of source.fields) {
        if (patch[field] !== undefined) {
          regionMap[entry.id][field] = patch[field];
        } else if (field === 'beachKm' && patch[field] === null) {
          regionMap[entry.id][field] = null;
        }
      }
      // Limpiar campos internos
      delete regionMap[entry.id]._lat;
      delete regionMap[entry.id]._lon;
      delete regionMap[entry.id].priceSource;
      updated++;
    }

    console.log(`✅ ${source.label}: ${updated} regiones actualizadas`);
  }

  const final = regions.map(r => regionMap[r.id]);
  const backup = saveRegions(code, match, final);
  console.log(`\n✅ regions.js actualizado. Backup: ${backup}`);
  console.log(`   Total regiones: ${final.length}`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
