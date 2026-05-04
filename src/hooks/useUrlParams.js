import { useEffect } from "react";

export const useUrlParams = ({ setWeights, setZonaId, setView, setCompareIds }) => {
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
};
