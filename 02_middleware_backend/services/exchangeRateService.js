const pool = require('../config/db');
const config = require('../config');

/**
 * Obtiene el tipo de cambio oficial (Bs por USD).
 * 1. Consulta la API externa con tiempo de espera acotado.
 * 2. Si responde, persiste el valor en tipos_cambio (histórico de contingencia).
 * 3. Si falla, usa la última cotización obtenida con éxito (RF-02, contingencia).
 * Nunca usa un valor fijo en el código.
 */
async function obtenerTipoCambio() {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.cotizacion.timeoutMs);
        const res = await fetch(config.cotizacion.apiUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const valor = Number(data?.datos?.usd_bob);
        if (!Number.isFinite(valor) || valor <= 0) throw new Error('Respuesta sin usd_bob válido');

        await pool.query('INSERT INTO tipos_cambio (valor, fuente) VALUES ($1, $2)', [valor, config.cotizacion.apiUrl]);
        return { valor, fuente: 'API', consultadoEn: new Date() };
    } catch (err) {
        console.warn(`[TIPO DE CAMBIO] API no disponible (${err.message}); se usa la última cotización registrada.`);
        const { rows } = await pool.query(
            'SELECT valor, consultado_en FROM tipos_cambio ORDER BY consultado_en DESC LIMIT 1'
        );
        if (!rows.length) {
            const e = new Error('No hay tipo de cambio disponible (API caída y sin histórico)');
            e.status = 503;
            throw e;
        }
        return { valor: Number(rows[0].valor), fuente: 'CONTINGENCIA', consultadoEn: rows[0].consultado_en };
    }
}

/**
 * Convierte bolivianos a unidades mínimas del token (6 decimales) con aritmética entera,
 * redondeando hacia arriba al centavo de dólar para que la aerolínea no reciba de menos.
 *   unidades = ceil(centavosBs * 10^4 / (tc * 10^4)) * 10^4
 */
function bobAUnidades(montoBob, tipoCambio) {
    const centavos = BigInt(Math.round(Number(montoBob) * 100));
    const tc4 = BigInt(Math.round(Number(tipoCambio) * 10000));
    const centavosUsd = (centavos * 10000n + tc4 - 1n) / tc4;
    return centavosUsd * 10000n;
}

module.exports = { obtenerTipoCambio, bobAUnidades };
