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
app.disable('x-powered-by'); // no revelar la tecnología del servidor
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});
app.use(cors({ origin: config.frontendUrl, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: '16kb' }));
app.use(morgan(':date[iso] | :method :url :status :response-time ms - :res[content-length]'));

// =========================================================
// RUTAS REST (MVC)
// =========================================================
app.get('/', (req, res) => res.json({
    servicio: 'Pasarela de cobro USDT - Boliviana de Aviación',
    estado: 'operativo',
    documentacion: {
        salud: 'GET /api/health',
        red: 'GET /api/chain',
        reserva: 'POST /api/reservas',
        estadoPago: 'GET /api/payments/status/:pnr',
        transaccion: 'GET /api/payments/tx/:hash',
        tipoCambio: 'GET /api/payments/rate',
        confirmacionSSE: 'GET /api/pagos/:pnr/stream',
        conciliacion: 'GET /api/payments/all (requiere JWT)',
    },
}));

app.use('/api/payments', paymentRoutes);

// Núcleo de reservas simulado: registra la reserva y devuelve los parámetros de cobro
app.post('/api/reservas', paymentController.crearReserva.bind(paymentController));

// Parámetros de red para el frontend (chainId, contrato, token)
app.get('/api/chain', paymentController.chainInfo.bind(paymentController));

// Canal SSE de confirmación de pago por PNR
app.get('/api/pagos/:pnr/stream', paymentController.stream.bind(paymentController));

app.get('/api/health', (req, res) => res.json({ success: true, estado: 'operativo' }));

// =========================================================
// RESPUESTAS DE ERROR EN JSON (sin páginas HTML ni trazas internas)
// =========================================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'El cuerpo de la solicitud no es un JSON válido' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'El cuerpo de la solicitud excede el tamaño permitido' });
    }
    console.error('[SERVER] Error no controlado:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

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
