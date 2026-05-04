import { useState, useEffect } from "react";
import { useCtx } from "../context/AppContext.jsx";
import { StatBar } from "../components/StatBar.jsx";
import { SimilarRegions } from "../components/SimilarRegions.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
import {
  Sun, ArrowUpRight, ArrowDownRight, Mountain, Hammer, Waves, Search,
  Calculator, BookmarkCheck, Eye, Trash2, Cloud, Droplets
} from "lucide-react";
import { calcTotalCost, scorePlayas, allStats, calcFinalScore } from "../utils/scoring.js";
import { idealistaURL, protectedLabel } from "../config/constants.js";
export const GameView = () => {
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

