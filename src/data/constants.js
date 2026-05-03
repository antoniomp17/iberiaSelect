/* ============================================================
   CONSTANTES DE REFERENCIA
   Fuentes: Idealista Q1 2026, Fotocasa Research, IPV Q4 2025
   ============================================================ */

// Precio medio €/m² por provincia (usado para contexto comparativo)
export const PRECIO_PROVINCIA = {
  'Illes Balears': 5395, 'Madrid': 5372, 'Málaga': 4490, 'Gipuzkoa': 4458,
  'S.C. de Tenerife': 3725, 'Barcelona': 3666, 'Bizkaia': 3536, 'Girona': 3113,
  'Alicante': 3022, 'Las Palmas': 3150, 'Valencia': 2780, 'Cádiz': 2400,
  'Cantabria': 2583, 'Sevilla': 2200, 'Asturias': 2317, 'Navarra': 2291,
  'Álava': 2500, 'Granada': 2000, 'Pontevedra': 2100, 'Tarragona': 1900,
  'Murcia': 2017, 'A Coruña': 2000, 'Almería': 1800, 'Castellón': 1800,
  'La Rioja': 1844, 'Lleida': 1700, 'Zaragoza': 2050, 'Huesca': 1700,
  'Valladolid': 1700, 'Burgos': 1500, 'Salamanca': 1700, 'Segovia': 1700,
  'Toledo': 1500, 'Guadalajara': 1500, 'Córdoba': 1500, 'Huelva': 1500,
  'Badajoz': 1300, 'Cáceres': 1300, 'León': 1300, 'Albacete': 1300,
  'Ávila': 1300, 'Lugo': 1300, 'Ourense': 1300, 'Palencia': 1300,
  'Soria': 1200, 'Ciudad Real': 1000, 'Cuenca': 1000, 'Jaén': 1000,
  'Zamora': 1000, 'Teruel': 900, 'Lugo/Ourense': 1300,
};

// Variación interanual de precios por CCAA (%)
export const VAR_CCAA = {
  'Murcia': 23.1, 'Cantabria': 19.1, 'Andalucía': 18.7, 'Asturias': 17.0,
  'C. Valenciana': 16.0, 'Madrid': 16.8, 'Canarias': 17.0, 'Cataluña': 12.5,
  'Baleares': 14.0, 'Galicia': 7.6, 'País Vasco': 11.0, 'Castilla y León': 9.0,
  'La Rioja': 8.5, 'Castilla-La Mancha': 8.6, 'Navarra': 8.0, 'Aragón': 9.0,
  'Extremadura': 8.3,
};

// Proyección de variación poblacional por CCAA — INE 2024-2039 (%)
export const POB_CCAA = {
  'Baleares': 19.0, 'C. Valenciana': 19.0, 'Murcia': 17.2, 'Canarias': 15.5,
  'Madrid': 12.0, 'Cataluña': 8.0, 'Andalucía': 7.5, 'País Vasco': 1.5,
  'Cantabria': 1.0, 'Navarra': 2.0, 'Aragón': 0.5, 'La Rioja': 0.0,
  'Galicia': -1.5, 'Castilla-La Mancha': 1.0, 'Castilla y León': -4.1,
  'Extremadura': -3.4, 'Asturias': -4.1,
};

// Coste estimado de reforma por nivel (€/m²)
export const REFORM_COST_M2 = {
  basica:   650,
  media:    950,
  integral: 1450,
};

export const REFORM_LABELS = {
  basica:   'Básica (650 €/m²)',
  media:    'Media (950 €/m²)',
  integral: 'Integral (1.450 €/m²)',
};

// Pesos por defecto para el ranking (deben sumar 100)
export const DEFAULT_WEIGHTS = {
  precio:    20,
  clima:     17,
  poblacion: 17,
  servicios: 16,
  belleza:   15,
  playa:     15,
};
