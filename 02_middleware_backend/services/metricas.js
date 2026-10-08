const pool = require('../config/db');
const { provider } = require('../config/web3');

// =========================================================
// Métricas del módulo de pagos para el monitoreo con Cacti (GET /api/metricas)
// Solo responde a solicitudes locales (el script de Cacti corre en el mismo servidor).
// Con ?formato=cacti devuelve "clave:valor" separados por espacios.
// =========================================================
const inicio = Date.now();
let solicitudes = 0;
let tiempoAcumuladoMs = 0;

// Middleware que mide el tiempo de respuesta de la API (promedio desde la última lectura)
function medir(req, res, next) {
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
        solicitudes += 1;
        tiempoAcumuladoMs += Number(process.hrtime.bigint() - t0) / 1e6;
    });
    next();
}

async function obtener() {
    const { rows } = await pool.query(`
        SELECT count(*) FILTER (WHERE estado_pago = 'CONFIRMADO')                         AS confirmados,
               count(*) FILTER (WHERE estado_pago = 'PENDIENTE')                          AS pendientes,
               count(*) FILTER (WHERE estado_pago = 'EXPIRADO')                           AS expirados,
               count(*) FILTER (WHERE estado_emision = 'ERROR')                           AS emisiones_error,
               COALESCE(sum(monto_stablecoin) FILTER (WHERE estado_pago = 'CONFIRMADO'), 0) AS recaudado_usdt
          FROM pasarela_pagos_cripto`);
    const t0 = Date.now();
    const bloque = await provider.getBlockNumber().catch(() => -1);
    const latenciaNodoMs = bloque >= 0 ? Date.now() - t0 : -1;
    const m = rows[0];
    const promedio = solicitudes ? tiempoAcumuladoMs / solicitudes : 0;
    const salida = {
        pagos_confirmados: Number(m.confirmados),
        pagos_pendientes: Number(m.pendientes),
        pagos_expirados: Number(m.expirados),
        emisiones_error: Number(m.emisiones_error),
        recaudado_usdt: Number(m.recaudado_usdt),
        solicitudes_api: solicitudes,
        respuesta_api_ms: Number(promedio.toFixed(2)),
        latencia_nodo_ms: latenciaNodoMs,
        bloque_actual: bloque,
        memoria_mb: Number((process.memoryUsage().rss / 1048576).toFixed(1)),
        activo_s: Math.round((Date.now() - inicio) / 1000),
    };
    solicitudes = 0;
    tiempoAcumuladoMs = 0;
    return salida;
}

async function manejar(req, res) {
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
        && !req.headers['x-forwarded-for'];
    if (!local) return res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` });
    try {
        const m = await obtener();
        if (req.query.formato === 'cacti') {
            return res.type('text/plain').send(Object.entries(m).map(([k, v]) => `${k}:${v}`).join(' '));
        }
        return res.json({ success: true, ...m });
    } catch (err) {
        return res.status(503).json({ success: false, message: 'Métricas no disponibles' });
    }
}

module.exports = { medir, manejar };
