const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

const paymentRoutes = require('./routes/paymentRoutes');
const paymentController = require('./controllers/paymentController');
const blockchainListener = require('./services/blockchainListener');

const app = express();

// =========================================================
// MIDDLEWARES DE SEGURIDAD Y AUDITORÍA
// =========================================================
app.use(cors({ origin: config.frontendUrl, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: '16kb' }));
app.use(morgan(':date[iso] | :method :url :status :response-time ms - :res[content-length]'));

// =========================================================
// RUTAS REST (MVC)
// =========================================================
app.use('/api/payments', paymentRoutes);

// Núcleo de reservas simulado: registra la reserva y devuelve los parámetros de cobro
app.post('/api/reservas', paymentController.crearReserva.bind(paymentController));

// Parámetros de red para el frontend (chainId, contrato, token)
app.get('/api/chain', paymentController.chainInfo.bind(paymentController));

// Canal SSE de confirmación de pago por PNR
app.get('/api/pagos/:pnr/stream', paymentController.stream.bind(paymentController));

app.get('/api/health', (req, res) => res.json({ success: true, estado: 'operativo' }));

// =========================================================
// INICIO
// =========================================================
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`[SERVER] API REST en el puerto ${config.port}`);
        blockchainListener.iniciar();
    });
}

module.exports = app;
