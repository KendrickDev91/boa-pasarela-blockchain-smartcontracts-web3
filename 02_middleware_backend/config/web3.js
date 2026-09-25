const { ethers } = require('ethers');
const config = require('../config');

// =========================================================
// Acceso a la cadena mediante JSON-RPC (ethers v6)
// - provider: lectura del estado y de los eventos
// - operador: firma de registrarTarifa (NonceManager evita colisiones de nonce)
// =========================================================
const BOA_PAYMENTS_ABI = [
    'function registrarTarifa(string pnr, uint256 monto, uint64 venceEn)',
    'function pagarBoleto(string pnr)',
    'function verificarPago(string pnr) view returns (bool)',
    'function consultarTarifa(string pnr) view returns (uint256 monto, uint64 venceEn)',
    'function billeteraRecaudadora() view returns (address)',
    'event TarifaRegistrada(string pnr, uint256 monto, uint64 venceEn)',
    'event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)',
];

const network = ethers.Network.from(config.chain.chainId);
// cacheTimeout: -1 -> sin caché del número de bloque (el listener necesita la cabeza real)
const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl, network, { staticNetwork: network, cacheTimeout: -1 });
const operador = new ethers.NonceManager(new ethers.Wallet(config.chain.operatorKey, provider));

function contrato(signerOrProvider = provider) {
    if (!config.chain.contractAddress) throw new Error('CONTRACT_ADDRESS no está configurado');
    return new ethers.Contract(config.chain.contractAddress, BOA_PAYMENTS_ABI, signerOrProvider);
}

module.exports = { provider, operador, contrato, BOA_PAYMENTS_ABI };
