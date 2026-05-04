import { useState, useMemo, useEffect, useCallback } from "react";
import { Ctx, useLocalStorage } from "./context/AppContext.jsx";
import { S } from "./config/theme.js";
import { REGIONS_DATA } from "./data/regions.js";
import { AppHeader } from "./components/AppHeader.jsx";
import { CompareBar } from "./components/CompareBar.jsx";
import { MapView } from "./views/MapView.jsx";
import { IntroView } from "./views/IntroView.jsx";
import { SettingsView } from "./views/SettingsView.jsx";
import { GameView } from "./views/GameView.jsx";
import { RankingView } from "./views/RankingView.jsx";
import { CompareView } from "./views/CompareView.jsx";
import { DEFAULT_WEIGHTS } from "./config/constants.js";
import { calcFinalScore, allStats } from "./utils/scoring.js";
import { useNavigation } from "./hooks/useNavigation.js";
import { useFilters } from "./hooks/useFilters.js";
import { useUrlParams } from "./hooks/useUrlParams.js";

const App = () => {
  const { view, setView } = useNavigation();
  const filters = useFilters();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [weights, setWeights] = useLocalStorage('iberia-weights', DEFAULT_WEIGHTS);
  const [diary, setDiary] = useLocalStorage('iberia-diary', {});
  const [favs, setFavs] = useLocalStorage('iberia-favs', []);
  const toggleFav = useCallback(id => setFavs(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]), [setFavs]);
  const [compareIds, setCompareIds] = useState([]);
  const toggleCompare = useCallback(id => setCompareIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id)
    : prev.length < 3 ? [...prev, id] : prev
  ), []);
  const [zonaId, setZonaId] = useState(null);

  useUrlParams({ setWeights, setZonaId, setView, setCompareIds });

  const shareUrl = useCallback(() => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const url = `${window.location.origin}${window.location.pathname}?cfg=${[precio, clima, poblacion, servicios, belleza, playa].join('-')}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [weights]);

  const shareRegionUrl = useCallback((regionId) => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const url = `${window.location.origin}${window.location.pathname}?cfg=${[precio, clima, poblacion, servicios, belleza, playa].join('-')}&zona=${regionId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [weights]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,800;9..144,900&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  const sortedRanking = useMemo(() =>
    REGIONS_DATA
      .map(r => ({ ...r, finalScore: calcFinalScore(r, weights), stats: allStats(r) }))
      .sort((a, b) => b.finalScore - a.finalScore)
  , [weights]);

  const ctx = {
    view, setView,
    currentIndex, setCurrentIndex,
    ...filters,
    weights, setWeights,
    sortedRanking,
    diary, setDiary,
    favs, toggleFav,
    compareIds, setCompareIds, toggleCompare,
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
          {view === 'intro'    && <IntroView />}
          {view === 'settings' && <SettingsView />}
          {view === 'map'      && <MapView />}
          {view === 'game'     && <GameView />}
          {view === 'ranking'  && <RankingView />}
          {view === 'compare'  && <CompareView />}
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
