const crypto = require('crypto');
const { ethers } = require('ethers');
const pool = require('../config/db');
const config = require('../config');
const { operador, contrato } = require('../config/web3');
const { obtenerTipoCambio, bobAUnidades } = require('./exchangeRateService');

const ALFABETO_PNR = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Núcleo de reservas simulado: genera un localizador de 6 caracteres
function generarPnr() {
    return Array.from(crypto.randomBytes(6), (b) => ALFABETO_PNR[b % ALFABETO_PNR.length]).join('');
}

/**
 * Crea la solicitud de pago de una reserva:
 *  1. obtiene el tipo de cambio (API o contingencia);
 *  2. convierte la tarifa a unidades del token;
 *  3. persiste la solicitud (PENDIENTE);
 *  4. registra la tarifa en el contrato (registrarTarifa), que fija el importe on-chain.
 * Si el registro on-chain falla, la solicitud se elimina para no dejar estados huérfanos.
 */
async function crearSolicitud({ pnr, montoBob }) {
    const monto = Number(montoBob);
    if (!Number.isFinite(monto) || monto <= 0) {
        const e = new Error('montoBob debe ser un número positivo'); e.status = 400; throw e;
    }
    pnr = (pnr || generarPnr()).toUpperCase();
    if (!/^[A-Z0-9]{1,10}$/.test(pnr)) {
        const e = new Error('PNR inválido'); e.status = 400; throw e;
    }

    const tc = await obtenerTipoCambio();
    const unidades = bobAUnidades(monto, tc.valor);
    const montoUsdt = ethers.formatUnits(unidades, 6);
    const venceEn = Math.floor(Date.now() / 1000) + config.cotizacion.vigenciaMin * 60;
    const boa = contrato();
    const tesoreria = await boa.billeteraRecaudadora();

    // Una re-cotización solo se admite mientras la solicitud no esté confirmada
    const { rowCount, rows } = await pool.query(
        `INSERT INTO pasarela_pagos_cripto
           (id_reserva, monto_bob, tipo_cambio, fuente_tipo_cambio, monto_stablecoin,
            direccion_contrato, direccion_billetera_boa, vence_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp($8))
         ON CONFLICT (id_reserva) DO UPDATE SET
            monto_bob = EXCLUDED.monto_bob, tipo_cambio = EXCLUDED.tipo_cambio,
            fuente_tipo_cambio = EXCLUDED.fuente_tipo_cambio, monto_stablecoin = EXCLUDED.monto_stablecoin,
            vence_en = EXCLUDED.vence_en, estado_pago = 'PENDIENTE', fecha_solicitud = now()
         WHERE pasarela_pagos_cripto.estado_pago <> 'CONFIRMADO'
         RETURNING (xmax = 0) AS insertado`,
        [pnr, monto, tc.valor, tc.fuente, montoUsdt, config.chain.contractAddress, tesoreria, venceEn]
    );
    if (rowCount === 0) {
        const e = new Error(`El PNR ${pnr} ya fue pagado`); e.status = 409; throw e;
    }

    try {
        const tx = await boa.connect(operador).registrarTarifa(pnr, unidades, venceEn);
        await tx.wait();
    } catch (err) {
        if (rows[0].insertado) {
            await pool.query(`DELETE FROM pasarela_pagos_cripto WHERE id_reserva = $1 AND estado_pago = 'PENDIENTE'`, [pnr]);
        } else {
            // Re-cotización fallida: la cotización anterior sigue vigente on-chain; se marca vencida en BD
            await pool.query(`UPDATE pasarela_pagos_cripto SET vence_en = now() WHERE id_reserva = $1 AND estado_pago = 'PENDIENTE'`, [pnr]);
        }
        throw err;
    }

    return {
        pnr,
        montoBob: monto,
        tipoCambio: tc.valor,
        fuenteTipoCambio: tc.fuente,
        montoStablecoin: montoUsdt,
        montoUnidades: unidades.toString(),
        venceEn: new Date(venceEn * 1000).toISOString(),
        chainId: config.chain.chainId,
        contrato: config.chain.contractAddress,
        token: config.chain.tokenAddress,
        direccionBoa: tesoreria,
    };
}

module.exports = { crearSolicitud, generarPnr };
