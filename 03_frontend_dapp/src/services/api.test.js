// CF-01 a CF-04: cliente del servidor intermedio
import { describe, it, expect, vi } from 'vitest';
import { api } from './api.js';
import { API_BASE } from './config.js';

const respuesta = (cuerpo, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(cuerpo) });

describe('Cliente del servidor intermedio (services/api.js)', () => {
  it('CF-01 crea la reserva con POST /reservas y cuerpo JSON', async () => {
    const fetchMock = vi.fn(() => respuesta({ success: true, pnr: 'ABC123' }));
    vi.stubGlobal('fetch', fetchMock);

    const r = await api.crearReserva({ montoBob: 933 });

    expect(r.pnr).toBe('ABC123');
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/reservas`);
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual({ montoBob: 933 });
  });

  it('CF-02 propaga el mensaje de error del servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta({ error: 'Monto inválido' }, false, 400)));
    await expect(api.crearReserva({ montoBob: -1 })).rejects.toThrow('Monto inválido');
  });

  it('CF-03 consulta los parámetros de red con GET /chain', async () => {
    const fetchMock = vi.fn(() => respuesta({ chainId: 31337, faucet: true }));
    vi.stubGlobal('fetch', fetchMock);

    const r = await api.chainInfo();

    expect(r.chainId).toBe(31337);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/chain`);
  });

  it('CF-04 solicita fondos de prueba para una billetera y arma la URL del canal SSE', async () => {
    const fetchMock = vi.fn(() => respuesta({ success: true, usdt: '1000' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.faucet('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/chain/faucet`);
    expect(JSON.parse(opciones.body).address).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    expect(api.streamUrl('XYZ789')).toBe(`${API_BASE}/pagos/XYZ789/stream`);
  });
});
