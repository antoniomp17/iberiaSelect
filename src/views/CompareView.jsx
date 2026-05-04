import { useState } from "react";
import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
import { ExternalLink, StickyNote, Hospital, Eye, BookmarkCheck, Trash2 } from "lucide-react";
import { calcTotalCost, allStats, calcFinalScore } from "../utils/scoring.js";
export const CompareView = () => {
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
