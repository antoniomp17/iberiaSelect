import { useState, useMemo } from "react";
import { REGIONS_DATA } from "../data/regions.js";
import { calcTotalCost } from "../utils/scoring.js";

export const useFilters = () => {
  const [filterProvince, setFilterProvince] = useState('Todas');
  const [maxBudget, setMaxBudget] = useState(8500);
  const [hidePopRisk, setHidePopRisk] = useState(false);
  const [totalBudget, setTotalBudget] = useState(150000);
  const [superficie, setSuperficie] = useState(80);
  const [reformLevel, setReformLevel] = useState('media');
  const [useBudgetFilter, setUseBudgetFilter] = useState(false);

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

  return {
    filterProvince, setFilterProvince,
    maxBudget, setMaxBudget,
    hidePopRisk, setHidePopRisk,
    totalBudget, setTotalBudget,
    superficie, setSuperficie,
    reformLevel, setReformLevel,
    useBudgetFilter, setUseBudgetFilter,
    filteredRegions, provinces,
  };
};
