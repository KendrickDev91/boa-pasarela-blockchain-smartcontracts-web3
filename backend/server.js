const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const dbPool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// CONFIGURACIÓN WEB3 Y SMART CONTRACT
// =========================================================
const RPC_URL = process.env.RPC_URL || 'ws://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'DIRECCION_DEL_CONTRATO_AQUI';

// ABI mínimo necesario para instanciar el contrato y escuchar el evento PagoConfirmado
const CONTRACT_ABI = [
    "event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)"
];

// Utilizamos WebSocketProvider porque Ethers v6 tiene un bug conocido (results is not iterable)
// al hacer HTTP Polling de eventos en el nodo local de Hardhat.
const provider = new ethers.WebSocketProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// =========================================================
// LISTENER DE EVENTOS ON-CHAIN Y TRANSACCIONES ACID
// =========================================================

/**
 * Escucha asíncrona del evento PagoConfirmado emitido por el Smart Contract.
 * Garantiza propiedades ACID para evitar pérdida de datos o la doble emisión (idempotencia).
 */
contract.on("PagoConfirmado", async (cliente, pnr, monto, timestamp, event) => {
    console.log(`\n[WEB3 EVENT] Pago confirmado detectado para PNR: ${pnr}`);
    
    // El monto viene en unidades mínimas (ej. Wei o con los decimales del token ERC20).
    // Para simplificar la base de datos, lo transformamos. (Asumiendo USDT: 6 decimales)
    const montoFormateado = ethers.formatUnits(monto, 6); 
    
    const txHash = event.log.transactionHash;
    const blockNumber = event.log.blockNumber;
    
    // Obtenemos un cliente exclusivo del pool para manejar la transacción de forma atómica
    const client = await dbPool.connect();

    try {
        // 1. INICIO DE LA TRANSACCIÓN (ACID)
        // Bloquea las tablas involucradas en este contexto y prepara el batch.
        await client.query('BEGIN');

        // 2. INSERTAR EN boletos_pagados
        // Si el PNR ya existe, fallará por la restricción UNIQUE, activando el ROLLBACK (idempotencia).
        const insertBoletoText = `
            INSERT INTO boletos_pagados (pnr, wallet_cliente, monto_usdt, estado_emision)
            VALUES ($1, $2, $3, 'PENDIENTE')
            RETURNING id;
        `;
        const insertBoletoValues = [pnr, cliente, montoFormateado];
        await client.query(insertBoletoText, insertBoletoValues);

        // 3. INSERTAR EN auditoria_blockchain
        // Guardamos todo el payload crudo del evento Web3 en 'datos_completos_nodo' (tipo JSONB)
        const rawEventData = JSON.stringify({
            args: { cliente, pnr, monto: monto.toString(), timestamp: timestamp.toString() },
            transactionHash: txHash,
            blockNumber: blockNumber,
            address: event.log.address,
            logIndex: event.log.index
        });

        const insertAuditoriaText = `
            INSERT INTO auditoria_blockchain (pnr_relacionado, tx_hash, bloque_red, datos_completos_nodo)
            VALUES ($1, $2, $3, $4);
        `;
        const insertAuditoriaValues = [pnr, txHash, blockNumber, rawEventData];
        await client.query(insertAuditoriaText, insertAuditoriaValues);

        // 4. CONFIRMAR LA TRANSACCIÓN (COMMIT)
        // Se consolida en disco. Si el servidor se apaga después de esta línea, 
        // la información financiera está a salvo.
        await client.query('COMMIT');
        console.log(`[EXITO] Transacción ACID completada. PNR ${pnr} y auditoría registrados correctamente.`);
        
    } catch (error) {
        // 5. REVERSIÓN EN CASO DE FALLO (ROLLBACK)
        // Protege contra escrituras parciales (ej. se guarda la auditoría pero falla el registro del boleto)
        await client.query('ROLLBACK');
        console.error(`[ERROR CRÍTICO] Fallo durante la transacción ACID para el PNR ${pnr}:`, error.message);
        
        // NOTA: Aquí se podría integrar un sistema de envío de alertas a un Slack o PagerDuty corporativo de BoA.
    } finally {
        // Liberar el cliente de vuelta al pool para no agotar las conexiones
        client.release();
    }
});

// =========================================================
// INICIO DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Middleware BoA Web3 Operativo y conectado a Polygon Amoy' });
});

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Servidor Middleware escuchando en el puerto ${PORT}`);
    console.log(`Escuchando eventos de Smart Contracts en red Polygon Amoy...`);
    console.log(`=================================================`);
});
