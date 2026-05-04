import { S } from "../config/theme.js";

export const StatBar = ({ value, max = 10, color, label }) => {
  const { ink } = S;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs uppercase tracking-wider" style={{ ...S.fontBody, color: ink, opacity: 0.6 }}>
        <span>{label}</span>
        <span className="tabular-nums" style={{ color: ink, opacity: 1, fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <div className="w-full" style={{ background: '#D6CFC0', height: '3px' }}>
        <div className="h-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
};
