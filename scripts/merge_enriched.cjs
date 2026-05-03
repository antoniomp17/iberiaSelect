/**
 * ============================================================
 * IBERIA SELECT — Script de Merge: enriched → regions.js
 * ============================================================
 * Toma data_audit/enriched_regions.json y actualiza
 * src/data/regions.js preservando todos los campos originales
 * y sobreescribiendo solo los que han sido enriquecidos.
 *
 * USO: node scripts/merge_enriched.js
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const ENRICHED_FILE = path.join('data_audit', 'enriched_regions.json');
const REGIONS_FILE = path.join('src', 'data', 'regions.js');

if (!fs.existsSync(ENRICHED_FILE)) {
  console.error('❌ No se encontró enriched_regions.json. Ejecuta primero enrich_regions.js');
  process.exit(1);
}

const enriched = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf8'));

// Crear mapa por ID para lookup rápido
const enrichedMap = {};
for (const r of enriched) {
  enrichedMap[r.id] = r;
}

// Leer regions.js original
const original = fs.readFileSync(REGIONS_FILE, 'utf8');

// Parsear el array de regiones
const match = original.match(/(export const REGIONS_DATA\s*=\s*)(\[[\s\S]*?\]);/);
if (!match) {
  console.error('❌ No se encontró REGIONS_DATA en regions.js');
  process.exit(1);
}

const prefix = match[1];
const rawArray = match[2];
const regions = eval(rawArray); // eslint-disable-line no-eval

// Campos que se actualizan automáticamente (los "objetivos" y sin riesgo de sobreescritura errónea)
const FIELDS_TO_UPDATE = ['tempAvg', 'sunHours', 'rainfall', 'hospitalKm', 'airportKm', 'beachKm'];
// Campos que se actualizan SOLO si el valor de origen no era nulo/0
const FIELDS_CONDITIONAL = ['popTrend', 'density', 'fiber'];

let updated = 0;
let skipped = 0;

const merged = regions.map(region => {
  const enrichedRegion = enrichedMap[region.id];
  if (!enrichedRegion) {
    skipped++;
    return region;
  }

  const result = { ...region };

  for (const field of FIELDS_TO_UPDATE) {
    if (enrichedRegion[field] !== undefined && enrichedRegion[field] !== null) {
      result[field] = enrichedRegion[field];
    } else if (field === 'beachKm' && enrichedRegion[field] === null) {
      // null es un valor válido para interior
      result[field] = null;
    }
  }

  for (const field of FIELDS_CONDITIONAL) {
    if (enrichedRegion[field] !== undefined && enrichedRegion[field] !== null && enrichedRegion[field] !== 0) {
      result[field] = enrichedRegion[field];
    }
  }

  // Eliminar campos internos del proceso (coordenadas, etc.)
  delete result._lat;
  delete result._lon;

  updated++;
  return result;
});

// Generar el nuevo contenido de regions.js
const newArray = JSON.stringify(merged, null, 2)
  // Convertir JSON puro a formato JS (quitar comillas de keys)
  .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:')
  // Null -> null (ya está bien en JSON)
  // Formatear el array multilinea
  ;

const header = original.slice(0, original.indexOf(match[0]));
const newContent = header + prefix + newArray + ';';

// Hacer backup antes de sobreescribir
const backupFile = REGIONS_FILE + '.bak.' + Date.now();
fs.copyFileSync(REGIONS_FILE, backupFile);
console.log(`✅ Backup creado: ${backupFile}`);

fs.writeFileSync(REGIONS_FILE, newContent, 'utf8');

console.log(`\n✅ Merge completado!`);
console.log(`   Regiones actualizadas: ${updated}`);
console.log(`   Sin datos de enriquecimiento: ${skipped}`);
console.log(`   Archivo: ${REGIONS_FILE}`);
