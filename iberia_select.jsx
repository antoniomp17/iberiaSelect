import { useState, useMemo, useEffect, useCallback, createContext, useContext } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import {
  Sun, Users, Home, Wifi, TrendingUp, ChevronRight, ChevronLeft, Star,
  Filter, MapPin, Euro, ArrowUpRight, ArrowDownRight, AlertTriangle,
  Sparkles, Mountain, Hospital, ExternalLink, Database, Search, Cloud, Droplets, Waves,
  BookmarkCheck, StickyNote, Trash2, CheckCircle2, Eye, Calculator,
  Building2, Hammer, Map
} from "lucide-react";
import { REGIONS_DATA } from "./src/data/regions.js";
import {
  REFORM_COST_M2, REFORM_LABELS, DEFAULT_WEIGHTS,
} from "./src/data/constants.js";

/* ====================================================================
   FUENTES DE DATOS: src/data/regions.js · src/data/constants.js
   ==================================================================== */
const calcTotalCost = (r, sup, level) =>
  Math.round(r.priceM2 * 0.55 * sup + REFORM_COST_M2[level] * sup);


/* ====================================================================
   FUNCIONES DERIVADAS (fuera del componente — nunca se recrean)
   ==================================================================== */
const scorePrecio = p => {
  if (p < 600) return 10; if (p < 800) return 9; if (p < 1000) return 8;
  if (p < 1300) return 7; if (p < 1700) return 6; if (p < 2200) return 5;
  if (p < 2800) return 4; if (p < 3500) return 3; if (p < 4500) return 2;
  return 1;
};

const scoreClima = (t, h, l) => {
  let s = 0;
  s += (t >= 15 && t <= 19) ? 4 : (t >= 13 && t <= 21) ? 3 : (t >= 11) ? 2 : 1;
  s += h > 2900 ? 3 : h > 2600 ? 2.5 : h > 2300 ? 1.8 : h > 2000 ? 1.2 : 0.7;
  s += l > 1500 ? 0.8 : l > 1000 ? 1.5 : l > 400 ? 3 : l > 200 ? 2 : 1;
  return Math.round(Math.min(10, s));
};

const scorePoblacion = p => {
  if (p > 15) return 10; if (p > 8) return 9; if (p > 4) return 8;
  if (p > 1) return 7; if (p > -1) return 6; if (p > -3) return 5;
  if (p > -6) return 4; if (p > -10) return 3; if (p > -15) return 2;
  return 1;
};

const scoreServicios = (fib, hosp, air, dens) => {
  let s = 0;
  s += fib > 95 ? 3 : fib > 88 ? 2.5 : fib > 80 ? 2 : fib > 70 ? 1.5 : 1;
  s += hosp < 10 ? 2.5 : hosp < 20 ? 2 : hosp < 30 ? 1.5 : hosp < 40 ? 1 : 0.5;
  s += air < 30 ? 2 : air < 60 ? 1.5 : air < 100 ? 1 : 0.5;
  s += dens > 100 ? 2.5 : dens > 30 ? 2 : dens > 15 ? 1.5 : dens > 5 ? 1 : 0.5;
  return Math.round(Math.min(10, s));
};


const scorePlayas = km => {
  if (km === null) return 1;
  if (km === 0) return 10; if (km <= 5) return 9; if (km <= 15) return 8;
  if (km <= 30) return 7; if (km <= 60) return 6; if (km <= 100) return 5;
  if (km <= 150) return 4; if (km <= 200) return 3; if (km <= 300) return 2;
  return 1;
};

const allStats = r => ({
  precio: scorePrecio(r.priceM2),
  clima: scoreClima(r.tempAvg, r.sunHours, r.rainfall),
  poblacion: scorePoblacion(r.popTrend),
  servicios: scoreServicios(r.fiber, r.hospitalKm, r.airportKm, r.density),
  belleza: r.beauty,
  playa: scorePlayas(r.beachKm)
});

const calcFinalScore = (r, w) => {
  const s = allStats(r);
  const tot = w.precio + w.clima + w.poblacion + w.servicios + w.belleza + (w.playa||0);
  if (tot === 0) return '0.00';
  return ((s.precio * w.precio + s.clima * w.clima + s.poblacion * w.poblacion +
           s.servicios * w.servicios + s.belleza * w.belleza + s.playa * (w.playa||0)) / tot).toFixed(2);
};

// INE province code → province name (matches our regions.js province field)
const INE_TO_PROVINCE = {
  '01':'Álava','02':'Albacete','03':'Alicante','04':'Almería','05':'Ávila',
  '06':'Badajoz','07':'Illes Balears','08':'Barcelona','09':'Burgos','10':'Cáceres',
  '11':'Cádiz','12':'Castellón','13':'Ciudad Real','14':'Córdoba','15':'A Coruña',
  '16':'Cuenca','17':'Girona','18':'Granada','19':'Guadalajara','20':'Gipuzkoa',
  '21':'Huelva','22':'Huesca','23':'Jaén','24':'León','25':'Lleida',
  '26':'La Rioja','27':'Lugo','28':'Madrid','29':'Málaga','30':'Murcia',
  '31':'Navarra','32':'Ourense','33':'Asturias','34':'Palencia','35':'Las Palmas',
  '36':'Pontevedra','37':'Salamanca','38':'Santa Cruz de Tenerife','39':'Cantabria','40':'Segovia',
  '41':'Sevilla','42':'Soria','43':'Tarragona','44':'Teruel','45':'Toledo',
  '46':'Valencia','47':'Valladolid','48':'Bizkaia','49':'Zamora','50':'Zaragoza',
  '51':'Ceuta','52':'Melilla'
};

// Some province names in regions.js differ slightly — normalize
const PROVINCE_NORMALIZE = {
  'Illes Balears': ['Mallorca','Menorca','Ibiza','Formentera'],
  'Las Palmas': ['Gran Canaria','Lanzarote','Fuerteventura'],
  'Santa Cruz de Tenerife': ['Tenerife','La Palma','La Gomera','El Hierro'],
  'A Coruña': ['A Coruña'],
  'Gipuzkoa': ['Gipuzkoa'],
  'Bizkaia': ['Bizkaia'],
  'Álava': ['Álava'],
};

// Returns all province names from regions.js that map to an INE province
const ineToRegionsProvinces = (ineName) => {
  if (PROVINCE_NORMALIZE[ineName]) return PROVINCE_NORMALIZE[ineName];
  return [ineName];
};

const PROVINCE_SLUGS = {
  'A Coruña': 'a-coruna-provincia',
  'Álava': 'alava',
  'Gipuzkoa': 'guipuzcoa',
  'Bizkaia': 'vizcaya',
  'Lugo/Ourense': 'ourense-provincia',
  'La Rioja': 'la-rioja',
  'Asturias': 'asturias',
  'Cantabria': 'cantabria',
  'Navarra': 'navarra',
  'Mallorca': 'balears-illes',
  'Menorca': 'balears-illes',
  'Ibiza': 'balears-illes',
  'Formentera': 'balears-illes',
  'Tenerife': 'santa-cruz-de-tenerife-provincia',
  'La Palma': 'santa-cruz-de-tenerife-provincia',
  'La Gomera': 'santa-cruz-de-tenerife-provincia',
  'El Hierro': 'santa-cruz-de-tenerife-provincia',
  'Gran Canaria': 'las-palmas-provincia',
  'Lanzarote': 'las-palmas-provincia',
  'Fuerteventura': 'las-palmas-provincia',
  'Ceuta': 'ceuta-ceuta',
  'Melilla': 'melilla-melilla',
};

const IDEALISTA_AFFILIATE = ''; // Rellenar con el ID de afiliado cuando esté disponible

const IDEALISTA_PROVINCE_SLUGS = {
  'A Coruña':   'a-coruna',
  'Lugo':       'lugo',
  'Ourense':    'ourense',
  'Pontevedra': 'pontevedra',
  'Asturias':   'asturias',
  'Cantabria':  'cantabria',
  'Bizkaia':    'vizcaya',
  'Gipuzkoa':  'guipuzcoa',
  'Álava':     'alava',
  'Navarra':   'navarra',
  'Zaragoza':  'zaragoza',
  'Huesca':    'huesca',
  'Teruel':    'teruel',
  'Lleida':       'lleida',
  'Girona':       'girona',
  'Barcelona':    'barcelona',
  'Tarragona':    'tarragona',
  'Castellón':    'castellon',
  'Valencia':     'valencia',
  'Alicante':     'alicante',
  'Murcia':       'murcia',
  'Almería':      'almeria',
  'Granada':      'granada',
  'Jaén':         'jaen',
  'Córdoba':      'cordoba',
  'Málaga':       'malaga',
  'Sevilla':      'sevilla',
  'Cádiz':        'cadiz',
  'Huelva':       'huelva',
  'Badajoz':      'badajoz',
  'Cáceres':      'caceres',
  'Toledo':       'toledo',
  'Guadalajara':  'guadalajara',
  'Cuenca':       'cuenca',
  'Albacete':     'albacete',
  'Ciudad Real':  'ciudad-real',
  'Madrid':       'madrid',
  'Ávila':        'avila',
  'Salamanca':    'salamanca',
  'Zamora':       'zamora',
  'Valladolid':   'valladolid',
  'Segovia':      'segovia',
  'Burgos':       'burgos',
  'Palencia':     'palencia',
  'León':         'leon',
  'Soria':        'soria',
  'La Rioja':     'la-rioja',
  // Islas Baleares — slug compuesto para soportar 4 niveles de URL
  'Mallorca':           'balears-illes/mallorca',
  'Menorca':            'balears-illes/menorca',
  'Ibiza':              'balears-illes/ibiza',
  'Formentera':         'balears-illes',            // nivel isla, sin subcomarca
  // Canarias — slug compuesto por isla
  'Tenerife':           'santa-cruz-de-tenerife/tenerife',
  'La Palma':           'santa-cruz-de-tenerife/la-palma',
  'La Gomera':          'santa-cruz-de-tenerife/la-gomera',
  'El Hierro':          'santa-cruz-de-tenerife/el-hierro',
  'Gran Canaria':       'las-palmas/gran-canaria',
  'Lanzarote':          'las-palmas/lanzarote',
  'Fuerteventura':      'las-palmas/fuerteventura',
  // Zona compartida Galicia
  'Lugo/Ourense':       'ourense',
};

const idealistaURL = r => {
  const suffix = IDEALISTA_AFFILIATE ? `?ref=${IDEALISTA_AFFILIATE}` : '';
  if (r.idealistaSlug) {
    const pSlug = IDEALISTA_PROVINCE_SLUGS[r.province]
      || r.province.toLowerCase()
           .replace(/[/\s]+/g, '-')
           .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
           .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
           .replace(/[^a-z0-9-]/g,'');
    return `https://www.idealista.com/venta-viviendas/${pSlug}/${r.idealistaSlug}/${suffix}`;
  }
  const province = PROVINCE_SLUGS[r.province]
    || (r.province.toLowerCase()
      .replace(/[/\s]+/g, '-')
      .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
      .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
      .replace(/[^a-z0-9-]/g,'') + '-provincia');
  return `https://www.idealista.com/venta-viviendas/${province}/${suffix}`;
};

const protectedLabel = p =>
  p === 'PN' ? 'Parque Nacional' :
  p === 'PNat' ? 'Parque Natural' :
  p === 'RB' ? 'Reserva de la Biosfera' : null;

// Devuelve hasta `count` regiones con perfil parecido (clima, belleza, mar) pero precio inferior
const findSimilarCheaper = (region, count = 3) =>
  REGIONS_DATA
    .filter(r => r.id !== region.id && r.priceM2 < region.priceM2 * 0.88)
    .map(r => {
      const climaSim  = 1 - Math.min(1, Math.abs(r.tempAvg   - region.tempAvg)   / 8);
      const solSim    = 1 - Math.min(1, Math.abs(r.sunHours  - region.sunHours)  / 1500);
      const bellezaSim = 1 - Math.abs(r.beauty - region.beauty) / 10;
      const b1 = r.beachKm === null ? 300 : r.beachKm;
      const b2 = region.beachKm === null ? 300 : region.beachKm;
      const playaSim  = 1 - Math.min(1, Math.abs(b1 - b2) / 300);
      return { ...r, _sim: (climaSim + solSim + bellezaSim * 1.5 + playaSim) / 4.5 };
    })
    .sort((a, b) => b._sim - a._sim)
    .slice(0, count);

/* ====================================================================
   ESTILOS (constante — fuera del componente, nunca se recrean)
   ==================================================================== */
const S = {
  fontDisplay: { fontFamily: '"Fraunces", "Times New Roman", serif' },
  fontBody: { fontFamily: '"Geist", -apple-system, system-ui, sans-serif' },
  fontMono: { fontFamily: '"Geist Mono", ui-monospace, monospace' },
  ink: '#1A1410',
  paper: '#FAF6EE',
  accent: '#9F2D1F',
  ochre: '#B8893A',
  forest: '#365732',
  crimson: '#8B1F1F',
};

/* ====================================================================
   CONTEXTO — para compartir estado entre sub-componentes sin prop drilling
   ==================================================================== */
const Ctx = createContext(null);
const useCtx = () => useContext(Ctx);

/* ====================================================================
   HOOKS REUTILIZABLES
   ==================================================================== */
const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  const set = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, set];
};

/* ====================================================================
   SUB-COMPONENTES (fuera de App — React los reutiliza correctamente)
   ==================================================================== */

const StatBar = ({ value, max = 10, color, label }) => {
  const { ink } = S;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>
        <span>{label}</span>
        <span className="tabular-nums" style={{ color: ink, opacity: 1, fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <div className="w-full" style={{ background: '#D6CFC0', height: '3px' }}>
        <div className="h-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
};

const SimilarRegions = ({ region }) => {
  const { weights, setFilterProvince, setZonaId } = useCtx();
  const { ink, paper, forest } = S;
  const similar = useMemo(() => findSimilarCheaper(region), [region.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!similar.length) return null;
  return (
    <div className="mt-6 pt-5 border-t space-y-3" style={{ borderColor: ink }}>
      <div className="text-xs uppercase tracking-widest" style={{ ...S.fontBody, color: S.accent }}>
        Similares · precio más bajo
      </div>
      <div className="space-y-2">
        {similar.map(r => {
          const discount = Math.round((1 - r.priceM2 / region.priceM2) * 100);
          return (
            <button key={r.id}
              onClick={() => { setFilterProvince('Todas'); setZonaId(r.id); window.scrollTo(0,0); }}
              className="w-full text-left p-3 transition hover:opacity-75"
              style={{ border: `1px solid #D6CFC0`, background: paper }}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="text-sm truncate" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>{r.name}</div>
                  <div className="text-xs uppercase tracking-wider mt-0.5" style={{ ...S.fontBody, color: ink, opacity: 0.45 }}>
                    {r.province} · {r.community}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums" style={{ ...S.fontDisplay, color: forest, fontWeight: 700 }}>
                    {r.priceM2.toLocaleString('es-ES')} €/m²
                  </div>
                  <div className="text-xs tabular-nums" style={{ ...S.fontBody, color: forest }}>
                    -{discount}% · {calcFinalScore(r, weights)} pts
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AppHeader = () => {
  const { view, setView, compareIds } = useCtx();
  const { ink, paper, accent } = S;
  return (
    <header className="sticky top-0 z-50 border-b" style={{ background: `${paper}F0`, borderColor: ink, backdropFilter: 'blur(8px)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
        <button onClick={() => setView('intro')} className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-xl" style={{ ...S.fontDisplay, color: ink, fontWeight: 900 }}>Iberia</span>
          <span className="text-xl italic" style={{ ...S.fontDisplay, color: accent, fontWeight: 300 }}>Select</span>
        </button>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-widest" style={S.fontBody}>
          {[['settings','Pesos'],['map','Mapa'],['game','Explorar'],['ranking','Ranking']].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} className="relative py-1 shrink-0"
              style={{ color: view === v ? accent : ink, opacity: view === v ? 1 : 0.6 }}>
              {l}
              {view === v && <span className="absolute -bottom-3 left-0 right-0" style={{ background: accent, height: '2px' }} />}
            </button>
          ))}
          <button onClick={() => setView('compare')} className="relative py-1 shrink-0 flex items-center gap-1.5"
            style={{ color: view === 'compare' ? accent : compareIds.length > 0 ? accent : ink,
                     opacity: view === 'compare' ? 1 : compareIds.length > 0 ? 0.9 : 0.35 }}>
            Comparar
            {compareIds.length > 0 && (
              <span className="text-xs tabular-nums px-1.5 py-0.5 rounded-sm leading-none"
                style={{ background: accent, color: paper, fontWeight: 700 }}>
                {compareIds.length}
              </span>
            )}
            {view === 'compare' && <span className="absolute -bottom-3 left-0 right-0" style={{ background: accent, height: '2px' }} />}
          </button>
        </nav>
      </div>
    </header>
  );
};

/* ====================================================================
   MAP VIEW — Mapa coroplético de provincias
   ==================================================================== */
const METRIC_OPTIONS = [
  { key: 'score',    label: 'Puntuación final' },
  { key: 'precio',   label: 'Asequibilidad' },
  { key: 'clima',    label: 'Clima' },
  { key: 'poblacion',label: 'Demografía' },
  { key: 'servicios',label: 'Servicios' },
  { key: 'belleza',  label: 'Entorno' },
  { key: 'playa',    label: 'Playa' },
];

const scoreColor = (val, min, max) => {
  if (val === null || val === undefined) return '#D6CFC0';
  const t = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
  // #C84B2F (crimson low) → #FAF6EE (paper mid) → #2A6B2A (forest high)
  if (t < 0.5) {
    const tt = t * 2;
    const r = Math.round(200 + (250 - 200) * tt);
    const g = Math.round(75 + (246 - 75) * tt);
    const b = Math.round(47 + (238 - 47) * tt);
    return `rgb(${r},${g},${b})`;
  } else {
    const tt = (t - 0.5) * 2;
    const r = Math.round(250 + (42 - 250) * tt);
    const g = Math.round(246 + (107 - 246) * tt);
    const b = Math.round(238 + (42 - 238) * tt);
    return `rgb(${r},${g},${b})`;
  }
};

const MapView = () => {
  const { weights, setView, setFilterProvince } = useCtx();
  const { ink, paper, accent, forest } = S;
  const [metric, setMetric] = useState('score');
  const [hovered, setHovered] = useState(null); // { name, val, regions }
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  // Calcula score medio por provincia
  const provinceData = useMemo(() => {
    const map = {};
    for (const [ineCode, ineName] of Object.entries(INE_TO_PROVINCE)) {
      const provinceNames = ineToRegionsProvinces(ineName);
      const regions = REGIONS_DATA.filter(r => provinceNames.includes(r.province));
      if (!regions.length) { map[ineCode] = null; continue; }

      let val;
      if (metric === 'score') {
        const scores = regions.map(r => parseFloat(calcFinalScore(r, weights)));
        val = scores.reduce((a, b) => a + b, 0) / scores.length;
      } else {
        const stats = regions.map(r => allStats(r)[metric]);
        val = stats.reduce((a, b) => a + b, 0) / stats.length;
      }
      map[ineCode] = { val: Math.round(val * 10) / 10, name: ineName, regions, provinceNames };
    }
    return map;
  }, [metric, weights]);

  const allVals = Object.values(provinceData).filter(Boolean).map(d => d.val);
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);

  const handleProvinceClick = (ineCode) => {
    const data = provinceData[ineCode];
    if (!data) return;
    // Use the first matching province name in our data
    const matchProv = data.provinceNames.find(p => REGIONS_DATA.some(r => r.province === p));
    if (matchProv) {
      setFilterProvince(matchProv);
      setView('game');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="border-y-2 py-3 mb-6 flex justify-between items-center text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span className="flex items-center gap-2"><Map size={13} />Mapa de provincias</span>
        <span style={{ color: accent }}>Click en una provincia para explorarla</span>
      </div>

      {/* Selector de métrica */}
      <div className="flex flex-wrap gap-2 mb-6">
        {METRIC_OPTIONS.map(opt => (
          <button key={opt.key}
            onClick={() => setMetric(opt.key)}
            className="px-3 py-1.5 text-xs uppercase tracking-wider transition"
            style={{
              ...S.fontBody,
              background: metric === opt.key ? ink : 'transparent',
              color: metric === opt.key ? paper : ink,
              border: `1px solid ${ink}`,
              opacity: metric === opt.key ? 1 : 0.6,
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Mapa — Península + Baleares (principal) con Canarias como inset */}
      <div className="relative border overflow-hidden" style={{ borderColor: ink, background: '#F0EBE1' }}>

        {/* Mapa principal: Península + Baleares */}
        <ComposableMap
          projection="geoAzimuthalEqualArea"
          projectionConfig={{ rotate: [3, -40, 0], scale: 2600 }}
          width={800} height={500}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <Geographies geography="/spain-provinces.json">
            {({ geographies }) =>
              geographies
                .filter(geo => geo.id !== '35' && geo.id !== '38') // excluye Canarias
                .map(geo => {
                  const ineCode = geo.id;
                  const data = provinceData[ineCode];
                  const fill = data ? scoreColor(data.val, minVal, maxVal) : '#D6CFC0';
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleProvinceClick(ineCode)}
                      onMouseEnter={(e) => {
                        setHovered({ code: ineCode, ...data });
                        setTooltip({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        default: { fill, stroke: ink, strokeWidth: 0.4, outline: 'none', cursor: data ? 'pointer' : 'default' },
                        hover:   { fill, stroke: accent, strokeWidth: 1.2, outline: 'none', filter: 'brightness(0.88)' },
                        pressed: { fill, outline: 'none' },
                      }}
                    />
                  );
                })
            }
          </Geographies>
        </ComposableMap>

        {/* Inset Canarias — esquina inferior izquierda, con borde */}
        <div className="absolute border" style={{
          bottom: '5%', right: '2%',
          width: '26%',
          borderColor: ink,
          background: '#F0EBE1',
        }}>
          {/* Etiqueta */}
          <div className="text-center py-0.5 border-b" style={{
            ...S.fontBody, fontSize: 8, letterSpacing: '0.08em',
            color: ink, opacity: 0.5, borderColor: ink, textTransform: 'uppercase'
          }}>Islas Canarias</div>
          <ComposableMap
            projection="geoAzimuthalEqualArea"
            projectionConfig={{ rotate: [15.5, -28.3, 0], scale: 3200 }}
            width={300} height={170}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <Geographies geography="/spain-provinces.json">
              {({ geographies }) =>
                geographies
                  .filter(geo => geo.id === '35' || geo.id === '38')
                  .map(geo => {
                    const ineCode = geo.id;
                    const data = provinceData[ineCode];
                    const fill = data ? scoreColor(data.val, minVal, maxVal) : '#D6CFC0';
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleProvinceClick(ineCode)}
                        onMouseEnter={(e) => {
                          setHovered({ code: ineCode, ...data });
                          setTooltip({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          default: { fill, stroke: ink, strokeWidth: 0.6, outline: 'none', cursor: data ? 'pointer' : 'default' },
                          hover:   { fill, stroke: accent, strokeWidth: 1.5, outline: 'none', filter: 'brightness(0.88)' },
                          pressed: { fill, outline: 'none' },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* Tooltip */}
        {hovered && (
          <div className="fixed z-50 pointer-events-none px-3 py-2 text-xs"
            style={{
              left: tooltip.x + 14, top: tooltip.y - 10,
              background: ink, color: paper, ...S.fontBody,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transform: 'translateY(-50%)'
            }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{hovered.name}</div>
            <div style={{ opacity: 0.8 }}>{METRIC_OPTIONS.find(m => m.key === metric)?.label}: <strong>{hovered.val?.toFixed(1)}</strong></div>
            <div style={{ opacity: 0.6, marginTop: 2 }}>{hovered.regions?.length} zonas · Click para explorar</div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>Menos</span>
        <div className="flex-1 h-2 rounded-sm" style={{
          background: 'linear-gradient(to right, rgb(200,75,47), rgb(250,246,238), rgb(42,107,42))'
        }} />
        <span className="text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>Más</span>
        <span className="text-xs tabular-nums ml-2" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
          {minVal.toFixed(1)} – {maxVal.toFixed(1)}
        </span>
      </div>

      {/* Resumen top 5 provincias */}
      <div className="mt-8 border-t pt-6" style={{ borderColor: ink }}>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ ...S.fontBody, color: accent }}>
          Top 5 provincias · {METRIC_OPTIONS.find(m => m.key === metric)?.label}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {Object.entries(provinceData)
            .filter(([, d]) => d)
            .sort(([, a], [, b]) => b.val - a.val)
            .slice(0, 5)
            .map(([code, data], i) => (
              <button key={code}
                onClick={() => handleProvinceClick(code)}
                className="text-left p-3 border transition hover:opacity-80"
                style={{ borderColor: ink, background: paper }}>
                <div className="text-xs tabular-nums" style={{ ...S.fontBody, color: accent, fontWeight: 700 }}>
                  #{i + 1}
                </div>
                <div className="text-sm mt-1" style={{ ...S.fontDisplay, color: ink, fontWeight: 700, lineHeight: 1.2 }}>
                  {data.name}
                </div>
                <div className="text-lg tabular-nums mt-1" style={{ ...S.fontDisplay, color: forest, fontWeight: 800 }}>
                  {data.val.toFixed(1)}
                </div>
                <div className="text-xs mt-1" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
                  {data.regions.length} zonas
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

const IntroView = () => {
  const { setView } = useCtx();
  const { ink, paper, accent, forest } = S;
  const minP = Math.min(...REGIONS_DATA.map(r => r.priceM2));
  const maxP = Math.max(...REGIONS_DATA.map(r => r.priceM2));
  const minRegion = REGIONS_DATA.find(r => r.priceM2 === minP);
  const maxRegion = REGIONS_DATA.find(r => r.priceM2 === maxP);

  return (
    <div className="max-w-5xl mx-auto px-5 pt-10 pb-16">
      <div className="border-y-2 py-3 mb-10 flex justify-between text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span>Vol. II · Nº 1</span>
        <span>{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</span>
        <span>Datos verificados</span>
      </div>

      <div className="mb-10">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ ...S.fontBody, color: accent }}>
          Estudio inmobiliario · {REGIONS_DATA.length} comarcas analizadas
        </div>
        <h1 className="tracking-tight mb-6" style={{ ...S.fontDisplay, color: ink, lineHeight: 0.88 }}>
          <span className="block text-5xl font-black">Tu próxima</span>
          <span className="block text-5xl font-light italic" style={{ color: accent }}>vida</span>
          <span className="block text-5xl font-black">empieza aquí.</span>
        </h1>
        <p className="text-base leading-relaxed max-w-xl" style={{ ...S.fontBody, color: ink }}>
          Herramienta de decisión basada en <strong>datos reales</strong> de Idealista, Fotocasa, INE y AEMET. Sin marketing inmobiliario.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mb-12" style={{ background: ink }}>
        {[
          { label: 'Comarcas', value: REGIONS_DATA.length, sub: 'estudiadas' },
          { label: 'Más asequible', value: `${minP} €/m²`, sub: minRegion?.name || '' },
          { label: 'Más caro', value: `${maxP.toLocaleString('es-ES')} €/m²`, sub: maxRegion?.name || '' },
          { label: 'Variables', value: '11', sub: 'por región' }
        ].map((s, i) => (
          <div key={i} className="px-5 py-6" style={{ background: paper }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: accent }}>{s.label}</div>
            <div className="text-3xl font-black mb-1" style={{ ...S.fontDisplay, color: ink }}>{s.value}</div>
            <div className="text-xs" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Método', title: 'Datos derivados', text: 'Las puntuaciones (1–10) se calculan desde €/m² reales, horas de sol AEMET, proyección INE 15 años y cobertura digital MITECO.' },
          { label: 'Filtros', title: 'Por presupuesto', text: 'Ajusta tu techo de €/m² y excluye zonas con riesgo de despoblación para proteger la inversión a largo plazo.' },
          { label: 'Acción', title: 'Ir a Idealista', text: 'Cada ficha enlaza con la búsqueda de casas para reformar en esa provincia, ordenadas por precio ascendente.' }
        ].map((c, i) => (
          <div key={i} className="border-t pt-4" style={{ borderColor: ink }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: accent }}>{c.label}</div>
            <h3 className="text-xl mb-2" style={{ ...S.fontDisplay, color: ink, fontWeight: 600 }}>{c.title}</h3>
            <p className="text-xs leading-relaxed" style={{ ...S.fontBody, color: ink, opacity: 0.75 }}>{c.text}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setView('settings')}
          className="flex-1 py-4 text-xs uppercase tracking-wider font-medium transition hover:opacity-90"
          style={{ ...S.fontBody, background: ink, color: paper }}>
          Configurar prioridades
        </button>
        <button onClick={() => setView('ranking')}
          className="flex-1 py-4 text-xs uppercase tracking-wider font-medium transition hover:bg-stone-100"
          style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
          Ver ranking →
        </button>
      </div>

      <div className="mt-12 pt-5 border-t flex flex-wrap gap-x-6 gap-y-1 text-xs uppercase tracking-wider"
        style={{ ...S.fontBody, borderColor: ink, color: ink, opacity: 0.45 }}>
        <span>Idealista Q1 2026</span><span>Fotocasa Research</span>
        <span>INE 2024–2039</span><span>AEMET 1981–2010</span><span>MITECO 2025</span>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const { weights, setWeights, setView, setCurrentIndex,
          totalBudget, setTotalBudget, superficie, setSuperficie,
          reformLevel, setReformLevel, useBudgetFilter, setUseBudgetFilter } = useCtx();
  const { ink, paper, accent, forest } = S;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const dims = [
    { key: 'precio', label: 'Asequibilidad', sub: 'Precio €/m² real', color: forest },
    { key: 'clima', label: 'Clima', sub: 'Temperatura · sol · lluvia', color: S.ochre },
    { key: 'poblacion', label: 'Demografía', sub: 'Proyección INE 15 años', color: accent },
    { key: 'servicios', label: 'Conexión', sub: 'Fibra · hospital · aeropuerto', color: '#3B5F8A' },
    { key: 'belleza', label: 'Entorno', sub: 'Áreas protegidas y singularidad', color: forest },
    { key: 'playa', label: 'Playa', sub: 'Distancia al mar · km', color: '#2563EB' }
  ];

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="border-y-2 py-3 mb-8 flex justify-between text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span>Paso 1 / 2</span><span>Tus prioridades</span>
      </div>

      <h2 className="text-4xl mb-2 leading-none" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>
        ¿Qué pesa <span style={{ fontStyle: 'italic', fontWeight: 300, color: accent }}>más</span>?
      </h2>
      <p className="text-sm mb-10" style={{ ...S.fontBody, color: ink, opacity: 0.7 }}>
        Distribuye 100 puntos entre las cinco dimensiones.
      </p>

      <div className="space-y-6 mb-10">
        {dims.map(({ key, label, sub, color }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-7 flex-shrink-0" style={{ background: color }} />
                <div className="min-w-0">
                  <div className="text-sm leading-tight truncate" style={{ ...S.fontDisplay, color: ink, fontWeight: 600 }}>{label}</div>
                  <div className="text-xs uppercase tracking-wider truncate" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>{sub}</div>
                </div>
              </div>
              <span className="text-xl tabular-nums shrink-0" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>{weights[key]}</span>
            </div>
            <input type="range" min="0" max="50" step="1" value={weights[key]}
              onChange={e => setWeights({ ...weights, [key]: parseInt(e.target.value) })}
              className="w-full cursor-pointer"
              style={{
                appearance: 'none', height: '2px',
                background: `linear-gradient(to right, ${ink} 0%, ${ink} ${weights[key] * 2}%, #D6CFC0 ${weights[key] * 2}%, #D6CFC0 100%)`
              }} />
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center px-5 py-4 mb-6"
        style={{ background: total === 100 ? forest : S.crimson, color: paper }}>
        <span className="text-xs uppercase tracking-widest" style={S.fontBody}>Total</span>
        <span className="text-2xl tabular-nums" style={{ ...S.fontDisplay, fontWeight: 800 }}>
          {total}{total === 100 ? ' ✓' : ` / 100`}
        </span>
      </div>


      {/* ── Presupuesto total ── */}
      <div className="mt-10 space-y-5">
        <div className="border-y-2 py-3 flex justify-between text-xs uppercase tracking-widest"
          style={{ ...S.fontBody, borderColor: ink, color: ink }}>
          <span>Presupuesto total</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useBudgetFilter} onChange={e => setUseBudgetFilter(e.target.checked)}
              className="w-3.5 h-3.5" style={{ accentColor: accent }} />
            <span>Activar filtro</span>
          </label>
        </div>
        <div className={`space-y-4 transition-opacity ${useBudgetFilter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div>
            <div className="flex justify-between text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: ink }}>
              <span>Presupuesto disponible</span>
              <span className="tabular-nums" style={S.fontMono}>{totalBudget.toLocaleString('es-ES')} €</span>
            </div>
            <input type="range" min="50000" max="600000" step="5000" value={totalBudget}
              onChange={e => setTotalBudget(Number(e.target.value))}
              className="w-full" style={{ accentColor: ink }} />
            <div className="flex justify-between text-xs mt-1" style={{ ...S.fontBody, color: ink, opacity: 0.4 }}>
              <span>50k €</span><span>600k €</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: ink }}>
              <span>Superficie objetivo</span>
              <span className="tabular-nums" style={S.fontMono}>{superficie} m²</span>
            </div>
            <input type="range" min="40" max="250" step="5" value={superficie}
              onChange={e => setSuperficie(Number(e.target.value))}
              className="w-full" style={{ accentColor: ink }} />
            <div className="flex justify-between text-xs mt-1" style={{ ...S.fontBody, color: ink, opacity: 0.4 }}>
              <span>40 m²</span><span>250 m²</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: ink }}>
              Nivel de reforma
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(REFORM_LABELS).map(([k, l]) => (
                <button key={k} onClick={() => setReformLevel(k)}
                  className="py-2.5 text-xs uppercase tracking-wider transition"
                  style={{
                    ...S.fontBody,
                    background: reformLevel === k ? ink : 'transparent',
                    color: reformLevel === k ? paper : ink,
                    border: `1px solid ${ink}`
                  }}>{l.split(' ')[0]}</button>
              ))}
            </div>
            <div className="text-xs mt-2 italic" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
              {REFORM_LABELS[reformLevel]} · Compra (×0,55) + reforma = {calcTotalCost({ priceM2: 1500 }, superficie, reformLevel).toLocaleString('es-ES')} € ejemplo (1.500 €/m²)
            </div>
          </div>
          {useBudgetFilter && (
            <div className="p-3 text-xs uppercase tracking-wider" style={{ background: forest, color: paper, ...S.fontBody }}>
              <Calculator size={11} className="inline mr-2" />
              Mostrando regiones donde compra + reforma ≤ {totalBudget.toLocaleString('es-ES')} €
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button disabled={total !== 100}
          onClick={() => { setCurrentIndex(0); setView('game'); }}
          className="flex-1 py-4 text-xs uppercase tracking-wider font-medium transition disabled:opacity-30 hover:opacity-90"
          style={{ ...S.fontBody, background: ink, color: paper }}>
          Explorar fichas →
        </button>
        <button disabled={total !== 100}
          onClick={() => { setView('ranking'); }}
          className="flex-1 py-4 text-xs uppercase tracking-wider font-medium transition disabled:opacity-30 hover:bg-stone-100"
          style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
          Ver ranking →
        </button>
      </div>
    </div>
  );
};

const GameView = () => {
  const { filteredRegions, currentIndex, setCurrentIndex, filterProvince, setFilterProvince,
          maxBudget, setMaxBudget, hidePopRisk, setHidePopRisk, weights, setView, provinces,
          diary, setDiary, superficie, reformLevel, useBudgetFilter, totalBudget,
          setUseBudgetFilter, zonaId, setZonaId, shareRegionUrl, favs, toggleFav,
          compareIds, toggleCompare } = useCtx();
  const { ink, paper, accent, forest } = S;
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState('grid');
  const [page, setPage] = useState(0);

  // Resuelve navegación por URL compartida en cuanto filteredRegions está disponible
  useEffect(() => {
    if (!zonaId) return;
    const idx = filteredRegions.findIndex(r => r.id === zonaId);
    if (idx !== -1) { setCurrentIndex(idx); setMode('detail'); }
    setZonaId(null);
  }, [zonaId, filteredRegions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPage(0); }, [filterProvince, maxBudget, hidePopRisk]);

  if (!filteredRegions.length) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <p className="text-2xl mb-6" style={{ ...S.fontDisplay, color: ink }}>Sin resultados con estos filtros.</p>
        <button onClick={() => { setMaxBudget(8500); setHidePopRisk(false); setFilterProvince('Todas'); }}
          className="px-6 py-3 text-xs uppercase tracking-wider"
          style={{ ...S.fontBody, background: ink, color: paper }}>
          Restablecer filtros
        </button>
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, filteredRegions.length - 1);
  const r = filteredRegions[safeIndex];
  const s = allStats(r);
  const trendColor = r.popTrend > 0 ? forest : r.popTrend < -8 ? S.crimson : S.ochre;

  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredRegions.length / itemsPerPage);
  const paginated = filteredRegions.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 justify-between items-end mb-7 pb-4 border-b" style={{ borderColor: ink }}>
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setMode('grid')} className="text-xs uppercase tracking-widest transition" style={{ ...S.fontBody, color: mode === 'grid' ? accent : ink, opacity: mode === 'grid' ? 1 : 0.4 }}>Catálogo</button>
            <span style={{ color: ink, opacity: 0.3 }}>|</span>
            <button onClick={() => setMode('detail')} className="text-xs uppercase tracking-widest transition" style={{ ...S.fontBody, color: mode === 'detail' ? accent : ink, opacity: mode === 'detail' ? 1 : 0.4 }}>Detalle</button>
          </div>
          <h2 className="text-2xl" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>
            {mode === 'grid' ? `Explorando ${filteredRegions.length} regiones` : `Ficha ${safeIndex + 1} de ${filteredRegions.length}`}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-stone-100" style={{ border: `1px solid ${ink}20` }}>
            <Search size={14} style={{ color: ink, opacity: 0.5 }} />
            <select value={filterProvince}
              onChange={e => { setFilterProvince(e.target.value); setCurrentIndex(0); setMode('grid'); }}
              className="text-xs uppercase tracking-wider bg-transparent cursor-pointer outline-none"
              style={{ ...S.fontBody, color: ink, minWidth: 140 }}>
              {provinces.map(c => <option key={c} value={c}>{c === 'Todas' ? 'Todas las provincias' : c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2" style={{ border: `1px solid ${ink}` }}>
            <span className="text-xs uppercase" style={{ ...S.fontBody, color: ink }}>Máx</span>
            <input type="number" value={maxBudget} step="200" min="500" max="9000"
              onChange={e => { setMaxBudget(parseInt(e.target.value || 9000)); setCurrentIndex(0); setMode('grid'); }}
              className="w-16 bg-transparent outline-none tabular-nums" style={{ ...S.fontMono, color: ink }} />
            <span className="text-xs" style={{ ...S.fontBody, color: ink }}>€/m²</span>
          </div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer px-3 py-2"
            style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
            <input type="checkbox" checked={hidePopRisk}
              onChange={e => { setHidePopRisk(e.target.checked); setCurrentIndex(0); setMode('grid'); }} className="cursor-pointer" />
            <span>Sin despoblación</span>
          </label>
        </div>
      </div>

      {mode === 'grid' ? (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {paginated.map((reg, i) => {
               const actualIndex = page * itemsPerPage + i;
               return (
                 <button key={reg.id} onClick={() => { setCurrentIndex(actualIndex); setMode('detail'); window.scrollTo(0, 0); }}
                    className="text-left p-5 hover:bg-stone-50 transition flex flex-col justify-between group"
                    style={{ background: paper, border: `1px solid ${ink}` }}>
                    <div className="mb-5">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <div className="text-xs uppercase tracking-widest line-clamp-1" style={{ ...S.fontBody, color: accent }}>{reg.province}</div>
                        {diary[reg.id]?.status === 'favorita' && <BookmarkCheck size={14} style={{ color: accent }} />}
                      </div>
                      <div className="text-xl leading-tight" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>{reg.name}</div>
                    </div>
                    <div className="flex justify-between items-end border-t pt-3" style={{ borderColor: '#D6CFC0' }}>
                      <div>
                         <div className="text-xl tabular-nums leading-none mb-1" style={{ ...S.fontDisplay, color: ink, fontWeight: 800 }}>{reg.priceM2.toLocaleString('es-ES')}</div>
                         <div className="text-[10px] uppercase tracking-wider opacity-50" style={S.fontBody}>€/m²</div>
                      </div>
                      <div className="text-right group-hover:-translate-y-0.5 transition-transform">
                         <div className="text-xl tabular-nums leading-none mb-1" style={{ ...S.fontDisplay, color: accent, fontWeight: 800 }}>{calcFinalScore(reg, weights)}</div>
                         <div className="text-[10px] opacity-50 uppercase tracking-wider" style={S.fontBody}>Nota</div>
                      </div>
                    </div>
                 </button>
               );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t" style={{ borderColor: ink }}>
               <button disabled={page === 0} onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }} className="px-4 py-2 text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-stone-100 transition" style={{ ...S.fontBody, border: `1px solid ${ink}` }}>← Anterior</button>
               <span className="text-xs uppercase tracking-wider opacity-50" style={S.fontBody}>Página {page + 1} de {totalPages}</span>
               <button disabled={page >= totalPages - 1} onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }} className="px-4 py-2 text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-stone-100 transition" style={{ ...S.fontBody, border: `1px solid ${ink}` }}>Siguiente →</button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div key={r.id} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Izquierda */}
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-widest flex flex-wrap gap-x-2" style={{ ...S.fontBody, color: accent }}>
            <span>{r.community}</span>
            <span style={{ color: ink, opacity: 0.3 }}>·</span>
            <span style={{ color: ink, opacity: 0.6 }}>{r.province}</span>
            <span style={{ color: ink, opacity: 0.3 }}>·</span>
            <span style={{ color: ink, opacity: 0.6 }}>{r.zone}</span>
          </div>

          <h2 className="text-4xl" style={{ ...S.fontDisplay, color: ink, fontWeight: 800, lineHeight: 0.9 }}>{r.name}</h2>

          <p className="text-base leading-relaxed border-l-2 pl-4"
            style={{ ...S.fontDisplay, color: ink, fontStyle: 'italic', fontWeight: 300, borderColor: accent }}>
            {r.description}
          </p>

          {protectedLabel(r.protected) && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider"
              style={{ ...S.fontBody, background: forest, color: paper }}>
              <Mountain size={11} /> {protectedLabel(r.protected)}
            </div>
          )}

          <a href={idealistaURL(r)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3 group"
            style={{ background: ink, color: paper }}>
            <div className="flex items-center gap-3">
              <Hammer size={14} />
              <div>
                <div className="text-xs uppercase tracking-wider opacity-60" style={S.fontBody}>Buscar en Idealista</div>
                <div className="text-xs" style={{ ...S.fontBody, fontWeight: 500 }}>Casas para reformar · {r.province}</div>
              </div>
            </div>
            <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <div className="flex gap-2">
            <button onClick={() => setCurrentIndex(c => (c - 1 + filteredRegions.length) % filteredRegions.length)}
              className="flex-1 py-2.5 text-xs uppercase tracking-wider"
              style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
              ← Ant
            </button>
            <button onClick={() => {
              if (safeIndex < filteredRegions.length - 1) setCurrentIndex(c => c + 1);
              else setView('ranking');
            }} className="flex-1 py-2.5 text-xs uppercase tracking-wider"
              style={{ ...S.fontBody, background: accent, color: paper }}>
              {safeIndex < filteredRegions.length - 1 ? 'Sig →' : 'Ranking →'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { shareRegionUrl(r.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex-1 py-2 text-xs uppercase tracking-wider transition"
              style={{ ...S.fontBody, color: ink, opacity: copied ? 1 : 0.45, border: `1px solid #D6CFC0` }}>
              {copied ? '✓ Enlace copiado' : 'Compartir ↗'}
            </button>
            <button
              onClick={() => toggleCompare(r.id)}
              className="px-3 py-2 text-xs uppercase tracking-wider transition"
              title={compareIds.includes(r.id) ? 'Quitar del comparador' : compareIds.length >= 3 ? 'Máximo 3 zonas' : 'Añadir al comparador'}
              style={{ border: `1px solid #D6CFC0`, color: compareIds.includes(r.id) ? accent : ink,
                background: compareIds.includes(r.id) ? '#FCEEEA' : 'transparent',
                opacity: (!compareIds.includes(r.id) && compareIds.length >= 3) ? 0.3 : 1 }}>
              {compareIds.includes(r.id) ? '✓ Comparando' : '⊕ Comparar'}
            </button>
            <button
              onClick={() => toggleFav(r.id)}
              className="px-4 py-2 text-xl transition"
              title={favs.includes(r.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              style={{ border: `1px solid #D6CFC0`, color: favs.includes(r.id) ? S.ochre : ink, opacity: favs.includes(r.id) ? 1 : 0.4 }}>
              ♥
            </button>
          </div>
        </div>

        {/* Derecha */}
        <div className="space-y-5">
          {/* Precio */}
          <div className="p-5" style={{ background: paper, border: `1px solid ${ink}` }}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs uppercase tracking-widest" style={{ ...S.fontBody, color: accent }}>
                Precio Q1 2026 · Idealista
              </div>
              <div className="flex items-center gap-1 text-xs tabular-nums px-2 py-0.5"
                title={r.yoySource ? 'Estimación basada en IPV provincial (INE) refinada con IA' : 'Dato Idealista'}
                style={{ ...S.fontMono, background: r.yoyPrice > 0 ? '#FCEEEA' : '#E8F0E5', color: r.yoyPrice > 0 ? accent : forest }}>
                {r.yoyPrice > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {r.yoySource ? '~' : ''}{r.yoyPrice > 0 ? '+' : ''}{r.yoyPrice}% interanual
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl tabular-nums" style={{ ...S.fontDisplay, color: ink, fontWeight: 800 }}>
                {r.priceM2.toLocaleString('es-ES')}
              </span>
              <span className="text-xl opacity-50" style={S.fontDisplay}>€/m²</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t" style={{ borderColor: '#D6CFC0' }}>
              {[
                { label: 'Casa 100m²', value: `${(r.priceM2 * 100).toLocaleString('es-ES')} €` },
                { label: 'Para reformar*', value: `${Math.round(r.priceM2 * 55).toLocaleString('es-ES')} €` },
                { label: 'Variación 5a (est.)', value: `+${Math.round(r.yoyPrice * 4.5)}%` }
              ].map((d, i) => (
                <div key={i}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>{d.label}</div>
                  <div className="text-sm tabular-nums" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>{d.value}</div>
                </div>
              ))}
            </div>

            {useBudgetFilter && (() => {
              const total = calcTotalCost(r, superficie, reformLevel);
              const fits = total <= totalBudget;
              return (
                <div className="col-span-1 sm:col-span-3 mt-2 px-3 py-2 text-xs uppercase tracking-wider"
                  style={{ background: fits ? '#E8F0E5' : '#FCEEEA', color: fits ? forest : accent, ...S.fontBody }}>
                  <Calculator size={10} className="inline mr-1.5" />
                  Compra + reforma ({reformLevel}): {total.toLocaleString('es-ES')} € {fits ? '✓ Dentro del presupuesto' : `— supera en ${(total - totalBudget).toLocaleString('es-ES')} €`}
                </div>
              );
            })()}
            <p className="text-xs mt-2 italic" style={{ ...S.fontBody, color: ink, opacity: 0.45 }}>
              *100m² × 0,55 (descuento medio "para reformar" según Idealista)
            </p>
          </div>

          {/* Demografía + Servicios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: ink }}>
            <div className="p-4" style={{ background: paper }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
                INE 2024–2039
              </div>
              <div className="text-2xl tabular-nums" style={{ ...S.fontDisplay, color: trendColor, fontWeight: 800 }}>
                {r.popTrend > 0 ? '+' : ''}{r.popTrend}%
              </div>
              <div className="text-xs mt-1 leading-tight" style={{ ...S.fontBody, color: r.popTrend < -10 ? S.crimson : ink, opacity: 0.7 }}>
                {r.popTrend > 8 ? 'Crecimiento fuerte' : r.popTrend > 0 ? 'Crecimiento moderado' : r.popTrend > -5 ? 'Estable' : r.popTrend > -10 ? 'Decrecimiento leve' : '⚠ Despoblación severa'}
              </div>
            </div>
            <div className="p-4" style={{ background: paper }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
                Fibra óptica
              </div>
              <div className="text-2xl tabular-nums" style={{ ...S.fontDisplay, color: ink, fontWeight: 800 }}>
                {r.fiber}<span className="text-sm opacity-50">%</span>
              </div>
              <div className="text-xs mt-1" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>
                Hospital {r.hospitalKm}km · Aeropuerto {r.airportKm}km
              </div>
            </div>
          </div>

          {/* Playa */}
          {r.beachKm !== null && (
            <div className="p-4" style={{ background: paper }}>
              <div className="flex items-center gap-2 mb-1">
                <Waves size={13} style={{ color: '#2563EB' }} />
                <div className="text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
                  Cercanía al mar
                </div>
              </div>
              <div className="text-2xl tabular-nums" style={{ ...S.fontDisplay, color: ink, fontWeight: 800 }}>
                {r.beachKm === 0 ? 'En costa' : `${r.beachKm} km`}
              </div>
            </div>
          )}

          {/* Clima */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: ink }}>
            {[
              { icon: Sun, value: `${r.tempAvg}°C`, label: 'Temp. media', color: S.ochre },
              { icon: Cloud, value: r.sunHours.toLocaleString('es-ES'), label: 'H. sol/año', color: S.ochre },
              { icon: Droplets, value: `${r.rainfall}mm`, label: 'Lluvia/año', color: '#3B5F8A' }
            ].map(({ icon: Icon, value, label, color }, i) => (
              <div key={i} className="p-4" style={{ background: paper }}>
                <Icon size={14} style={{ color }} className="mb-1.5" />
                <div className="text-xl tabular-nums" style={{ ...S.fontDisplay, color: ink, fontWeight: 700 }}>{value}</div>
                <div className="text-xs uppercase tracking-wider mt-0.5" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Barras derivadas */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-widest pb-2 border-b" style={{ ...S.fontBody, color: accent, borderColor: ink }}>
              Puntuaciones derivadas
            </div>
            <StatBar value={s.precio} color={forest} label="Asequibilidad" />
            <StatBar value={s.clima} color={S.ochre} label="Clima" />
            <StatBar value={s.poblacion} color={trendColor} label="Demografía" />
            <StatBar value={s.servicios} color="#3B5F8A" label="Servicios" />
            <StatBar value={s.belleza} color={accent} label="Entorno" />
            <StatBar value={s.playa} color="#2563EB" label="Playa" />
            <div className="flex justify-between items-baseline border-t-2 pt-2" style={{ borderColor: ink }}>
              <span className="text-xs uppercase tracking-wider" style={S.fontBody}>Nota final</span>
              <span className="text-2xl tabular-nums" style={{ ...S.fontDisplay, color: accent, fontWeight: 800 }}>
                {calcFinalScore(r, weights)}
              </span>
            </div>
          </div>

          <div className="text-xs uppercase tracking-wider py-2.5 border-t border-b" style={{ ...S.fontBody, color: ink, opacity: 0.55, borderColor: ink }}>
            {r.vibe}
          </div>
          {/* ── Diario ── */}
          <div className="border-t pt-4 space-y-3" style={{ borderColor: ink }}>
            <div className="text-xs uppercase tracking-widest" style={{ ...S.fontBody, color: accent }}>
              Mi diario
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {[
                { key: 'favorita', label: 'Favorita', icon: BookmarkCheck, color: accent },
                { key: 'visitada', label: 'Visitada', icon: Eye, color: S.ochre },
                { key: 'descartada', label: 'Descartar', icon: Trash2, color: '#888' }
              ].map(({ key, label, icon: Icon, color }) => {
                const active = diary[r.id]?.status === key;
                return (
                  <button key={key}
                    onClick={() => setDiary(prev => ({
                      ...prev,
                      [r.id]: { ...prev[r.id], status: active ? null : key, updatedAt: new Date().toISOString() }
                    }))}
                    className="flex flex-col items-center gap-1 py-2.5 text-xs uppercase tracking-wider transition"
                    style={{
                      ...S.fontBody,
                      background: active ? color : 'transparent',
                      color: active ? paper : ink,
                      border: `1px solid ${active ? color : '#D6CFC0'}`,
                      opacity: active ? 1 : 0.7
                    }}>
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>
            <textarea
              placeholder="Notas personales sobre esta zona..."
              value={diary[r.id]?.note || ''}
              onChange={e => setDiary(prev => ({
                ...prev,
                [r.id]: { ...prev[r.id], note: e.target.value, updatedAt: new Date().toISOString() }
              }))}
              rows={3}
              className="w-full text-xs p-3 resize-none outline-none"
              style={{ ...S.fontBody, color: ink, background: '#F5F0E8', border: `1px solid #D6CFC0` }}
            />
          </div>
        </div>
        </div>
        <SimilarRegions region={r} />
      </div>
      )}
    </div>
  );
};

const SortIcon = ({ active, dir }) => (
  <span className="ml-0.5 opacity-40" style={{ opacity: active ? 1 : 0.3 }}>
    {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
  </span>
);

const RankingView = () => {
  const { sortedRanking, setView, setCurrentIndex, shareUrl, setZonaId, setFilterProvince, favs, toggleFav, compareIds, toggleCompare } = useCtx();
  const { ink, paper, accent, forest } = S;
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [provFilter, setProvFilter] = useState('Todas');
  const [favsOnly, setFavsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const allProvs = useMemo(() =>
    ['Todas', ...new Set(REGIONS_DATA.map(r => r.province))].sort()
  , []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'score' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const displayList = useMemo(() => {
    let arr = sortedRanking;
    if (provFilter !== 'Todas') arr = arr.filter(r => r.province === provFilter);
    if (favsOnly) arr = arr.filter(r => favs.includes(r.id));

    if (sortKey !== 'score') {
      arr = [...arr].sort((a, b) => {
        const va = sortKey === 'price' ? a.priceM2 : sortKey === 'pop' ? a.popTrend : sortKey === 'sun' ? a.sunHours : 0;
        const vb = sortKey === 'price' ? b.priceM2 : sortKey === 'pop' ? b.popTrend : sortKey === 'sun' ? b.sunHours : 0;
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    } else if (sortDir === 'asc') {
      arr = [...arr].reverse();
    }
    return arr;
  }, [sortedRanking, provFilter, favsOnly, favs, sortKey, sortDir]);

  const winners = sortedRanking.slice(0, 3);
  const tableRows = displayList.slice(0, page * PAGE_SIZE);
  const hasMore = displayList.length > page * PAGE_SIZE;

  const goToRegion = (r) => { setFilterProvince('Todas'); setZonaId(r.id); setView('game'); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="border-y-2 py-3 mb-8 flex justify-between text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span>Resultado final</span>
        <span>{REGIONS_DATA.length} comarcas</span>
      </div>

      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: accent }}>El veredicto</div>
        <h2 className="text-5xl leading-none mb-2" style={{ ...S.fontDisplay, color: ink, fontWeight: 800 }}>
          Tu <span style={{ fontStyle: 'italic', fontWeight: 300, color: accent }}>destino</span>
        </h2>
      </div>

      {/* Podio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px mb-12" style={{ background: ink }}>
        {winners.map((r, i) => {
          const isFirst = i === 0;
          const isFav = favs.includes(r.id);
          return (
            <div key={r.id} className="relative" style={{ background: isFirst ? ink : paper }}>
              <button onClick={() => goToRegion(r)} className="w-full p-6 text-left hover:opacity-90 transition" style={{ color: isFirst ? paper : ink }}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-6xl tabular-nums leading-none" style={{ ...S.fontDisplay, fontWeight: 900, opacity: 0.2 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {isFirst && <Sparkles size={18} style={{ color: S.ochre }} />}
                </div>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ ...S.fontBody, opacity: 0.6 }}>
                  {r.province} · {r.community}
                </div>
                <h3 className="text-2xl mb-3" style={{ ...S.fontDisplay, fontWeight: 800, lineHeight: 0.95 }}>{r.name}</h3>
                <div className="flex items-baseline gap-2 mb-3 pb-3 border-b" style={{ borderColor: isFirst ? '#3a342e' : '#D6CFC0' }}>
                  <span className="text-4xl tabular-nums" style={{ ...S.fontDisplay, fontWeight: 800 }}>{r.finalScore}</span>
                  <span className="text-xs uppercase tracking-wider opacity-50" style={S.fontBody}>nota</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs" style={S.fontBody}>
                  {[['€/m²', r.priceM2.toLocaleString('es-ES')], ['Pob 2039', `${r.popTrend > 0 ? '+' : ''}${r.popTrend}%`],
                    ['Sol/año', `${r.sunHours}h`], ['Fibra', `${r.fiber}%`]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ opacity: 0.5 }}>{k}</span>
                      <span className="tabular-nums" style={S.fontMono}>{v}</span>
                    </div>
                  ))}
                </div>
                <a href={idealistaURL(r)} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mt-4 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-60 hover:opacity-100 transition inline-flex"
                  style={S.fontBody}>
                  Ver en Idealista <ExternalLink size={10} />
                </a>
              </button>
              <button onClick={e => { e.stopPropagation(); toggleFav(r.id); }}
                className="absolute top-3 right-3 p-1.5 text-xl transition"
                style={{ color: isFav ? S.ochre : (isFirst ? paper : ink), opacity: isFav ? 1 : 0.35 }}
                title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
                ♥
              </button>
            </div>
          );
        })}
      </div>

      {/* Tabla completa */}
      <div className="mb-10">
        {/* Cabecera + controles */}
        <div className="border-y-2 py-3 mb-4 flex flex-wrap justify-between items-center gap-3 text-xs uppercase tracking-widest"
          style={{ ...S.fontBody, borderColor: ink, color: ink }}>
          <span>Ranking completo · {displayList.length} comarcas</span>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => { setFavsOnly(f => !f); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-1 transition"
              style={{ border: `1px solid ${favsOnly ? S.ochre : ink}`, color: favsOnly ? S.ochre : ink, background: favsOnly ? '#FFF8EC' : 'transparent' }}>
              ♥ {favsOnly ? `Favoritos (${favs.length})` : 'Solo favoritos'}
            </button>
            <select value={provFilter} onChange={e => { setProvFilter(e.target.value); setPage(1); }}
              className="text-xs uppercase tracking-wider px-2 py-1"
              style={{ ...S.fontBody, border: `1px solid ${ink}`, color: ink, background: paper }}>
              {allProvs.map(p => <option key={p} value={p}>{p === 'Todas' ? 'Todas las provincias' : p}</option>)}
            </select>
          </div>
        </div>

        {compareIds.length === 0 && (
          <p className="text-xs mb-3 mt-1" style={{ ...S.fontBody, color: S.ink, opacity: 0.4 }}>
            Pulsa ⊕ en cualquier fila para añadirla al comparador · máx. 3 zonas
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 560 }}>
            <thead>
              <tr className="text-xs uppercase tracking-wider border-b" style={{ ...S.fontBody, color: ink, borderColor: ink }}>
                <th className="py-2.5 pr-2 w-8 opacity-40">#</th>
                <th className="py-2.5 pr-3">Comarca</th>
                <th className="py-2.5 pr-2 text-right cursor-pointer select-none" onClick={() => handleSort('price')}>
                  €/m² <SortIcon active={sortKey==='price'} dir={sortDir} />
                </th>
                <th className="py-2.5 pr-2 text-right cursor-pointer select-none" onClick={() => handleSort('pop')}>
                  Pob <SortIcon active={sortKey==='pop'} dir={sortDir} />
                </th>
                <th className="py-2.5 pr-2 text-right cursor-pointer select-none" onClick={() => handleSort('sun')}>
                  Sol <SortIcon active={sortKey==='sun'} dir={sortDir} />
                </th>
                <th className="py-2.5 pr-2 text-right cursor-pointer select-none" onClick={() => handleSort('score')}>
                  Nota <SortIcon active={sortKey==='score'} dir={sortDir} />
                </th>
                <th className="py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, idx) => {
                const isFav = favs.includes(r.id);
                const globalRank = sortedRanking.findIndex(x => x.id === r.id) + 1;
                return (
                  <tr key={r.id} className="border-b hover:bg-stone-50 transition cursor-pointer group" style={{ borderColor: '#E8E0D2' }}>
                    <td className="py-2.5 pr-2 tabular-nums text-xs" style={{ ...S.fontMono, color: ink, opacity: 0.35 }}
                      onClick={() => goToRegion(r)}>
                      {String(sortKey === 'score' ? (sortDir === 'asc' ? displayList.length - idx : idx + 1) : globalRank).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 pr-3" onClick={() => goToRegion(r)}>
                      <div className="text-sm" style={{ ...S.fontDisplay, color: ink, fontWeight: 600 }}>{r.name}</div>
                      <div className="text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.45 }}>{r.province}</div>
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-xs" style={S.fontMono} onClick={() => goToRegion(r)}>
                      {r.priceM2.toLocaleString('es-ES')}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-xs"
                      style={{ ...S.fontMono, color: r.popTrend > 5 ? forest : r.popTrend < -10 ? S.crimson : ink, opacity: 0.8 }}
                      onClick={() => goToRegion(r)}>
                      {r.popTrend > 0 ? '+' : ''}{r.popTrend}%
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-xs" style={{ ...S.fontMono, color: ink, opacity: 0.55 }}
                      onClick={() => goToRegion(r)}>
                      {r.sunHours}h
                    </td>
                    <td className="py-2.5 pr-2 text-right" onClick={() => goToRegion(r)}>
                      <span className="text-base tabular-nums" style={{ ...S.fontDisplay, color: accent, fontWeight: 700 }}>
                        {r.finalScore}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => toggleCompare(r.id)}
                          className="transition text-sm leading-none"
                          style={{ color: compareIds.includes(r.id) ? accent : ink,
                            opacity: compareIds.includes(r.id) ? 1 : (!compareIds.includes(r.id) && compareIds.length >= 3) ? 0.1 : 0.2 }}
                          title={compareIds.includes(r.id) ? 'Quitar del comparador' : 'Añadir al comparador'}>
                          ⊕
                        </button>
                        <button onClick={() => toggleFav(r.id)}
                          className="transition text-xl leading-none"
                          style={{ color: isFav ? S.ochre : ink, opacity: isFav ? 1 : 0.2 }}
                          title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
                          ♥
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <button onClick={() => setPage(p => p + 1)}
            className="w-full mt-4 py-3 text-xs uppercase tracking-wider transition"
            style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
            Ver más ({displayList.length - tableRows.length} restantes)
          </button>
        )}
      </div>

      <div className="mb-16 space-y-3">
        <button
          onClick={() => { shareUrl(); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="w-full py-4 text-xs uppercase tracking-wider transition font-medium"
          style={{ ...S.fontBody, color: copied ? forest : ink, border: `1px solid ${copied ? forest : ink}`, background: copied ? '#E8F0E5' : 'transparent' }}>
          {copied ? '✓ Enlace de configuración copiado' : 'Compartir tu ranking ↗'}
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => setView('settings')}
            className="py-4 text-xs uppercase tracking-wider"
            style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
            ← Recalcular
          </button>
          <button onClick={() => { setCurrentIndex(0); setView('game'); }}
            className="py-4 text-xs uppercase tracking-wider"
            style={{ ...S.fontBody, background: ink, color: paper }}>
            Explorar fichas →
          </button>
        </div>
      </div>

      <div className="border-t-2 pt-6" style={{ borderColor: ink }}>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ ...S.fontBody, color: accent }}>
          <Database size={11} className="inline mr-1" /> Fuentes
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs leading-relaxed" style={{ ...S.fontBody, color: ink, opacity: 0.65 }}>
          <div><strong>Precios</strong><br />Idealista Q1 2026, Fotocasa Research, IPV Q4 2025.</div>
          <div><strong>Demografía</strong><br />INE — Proyección de Población 2024–2039. Padrón Continuo.</div>
          <div><strong>Clima y servicios</strong><br />AEMET 1981–2010. MITECO — Cobertura banda ancha 2025.</div>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================
   COMPARADOR
   ==================================================================== */
const CompareBar = () => {
  const { compareIds, setCompareIds, setView } = useCtx();
  const { ink, paper, accent } = S;
  if (compareIds.length === 0) return null;
  const regions = compareIds.map(id => REGIONS_DATA.find(r => r.id === id)).filter(Boolean);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t" style={{ background: ink, borderColor: '#3a342e' }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-xs uppercase tracking-widest shrink-0" style={{ ...S.fontBody, color: paper, opacity: 0.5 }}>
          Comparando
        </span>
        <div className="flex gap-2 flex-1 flex-wrap">
          {regions.map(r => (
            <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 text-xs" style={{ background: '#3a342e', color: paper }}>
              <span style={S.fontBody}>{r.name}</span>
              <button onClick={() => setCompareIds(ids => ids.filter(x => x !== r.id))}
                className="opacity-50 hover:opacity-100 transition leading-none">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setCompareIds([])}
            className="px-3 py-1.5 text-xs uppercase tracking-wider transition"
            style={{ ...S.fontBody, color: paper, opacity: 0.45, border: '1px solid #3a342e' }}>
            Limpiar
          </button>
          <button onClick={() => setView('compare')}
            disabled={compareIds.length < 2}
            className="px-4 py-1.5 text-xs uppercase tracking-wider transition disabled:opacity-30"
            style={{ ...S.fontBody, background: accent, color: paper }}>
            Ver comparativa ({compareIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const CompareView = () => {
  const { compareIds, setCompareIds, setView, setZonaId, setFilterProvince, weights } = useCtx();
  const { ink, paper, accent, forest } = S;
  const [copiedCmp, setCopiedCmp] = useState(false);

  const regions = compareIds.map(id => REGIONS_DATA.find(r => r.id === id)).filter(Boolean)
    .map(r => ({ ...r, finalScore: calcFinalScore(r, weights), stats: allStats(r) }));

  const goTo = (r) => { setFilterProvince('Todas'); setZonaId(r.id); setView('game'); };

  const shareCmp = () => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const cfg = [precio, clima, poblacion, servicios, belleza, playa].join('-');
    const params = new URLSearchParams({ cfg, compare: compareIds.join(',') });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedCmp(true);
    setTimeout(() => setCopiedCmp(false), 2000);
  };

  const best = (vals, lowerBetter = false) => {
    const valid = vals.filter(v => v !== null && v !== undefined);
    if (!valid.length) return null;
    return lowerBetter ? Math.min(...valid) : Math.max(...valid);
  };

  const metrics = [
    { label: 'Nota final', vals: regions.map(r => r.finalScore), fmt: v => v, lowerBetter: false, highlight: true },
    { label: '€/m²', vals: regions.map(r => r.priceM2), fmt: v => v.toLocaleString('es-ES'), lowerBetter: true, highlight: true },
    { label: 'Variación anual precio (~est.)', vals: regions.map(r => r.yoyPrice),
      fmt: v => `~${v > 0 ? '+' : ''}${v}%`, highlight: false },
    { label: 'Tendencia pob. 15a', vals: regions.map(r => r.popTrend), fmt: v => `${v > 0 ? '+' : ''}${v}%`, lowerBetter: false, highlight: true },
    { label: 'Temperatura media', vals: regions.map(r => r.tempAvg), fmt: v => `${v} °C`, highlight: false },
    { label: 'Horas de sol/año', vals: regions.map(r => r.sunHours), fmt: v => `${v}h`, lowerBetter: false, highlight: true },
    { label: 'Lluvia anual', vals: regions.map(r => r.rainfall), fmt: v => `${v} mm`, highlight: false },
    { label: 'Cobertura fibra', vals: regions.map(r => r.fiber), fmt: v => `${v}%`, lowerBetter: false, highlight: true },
    { label: 'Hospital más cercano', vals: regions.map(r => r.hospitalKm), fmt: v => `${v} km`, lowerBetter: true, highlight: true },
    { label: 'Aeropuerto más cercano', vals: regions.map(r => r.airportKm), fmt: v => `${v} km`, lowerBetter: true, highlight: true },
    { label: 'Distancia playa', vals: regions.map(r => r.beachKm), fmt: v => v === null ? 'Interior' : `${v} km`, lowerBetter: true, highlight: true },
    { label: 'Densidad (hab/km²)', vals: regions.map(r => r.density), fmt: v => v.toLocaleString('es-ES'), highlight: false },
  ];

  if (regions.length < 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-sm uppercase tracking-wider mb-6" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>
          Selecciona al menos 2 zonas con ⊕ para comparar.
        </p>
        <button onClick={() => setView('ranking')} className="px-6 py-3 text-xs uppercase tracking-wider"
          style={{ ...S.fontBody, background: ink, color: paper }}>← Volver al ranking</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-24">
      <div className="border-y-2 py-3 mb-8 flex justify-between items-center text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span>Comparativa · {regions.length} zonas</span>
        <button onClick={() => setView('ranking')} className="opacity-50 hover:opacity-100 transition">← Ranking</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${ink}` }}>
              <th className="py-3 pr-4 text-xs uppercase tracking-wider w-40" style={{ ...S.fontBody, color: ink, opacity: 0.4 }}>
                Variable
              </th>
              {regions.map(r => (
                <th key={r.id} className="py-3 pr-4 text-left">
                  <div className="text-xs uppercase tracking-wider mb-0.5" style={{ ...S.fontBody, color: ink, opacity: 0.5 }}>{r.province}</div>
                  <button onClick={() => goTo(r)} className="text-lg hover:underline text-left leading-tight"
                    style={{ ...S.fontDisplay, color: ink, fontWeight: 800 }}>{r.name}</button>
                  <div className="mt-1.5 flex gap-2 items-center">
                    <a href={idealistaURL(r)} target="_blank" rel="noopener noreferrer"
                      className="text-xs uppercase tracking-wider opacity-50 hover:opacity-100 transition flex items-center gap-1"
                      style={S.fontBody}>
                      Idealista <ExternalLink size={9} />
                    </a>
                    <button onClick={() => setCompareIds(ids => ids.filter(x => x !== r.id))}
                      className="text-xs opacity-30 hover:opacity-70 transition" style={S.fontBody}>
                      × quitar
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ label, vals, fmt, lowerBetter, highlight }) => {
              const bestVal = highlight ? best(vals.filter(v => v !== null), lowerBetter) : null;
              return (
                <tr key={label} className="border-b" style={{ borderColor: '#E8E0D2' }}>
                  <td className="py-3 pr-4 text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.45 }}>
                    {label}
                  </td>
                  {vals.map((v, i) => {
                    const isBest = highlight && v !== null && v === bestVal;
                    return (
                      <td key={i} className="py-3 pr-4 text-sm tabular-nums"
                        style={{ ...S.fontMono, color: isBest ? accent : ink, fontWeight: isBest ? 700 : 400 }}>
                        {v === null || v === undefined ? <span style={{ opacity: 0.3 }}>—</span> : fmt(v)}
                        {isBest && <span className="ml-1 text-xs" style={{ color: accent }}>✓</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex gap-3 flex-wrap">
        <button onClick={shareCmp}
          className="px-6 py-3 text-xs uppercase tracking-wider transition"
          style={{ ...S.fontBody, color: copiedCmp ? forest : ink, border: `1px solid ${copiedCmp ? forest : ink}`, background: copiedCmp ? '#E8F0E5' : 'transparent' }}>
          {copiedCmp ? '✓ Enlace copiado' : 'Compartir comparativa ↗'}
        </button>
        <button onClick={() => setCompareIds([])}
          className="px-6 py-3 text-xs uppercase tracking-wider transition"
          style={{ ...S.fontBody, color: ink, opacity: 0.45, border: `1px solid #D6CFC0` }}>
          Limpiar selección
        </button>
      </div>
    </div>
  );
};

/* ====================================================================
   APP PRINCIPAL
   ==================================================================== */
const DiaryView = () => {
  const { diary, setDiary, setView, setCurrentIndex, weights } = useCtx();
  const { ink, paper, accent, forest } = S;

  const STATUS_META = {
    favorita:   { label: 'Favoritas',   icon: BookmarkCheck, color: accent },
    visitada:   { label: 'Visitadas',   icon: Eye,           color: S.ochre },
    descartada: { label: 'Descartadas', icon: Trash2,        color: '#888' },
  };

  const groups = Object.entries(STATUS_META).map(([key, meta]) => ({
    ...meta, key,
    regions: Object.entries(diary)
      .filter(([, v]) => v?.status === key)
      .map(([id, v]) => ({ ...REGIONS_DATA.find(r => r.id === id), ...v }))
      .filter(r => r.id)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }));

  const total = groups.reduce((acc, g) => acc + g.regions.length, 0);

  const goTo = (id) => {
    const idx = REGIONS_DATA.findIndex(r => r.id === id);
    if (idx !== -1) { setCurrentIndex(idx); setView('game'); }
  };

  const clearAll = () => {
    if (window.confirm('¿Borrar todo el diario?')) setDiary({});
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="border-y-2 py-3 mb-8 flex justify-between items-center text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span>Mi diario · {total} {total === 1 ? 'zona' : 'zonas'}</span>
        {total > 0 && (
          <button onClick={clearAll} className="text-xs uppercase tracking-wider opacity-50 hover:opacity-100 transition"
            style={{ ...S.fontBody, color: ink }}>
            Borrar todo
          </button>
        )}
      </div>

      {total === 0 && (
        <div className="text-center py-20 space-y-4">
          <StickyNote size={32} style={{ color: ink, opacity: 0.2, margin: '0 auto' }} />
          <p className="text-sm uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.4 }}>
            Todavía no has marcado ninguna zona.
          </p>
          <button onClick={() => setView('game')}
            className="px-6 py-3 text-xs uppercase tracking-wider"
            style={{ ...S.fontBody, background: ink, color: paper }}>
            Explorar zonas →
          </button>
        </div>
      )}

      {groups.filter(g => g.regions.length > 0).map(({ key, label, icon: Icon, color, regions }) => (
        <div key={key} className="mb-10">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: ink }}>
            <Icon size={14} style={{ color }} />
            <span className="text-xs uppercase tracking-widest" style={{ ...S.fontBody, color }}>{label}</span>
            <span className="text-xs opacity-40" style={S.fontBody}>({regions.length})</span>
          </div>

          <div className="space-y-3">
            {regions.map(r => {
              const s = allStats(r);
              return (
                <div key={r.id} className="p-4" style={{ border: `1px solid #D6CFC0`, background: paper }}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <button onClick={() => goTo(r.id)}
                          className="text-base hover:underline text-left"
                          style={{ ...S.fontDisplay, color: ink, fontWeight: 700, lineHeight: 1.1 }}>
                          {r.name}
                        </button>
                        <span className="text-xs opacity-50" style={S.fontBody}>{r.community}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs tabular-nums" style={{ ...S.fontMono, color: ink, opacity: 0.7 }}>
                        <span>{r.priceM2?.toLocaleString('es-ES')} €/m²</span>
                        <span>{r.tempAvg}°C · {r.sunHours?.toLocaleString('es-ES')}h sol</span>
                        {r.beachKm !== null && <span>{r.beachKm === 0 ? 'En costa' : `Playa ${r.beachKm}km`}</span>}
                      </div>
                      {r.note && (
                        <p className="mt-2 text-xs italic leading-relaxed" style={{ ...S.fontBody, color: ink, opacity: 0.65 }}>
                          "{r.note}"
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="text-2xl tabular-nums" style={{ ...S.fontDisplay, color: accent, fontWeight: 800 }}>
                        {calcFinalScore(r, weights)}
                      </div>
                      <button onClick={() => setDiary(prev => {
                        const next = { ...prev };
                        delete next[r.id];
                        return next;
                      })} className="text-xs opacity-30 hover:opacity-70 transition uppercase tracking-wider"
                        style={{ ...S.fontBody, color: ink }}>
                        Quitar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-3">
                    {[
                      { label: 'Precio', val: s.precio, color: forest },
                      { label: 'Clima', val: s.clima, color: S.ochre },
                      { label: 'Playa', val: s.playa, color: '#2563EB' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="p-2 text-center"
                        style={{ background: '#F5F0E8' }}>
                        <div className="text-lg tabular-nums" style={{ ...S.fontDisplay, color, fontWeight: 700 }}>{val}</div>
                        <div className="text-xs uppercase tracking-wider opacity-50" style={S.fontBody}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {total > 0 && (
        <div className="mt-8 pt-6 border-t text-xs uppercase tracking-wider opacity-40 text-center"
          style={{ ...S.fontBody, borderColor: ink, color: ink }}>
          {groups.find(g => g.key === 'favorita')?.regions.length || 0} favoritas ·{' '}
          {groups.find(g => g.key === 'visitada')?.regions.length || 0} visitadas ·{' '}
          {groups.find(g => g.key === 'descartada')?.regions.length || 0} descartadas
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [view, setViewRaw] = useState(() => {
    const hash = window.location.hash.slice(1);
    return ['intro','settings','game','ranking'].includes(hash) ? hash : 'intro';
  });
  const setView = useCallback((v) => {
    setViewRaw(v);
    window.history.pushState({ view: v }, '', `#${v}`);
  }, []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterProvince, setFilterProvince] = useState('Todas');
  const [maxBudget, setMaxBudget] = useState(8500);
  const [hidePopRisk, setHidePopRisk] = useState(false);
  const [weights, setWeights] = useLocalStorage('iberia-weights', DEFAULT_WEIGHTS);
  const [diary, setDiary] = useLocalStorage('iberia-diary', {});
  const [favs, setFavs] = useLocalStorage('iberia-favs', []);
  const toggleFav = useCallback(id => setFavs(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]), [setFavs]);
  const [compareIds, setCompareIds] = useState([]);
  const toggleCompare = useCallback(id => setCompareIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id)
    : prev.length < 3 ? [...prev, id] : prev
  ), []);
  const [totalBudget, setTotalBudget] = useState(150000);
  const [superficie, setSuperficie] = useState(80);
  const [reformLevel, setReformLevel] = useState('media');
  const [useBudgetFilter, setUseBudgetFilter] = useState(false);
  const [zonaId, setZonaId] = useState(null);

  // Lee pesos y zona desde query params al montar (enlace compartido)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cfg = params.get('cfg');
    if (cfg) {
      const parts = cfg.split('-').map(Number);
      if (parts.length === 6 && parts.every(n => !isNaN(n) && n >= 0 && n <= 50)) {
        const [precio, clima, poblacion, servicios, belleza, playa] = parts;
        setWeights({ precio, clima, poblacion, servicios, belleza, playa });
      }
    }
    const zona = params.get('zona');
    if (zona) { setZonaId(zona); setView('game'); }
    const compare = params.get('compare');
    if (compare) { setCompareIds(compare.split(',').slice(0, 3)); setView('compare'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back/forward button support
  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.view || window.location.hash.slice(1) || 'intro';
      setViewRaw(['intro','settings','map','game','ranking','compare'].includes(v) ? v : 'intro');
    };
    window.addEventListener('popstate', onPop);
    // Push initial state so back button works from first view
    window.history.replaceState({ view }, '', `#${view}`);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shareUrl = useCallback(() => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const cfg = [precio, clima, poblacion, servicios, belleza, playa].join('-');
    const params = new URLSearchParams({ cfg });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [weights]);

  const shareRegionUrl = useCallback((regionId) => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const cfg = [precio, clima, poblacion, servicios, belleza, playa].join('-');
    const params = new URLSearchParams({ cfg, zona: regionId });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [weights]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,800;9..144,900&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  const filteredRegions = useMemo(() => {
    let arr = REGIONS_DATA;
    if (filterProvince !== 'Todas') arr = arr.filter(r => r.province === filterProvince);
    arr = arr.filter(r => r.priceM2 <= maxBudget);
    if (hidePopRisk) arr = arr.filter(r => r.popTrend > -10);
    if (useBudgetFilter) arr = arr.filter(r => calcTotalCost(r, superficie, reformLevel) <= totalBudget);
    return arr;
  }, [filterProvince, maxBudget, hidePopRisk, useBudgetFilter, totalBudget, superficie, reformLevel]);

  const provinces = useMemo(() =>
    ['Todas', ...new Set(REGIONS_DATA.map(r => r.province))].sort()
  , []);

  const sortedRanking = useMemo(() =>
    REGIONS_DATA
      .map(r => ({ ...r, finalScore: calcFinalScore(r, weights), stats: allStats(r) }))
      .sort((a, b) => b.finalScore - a.finalScore)
  , [weights]);

  const ctx = {
    view, setView,
    currentIndex, setCurrentIndex,
    filterProvince, setFilterProvince,
    maxBudget, setMaxBudget,
    hidePopRisk, setHidePopRisk,
    weights, setWeights,
    filteredRegions, provinces, sortedRanking,
    diary, setDiary,
    favs, toggleFav,
    compareIds, setCompareIds, toggleCompare,
    totalBudget, setTotalBudget,
    superficie, setSuperficie,
    reformLevel, setReformLevel,
    useBudgetFilter, setUseBudgetFilter,
    zonaId, setZonaId,
    shareUrl, shareRegionUrl,
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-screen" style={{ background: S.paper, ...S.fontBody }}>
        <style>{`
          input[type="range"] { -webkit-appearance: none; appearance: none; outline: none; }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
            background: ${S.ink}; cursor: pointer;
            border: 2px solid ${S.paper}; box-shadow: 0 0 0 1px ${S.ink};
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px; height: 16px; border-radius: 50%;
            background: ${S.ink}; cursor: pointer; border: 2px solid ${S.paper};
          }
          select {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%231A1410' d='M3 5l3 3 3-3z'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 8px center;
            -webkit-appearance: none; appearance: none; padding-right: 28px;
          }
        `}</style>
        <AppHeader />
        <main>
          {view === 'intro' && <IntroView />}
          {view === 'settings' && <SettingsView />}
          {view === 'map' && <MapView />}
          {view === 'game' && <GameView />}
          {view === 'ranking' && <RankingView />}
          {view === 'compare' && <CompareView />}
        </main>
        <CompareBar />
        <footer className="border-t mt-8 py-5 px-5" style={{ borderColor: S.ink }}>
          <div className="max-w-7xl mx-auto flex justify-between text-xs uppercase tracking-wider"
            style={{ ...S.fontBody, color: S.ink, opacity: 0.4 }}>
            <span>Iberia Select · Open data</span>
            <span>{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          </div>
        </footer>
      </div>
    </Ctx.Provider>
  );
};

export default App;
