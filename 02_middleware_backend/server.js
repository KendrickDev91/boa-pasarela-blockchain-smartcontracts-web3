const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

const paymentRoutes = require('./routes/paymentRoutes');
const paymentController = require('./controllers/paymentController');
const blockchainListener = require('./services/blockchainListener');
const rpcPublico = require('./services/rpcPublico');
const faucet = require('./services/faucet');
const metricas = require('./services/metricas');

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
app.set('trust proxy', 'loopback'); // detrás de Apache: IP real del cliente para los límites
app.use(cors({ origin: config.frontendUrl, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: '16kb' }));
app.use('/api', metricas.medir);
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
        rpcPublico: 'POST /rpc (JSON-RPC filtrado)',
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

// Métricas del módulo de pagos para Cacti (solo solicitudes locales)
app.get('/api/metricas', metricas.manejar);

// RPC público filtrado de la red de pruebas (lo registra la billetera del usuario)
app.post('/rpc', rpcPublico.manejar);

// Grifo de fondos de prueba (solo red local 31337 y FAUCET_ENABLED=true)
const solicitudesFaucet = new Map();
app.post('/api/chain/faucet', async (req, res) => {
    const ip = req.ip;
    const ahora = Date.now();
    const r = (solicitudesFaucet.get(ip) || []).filter((t) => ahora - t < 60 * 60 * 1000);
    if (r.length >= 5) return res.status(429).json({ success: false, message: 'Demasiadas solicitudes de fondos de prueba' });
    solicitudesFaucet.set(ip, r.concat(ahora));
    try {
        const resultado = await faucet.acreditar(req.body && req.body.address);
        return res.json({ success: true, ...resultado });
    } catch (err) {
        return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'No se pudieron acreditar los fondos' });
    }
});

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
