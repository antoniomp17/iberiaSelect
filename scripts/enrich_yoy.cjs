/**
 * IBERIA SELECT — Enriquecimiento YoY de precios
 * ================================================
 * 1. Fetcha IPV provincial (último trimestre) del INE
 * 2. Gemini Flash refina por comarca en batches de ~20
 * 3. Produce: data_audit/yoy_prices.json
 *
 * USO: node scripts/enrich_yoy.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Leer .env manualmente sin dependencia externa
const envPath = require('path').join(__dirname, '..', '.env');
if (require('fs').existsSync(envPath)) {
  require('fs').readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OUTPUT = path.join('data_audit', 'yoy_prices.json');
const PROGRESS = path.join('data_audit', 'yoy_progress.json');

// --- Regiones ---
const { REGIONS_DATA } = (() => {
  const code = fs.readFileSync(path.join('src', 'data', 'regions.js'), 'utf8');
  const match = code.match(/export const REGIONS_DATA\s*=\s*(\[[\s\S]*?\]);/);
  return { REGIONS_DATA: eval(match[1]) }; // eslint-disable-line no-eval
})();

// --- HTTP helper ---
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'IberiaSelect/1.0' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Mapeo comunidad autónoma (INE) → provincias del proyecto
const CCAA_TO_PROVINCES = {
  'Galicia':                    ['A Coruña','Lugo','Ourense','Pontevedra','Lugo/Ourense'],
  'Asturias, Principado de':    ['Asturias'],
  'Cantabria':                  ['Cantabria'],
  'País Vasco':                 ['Álava','Gipuzkoa','Bizkaia'],
  'Navarra, Comunidad Foral de':['Navarra'],
  'Rioja, La':                  ['La Rioja'],
  'Aragón':                     ['Huesca','Zaragoza','Teruel'],
  'Cataluña':                   ['Lleida','Girona','Barcelona','Tarragona'],
  'Comunitat Valenciana':       ['Castellón','Valencia','Alicante'],
  'Murcia, Región de':          ['Murcia'],
  'Andalucía':                  ['Almería','Granada','Jaén','Córdoba','Málaga','Sevilla','Cádiz','Huelva'],
  'Extremadura':                ['Badajoz','Cáceres'],
  'Castilla - La Mancha':       ['Toledo','Guadalajara','Cuenca','Albacete','Ciudad Real'],
  'Madrid, Comunidad de':       ['Madrid'],
  'Castilla y León':            ['Ávila','Salamanca','Zamora','Valladolid','Segovia','Burgos','Palencia','León','Soria'],
  'Balears, Illes':             ['Mallorca','Menorca','Ibiza','Formentera'],
  'Canarias':                   ['Tenerife','La Palma','La Gomera','El Hierro','Gran Canaria','Lanzarote','Fuerteventura'],
  'Ceuta':                      ['Ceuta'],
  'Melilla':                    ['Melilla'],
};

// --- 1. IPV por CCAA del INE (tabla 25171, dato real) ---
async function fetchIPVProvincial() {
  console.log('📊 Descargando IPV por CCAA del INE (tabla 25171)...');
  const url = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/25171?nult=1';
  const data = await fetchJson(url);

  // Extraer variación anual por CCAA
  const ccaaMap = {};
  for (const item of data) {
    if (!item.Nombre || !item.Data?.[0]) continue;
    const m = item.Nombre.match(/^([^.]+)\.\s*[^.]+\.\s*Variaci[oó]n anual/i);
    if (!m) continue;
    const ccaa = m[1].trim();
    if (ccaa === 'Nacional') continue;
    const val = item.Data[0].Valor;
    if (val !== null && !isNaN(val) && !ccaaMap[ccaa]) {
      ccaaMap[ccaa] = parseFloat(val.toFixed(1));
    }
  }
  console.log(`  ✅ ${Object.keys(ccaaMap).length} comunidades autónomas con IPV real del INE`);
  Object.entries(ccaaMap).forEach(([k, v]) => console.log(`     ${k}: ${v}%`));

  // Expandir a provincias
  const provMap = {};
  for (const [ccaa, provinces] of Object.entries(CCAA_TO_PROVINCES)) {
    const val = ccaaMap[ccaa];
    if (val === undefined) { console.warn(`  ⚠️  Sin dato INE para: ${ccaa}`); continue; }
    for (const prov of provinces) provMap[prov] = val;
  }
  return provMap;
}

// --- 2. Gemini refinamiento por comarca ---
async function geminiRefineProvince(provinceName, ipvVal, comarcas) {
  const prompt = `Eres un experto inmobiliario español. La comunidad autónoma / provincia de ${provinceName} tuvo una variación anual de precios del ${ipvVal}% según el IPV del INE (dato oficial, último trimestre disponible).

Para cada comarca de la provincia, estima su variación anual ajustada teniendo en cuenta si es zona costera, capital, interior rural, turística, etc. La estimación debe ser realista y coherente con el dato provincial base.

Comarcas:
${comarcas.map(r => `- id: ${r.id} | nombre: ${r.name} | densidad: ${r.density} hab/km² | playa: ${r.beachKm === null ? 'interior' : r.beachKm + 'km'}`).join('\n')}

Responde SOLO con un objeto JSON válido, sin markdown, con este formato exacto:
{"id1": 8.3, "id2": 6.1, ...}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
  });

  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Gemini 2.5 Flash thinking: buscar en todos los parts
          const parts = json.candidates?.[0]?.content?.parts || [];
          const text = parts.map(p => p.text || '').join('');
          if (!text) { console.log('RAW:', JSON.stringify(json).slice(0, 300)); throw new Error('Empty response'); }
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start === -1 || end === -1) { console.log('TEXT:', text.slice(0, 200)); throw new Error('No JSON object found'); }
          resolve(JSON.parse(text.slice(start, end + 1)));
        } catch(e) { reject(new Error('Gemini parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// --- Main ---
async function main() {
  console.log('🔄 IberiaSelect — Enriquecimiento YoY\n');

  // Cargar progreso previo
  let saved = {};
  if (fs.existsSync(PROGRESS)) {
    try { saved = JSON.parse(fs.readFileSync(PROGRESS, 'utf8')); } catch(e) {}
  }
  console.log(`♻️  Progreso previo: ${Object.keys(saved).length} regiones\n`);

  // 1. IPV provincial
  const ipvMap = await fetchIPVProvincial();

  // 2. Agrupar por provincia
  const byProvince = {};
  for (const r of REGIONS_DATA) {
    if (saved[r.id]) continue; // ya procesada
    const prov = r.province;
    if (!byProvince[prov]) byProvince[prov] = [];
    byProvince[prov].push(r);
  }

  const provinces = Object.keys(byProvince);
  console.log(`\n🏘️  ${provinces.length} provincias pendientes\n`);

  for (const prov of provinces) {
    const comarcas = byProvince[prov];
    // Buscar IPV — nombre exacto o aproximado
    const ipvKey = Object.keys(ipvMap).find(k =>
      k.toLowerCase().includes(prov.toLowerCase().split('/')[0].trim().slice(0, 6))
    );
    const ipvVal = ipvKey ? ipvMap[ipvKey] : 7.0; // fallback nacional

    console.log(`  📍 ${prov} (IPV: ${ipvVal}%) — ${comarcas.length} comarcas`);

    try {
      const result = await geminiRefineProvince(prov, ipvVal, comarcas);

      for (const r of comarcas) {
        const yoy = result[r.id];
        saved[r.id] = {
          id: r.id,
          yoyPrice: (yoy !== undefined && !isNaN(yoy)) ? parseFloat(yoy.toFixed(1)) : ipvVal,
          yoySource: (yoy !== undefined) ? 'ipv_gemini' : 'ipv_provincial',
        };
      }

      fs.writeFileSync(PROGRESS, JSON.stringify(saved, null, 2));
      await sleep(1500);
    } catch(e) {
      console.warn(`    ⚠️  Gemini falló para ${prov}:`, e.message, '— usando IPV provincial');
      for (const r of comarcas) {
        saved[r.id] = { id: r.id, yoyPrice: ipvVal, yoySource: 'ipv_provincial' };
      }
      fs.writeFileSync(PROGRESS, JSON.stringify(saved, null, 2));
    }
  }

  // Guardar output final
  const results = Object.values(saved);
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`\n✅ ${results.length} regiones procesadas → ${OUTPUT}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
