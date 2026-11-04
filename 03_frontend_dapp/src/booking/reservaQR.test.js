// CF-17 a CF-19: reanudación del pago desde el QR (MetaMask Mobile abre la pasarela con ?pnr=)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { pnrDeLaUrl, reservaDesdeEstado, cargarReservaPendiente } from './reservaQR.js';

const fila = (extra = {}) => ({
  pnr: 'EJ9H3V', estado_pago: 'PENDIENTE', monto_bob: '520.00', monto_usdt: '43.120000',
  tipo_cambio: '12.0600', fuente_tipo_cambio: 'API', vence_en: new Date(Date.now() + 600000).toISOString(), ...extra,
});
const respuesta = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('Reanudación del pago desde el QR', () => {
  afterEach(() => vi.restoreAllMocks());

  it('CF-17 lee el PNR del enlace del QR y descarta valores inválidos', () => {
    expect(pnrDeLaUrl('?pnr=ej9h3v')).toBe('EJ9H3V');
    expect(pnrDeLaUrl('?pnr=')).toBeNull();
    expect(pnrDeLaUrl('?pnr=<script>')).toBeNull();
    expect(pnrDeLaUrl('')).toBeNull();
  });

  it('CF-18 reconstruye la cotización registrada on-chain con el importe exacto en unidades del token', () => {
    const r = reservaDesdeEstado(fila());
    expect(r).toMatchObject({ pnr: 'EJ9H3V', montoBob: 520, tipoCambio: 12.06, montoStablecoin: '43.12', montoUnidades: '43120000' });
  });

  it('CF-19 solo reanuda reservas pendientes y vigentes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockReturnValueOnce(respuesta(200, { success: true, data: fila() }));
    await expect(cargarReservaPendiente('EJ9H3V')).resolves.toMatchObject({ montoUnidades: '43120000' });

    fetchMock.mockReturnValueOnce(respuesta(200, { success: true, data: fila({ estado_pago: 'CONFIRMADO' }) }));
    await expect(cargarReservaPendiente('EJ9H3V')).rejects.toThrow(/ya no está pendiente/);

    fetchMock.mockReturnValueOnce(respuesta(200, { success: true, data: fila({ vence_en: new Date(Date.now() - 1000).toISOString() }) }));
    await expect(cargarReservaPendiente('EJ9H3V')).rejects.toThrow(/venció/);

    fetchMock.mockReturnValueOnce(respuesta(404, { success: false }));
    await expect(cargarReservaPendiente('ZZZZZZ')).rejects.toThrow(/no existe/);
  });
});
