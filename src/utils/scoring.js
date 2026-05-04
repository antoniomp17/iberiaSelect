import { REFORM_COST_M2 } from "../config/constants.js";

export const calcTotalCost = (r, sup, level) =>
  Math.round(r.priceM2 * 0.55 * sup + REFORM_COST_M2[level] * sup);


/* ====================================================================
   FUNCIONES DERIVADAS (fuera del componente — nunca se recrean)
   ==================================================================== */
export const scorePrecio = p => {
  if (p < 600) return 10; if (p < 800) return 9; if (p < 1000) return 8;
  if (p < 1300) return 7; if (p < 1700) return 6; if (p < 2200) return 5;
  if (p < 2800) return 4; if (p < 3500) return 3; if (p < 4500) return 2;
  return 1;
};

export const scoreClima = (t, h, l) => {
  let s = 0;
  s += (t >= 15 && t <= 19) ? 4 : (t >= 13 && t <= 21) ? 3 : (t >= 11) ? 2 : 1;
  s += h > 2900 ? 3 : h > 2600 ? 2.5 : h > 2300 ? 1.8 : h > 2000 ? 1.2 : 0.7;
  s += l > 1500 ? 0.8 : l > 1000 ? 1.5 : l > 400 ? 3 : l > 200 ? 2 : 1;
  return Math.round(Math.min(10, s));
};

export const scorePoblacion = p => {
  if (p > 15) return 10; if (p > 8) return 9; if (p > 4) return 8;
  if (p > 1) return 7; if (p > -1) return 6; if (p > -3) return 5;
  if (p > -6) return 4; if (p > -10) return 3; if (p > -15) return 2;
  return 1;
};

export const scoreServicios = (fib, hosp, air, dens) => {
  let s = 0;
  s += fib > 95 ? 3 : fib > 88 ? 2.5 : fib > 80 ? 2 : fib > 70 ? 1.5 : 1;
  s += hosp < 10 ? 2.5 : hosp < 20 ? 2 : hosp < 30 ? 1.5 : hosp < 40 ? 1 : 0.5;
  s += air < 30 ? 2 : air < 60 ? 1.5 : air < 100 ? 1 : 0.5;
  s += dens > 100 ? 2.5 : dens > 30 ? 2 : dens > 15 ? 1.5 : dens > 5 ? 1 : 0.5;
  return Math.round(Math.min(10, s));
};


export const scorePlayas = km => {
  if (km === null) return 1;
  if (km === 0) return 10; if (km <= 5) return 9; if (km <= 15) return 8;
  if (km <= 30) return 7; if (km <= 60) return 6; if (km <= 100) return 5;
  if (km <= 150) return 4; if (km <= 200) return 3; if (km <= 300) return 2;
  return 1;
};

export const allStats = r => ({
  precio: scorePrecio(r.priceM2),
  clima: scoreClima(r.tempAvg, r.sunHours, r.rainfall),
  poblacion: scorePoblacion(r.popTrend),
  servicios: scoreServicios(r.fiber, r.hospitalKm, r.airportKm, r.density),
  belleza: r.beauty,
  playa: scorePlayas(r.beachKm)
});

export const calcFinalScore = (r, w) => {
  const s = allStats(r);
  const tot = w.precio + w.clima + w.poblacion + w.servicios + w.belleza + (w.playa||0);
  if (tot === 0) return '0.00';
  return ((s.precio * w.precio + s.clima * w.clima + s.poblacion * w.poblacion +
           s.servicios * w.servicios + s.belleza * w.belleza + s.playa * (w.playa||0)) / tot).toFixed(2);
};
