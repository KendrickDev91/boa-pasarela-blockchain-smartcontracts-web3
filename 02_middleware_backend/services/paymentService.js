const { ethers } = require('ethers');
const pool = require('../config/db');
const { withTransaction } = require('../config/db');
const { notificarEmision } = require('./nucleoReservas');
const notifier = require('./notifier');

/**
 * Procesa un evento PagoConfirmado ya confirmado en la cadena.
 * - Idempotente: tx_hash (PK) e id_reserva (UNIQUE) impiden registrar dos veces el mismo cobro.
 * - ACID: la transacción on-chain y el cambio de estado de la solicitud se escriben juntos.
 * - Lanza error ante fallas de infraestructura (BD caída), para que el listener NO avance
 *   su cursor y reintente el bloque en el siguiente ciclo.
 * @returns {'REGISTRADO'|'DUPLICADO'|'SIN_SOLICITUD'}
 */
async function procesarEvento(evento) {
    const [cliente, pnr, monto] = evento.args;
    const txHash = evento.transactionHash;
    const recibo = await evento.getTransactionReceipt();
    const gasPagado = recibo ? ethers.formatEther(recibo.gasUsed * recibo.gasPrice) : null;
    const bloque = await evento.getBlock();
    const montoUsdt = ethers.formatUnits(monto, 6);

    const resultado = await withTransaction(async (client) => {
        const { rows } = await client.query(
            'SELECT monto_stablecoin FROM pasarela_pagos_cripto WHERE id_reserva = $1 FOR UPDATE',
            [pnr]
        );
        if (!rows.length) return 'SIN_SOLICITUD';

        // Defensa en profundidad: el contrato ya fija el importe; se deja constancia si difiere
        const estadoTx = Number(rows[0].monto_stablecoin) === Number(montoUsdt) ? 'SUCCESS' : 'MONTO_DIFERENTE';

        const insert = await client.query(
            `INSERT INTO transacciones_blockchain
               (tx_hash, id_reserva, bloque_numero, origen_address, destino_address,
                monto_transferido, gas_pagado, estado_tx, datos_evento)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT DO NOTHING`,
            [txHash, pnr, evento.blockNumber, cliente, evento.address, montoUsdt, gasPagado, estadoTx,
             JSON.stringify({ cliente, pnr, monto: monto.toString(), logIndex: evento.index })]
        );
        if (insert.rowCount === 0) return 'DUPLICADO';

        await client.query(
            `UPDATE pasarela_pagos_cripto
                SET estado_pago = 'CONFIRMADO', direccion_billetera_cliente = $2,
                    fecha_confirmacion = to_timestamp($3)
              WHERE id_reserva = $1`,
            [pnr, cliente, bloque.timestamp]
        );
        return 'REGISTRADO';
    });

    if (resultado === 'SIN_SOLICITUD') {
        console.error(`[ANOMALÍA] Pago on-chain del PNR ${pnr} (tx ${txHash}) sin solicitud en la base de datos.`);
        return resultado;
    }
    if (resultado === 'DUPLICADO') {
        console.log(`[IDEMPOTENCIA] Evento ya registrado para el PNR ${pnr}; se ignora.`);
        return resultado;
    }

    console.log(`[PAGO] PNR ${pnr} confirmado en el bloque ${evento.blockNumber} (tx ${txHash}).`);
    notifier.publicar(pnr, { estadoPago: 'confirmado', txHash, bloque: evento.blockNumber });
    await emitirBoleto(pnr, txHash, montoUsdt);
    return resultado;
}

/** Notifica al núcleo de reservas y registra el resultado de la emisión. */
async function emitirBoleto(pnr, txHash, monto) {
    try {
        await notificarEmision({ pnr, txHash, monto });
        await pool.query(`UPDATE pasarela_pagos_cripto SET estado_emision = 'EMITIDO' WHERE id_reserva = $1`, [pnr]);
    } catch (err) {
        console.error(`[EMISIÓN] Falló la notificación al núcleo para ${pnr}: ${err.message}`);
        await pool.query(`UPDATE pasarela_pagos_cripto SET estado_emision = 'ERROR' WHERE id_reserva = $1`, [pnr]);
    }
}

/** Reintenta las emisiones pendientes o fallidas de pagos ya confirmados. */
async function reintentarEmisiones() {
    const { rows } = await pool.query(
        `SELECT p.id_reserva, t.tx_hash, p.monto_stablecoin
           FROM pasarela_pagos_cripto p JOIN transacciones_blockchain t USING (id_reserva)
          WHERE p.estado_pago = 'CONFIRMADO' AND p.estado_emision <> 'EMITIDO'
          LIMIT 20`
    );
    for (const r of rows) await emitirBoleto(r.id_reserva, r.tx_hash, r.monto_stablecoin);
}

/** RF-07: vence las solicitudes no pagadas (margen de 2 min para confirmaciones en tránsito). */
async function expirarSolicitudes() {
    const { rowCount } = await pool.query(
        `UPDATE pasarela_pagos_cripto SET estado_pago = 'EXPIRADO'
          WHERE estado_pago = 'PENDIENTE' AND vence_en < now() - interval '2 minutes'`
    );
    if (rowCount) console.log(`[VIGENCIA] ${rowCount} solicitud(es) expirada(s).`);
}

module.exports = { procesarEvento, reintentarEmisiones, expirarSolicitudes };
