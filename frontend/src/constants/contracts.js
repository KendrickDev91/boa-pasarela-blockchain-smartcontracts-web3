// La dirección oficial del contrato. 
// IMPORTANTE: Actualizar con la que nos arroje el script de despliegue
export const BOA_PAYMENTS_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; 

// ABI mínimo para interactuar con el Smart Contract
export const BOA_PAYMENTS_ABI = [
  "function pagarBoletaWeb3(string calldata _pnr, uint256 _monto) external",
  "event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)"
];

// Dirección del USDT de pruebas (Mock en la red Amoy)
export const USDT_TOKEN_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// ABI mínimo para interactuar con cualquier ERC20 (Aprobar gasto)
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
];
