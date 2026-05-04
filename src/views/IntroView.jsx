import { useState, useMemo, useEffect, useCallback, useContext } from "react";
import { useCtx } from "../context/AppContext.jsx";
import { S } from "../config/theme.js";
import { REGIONS_DATA } from "../data/regions.js";
import {
  Sun, Users, Home, Wifi, TrendingUp, ChevronRight, ChevronLeft, Star,
  Filter, MapPin, Euro, ArrowUpRight, ArrowDownRight, AlertTriangle,
  Sparkles, Mountain, Hospital, ExternalLink, Database, Search, Cloud, Droplets, Waves,
  BookmarkCheck, StickyNote, Trash2, CheckCircle2, Eye, Calculator,
  Building2, Hammer, Map
} from "lucide-react";
export const IntroView = () => {
  const { setView } = useCtx();
  const { ink, paper, accent, forest } = S;
  const minP = Math.min(...REGIONS_DATA.map(r => r.priceM2));
  const maxP = Math.max(...REGIONS_DATA.map(r => r.priceM2));
  const minRegion = REGIONS_DATA.find(r => r.priceM2 === minP);
  const maxRegion = REGIONS_DATA.find(r => r.priceM2 === maxP);

  return (
    <div className="max-w-5xl mx-auto px-5 pt-10 pb-16">
      <div className="border-y-2 py-3 mb-10 flex justify-between text-xs uppercase tracking-widest"
        style={{ ...S.fontBody, borderColor: ink, color: ink }}>
        <span>Vol. II · Nº 1</span>
        <span>{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</span>
        <span>Datos verificados</span>
      </div>

      <div className="mb-10">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ ...S.fontBody, color: accent }}>
          Estudio inmobiliario · {REGIONS_DATA.length} comarcas analizadas
        </div>
        <h1 className="tracking-tight mb-6" style={{ ...S.fontDisplay, color: ink, lineHeight: 0.88 }}>
          <span className="block text-5xl font-black">Tu próxima</span>
          <span className="block text-5xl font-light italic" style={{ color: accent }}>vida</span>
          <span className="block text-5xl font-black">empieza aquí.</span>
        </h1>
        <p className="text-base leading-relaxed max-w-xl" style={{ ...S.fontBody, color: ink }}>
          Herramienta de decisión basada en <strong>datos reales</strong> de Idealista, Fotocasa, INE y AEMET. Sin marketing inmobiliario.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mb-12" style={{ background: ink }}>
        {[
          { label: 'Comarcas', value: REGIONS_DATA.length, sub: 'estudiadas' },
          { label: 'Más asequible', value: `${minP} €/m²`, sub: minRegion?.name || '' },
          { label: 'Más caro', value: `${maxP.toLocaleString('es-ES')} €/m²`, sub: maxRegion?.name || '' },
          { label: 'Variables', value: '11', sub: 'por región' }
        ].map((s, i) => (
          <div key={i} className="px-5 py-6" style={{ background: paper }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: accent }}>{s.label}</div>
            <div className="text-3xl font-black mb-1" style={{ ...S.fontDisplay, color: ink }}>{s.value}</div>
            <div className="text-xs" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Método', title: 'Datos derivados', text: 'Las puntuaciones (1–10) se calculan desde €/m² reales, horas de sol AEMET, proyección INE 15 años y cobertura digital MITECO.' },
          { label: 'Filtros', title: 'Por presupuesto', text: 'Ajusta tu techo de €/m² y excluye zonas con riesgo de despoblación para proteger la inversión a largo plazo.' },
          { label: 'Acción', title: 'Ir a Idealista', text: 'Cada ficha enlaza con la búsqueda de casas para reformar en esa provincia, ordenadas por precio ascendente.' }
        ].map((c, i) => (
          <div key={i} className="border-t pt-4" style={{ borderColor: ink }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ ...S.fontBody, color: accent }}>{c.label}</div>
            <h3 className="text-xl mb-2" style={{ ...S.fontDisplay, color: ink, fontWeight: 600 }}>{c.title}</h3>
            <p className="text-xs leading-relaxed" style={{ ...S.fontBody, color: ink, opacity: 0.75 }}>{c.text}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setView('settings')}
          className="flex-1 py-4 text-xs uppercase tracking-wider font-medium transition hover:opacity-90"
          style={{ ...S.fontBody, background: ink, color: paper }}>
          Configurar prioridades
        </button>
        <button onClick={() => setView('ranking')}
          className="flex-1 py-4 text-xs uppercase tracking-wider font-medium transition hover:bg-stone-100"
          style={{ ...S.fontBody, color: ink, border: `1px solid ${ink}` }}>
          Ver ranking →
        </button>
      </div>

      <div className="mt-12 pt-5 border-t flex flex-wrap gap-x-6 gap-y-1 text-xs uppercase tracking-wider"
        style={{ ...S.fontBody, borderColor: ink, color: ink, opacity: 0.45 }}>
        <span>Idealista Q1 2026</span><span>Fotocasa Research</span>
        <span>INE 2024–2039</span><span>AEMET 1981–2010</span><span>MITECO 2025</span>
      </div>
    </div>
  );
};
