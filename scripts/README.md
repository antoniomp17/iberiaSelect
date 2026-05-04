# IberiaSelect — Pipeline de datos

Actualización semestral de los datos de las 508 comarcas.

## Cuándo actualizar

Cada ~6 meses (enero y julio). Tiempo total: ~4 horas (3h automático + 40min manual).

## Cómo ejecutar

```bash
node scripts/update.cjs            # pipeline completo (detecta en qué punto estás)
node scripts/update.cjs --status   # ver qué pasos están completados
node scripts/update.cjs --merge    # solo hacer el merge final
```

---

## Pasos del pipeline

### Paso 1 — Clima + distancias (automático, ~3h)
```bash
node scripts/enrich_regions.cjs
```
- Geocodifica cada comarca via **OSM Nominatim**
- Clima (tempAvg, sunHours, rainfall) via **Open-Meteo ERA5**
- Hospitales y aeropuertos más cercanos via **Overpass API**
- Distancia a la costa via **Overpass API**
- Guarda progreso en `data_audit/enrich_progress.json` (reanudable)
- Produce: `data_audit/enriched_regions.json`

### Paso 2 — Precios reales Idealista (manual, ~40min)
1. Abre Chrome → `https://www.idealista.com`
2. F12 → Console
3. Copia y pega el contenido de `scripts/browser_scraper.js`
4. Espera ~40 minutos (guarda progreso en `localStorage`)
5. Se descarga `idealista_prices.json` automáticamente
6. Mueve el archivo a `data_audit/`

> El script usa las cookies de tu sesión de Idealista para evitar el bloqueo de Cloudflare.
> Si se interrumpe, repega el script — continúa desde donde paró.

### Paso 3 — Merge final (automático, instantáneo)
```bash
node scripts/merge_all.cjs
# o bien:
node scripts/update.cjs --merge
```
- Integra enriched_regions.json + idealista_prices.json en `src/data/regions.js`
- Crea backup automático antes de sobreescribir

---

## Estructura de archivos

```
scripts/
  update.cjs              ← orquestador del pipeline
  enrich_regions.cjs      ← paso 1: APIs clima + distancias
  browser_scraper.js      ← paso 2: scraper Idealista (consola Chrome)
  merge_all.cjs           ← paso 3: merge en regions.js

data_audit/
  enriched_regions.json   ← output paso 1 (se regenera cada ciclo)
  idealista_prices.json   ← output paso 2 (se regenera cada ciclo)
  archive/
    2026-S1/              ← ciclos anteriores archivados
    2026-S2/
```

---

## Variables de entorno

```
GEMINI_API_KEY   — en .env — para estimaciones de precio si Idealista falla
```

---

## Notas

- `regions.js` siempre tiene backup automático antes de cualquier merge (`.bak.TIMESTAMP`)
- Las 2 regiones sin cobertura Idealista (Ceuta, Melilla) tienen precios manuales — revisar en cada ciclo
- `browser_scraper.js` se regenera automáticamente con los slugs actuales cada vez que se añaden comarcas
