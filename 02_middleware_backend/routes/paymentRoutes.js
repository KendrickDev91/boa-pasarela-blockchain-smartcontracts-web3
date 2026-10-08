const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const limitarLogin = require('../middleware/loginRateLimit');

// Autenticación del personal de Finanzas (JWT)
router.post('/login', limitarLogin, authController.login.bind(authController));

// RF-12: listado de pagos confirmados para conciliación (requiere JWT)
router.get('/all', authMiddleware, paymentController.getAll.bind(paymentController));
router.get('/resumen', authMiddleware, paymentController.getResumen.bind(paymentController));

// Respaldo completo de la base de datos en JSON (requiere JWT)
router.get('/backup', authMiddleware, paymentController.getBackup.bind(paymentController));

// Consultas de estado y trazabilidad
router.get('/status/:pnr', paymentController.getStatus.bind(paymentController));
router.get('/tx/:hash', paymentController.getByHash.bind(paymentController));

// Tipo de cambio vigente e histórico
router.get('/rate', paymentController.getExchangeRate.bind(paymentController));
router.get('/rate/history/:fecha', paymentController.getHistoricalRate.bind(paymentController));

module.exports = router;
