const config = require('../config');

// =========================================================
// RPC público filtrado (POST /rpc)
// Expone el nodo de la red de pruebas a las billeteras de los usuarios sin
// permitir métodos que firmen con cuentas del nodo (eth_sendTransaction) ni
// métodos de administración (hardhat_*, evm_*, debug_*, personal_*).
// =========================================================
const PERMITIDOS = new Set([
    'eth_chainId', 'net_version', 'web3_clientVersion', 'eth_blockNumber', 'eth_gasPrice',
    'eth_maxPriorityFeePerGas', 'eth_feeHistory', 'eth_getBalance', 'eth_getCode', 'eth_getStorageAt',
    'eth_getTransactionCount', 'eth_call', 'eth_estimateGas', 'eth_sendRawTransaction',
    'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_getBlockByNumber', 'eth_getBlockByHash',
    'eth_getLogs', 'eth_syncing', 'net_listening',
]);

const MAX_LOTE = 20;

function rechazo(peticion, mensaje) {
    return { jsonrpc: '2.0', id: peticion && peticion.id !== undefined ? peticion.id : null, error: { code: -32601, message: mensaje } };
}

async function reenviar(cuerpo) {
    const res = await fetch(config.chain.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(15000),
    });
    return res.json();
}

async function manejar(req, res) {
    const cuerpo = req.body;
    const lote = Array.isArray(cuerpo);
    const peticiones = lote ? cuerpo : [cuerpo];
    if (!peticiones.length || peticiones.length > MAX_LOTE) {
        return res.status(400).json(rechazo(null, 'Lote vacío o demasiado grande'));
    }
    const validas = [];
    const rechazadas = [];
    for (const p of peticiones) {
        if (!p || typeof p.method !== 'string') rechazadas.push(rechazo(p, 'Petición JSON-RPC inválida'));
        else if (!PERMITIDOS.has(p.method)) rechazadas.push(rechazo(p, `Método no permitido: ${p.method}`));
        else validas.push(p);
    }
    try {
        let respuestas = [];
        if (validas.length) {
            const r = await reenviar(lote ? validas : validas[0]);
            respuestas = Array.isArray(r) ? r : [r];
        }
        const todas = respuestas.concat(rechazadas);
        return res.json(lote ? todas : todas[0]);
    } catch (err) {
        console.error('[RPC] Nodo no disponible:', err.message);
        return res.status(502).json(rechazo(peticiones[0], 'Nodo de la red de pruebas no disponible'));
    }
}

module.exports = { manejar, PERMITIDOS };
