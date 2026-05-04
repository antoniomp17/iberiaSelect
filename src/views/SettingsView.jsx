import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
import { Calculator } from "lucide-react";
import { REFORM_LABELS } from "../config/constants.js";
import { calcTotalCost } from "../utils/scoring.js";
export const SettingsView = () => {
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
