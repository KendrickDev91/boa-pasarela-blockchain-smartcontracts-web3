const { ethers } = require('ethers');
const config = require('../config');
const { provider } = require('../config/web3');

// =========================================================
// Grifo de fondos de prueba (POST /api/chain/faucet)
// Solo en la red local de pruebas (chainId 31337) y con FAUCET_ENABLED=true.
// Acredita ETH para la comisión de red y USDT de prueba (MockUSDT) a una
// billetera, una vez por intervalo, para que los participantes de las pruebas
// de aceptación paguen desde su propia billetera.
// =========================================================
const TOKEN_ABI = [
    'function faucet()',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
];

const ETH_POR_SOLICITUD = ethers.parseEther('1');
const USDT_POR_SOLICITUD = 1000n * 10n ** 6n;
const INTERVALO_MS = 10 * 60 * 1000;
const ultimos = new Map();

let firmante = null;
function obtenerFirmante() {
    if (!firmante) firmante = new ethers.NonceManager(new ethers.Wallet(config.faucet.privateKey, provider));
    return firmante;
}

function habilitado() {
    return config.chain.chainId === 31337 && config.faucet.habilitado && !!config.chain.tokenAddress;
}

async function acreditar(direccion) {
    if (!habilitado()) {
        const e = new Error('El grifo de fondos de prueba no está habilitado'); e.status = 404; throw e;
    }
    if (!ethers.isAddress(direccion)) {
        const e = new Error('Dirección de billetera inválida'); e.status = 400; throw e;
    }
    const clave = direccion.toLowerCase();
    const ahora = Date.now();
    if (ultimos.has(clave) && ahora - ultimos.get(clave) < INTERVALO_MS) {
        const e = new Error('La billetera ya recibió fondos de prueba recientemente'); e.status = 429; throw e;
    }
    ultimos.set(clave, ahora);
    try {
        const s = obtenerFirmante();
        const token = new ethers.Contract(config.chain.tokenAddress, TOKEN_ABI, s);
        const propia = await s.getAddress();
        if ((await token.balanceOf(propia)) < USDT_POR_SOLICITUD) await (await token.faucet()).wait();
        const txEth = await s.sendTransaction({ to: direccion, value: ETH_POR_SOLICITUD });
        const txUsdt = await token.transfer(direccion, USDT_POR_SOLICITUD);
        await Promise.all([txEth.wait(), txUsdt.wait()]);
        return { eth: '1', usdt: '1000', txEth: txEth.hash, txUsdt: txUsdt.hash };
    } catch (err) {
        ultimos.delete(clave);
        if (firmante) firmante.reset();
        throw err;
    }
}

module.exports = { acreditar, habilitado };
