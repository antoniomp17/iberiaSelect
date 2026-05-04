import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
export const AppHeader = () => {
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
