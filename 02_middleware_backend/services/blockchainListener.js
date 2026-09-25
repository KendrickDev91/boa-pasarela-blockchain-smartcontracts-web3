const pool = require('../config/db');
const config = require('../config');
const { provider, contrato } = require('../config/web3');
const paymentService = require('./paymentService');

/**
 * Captura asíncrona de PagoConfirmado mediante consulta periódica (polling) JSON-RPC.
 * Garantías:
 *  - Cursor persistente en BD (estado_listener): un reinicio no reprocesa desde el bloque 0
 *    ni pierde eventos emitidos mientras el servidor estaba detenido.
 *  - Solo procesa bloques con N confirmaciones (RF-06), para tolerar reorganizaciones.
 *  - Rangos acotados (MAX_BLOCK_RANGE), compatibles con los límites de los proveedores RPC.
 *  - El cursor avanza SOLO después de persistir todos los eventos del rango; ante cualquier
 *    error (RPC o BD) el rango se reintenta en el siguiente ciclo (entrega al-menos-una-vez,
 *    que la idempotencia de la BD convierte en exactamente-una-vez).
 *  - Sin ciclos solapados: un ciclo no inicia si el anterior sigue en curso.
 */
class BlockchainListener {
    constructor() {
        this.enCurso = false;
        this.timer = null;
    }

    async leerCursor() {
        const { rows } = await pool.query('SELECT ultimo_bloque FROM estado_listener WHERE id = 1');
        if (rows.length) return Number(rows[0].ultimo_bloque);
        const inicial = Math.max(config.chain.deployBlock - 1, 0);
        await pool.query('INSERT INTO estado_listener (id, ultimo_bloque) VALUES (1, $1) ON CONFLICT DO NOTHING', [inicial]);
        return inicial;
    }

    async guardarCursor(bloque) {
        await pool.query('UPDATE estado_listener SET ultimo_bloque = $1, actualizado_en = now() WHERE id = 1', [bloque]);
    }

    async ciclo() {
        if (this.enCurso) return;
        this.enCurso = true;
        try {
            const boa = contrato();
            const cabeza = await provider.getBlockNumber();
            const hasta = cabeza - config.chain.confirmaciones;
            let cursor = await this.leerCursor();
            if (cursor > cabeza) {
                // La cadena es más corta que el cursor: nodo local reiniciado (o reorganización profunda)
                console.warn(`[LISTENER] Cursor ${cursor} mayor que la cabeza ${cabeza}; se reinicia desde el bloque de despliegue.`);
                cursor = Math.max(config.chain.deployBlock - 1, 0);
                await this.guardarCursor(cursor);
            }
            let desde = cursor + 1;

            while (desde <= hasta) {
                const fin = Math.min(desde + config.chain.rangoMaximo - 1, hasta);
                const eventos = await boa.queryFilter(boa.filters.PagoConfirmado(), desde, fin);
                for (const evento of eventos) {
                    await paymentService.procesarEvento(evento); // si lanza, el cursor no avanza
                }
                await this.guardarCursor(fin);
                desde = fin + 1;
            }

            await paymentService.expirarSolicitudes();
            await paymentService.reintentarEmisiones();
        } catch (err) {
            console.error(`[LISTENER] Ciclo interrumpido, se reintentará: ${err.shortMessage || err.message}`);
        } finally {
            this.enCurso = false;
        }
    }

    iniciar() {
        console.log(`[LISTENER] Escuchando PagoConfirmado cada ${config.chain.intervaloMs} ms ` +
                    `(${config.chain.confirmaciones} confirmaciones, contrato ${config.chain.contractAddress}).`);
        this.ciclo();
        this.timer = setInterval(() => this.ciclo(), config.chain.intervaloMs);
    }

    detener() {
        clearInterval(this.timer);
    }
}

module.exports = new BlockchainListener();
