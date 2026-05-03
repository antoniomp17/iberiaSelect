/**
 * ============================================================
 * IBERIA SELECT — Script de Enriquecimiento Masivo de Datos
 * ============================================================
 * Fases:
 *   1. Geocodificación → coordenadas lat/lon via OSM Nominatim
 *   2. Clima → temperatura, lluvia, sol via Open-Meteo (gratis, sin key)
 *   3. Distancias → hospital, aeropuerto, playa via Overpass API (OSM)
 *
 * USO:
 *   node scripts/enrich_regions.js
 *
 * Produce: data_audit/enriched_regions.json (listo para merge en regions.js)
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const AEMET_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbnRvbmlvbW9yYWxlZGExN0BnbWFpbC5jb20iLCJqdGkiOiI1YmJmMjhmMy1lNjYwLTQ1NDQtODc2NS04YTlhZjc5NDk3ZDEiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTc3NzgzNTY5MywidXNlcklkIjoiNWJiZjI4ZjMtZTY2MC00NTQ0LTg3NjUtOGE5YWY3OTQ5N2QxIiwicm9sZSI6IiJ9.7Uupd38eAkx243YrM7eUmZCCnPHGU-Z-Gv_DigXQsG';
const OUTPUT_FILE = path.join('data_audit', 'enriched_regions.json');
const PROGRESS_FILE = path.join('data_audit', 'enrich_progress.json');

// --- Utilidades ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'IberiaSelect/1.0 (antoniomoraleda17@gmail.com)', ...(options.headers || {}) } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message} — raw: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// --- Fase 1: Geocodificación ---

async function geocode(region) {
  // Intenta buscar por nombre de la comarca y comunidad
  const query = encodeURIComponent(`${region.name}, ${region.province}, España`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=es`;
  try {
    await sleep(1100); // Nominatim pide max 1 req/seg
    const results = await fetchJSON(url);
    if (results && results.length > 0) {
      return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    }
  } catch (e) {
    console.warn(`  [Geocode WARN] ${region.name}: ${e.message}`);
  }
  return null;
}

// --- Fase 2: Clima via Open-Meteo (sin key, gratis) ---

async function getClimate(lat, lon) {
  // Usa datos históricos 1991-2020 (ERA5) via Open-Meteo
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_mean,precipitation_sum,sunshine_duration&timezone=Europe%2FMadrid&models=era5`;
  try {
    const data = await fetchJSON(url);
    if (!data || !data.daily) return null;

    const temps = data.daily.temperature_2m_mean.filter(v => v !== null);
    const rain = data.daily.precipitation_sum.filter(v => v !== null);
    const sun = data.daily.sunshine_duration.filter(v => v !== null); // segundos/día

    const tempAvg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const rainfallAnnual = (rain.reduce((a, b) => a + b, 0) / 30); // media anual 30 años
    // sun en segundos -> horas anuales (media diaria * 365)
    const sunHoursAnnual = (sun.reduce((a, b) => a + b, 0) / sun.length) / 3600 * 365;

    return {
      tempAvg: Math.round(tempAvg * 10) / 10,
      rainfall: Math.round(rainfallAnnual),
      sunHours: Math.round(sunHoursAnnual)
    };
  } catch (e) {
    console.warn(`  [Climate WARN] lat=${lat} lon=${lon}: ${e.message}`);
    return null;
  }
}

// --- Fase 3a: Hospital más cercano via Overpass ---

async function getNearestHospitalKm(lat, lon) {
  // Radio de búsqueda de 80km (amplio para zonas rurales)
  const query = encodeURIComponent(`[out:json][timeout:25];(node["amenity"="hospital"](around:80000,${lat},${lon});way["amenity"="hospital"](around:80000,${lat},${lon}););out center 1;`);
  const url = `https://overpass-api.de/api/interpreter?data=${query}`;
  try {
    await sleep(500);
    const data = await fetchJSON(url);
    if (!data || !data.elements || !data.elements.length) return null;

    let nearest = null;
    let minDist = Infinity;
    for (const el of data.elements) {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) continue;
      const d = haversine(lat, lon, elLat, elLon);
      if (d < minDist) { minDist = d; nearest = d; }
    }
    return nearest !== null ? Math.round(nearest) : null;
  } catch (e) {
    console.warn(`  [Hospital WARN] lat=${lat} lon=${lon}: ${e.message}`);
    return null;
  }
}

// --- Fase 3b: Aeropuerto más cercano via Overpass ---

async function getNearestAirportKm(lat, lon) {
  const query = encodeURIComponent(`[out:json][timeout:25];(node["aeroway"="aerodrome"]["iata"](around:300000,${lat},${lon});way["aeroway"="aerodrome"]["iata"](around:300000,${lat},${lon}););out center 5;`);
  const url = `https://overpass-api.de/api/interpreter?data=${query}`;
  try {
    await sleep(500);
    const data = await fetchJSON(url);
    if (!data || !data.elements || !data.elements.length) return null;

    let minDist = Infinity;
    for (const el of data.elements) {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) continue;
      const d = haversine(lat, lon, elLat, elLon);
      if (d < minDist) minDist = d;
    }
    return minDist !== Infinity ? Math.round(minDist) : null;
  } catch (e) {
    console.warn(`  [Airport WARN] lat=${lat} lon=${lon}: ${e.message}`);
    return null;
  }
}

// --- Fase 3c: Distancia a la costa via Overpass (línea de costa OSM) ---

async function getBeachKm(lat, lon) {
  // Busca la orilla de mar más cercana en radio 150km
  const query = encodeURIComponent(`[out:json][timeout:30];(way["natural"="coastline"](around:150000,${lat},${lon}););out geom 1;`);
  const url = `https://overpass-api.de/api/interpreter?data=${query}`;
  try {
    await sleep(500);
    const data = await fetchJSON(url);
    if (!data || !data.elements || !data.elements.length) return null; // > 150km = null (interior profundo)

    let minDist = Infinity;
    for (const el of data.elements) {
      if (!el.geometry) continue;
      for (const node of el.geometry) {
        const d = haversine(lat, lon, node.lat, node.lon);
        if (d < minDist) minDist = d;
      }
    }
    return minDist !== Infinity ? Math.round(minDist) : null;
  } catch (e) {
    console.warn(`  [Beach WARN] lat=${lat} lon=${lon}: ${e.message}`);
    return null;
  }
}

// --- Haversine: distancia en línea recta km ---

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- Cargar regiones desde regions.js ---

function loadRegions() {
  const raw = fs.readFileSync(path.join('src', 'data', 'regions.js'), 'utf8');
  // Extrae el array del export
  const match = raw.match(/export const REGIONS_DATA\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('No se encontró REGIONS_DATA en regions.js');
  return eval(match[1]); // eslint-disable-line no-eval
}

// --- Main ---

async function main() {
  console.log('🚀 IberiaSelect — Enriquecimiento de Datos\n');

  // Cargar todas las regiones
  let regions;
  try {
    regions = loadRegions();
  } catch(e) {
    // Fallback: cargar desde los JSON de data_audit
    console.log('  Cargando desde data_audit/*.json...');
    const dir = 'data_audit';
    regions = [];
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.includes('enriched') && !f.includes('progress'))) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (Array.isArray(d)) regions.push(...d);
    }
  }
  console.log(`  ✅ ${regions.length} regiones cargadas.\n`);

  // Cargar progreso previo si existe (para reanudar si se interrumpe)
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`  ♻️  Reanudando desde progreso previo (${Object.keys(progress).length} ya procesadas).\n`);
  }

  const enriched = [];
  let done = 0;
  const total = regions.length;

  for (const region of regions) {
    // Si ya está procesada, la cargamos del progreso
    if (progress[region.id]) {
      enriched.push(progress[region.id]);
      done++;
      continue;
    }

    console.log(`[${done+1}/${total}] 🔍 ${region.name} (${region.province})`);

    const result = { ...region };

    // Fase 1: Coordenadas
    const coords = await geocode(region);
    if (coords) {
      result._lat = coords.lat;
      result._lon = coords.lon;
      console.log(`       📍 Coords: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);

      // Fase 2: Clima
      const climate = await getClimate(coords.lat, coords.lon);
      if (climate) {
        result.tempAvg = climate.tempAvg;
        result.rainfall = climate.rainfall;
        result.sunHours = climate.sunHours;
        console.log(`       ☀️  Clima: ${climate.tempAvg}°C / ${climate.sunHours}h sol / ${climate.rainfall}mm`);
      }

      // Fase 3: Distancias
      const hospitalKm = await getNearestHospitalKm(coords.lat, coords.lon);
      if (hospitalKm !== null) {
        result.hospitalKm = hospitalKm;
        console.log(`       🏥 Hospital: ${hospitalKm} km`);
      }

      const airportKm = await getNearestAirportKm(coords.lat, coords.lon);
      if (airportKm !== null) {
        result.airportKm = airportKm;
        console.log(`       ✈️  Aeropuerto: ${airportKm} km`);
      }

      const beachKm = await getBeachKm(coords.lat, coords.lon);
      result.beachKm = beachKm; // null si > 150km (interior)
      console.log(`       🏖️  Playa: ${beachKm === null ? 'null (interior)' : beachKm + ' km'}`);
    } else {
      console.log(`       ⚠️  Sin coordenadas, se mantienen datos originales.`);
    }

    // Guardar en progreso
    progress[region.id] = result;
    enriched.push(result);

    // Guardar progreso cada 10 regiones por si se interrumpe
    done++;
    if (done % 10 === 0) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
      console.log(`\n  💾 Progreso guardado (${done}/${total})\n`);
    }
  }

  // Guardar resultado final
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  console.log(`\n✅ ¡Completado! ${enriched.length} regiones enriquecidas.`);
  console.log(`📁 Resultado en: ${OUTPUT_FILE}`);
  console.log(`\nPróximo paso: ejecuta 'node scripts/merge_enriched.js' para integrar en regions.js`);
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
