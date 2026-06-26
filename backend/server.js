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

// Utilizamos JsonRpcProvider (HTTP) porque en el nodo local Hardhat
// el WebSocket puede perder la conexión o no emitir eventos correctamente.
const provider = new ethers.JsonRpcProvider(RPC_URL.replace('ws://', 'http://').replace('wss://', 'https://'));
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// =========================================================
// LISTENER DE EVENTOS ON-CHAIN Y TRANSACCIONES ACID
// =========================================================

/**
 * Escucha asíncrona del evento PagoConfirmado emitido por el Smart Contract.
 * Garantiza propiedades ACID para evitar pérdida de datos o la doble emisión (idempotencia).
 */
async function processPaymentEvent(cliente, pnr, monto, timestamp, event) {
    console.log(`\n[WEB3 EVENT] Pago confirmado detectado para PNR: ${pnr}`);
    
    // El monto viene en unidades mínimas (ej. Wei o con los decimales del token ERC20).
    // Para simplificar la base de datos, lo transformamos. (Asumiendo USDT: 6 decimales)
    const montoFormateado = ethers.formatUnits(monto, 6); 
    
    const txHash = event.transactionHash || (event.log && event.log.transactionHash);
    const blockNumber = event.blockNumber || (event.log && event.log.blockNumber);
    
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
            address: event.address || (event.log && event.log.address),
            logIndex: event.index || (event.log && event.log.index)
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
        if (global.notifyPaymentToFrontend) global.notifyPaymentToFrontend(pnr, txHash, blockNumber);
        
    } catch (error) {
        // 5. REVERSIÓN EN CASO DE FALLO (ROLLBACK)
        // Protege contra escrituras parciales (ej. se guarda la auditoría pero falla el registro del boleto)
        await client.query('ROLLBACK');
        
        if (error.code === '23505') {
            console.log(`[IDEMPOTENCIA] El pago para el PNR ${pnr} ya estaba registrado. Ignorando evento duplicado.`);
        } else {
            console.error(`[ERROR CRÍTICO] Fallo durante la transacción ACID para el PNR ${pnr}:`, error.message);
            // NOTA: Aquí se podría integrar un sistema de envío de alertas a un Slack o PagerDuty corporativo de BoA.
        }
    } finally {
        // Liberar el cliente de vuelta al pool para no agotar las conexiones
        client.release();
    }
}

// =========================================================
// SISTEMA DE POLLING MANUAL (WORKAROUND PARA ETHERS V6 + HARDHAT)
// =========================================================
let lastCheckedBlock = -1;

async function pollEvents() {
    try {
        const latestBlock = await provider.getBlockNumber();
        if (lastCheckedBlock === -1) {
            // Al arrancar, revisamos los últimos 50 bloques por si nos perdimos pagos mientras estaba apagado
            lastCheckedBlock = Math.max(0, latestBlock - 50); 
        }

        if (latestBlock > lastCheckedBlock) {
            const filter = contract.filters.PagoConfirmado();
            const events = await contract.queryFilter(filter, lastCheckedBlock + 1, latestBlock);
            
            for (const event of events) {
                const [cliente, pnr, monto, timestamp] = event.args;
                await processPaymentEvent(cliente, pnr, monto, timestamp, event);
            }
            
            lastCheckedBlock = latestBlock;
        }
    } catch (error) {
        // Silenciamos errores temporales de conexión (ej. nodo reiniciándose)
    }
}

// Ejecutar la búsqueda de eventos cada 3 segundos
setInterval(pollEvents, 3000);

// =========================================================
// INICIO DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Middleware BoA Web3 Operativo y conectado a Polygon Amoy' });
});

// =========================================================
// API REST DE CONSULTAS
// =========================================================

/**
 * Endpoint de Consulta de Pagos Web3 (REST API)
 * Permite a sistemas corporativos externos de BoA verificar si un PNR
 * ya ha sido pagado de manera inmutable en la blockchain.
 * 
 * Uso de Pruebas:
 * Browser: http://localhost:3000/api/pagos/estado/DEF123
 * cURL: curl -X GET http://localhost:3000/api/pagos/estado/DEF123
 */
app.get('/api/pagos/estado/:pnr', async (req, res) => {
    const { pnr } = req.params;

    try {
        const query = `
            SELECT 
                b.pnr,
                b.estado_emision,
                b.monto_usdt,
                b.fecha_pago,
                a.tx_hash
            FROM boletos_pagados b
            LEFT JOIN auditoria_blockchain a ON b.pnr = a.pnr_relacionado
            WHERE b.pnr = $1;
        `;
        
        // Forzamos a mayúsculas para evitar problemas de case-sensitivity en los PNRs
        const { rows } = await dbPool.query(query, [pnr.toUpperCase()]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'NOT_FOUND',
                message: 'El registro no ha sido procesado por el contrato inteligente o el estado del PNR proporcionado no fue encontrado.',
                pnr: pnr
            });
        }

        // Si existe el PNR, retornamos toda su información transaccional y blockchain
        return res.status(200).json({
            status: 'SUCCESS',
            data: rows[0]
        });

    } catch (error) {
        console.error(`[REST ERROR] Fallo en la consulta del PNR ${pnr}:`, error.message);
        return res.status(500).json({
            status: 'ERROR',
            message: 'Error interno del servidor al consultar la base de datos.',
            errorDetalle: error.message
        });
    }
});

// Endpoint para el Simulador de PolygonScan Local
app.get('/api/explorer/tx/:hash', async (req, res) => {
    const { hash } = req.params;
    try {
        const query = `
            SELECT 
                pnr_relacionado, 
                tx_hash, 
                bloque_red, 
                datos_completos_nodo,
                fecha_registro
            FROM auditoria_blockchain 
            WHERE tx_hash = $1
        `;
        const { rows } = await dbPool.query(query, [hash]);

        if (rows.length === 0) {
            return res.status(404).json({ status: 'NOT_FOUND' });
        }

        res.status(200).json({
            status: 'SUCCESS',
            data: rows[0]
        });
    } catch (error) {
        console.error(`[REST ERROR] Fallo al buscar hash ${hash}:`, error.message);
        res.status(500).json({ status: 'ERROR' });
    }
});

// =========================================================
// MOCK ENDPOINTS PARA SOPORTAR FRONTEND
// =========================================================

// Simulamos la creación de reserva y devolvemos la info cripto
app.post('/api/reservas', (req, res) => {
    const pnr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const montoStablecoin = req.body.montoFiat || 100; // Asumiendo paridad
    res.status(200).json({
        pnr,
        montoStablecoin,
        direccionBoa: process.env.CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
    });
});

// Enviamos info de red para que el frontend arme el QR / Transacción
app.get('/api/chain', (req, res) => {
    res.status(200).json({
        chainId: 31337, // Hardhat localhost
        contracts: {
            MockUSDT: process.env.USDT_TOKEN_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
        }
    });
});

// Endpoint SSE (Server-Sent Events) para pushear la confirmación
const sseClients = new Map(); // pnr -> res

app.get('/api/pagos/:pnr/stream', (req, res) => {
    const { pnr } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.set(pnr.toUpperCase(), res);
    
    req.on('close', () => {
        sseClients.delete(pnr.toUpperCase());
    });
});

// Para enviar eventos a los clientes SSE
function notifyPaymentToFrontend(pnr, txHash, bloque) {
    const client = sseClients.get(pnr.toUpperCase());
    if (client) {
        client.write(`event: pago\n`);
        client.write(`data: ${JSON.stringify({ estadoPago: 'confirmado', txHash, bloque })}\n\n`);
    }
}

// Endpoint para el botón "Simular pago" sin MetaMask
app.post('/api/pagos/:pnr/simular', (req, res) => {
    const { pnr } = req.params;
    setTimeout(() => {
        notifyPaymentToFrontend(pnr, "0xSIMULATED_TX_HASH", 12345);
    }, 2000);
    res.status(200).json({ status: 'Simulando pago...' });
});

// Hacemos que la función esté disponible globalmente para el listener de Web3
global.notifyPaymentToFrontend = notifyPaymentToFrontend;

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Servidor Middleware escuchando en el puerto ${PORT}`);
    console.log(`Escuchando eventos de Smart Contracts en red Polygon Amoy...`);
    console.log(`=================================================`);
});
