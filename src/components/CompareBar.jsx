import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
export const CompareBar = () => {
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
