const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const paymentRoutes = require('./routes/paymentRoutes');
const blockchainListener = require('./services/blockchainListener');

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================
// MIDDLEWARES DE SEGURIDAD Y AUDITORÍA
// =========================================================
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
// Logging estructurado corporativo
app.use(morgan(':date[iso] | :method :url :status :response-time ms - :res[content-length]'));

// =========================================================
// RUTAS REST MVC
// =========================================================
app.use('/api/payments', paymentRoutes);

// Endpoint para vinculación y desbloqueo del flujo de reservas en el Frontend
app.all('/api/reservas', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Canal de reservas y pasarela vinculado correctamente'
    });
});

// =========================================================
// INICIALIZACIÓN DE SERVICIOS Y WEBHOOK (SSE)
// =========================================================
const EventEmitter = require('events');
const paymentEvents = new EventEmitter();

// Iniciar el listener de Web3 
blockchainListener.startListening((pnr, txHash, blockNumber) => {
    console.log(`[FRONTEND NOTIFIER] Pago del PNR ${pnr} confirmado en bloque ${blockNumber}. Hash: ${txHash}`);
    // Emitir el evento de forma interna para el webhook de Server-Sent Events (SSE)
    paymentEvents.emit(`pago_${pnr}`, { txHash, blockNumber });
});

// Endpoint SSE (Webhook) para notificar en tiempo real la confirmación on-chain al Frontend
app.get('/api/pagos/:pnr/stream', (req, res) => {
    const { pnr } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onPago = (data) => {
        res.write(`event: pago\n`);
        res.write(`data: ${JSON.stringify({ estadoPago: 'confirmado', txHash: data.txHash, bloque: data.blockNumber })}\n\n`);
    };

    paymentEvents.on(`pago_${pnr}`, onPago);

    req.on('close', () => {
        paymentEvents.off(`pago_${pnr}`, onPago);
    });
});

// Iniciar servidor Express
app.listen(PORT, () => {
    console.log(`[SERVER] API REST ejecutándose correctamente en el puerto ${PORT}`);
});
