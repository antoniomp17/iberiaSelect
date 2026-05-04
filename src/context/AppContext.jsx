import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, Filter } from "lucide-react";
import { idealistaURL, findSimilarCheaper } from "../config/constants.js";
import { S } from "../config/theme.js";
import { calcFinalScore } from "../utils/scoring.js";
import { Ctx, useCtx } from "./Ctx.js";

export { Ctx, useCtx };

/* ====================================================================
   HOOKS REUTILIZABLES
   ==================================================================== */
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  const set = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, set];
};

