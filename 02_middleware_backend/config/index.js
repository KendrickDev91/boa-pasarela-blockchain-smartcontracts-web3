const crypto = require('crypto');
require('dotenv').config();

// Cuenta #0 pública de Hardhat: SOLO se admite como operador en la red local (chainId 31337)
const CLAVE_HARDHAT_LOCAL = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const produccion = process.env.NODE_ENV === 'production';
const chainId = Number(process.env.CHAIN_ID || 31337);

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    if (produccion) throw new Error('JWT_SECRET es obligatorio en producción');
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[CONFIG] JWT_SECRET no definido: se generó un secreto temporal (los tokens se invalidan al reiniciar).');
}

let operatorKey = process.env.OPERATOR_PRIVATE_KEY;
if (!operatorKey) {
    if (chainId !== 31337) throw new Error('OPERATOR_PRIVATE_KEY es obligatorio fuera de la red local');
    operatorKey = CLAVE_HARDHAT_LOCAL;
}

module.exports = {
    port: Number(process.env.PORT || 3000),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    jwtSecret,
    admin: { user: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || null },
    chain: {
        rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
        chainId,
        contractAddress: process.env.CONTRACT_ADDRESS,
        tokenAddress: process.env.TOKEN_ADDRESS || process.env.USDT_TOKEN_ADDRESS,
        operatorKey,
        confirmaciones: Number(process.env.CONFIRMATIONS ?? (chainId === 31337 ? 0 : 5)),
        deployBlock: Number(process.env.DEPLOY_BLOCK || 0),
        rangoMaximo: Number(process.env.MAX_BLOCK_RANGE || 2000),
        intervaloMs: Number(process.env.POLL_INTERVAL_MS || 3000),
    },
    cotizacion: {
        apiUrl: process.env.EXCHANGE_RATE_URL || 'https://api.factura.bo/ExchangeRate',
        timeoutMs: Number(process.env.EXCHANGE_RATE_TIMEOUT_MS || 4000),
        vigenciaMin: Number(process.env.QUOTE_TTL_MINUTES || 15),
    },
    nucleo: { webhookUrl: process.env.CORE_WEBHOOK_URL || null, token: process.env.CORE_TOKEN || null },
};
