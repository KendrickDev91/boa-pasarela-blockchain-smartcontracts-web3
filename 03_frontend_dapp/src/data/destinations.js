// Destinos operados por Boliviana de Aviación (BoA).
// Nacionales: capital de cada uno de los 9 departamentos.
// Internacionales: rutas reales históricas/actuales de BoA.

export const DESTINOS = [
  // Bolivia — 9 departamentos
  { code: 'LPB', name: 'La Paz',     country: 'Bolivia', region: 'Bolivia' },
  { code: 'CBB', name: 'Cochabamba', country: 'Bolivia', region: 'Bolivia' },
  { code: 'VVI', name: 'Santa Cruz', country: 'Bolivia', region: 'Bolivia' }, // Viru Viru
  { code: 'SRE', name: 'Sucre',      country: 'Bolivia', region: 'Bolivia' }, // Chuquisaca
  { code: 'TJA', name: 'Tarija',     country: 'Bolivia', region: 'Bolivia' },
  { code: 'POI', name: 'Potosí',     country: 'Bolivia', region: 'Bolivia' },
  { code: 'ORU', name: 'Oruro',      country: 'Bolivia', region: 'Bolivia' },
  { code: 'TDD', name: 'Trinidad',   country: 'Bolivia', region: 'Bolivia' }, // Beni
  { code: 'CIJ', name: 'Cobija',     country: 'Bolivia', region: 'Bolivia' }, // Pando

  // Internacionales
  { code: 'MAD', name: 'Madrid',         country: 'España',     region: 'Internacional' },
  { code: 'MIA', name: 'Miami',          country: 'EE. UU.',    region: 'Internacional' },
  { code: 'EZE', name: 'Buenos Aires',   country: 'Argentina',  region: 'Internacional' },
  { code: 'GRU', name: 'São Paulo',      country: 'Brasil',     region: 'Internacional' },
  { code: 'LIM', name: 'Lima',           country: 'Perú',       region: 'Internacional' },
  { code: 'HAV', name: 'La Habana',      country: 'Cuba',       region: 'Internacional' },
  { code: 'CCS', name: 'Caracas',        country: 'Venezuela',  region: 'Internacional' },
];

export const getDestino = (code) => DESTINOS.find(d => d.code === code);

// Helper: precio base aproximado en BOB para la pareja origen-destino.
// Solo simulación — sirve para que distintas rutas muestren tarifas distintas.
export const precioBaseRuta = (originCode, destCode) => {
  const origin = getDestino(originCode);
  const dest = getDestino(destCode);
  if (!origin || !dest) return 309;
  const internacional = origin.region === 'Internacional' || dest.region === 'Internacional';
  if (internacional) return 2890; // tarifa internacional típica
  return 309; // doméstico
};
