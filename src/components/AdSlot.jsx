import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "../config/constants.js";

export const AdSlot = ({ slot, style = 'display:block', format = 'auto', className = '' }) => {
  const ref = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT || ref.current) return;
    ref.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, []);

  if (!ADSENSE_CLIENT) return (
    <div className={`flex items-center justify-center text-xs uppercase tracking-wider opacity-30 ${className}`}
      style={{ border: '1px dashed currentColor', minHeight: 90 }}>
      Ad slot · configurar AdSense
    </div>
  );

  return (
    <ins className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...Object.fromEntries(style.split(';').filter(Boolean).map(s => s.split(':').map(x => x.trim()))) }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true" />
  );
};
