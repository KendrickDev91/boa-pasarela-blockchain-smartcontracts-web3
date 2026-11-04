import { parseUnits } from 'ethers';
import { API_BASE } from '../services/config.js';

// Reanudación del pago desde el QR: MetaMask Mobile abre la pasarela con ?pnr=XXXX y la
// pantalla de pago se reconstruye con la cotización ya registrada on-chain para ese PNR.
const PNR_VALIDO = /^[A-Z0-9]{1,10}$/;

export function pnrDeLaUrl(search = window.location.search) {
  const pnr = (new URLSearchParams(search).get('pnr') || '').trim().toUpperCase();
  return PNR_VALIDO.test(pnr) ? pnr : null;
}

// Convierte la fila de GET /api/payments/status/:pnr en la misma forma que devuelve POST /api/reservas
export function reservaDesdeEstado(d) {
  return {
    pnr: d.pnr,
    montoBob: Number(d.monto_bob),
    tipoCambio: Number(d.tipo_cambio),
    fuenteTipoCambio: d.fuente_tipo_cambio,
    montoStablecoin: Number(d.monto_usdt).toFixed(2),
    montoUnidades: parseUnits(String(d.monto_usdt), 6).toString(),
    venceEn: d.vence_en,
  };
}

export async function cargarReservaPendiente(pnr) {
  const res = await fetch(`${API_BASE}/payments/status/${pnr}`);
  if (!res.ok) throw new Error(res.status === 404 ? `La reserva ${pnr} no existe` : `HTTP ${res.status}`);
  const { data } = await res.json();
  if (data.estado_pago !== 'PENDIENTE') throw new Error(`La reserva ${pnr} ya no está pendiente de pago (${data.estado_pago})`);
  if (data.vence_en && new Date(data.vence_en) <= new Date()) throw new Error(`La cotización de la reserva ${pnr} venció; genere una nueva reserva`);
  return reservaDesdeEstado(data);
}
