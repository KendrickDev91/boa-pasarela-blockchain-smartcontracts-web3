// CF-05 y CF-06: parámetros de red y ABI empleados por la interfaz
import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { BOA_PAYMENTS_ABI, ERC20_ABI, BOA_PAYMENTS_ADDRESS, USDT_TOKEN_ADDRESS, CHAIN_ID } from './contracts.js';

describe('Parámetros de red y ABI (constants/contracts.js)', () => {
  it('CF-05 expone direcciones válidas y la red local por defecto', () => {
    expect(ethers.isAddress(BOA_PAYMENTS_ADDRESS)).toBe(true);
    expect(ethers.isAddress(USDT_TOKEN_ADDRESS)).toBe(true);
    expect(CHAIN_ID).toBe(31337);
  });

  it('CF-06 codifica las dos firmas del pago: approve y pagarBoleto', () => {
    const erc20 = new ethers.Interface(ERC20_ABI);
    const boa = new ethers.Interface(BOA_PAYMENTS_ABI);

    const approve = erc20.encodeFunctionData('approve', [BOA_PAYMENTS_ADDRESS, 135_000_000n]);
    const pago = boa.encodeFunctionData('pagarBoleto', ['ABC123']);

    expect(approve.slice(0, 10)).toBe(erc20.getFunction('approve').selector);
    expect(pago.slice(0, 10)).toBe(boa.getFunction('pagarBoleto').selector);
    expect(boa.decodeFunctionData('pagarBoleto', pago)[0]).toBe('ABC123');
    expect(boa.getEvent('PagoConfirmado')).not.toBeNull();
  });
});
