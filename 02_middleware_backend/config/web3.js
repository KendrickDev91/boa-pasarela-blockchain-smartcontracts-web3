const { ethers } = require('ethers');
require('dotenv').config();

// =========================================================
// CONFIGURACIÓN WEB3 Y SMART CONTRACT (HTTP JSON-RPC)
// =========================================================
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

const CONTRACT_ABI = [
    "event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)"
];

class Web3Manager {
    constructor() {
        this.provider = null;
        this.contract = null;
    }

    connect() {
        console.log(`[WEB3] Conectando vía JSON-RPC a ${RPC_URL}...`);
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
        return this.contract;
    }

    getProvider() {
        return this.provider;
    }
}

const web3Manager = new Web3Manager();
module.exports = web3Manager;
