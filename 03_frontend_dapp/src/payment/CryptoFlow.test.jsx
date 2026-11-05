// CF-12 a CF-16, CF-20 y CF-21: flujo de pago con doble firma en la billetera (approve + pagarBoleto)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';
import CryptoCheckoutFlow from './CryptoFlow.jsx';
import { BOA_PAYMENTS_ADDRESS, USDT_TOKEN_ADDRESS, BOA_PAYMENTS_ABI, ERC20_ABI } from '../constants/contracts.js';
import { API_BASE } from '../services/config.js';

// Estado de la red simulada (lecturas de saldo del proveedor de solo lectura)
const red = vi.hoisted(() => ({ eth: 10n ** 18n, usdt: 1_000_000_000n }));

vi.mock('ethers', async (original) => {
  const real = await original();
  class ProveedorSimulado {
    async getBalance() { return red.eth; }
    async getTransactionReceipt(hash) { return { hash, status: 1 }; }
    async getBlock() { return { number: 42, hash: '0x' + 'b'.repeat(64) }; }
  }
  class ContratoSimulado {
    async balanceOf() { return red.usdt; }
  }
  return { ...real, ethers: { ...real.ethers, JsonRpcProvider: ProveedorSimulado, Contract: ContratoSimulado } };
});

class EventSourceSimulado {
  constructor(url) { this.url = url; }
  addEventListener() {}
  close() {}
}

const CUENTA = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const COTIZACION = { montoUnidades: '135060000', montoStablecoin: '135.06', tipoCambio: 6.91, contrato: BOA_PAYMENTS_ADDRESS };

// Billetera simulada con la interfaz sendAsync de MetaMask
// sinPermisoEnRed: como MetaMask Mobile, la cuenta no queda autorizada en la red nueva hasta wallet_requestPermissions
function billetera({ chainId = '0x7a69', switchFalla = false, otroNodo = false, sinPermisoEnRed = false } = {}) {
  const llamadas = [];
  let n = 0;
  let permiso = !sinPermisoEnRed;
  window.ethereum = {
    isMetaMask: true,
    sendAsync: ({ method, params }, cb) => {
      llamadas.push({ method, params });
      if (method === 'eth_requestAccounts') return cb(null, { result: [CUENTA] });
      if (method === 'eth_accounts') return cb(null, { result: permiso ? [CUENTA] : [] });
      if (method === 'wallet_requestPermissions') { permiso = true; return cb(null, { result: [{ parentCapability: 'eth_accounts' }] }); }
      if (method === 'eth_sendTransaction' && !permiso) return cb({ code: -32602, message: 'Invalid parameters: must provide an Ethereum address.' });
      if (method === 'eth_chainId') return cb(null, { result: chainId });
      if (method === 'wallet_switchEthereumChain' && switchFalla) {
        return cb({ code: 4902, message: 'Unrecognized chain ID' });
      }
      if (method === 'eth_getBlockByNumber') {
        return cb(null, { result: otroNodo ? null : { number: params[0], hash: '0x' + 'b'.repeat(64) } });
      }
      if (method === 'eth_sendTransaction') return cb(null, { result: '0x' + String(++n).padStart(64, '0') });
      return cb(null, { result: null });
    },
  };
  return llamadas;
}

function servidor({ faucet = false } = {}) {
  const fetchMock = vi.fn((url) => {
    const cuerpo = url.endsWith('/chain') ? { success: true, chainId: 31337, faucet }
      : url.includes('/payments/rate') ? { success: true, tasa: 6.91 }
      : url.includes('/chain/faucet') ? { success: true, usdt: '1000' }
      : { success: true, data: { estado_pago: 'PENDIENTE' } };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(cuerpo) });
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('EventSource', EventSourceSimulado);
  return fetchMock;
}

async function abrirCheckout() {
  render(<CryptoCheckoutFlow backendDisponible pnr="ABC123" cotizacion={COTIZACION} totalBob={933} />);
  fireEvent.click(screen.getByText(/Tether/).closest('button'));
  const pagar = await screen.findByRole('button', { name: /Pagar con la billetera oficial/ });
  await waitFor(() => expect(pagar).not.toBeDisabled());
  return pagar;
}

describe('Pago con doble firma en la billetera (payment/CryptoFlow.jsx)', () => {
  beforeEach(() => { red.eth = 10n ** 18n; red.usdt = 1_000_000_000n; });

  it('CF-12 firma primero approve al token y luego pagarBoleto al contrato', async () => {
    servidor();
    const llamadas = billetera();
    fireEvent.click(await abrirCheckout());

    expect(await screen.findByText('Verificando pago')).toBeInTheDocument();
    const envios = llamadas.filter((l) => l.method === 'eth_sendTransaction').map((l) => l.params[0]);
    expect(envios).toHaveLength(2);

    const erc20 = new ethers.Interface(ERC20_ABI);
    const boa = new ethers.Interface(BOA_PAYMENTS_ABI);
    expect(envios[0].to).toBe(USDT_TOKEN_ADDRESS);
    const [spender, monto] = erc20.decodeFunctionData('approve', envios[0].data);
    expect(spender).toBe(BOA_PAYMENTS_ADDRESS);
    expect(monto).toBe(135_060_000n);
    expect(envios[1].to).toBe(BOA_PAYMENTS_ADDRESS);
    expect(boa.decodeFunctionData('pagarBoleto', envios[1].data)[0]).toBe('ABC123');
  });

  it('CF-13 registra la red de pruebas en la billetera cuando no la conoce', async () => {
    servidor();
    const llamadas = billetera({ chainId: '0x1', switchFalla: true });
    fireEvent.click(await abrirCheckout());

    await screen.findByText('Verificando pago');
    const alta = llamadas.find((l) => l.method === 'wallet_addEthereumChain');
    expect(alta).toBeDefined();
    expect(alta.params[0].chainId).toBe('0x7a69');
    expect(alta.params[0].rpcUrls.length).toBe(1);
  });

  it('CF-14 no firma nada si el saldo de USDT no cubre la tarifa', async () => {
    servidor();
    red.usdt = 0n;
    const llamadas = billetera();
    fireEvent.click(await abrirCheckout());

    expect(await screen.findByText(/Saldo de USDT insuficiente/)).toBeInTheDocument();
    expect(llamadas.some((l) => l.method === 'eth_sendTransaction')).toBe(false);
  });

  it('CF-15 ofrece el grifo de fondos de prueba y lo solicita para la billetera conectada', async () => {
    const fetchMock = servidor({ faucet: true });
    red.eth = 0n;
    billetera();
    fireEvent.click(await abrirCheckout());

    fireEvent.click(await screen.findByRole('button', { name: /Obtener USDT y ETH de prueba/ }));

    expect(await screen.findByText(/Fondos de prueba acreditados/)).toBeInTheDocument();
    const solicitud = fetchMock.mock.calls.find(([url]) => url === `${API_BASE}/chain/faucet`);
    expect(JSON.parse(solicitud[1].body).address).toBe(CUENTA);
  });

  it('CF-16 no firma si la billetera envía a otro nodo con el mismo chainId', async () => {
    servidor();
    const llamadas = billetera({ otroNodo: true });
    fireEvent.click(await abrirCheckout());

    expect(await screen.findByText(/conectada a otro nodo/)).toBeInTheDocument();
    expect(llamadas.some((l) => l.method === 'wallet_addEthereumChain')).toBe(true);
    expect(llamadas.some((l) => l.method === 'eth_sendTransaction')).toBe(false);
  });

  it('CF-20 en MetaMask Mobile firma por request (EIP-1193) con la cuenta conectada en "from"', async () => {
    servidor();
    billetera();
    window.ethereum.request = vi.fn(({ method, params }) => new Promise((ok, mal) =>
      window.ethereum.sendAsync({ method, params }, (err, res) => (err ? mal(err) : ok(res.result)))));
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14) Mobile MetaMaskMobile');
    fireEvent.click(await abrirCheckout());

    await screen.findByText('Verificando pago');
    const envios = window.ethereum.request.mock.calls.map(([p]) => p).filter((p) => p.method === 'eth_sendTransaction');
    expect(envios).toHaveLength(2);
    envios.forEach((e) => expect(e.params[0].from).toBe(CUENTA));
    ua.mockRestore();
  });

  it('CF-21 pide de nuevo el permiso de la cuenta en la red de pruebas antes de firmar', async () => {
    servidor();
    const llamadas = billetera({ sinPermisoEnRed: true });
    fireEvent.click(await abrirCheckout());

    await screen.findByText('Verificando pago');
    const metodos = llamadas.map((l) => l.method);
    const permiso = metodos.indexOf('wallet_requestPermissions');
    expect(permiso).toBeGreaterThan(-1);
    expect(permiso).toBeLessThan(metodos.indexOf('eth_sendTransaction'));
    expect(metodos.filter((m) => m === 'eth_sendTransaction')).toHaveLength(2);
  });
});
