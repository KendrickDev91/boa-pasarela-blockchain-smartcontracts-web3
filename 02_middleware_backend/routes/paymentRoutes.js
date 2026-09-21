const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint de autenticación (Login JWT)
router.post('/login', authController.login.bind(authController));

// Endpoint para consultar el listado completo de transacciones filtrado por fechas (Requiere JWT)
router.get('/all', authMiddleware, paymentController.getAll.bind(paymentController));

// Endpoint para consultar el estado de un PNR
router.get('/status/:pnr', paymentController.getStatus.bind(paymentController));

// Endpoint público para buscar por Hash de Transacción (Explorer)
router.get('/tx/:hash', paymentController.getByHash.bind(paymentController));

// Endpoint para consultar la cotización en tiempo real (Checkout)
router.get('/rate', paymentController.getExchangeRate.bind(paymentController));

// Endpoint para consultar la cotización histórica (Auditoría)
router.get('/rate/history/:fecha', paymentController.getHistoricalRate.bind(paymentController));

module.exports = router;
