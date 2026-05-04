import { useState, useMemo, useEffect, useCallback, useContext } from "react";
import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
import {
  Sun, Users, Home, Wifi, TrendingUp, ChevronRight, ChevronLeft, Star,
  Filter, MapPin, Euro, ArrowUpRight, ArrowDownRight, AlertTriangle,
  Sparkles, Mountain, Hospital, ExternalLink, Database, Search, Cloud, Droplets, Waves,
  BookmarkCheck, StickyNote, Trash2, CheckCircle2, Eye, Calculator,
  Building2, Hammer, Map
} from "lucide-react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { INE_TO_PROVINCE, ineToRegionsProvinces } from "../config/constants.js";
import { calcFinalScore, allStats } from "../utils/scoring.js";
export const METRIC_OPTIONS = [
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

export const MapView = () => {
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
