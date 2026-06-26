// La dirección oficial del contrato. 
export const BOA_PAYMENTS_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 

// ABI mínimo para interactuar con el Smart Contract
export const BOA_PAYMENTS_ABI = [
  "function pagarBoletaWeb3(string calldata _pnr, uint256 _monto) external",
  "event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)"
];

// Dirección del USDT de pruebas (Mock en la red Amoy)
export const USDT_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ABI mínimo para interactuar con cualquier ERC20 (Aprobar gasto)
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)"
];
