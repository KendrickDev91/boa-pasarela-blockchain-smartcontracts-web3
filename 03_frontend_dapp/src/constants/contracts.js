// Parámetros de red y direcciones de contratos (definidos en 03_frontend_dapp/.env).
// Valores por defecto: red local de Hardhat (chainId 31337) tras ejecutar scripts/deploy.js.
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';

export const BOA_PAYMENTS_ADDRESS = import.meta.env.VITE_BOA_PAYMENTS_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Token ERC-20 de cobro (en pruebas: MockUSDT, 6 decimales)
export const USDT_TOKEN_ADDRESS = import.meta.env.VITE_USDT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ABI mínimo de BoAPayments (Tabla 21 del Capítulo III)
export const BOA_PAYMENTS_ABI = [
  "function pagarBoleto(string pnr)",
  "function consultarTarifa(string pnr) view returns (uint256 monto, uint64 venceEn)",
  "function verificarPago(string pnr) view returns (bool)",
  "event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)"
];

// ABI mínimo ERC-20 (autorización de gasto y saldo)
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)"
];
