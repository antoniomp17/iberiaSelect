import { useState, useMemo } from "react";
import { useCtx } from "../context/AppContext.jsx";
import { SortIcon } from "../components/SortIcon.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
import { Sparkles, ExternalLink, Database } from "lucide-react";
import { idealistaURL } from "../config/constants.js";
import { calcTotalCost, allStats } from "../utils/scoring.js";
export const RankingView = () => {
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
