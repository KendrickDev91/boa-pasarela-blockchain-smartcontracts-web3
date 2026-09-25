const pool = require('../config/db');
const config = require('../config');
const { crearSolicitud } = require('../services/quoteService');
const { obtenerTipoCambio } = require('../services/exchangeRateService');
const notifier = require('../services/notifier');

// Columnas con los alias que ya consume el frontend (se conserva el contrato de la API)
const SELECT_PAGO = `
    SELECT p.id_reserva                  AS pnr,
           p.estado_pago,
           p.estado_emision,
           p.monto_bob,
           p.monto_stablecoin            AS monto_usdt,
           p.tipo_cambio,
           p.fuente_tipo_cambio,
           p.direccion_billetera_cliente AS wallet_cliente,
           p.vence_en,
           p.fecha_confirmacion          AS fecha_pago,
           t.tx_hash,
           t.bloque_numero               AS bloque_red,
           t.gas_pagado
      FROM pasarela_pagos_cripto p
 LEFT JOIN transacciones_blockchain t USING (id_reserva)`;

const PNR_VALIDO = /^[A-Z0-9]{1,10}$/;
const HASH_VALIDO = /^0x[0-9a-fA-F]{64}$/;

function manejarError(res, err, contexto) {
    const status = err.status || 500;
    if (status >= 500) console.error(`[CONTROLLER] ${contexto}:`, err.message);
    return res.status(status).json({ success: false, message: status >= 500 ? 'Error interno del servidor' : err.message });
}

class PaymentController {
    /** POST /api/reservas — núcleo simulado: registra la reserva y genera los parámetros de cobro */
    async crearReserva(req, res) {
        try {
            const { pnr, montoBob, montoFiat } = req.body || {};
            const datos = await crearSolicitud({ pnr, montoBob: montoBob ?? montoFiat });
            return res.status(201).json({ success: true, ...datos });
        } catch (err) {
            return manejarError(res, err, 'crearReserva');
        }
    }

    /** GET /api/chain — parámetros de red para el frontend */
    chainInfo(req, res) {
        return res.json({
            success: true,
            chainId: config.chain.chainId,
            contracts: { BoAPayments: config.chain.contractAddress, token: config.chain.tokenAddress },
            decimals: 6,
        });
    }

    /** GET /api/payments/status/:pnr */
    async getStatus(req, res) {
        const pnr = String(req.params.pnr || '').toUpperCase();
        if (!PNR_VALIDO.test(pnr)) return res.status(400).json({ success: false, message: 'PNR inválido' });
        try {
            const { rows } = await pool.query(`${SELECT_PAGO} WHERE p.id_reserva = $1`, [pnr]);
            if (!rows.length) return res.status(404).json({ success: false, message: 'PNR no registrado en el sistema' });
            return res.json({ success: true, data: rows[0] });
        } catch (err) {
            return manejarError(res, err, `getStatus ${pnr}`);
        }
    }

    /** GET /api/payments/tx/:hash */
    async getByHash(req, res) {
        const { hash } = req.params;
        if (!HASH_VALIDO.test(hash)) return res.status(400).json({ success: false, message: 'Hash inválido' });
        try {
            const { rows } = await pool.query(`${SELECT_PAGO} WHERE t.tx_hash = $1`, [hash]);
            if (!rows.length) return res.status(404).json({ success: false, message: 'Hash no encontrado en los registros de auditoría' });
            return res.json({ success: true, data: rows[0] });
        } catch (err) {
            return manejarError(res, err, 'getByHash');
        }
    }

    /** GET /api/payments/all (JWT) — RF-12: pagos confirmados para conciliación, filtrables por fecha */
    async getAll(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const params = [];
            let filtro = 'WHERE t.tx_hash IS NOT NULL';
            if (startDate && endDate) {
                filtro += ' AND p.fecha_confirmacion BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }
            const { rows } = await pool.query(`${SELECT_PAGO} ${filtro} ORDER BY p.fecha_confirmacion DESC LIMIT 5000`, params);
            return res.json({ success: true, data: rows });
        } catch (err) {
            return manejarError(res, err, 'getAll');
        }
    }

    /** GET /api/payments/rate — tipo de cambio vigente (API o contingencia) */
    async getExchangeRate(req, res) {
        try {
            const tc = await obtenerTipoCambio();
            return res.json({ success: true, tasa: tc.valor, fuente: tc.fuente, consultadoEn: tc.consultadoEn });
        } catch (err) {
            return manejarError(res, err, 'getExchangeRate');
        }
    }

    /** GET /api/payments/rate/history/:fecha — cotización registrada en una fecha (auditoría) */
    async getHistoricalRate(req, res) {
        const { fecha } = req.params;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ success: false, message: 'Formato de fecha AAAA-MM-DD' });
        try {
            const { rows } = await pool.query(
                `SELECT valor, fuente, consultado_en FROM tipos_cambio
                  WHERE consultado_en < ($1::date + 1) ORDER BY consultado_en DESC LIMIT 1`, [fecha]);
            if (!rows.length) return res.status(404).json({ success: false, message: 'Sin cotización registrada para esa fecha' });
            return res.json({ success: true, fecha, tasa: Number(rows[0].valor), fuente: rows[0].fuente, consultadoEn: rows[0].consultado_en });
        } catch (err) {
            return manejarError(res, err, 'getHistoricalRate');
        }
    }

    /** GET /api/pagos/:pnr/stream — canal SSE; envía el estado actual si ya está confirmado */
    async stream(req, res) {
        const pnr = String(req.params.pnr || '').toUpperCase();
        if (!PNR_VALIDO.test(pnr)) return res.status(400).end();
        let actual = null;
        try {
            const { rows } = await pool.query(`${SELECT_PAGO} WHERE p.id_reserva = $1`, [pnr]);
            if (rows[0]?.tx_hash) actual = { estadoPago: 'confirmado', txHash: rows[0].tx_hash, bloque: Number(rows[0].bloque_red) };
        } catch (err) {
            console.error('[SSE] No se pudo leer el estado inicial:', err.message);
        }
        notifier.suscribir(req, res, pnr, actual);
    }
}

module.exports = new PaymentController();
