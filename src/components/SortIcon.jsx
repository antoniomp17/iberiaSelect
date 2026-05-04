import { S } from "../config/theme.js";

export const SortIcon = ({ active, dir }) => (
  <span className="ml-0.5 opacity-40" style={{ opacity: active ? 1 : 0.3 }}>
    {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
  </span>
);
