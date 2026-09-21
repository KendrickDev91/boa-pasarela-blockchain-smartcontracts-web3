// Cliente del middleware BoA. Si el backend no está disponible, los componentes
// hacen fallback a datos en caché para mantener la operación.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health:          () => get('/health'),
  transacciones:   () => get('/admin/transacciones'),
  dashboard:       () => get('/admin/dashboard'),
  clientes:        () => get('/admin/clientes'),
  crearReserva:    (data) => post('/reservas', data),
  estadoPago:      (pnr) => get(`/pagos/${pnr}/estado`),
  // Integración on-chain
  chainInfo:       () => get('/chain'),
  procesarPago:    (pnr) => post(`/pagos/${pnr}/simular`, {}),
  faucet:          (address, monto) => post('/chain/faucet', { address, monto }),
  // URL del stream SSE para el push de confirmación verificada por webhook
  streamUrl:       (pnr) => `${BASE}/pagos/${pnr}/stream`,
};
