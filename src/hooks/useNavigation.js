import { useState, useCallback, useEffect } from "react";

const VALID_VIEWS = ['intro', 'settings', 'map', 'game', 'ranking', 'compare'];

export const useNavigation = () => {
  const [view, setViewRaw] = useState(() => {
    const hash = window.location.hash.slice(1);
    return VALID_VIEWS.includes(hash) ? hash : 'intro';
  });

  const setView = useCallback((v) => {
    setViewRaw(v);
    window.history.pushState({ view: v }, '', `#${v}`);
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.view || window.location.hash.slice(1) || 'intro';
      setViewRaw(VALID_VIEWS.includes(v) ? v : 'intro');
    };
    window.addEventListener('popstate', onPop);
    window.history.replaceState({ view }, '', `#${view}`);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { view, setView };
};
