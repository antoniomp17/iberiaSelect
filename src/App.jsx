import { useState, useMemo, useEffect, useCallback, useContext } from "react";
import { useCtx } from "./context/AppContext.jsx";
import { S } from "./config/theme.js";
import { REGIONS_DATA } from "./data/regions.js";
import { Ctx, useLocalStorage } from "./context/AppContext.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { CompareBar } from "./components/CompareBar.jsx";
import { MapView } from "./views/MapView.jsx";
import { IntroView } from "./views/IntroView.jsx";
import { SettingsView } from "./views/SettingsView.jsx";
import { GameView } from "./views/GameView.jsx";
import { RankingView } from "./views/RankingView.jsx";
import { CompareView } from "./views/CompareView.jsx";
import { DEFAULT_WEIGHTS } from "./config/constants.js";
import { calcTotalCost, calcFinalScore, allStats } from "./utils/scoring.js";

const App = () => {
  const [view, setViewRaw] = useState(() => {
    const hash = window.location.hash.slice(1);
    return ['intro','settings','game','ranking'].includes(hash) ? hash : 'intro';
  });
  const setView = useCallback((v) => {
    setViewRaw(v);
    window.history.pushState({ view: v }, '', `#${v}`);
  }, []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterProvince, setFilterProvince] = useState('Todas');
  const [maxBudget, setMaxBudget] = useState(8500);
  const [hidePopRisk, setHidePopRisk] = useState(false);
  const [weights, setWeights] = useLocalStorage('iberia-weights', DEFAULT_WEIGHTS);
  const [diary, setDiary] = useLocalStorage('iberia-diary', {});
  const [favs, setFavs] = useLocalStorage('iberia-favs', []);
  const toggleFav = useCallback(id => setFavs(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]), [setFavs]);
  const [compareIds, setCompareIds] = useState([]);
  const toggleCompare = useCallback(id => setCompareIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id)
    : prev.length < 3 ? [...prev, id] : prev
  ), []);
  const [totalBudget, setTotalBudget] = useState(150000);
  const [superficie, setSuperficie] = useState(80);
  const [reformLevel, setReformLevel] = useState('media');
  const [useBudgetFilter, setUseBudgetFilter] = useState(false);
  const [zonaId, setZonaId] = useState(null);

  // Lee pesos y zona desde query params al montar (enlace compartido)
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

  // Browser back/forward button support
  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.view || window.location.hash.slice(1) || 'intro';
      setViewRaw(['intro','settings','map','game','ranking','compare'].includes(v) ? v : 'intro');
    };
    window.addEventListener('popstate', onPop);
    // Push initial state so back button works from first view
    window.history.replaceState({ view }, '', `#${view}`);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shareUrl = useCallback(() => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const cfg = [precio, clima, poblacion, servicios, belleza, playa].join('-');
    const params = new URLSearchParams({ cfg });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [weights]);

  const shareRegionUrl = useCallback((regionId) => {
    const { precio, clima, poblacion, servicios, belleza, playa } = weights;
    const cfg = [precio, clima, poblacion, servicios, belleza, playa].join('-');
    const params = new URLSearchParams({ cfg, zona: regionId });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [weights]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,800;9..144,900&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  const filteredRegions = useMemo(() => {
    let arr = REGIONS_DATA;
    if (filterProvince !== 'Todas') arr = arr.filter(r => r.province === filterProvince);
    arr = arr.filter(r => r.priceM2 <= maxBudget);
    if (hidePopRisk) arr = arr.filter(r => r.popTrend > -10);
    if (useBudgetFilter) arr = arr.filter(r => calcTotalCost(r, superficie, reformLevel) <= totalBudget);
    return arr;
  }, [filterProvince, maxBudget, hidePopRisk, useBudgetFilter, totalBudget, superficie, reformLevel]);

  const provinces = useMemo(() =>
    ['Todas', ...new Set(REGIONS_DATA.map(r => r.province))].sort()
  , []);

  const sortedRanking = useMemo(() =>
    REGIONS_DATA
      .map(r => ({ ...r, finalScore: calcFinalScore(r, weights), stats: allStats(r) }))
      .sort((a, b) => b.finalScore - a.finalScore)
  , [weights]);

  const ctx = {
    view, setView,
    currentIndex, setCurrentIndex,
    filterProvince, setFilterProvince,
    maxBudget, setMaxBudget,
    hidePopRisk, setHidePopRisk,
    weights, setWeights,
    filteredRegions, provinces, sortedRanking,
    diary, setDiary,
    favs, toggleFav,
    compareIds, setCompareIds, toggleCompare,
    totalBudget, setTotalBudget,
    superficie, setSuperficie,
    reformLevel, setReformLevel,
    useBudgetFilter, setUseBudgetFilter,
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
          {view === 'intro' && <IntroView />}
          {view === 'settings' && <SettingsView />}
          {view === 'map' && <MapView />}
          {view === 'game' && <GameView />}
          {view === 'ranking' && <RankingView />}
          {view === 'compare' && <CompareView />}
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
