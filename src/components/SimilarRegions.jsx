import { useMemo } from "react";
import { useCtx } from "../context/Ctx.js";
import { S } from "../config/theme.js";
import { findSimilarCheaper } from "../config/constants.js";
import { calcFinalScore } from "../utils/scoring.js";

export const SimilarRegions = ({ region }) => {
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
