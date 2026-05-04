import { REGIONS_DATA } from "../data/regions.js";

export const REFORM_COST_M2 = { basica: 650, media: 950, integral: 1450 };
export const REFORM_LABELS  = { basica: 'Básica (650 €/m²)', media: 'Media (950 €/m²)', integral: 'Integral (1.450 €/m²)' };
export const DEFAULT_WEIGHTS = { precio: 20, clima: 17, poblacion: 17, servicios: 16, belleza: 15, playa: 15 };

// INE province code → province name (matches our regions.js province field)
export const INE_TO_PROVINCE = {
  '01':'Álava','02':'Albacete','03':'Alicante','04':'Almería','05':'Ávila',
  '06':'Badajoz','07':'Illes Balears','08':'Barcelona','09':'Burgos','10':'Cáceres',
  '11':'Cádiz','12':'Castellón','13':'Ciudad Real','14':'Córdoba','15':'A Coruña',
  '16':'Cuenca','17':'Girona','18':'Granada','19':'Guadalajara','20':'Gipuzkoa',
  '21':'Huelva','22':'Huesca','23':'Jaén','24':'León','25':'Lleida',
  '26':'La Rioja','27':'Lugo','28':'Madrid','29':'Málaga','30':'Murcia',
  '31':'Navarra','32':'Ourense','33':'Asturias','34':'Palencia','35':'Las Palmas',
  '36':'Pontevedra','37':'Salamanca','38':'Santa Cruz de Tenerife','39':'Cantabria','40':'Segovia',
  '41':'Sevilla','42':'Soria','43':'Tarragona','44':'Teruel','45':'Toledo',
  '46':'Valencia','47':'Valladolid','48':'Bizkaia','49':'Zamora','50':'Zaragoza',
  '51':'Ceuta','52':'Melilla'
};

// Some province names in regions.js differ slightly — normalize
export const PROVINCE_NORMALIZE = {
  'Illes Balears': ['Mallorca','Menorca','Ibiza','Formentera'],
  'Las Palmas': ['Gran Canaria','Lanzarote','Fuerteventura'],
  'Santa Cruz de Tenerife': ['Tenerife','La Palma','La Gomera','El Hierro'],
  'A Coruña': ['A Coruña'],
  'Gipuzkoa': ['Gipuzkoa'],
  'Bizkaia': ['Bizkaia'],
  'Álava': ['Álava'],
};

// Returns all province names from regions.js that map to an INE province
export const ineToRegionsProvinces = (ineName) => {
  if (PROVINCE_NORMALIZE[ineName]) return PROVINCE_NORMALIZE[ineName];
  return [ineName];
};

export const PROVINCE_SLUGS = {
  'A Coruña': 'a-coruna-provincia',
  'Álava': 'alava',
  'Gipuzkoa': 'guipuzcoa',
  'Bizkaia': 'vizcaya',
  'Lugo/Ourense': 'ourense-provincia',
  'La Rioja': 'la-rioja',
  'Asturias': 'asturias',
  'Cantabria': 'cantabria',
  'Navarra': 'navarra',
  'Mallorca': 'balears-illes',
  'Menorca': 'balears-illes',
  'Ibiza': 'balears-illes',
  'Formentera': 'balears-illes',
  'Tenerife': 'santa-cruz-de-tenerife-provincia',
  'La Palma': 'santa-cruz-de-tenerife-provincia',
  'La Gomera': 'santa-cruz-de-tenerife-provincia',
  'El Hierro': 'santa-cruz-de-tenerife-provincia',
  'Gran Canaria': 'las-palmas-provincia',
  'Lanzarote': 'las-palmas-provincia',
  'Fuerteventura': 'las-palmas-provincia',
  'Ceuta': 'ceuta-ceuta',
  'Melilla': 'melilla-melilla',
};

export const IDEALISTA_AFFILIATE = '';

// ── Afiliación / Monetización ──────────────────────────────────────────────
export const BOOKING_AID     = '';   // Rellenar: https://www.booking.com/affiliate-program
export const IAHORRO_UTM     = 'iberiaselect_web';
export const TRIOTECA_UTM    = 'iberiaselect_web';
export const ADSENSE_CLIENT  = '';   // Rellenar: ca-pub-XXXXXXXXXXXXXXXX

export const bookingUrl = (locationName) => {
  const base = `https://www.booking.com/searchresults.es.html?ss=${encodeURIComponent(locationName + ', España')}&lang=es`;
  return BOOKING_AID ? `${base}&aid=${BOOKING_AID}` : base;
};

export const iAhorroUrl = (priceM2, superficie = 80) => {
  const price = Math.round(priceM2 * 0.55 * superficie);
  return `https://www.iahorro.com/hipotecas/comparador/?utm_source=${IAHORRO_UTM}&utm_medium=cta&precio=${price}`;
};

export const triotecaUrl = () =>
  `https://www.trioteca.com/?utm_source=${TRIOTECA_UTM}&utm_medium=cta`;

export const IDEALISTA_PROVINCE_SLUGS = {
  'A Coruña':   'a-coruna',
  'Lugo':       'lugo',
  'Ourense':    'ourense',
  'Pontevedra': 'pontevedra',
  'Asturias':   'asturias',
  'Cantabria':  'cantabria',
  'Bizkaia':    'vizcaya',
  'Gipuzkoa':  'guipuzcoa',
  'Álava':     'alava',
  'Navarra':   'navarra',
  'Zaragoza':  'zaragoza',
  'Huesca':    'huesca',
  'Teruel':    'teruel',
  'Lleida':       'lleida',
  'Girona':       'girona',
  'Barcelona':    'barcelona',
  'Tarragona':    'tarragona',
  'Castellón':    'castellon',
  'Valencia':     'valencia',
  'Alicante':     'alicante',
  'Murcia':       'murcia',
  'Almería':      'almeria',
  'Granada':      'granada',
  'Jaén':         'jaen',
  'Córdoba':      'cordoba',
  'Málaga':       'malaga',
  'Sevilla':      'sevilla',
  'Cádiz':        'cadiz',
  'Huelva':       'huelva',
  'Badajoz':      'badajoz',
  'Cáceres':      'caceres',
  'Toledo':       'toledo',
  'Guadalajara':  'guadalajara',
  'Cuenca':       'cuenca',
  'Albacete':     'albacete',
  'Ciudad Real':  'ciudad-real',
  'Madrid':       'madrid',
  'Ávila':        'avila',
  'Salamanca':    'salamanca',
  'Zamora':       'zamora',
  'Valladolid':   'valladolid',
  'Segovia':      'segovia',
  'Burgos':       'burgos',
  'Palencia':     'palencia',
  'León':         'leon',
  'Soria':        'soria',
  'La Rioja':     'la-rioja',
  // Islas Baleares — slug compuesto para soportar 4 niveles de URL
  'Mallorca':           'balears-illes/mallorca',
  'Menorca':            'balears-illes/menorca',
  'Ibiza':              'balears-illes/ibiza',
  'Formentera':         'balears-illes',            // nivel isla, sin subcomarca
  // Canarias — slug compuesto por isla
  'Tenerife':           'santa-cruz-de-tenerife/tenerife',
  'La Palma':           'santa-cruz-de-tenerife/la-palma',
  'La Gomera':          'santa-cruz-de-tenerife/la-gomera',
  'El Hierro':          'santa-cruz-de-tenerife/el-hierro',
  'Gran Canaria':       'las-palmas/gran-canaria',
  'Lanzarote':          'las-palmas/lanzarote',
  'Fuerteventura':      'las-palmas/fuerteventura',
  // Zona compartida Galicia
  'Lugo/Ourense':       'ourense',
};

export const idealistaURL = r => {
  const suffix = IDEALISTA_AFFILIATE ? `?ref=${IDEALISTA_AFFILIATE}` : '';
  if (r.idealistaSlug) {
    const pSlug = IDEALISTA_PROVINCE_SLUGS[r.province]
      || r.province.toLowerCase()
           .replace(/[/\s]+/g, '-')
           .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
           .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
           .replace(/[^a-z0-9-]/g,'');
    return `https://www.idealista.com/venta-viviendas/${pSlug}/${r.idealistaSlug}/${suffix}`;
  }
  const province = PROVINCE_SLUGS[r.province]
    || (r.province.toLowerCase()
      .replace(/[/\s]+/g, '-')
      .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
      .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
      .replace(/[^a-z0-9-]/g,'') + '-provincia');
  return `https://www.idealista.com/venta-viviendas/${province}/${suffix}`;
};

export const protectedLabel = p =>
  p === 'PN' ? 'Parque Nacional' :
  p === 'PNat' ? 'Parque Natural' :
  p === 'RB' ? 'Reserva de la Biosfera' : null;

// Devuelve hasta `count` regiones con perfil parecido (clima, belleza, mar) pero precio inferior
export const findSimilarCheaper = (region, count = 3) =>
  REGIONS_DATA
    .filter(r => r.id !== region.id && r.priceM2 < region.priceM2 * 0.88)
    .map(r => {
      const climaSim  = 1 - Math.min(1, Math.abs(r.tempAvg   - region.tempAvg)   / 8);
      const solSim    = 1 - Math.min(1, Math.abs(r.sunHours  - region.sunHours)  / 1500);
      const bellezaSim = 1 - Math.abs(r.beauty - region.beauty) / 10;
      const b1 = r.beachKm === null ? 300 : r.beachKm;
      const b2 = region.beachKm === null ? 300 : region.beachKm;
      const playaSim  = 1 - Math.min(1, Math.abs(b1 - b2) / 300);
      return { ...r, _sim: (climaSim + solSim + bellezaSim * 1.5 + playaSim) / 4.5 };
    })
    .sort((a, b) => b._sim - a._sim)
    .slice(0, count);

/* ====================================================================
   ESTILOS (constante — fuera del componente, nunca se recrean)
   ==================================================================== */
