const dbPool = require('../config/db');
const { ethers } = require('ethers');

class PaymentService {
    /**
     * Procesa la confirmación de pago asegurando propiedades ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad)
     * Cumple con requerimiento RNF-04
     */
    async processPaymentEvent(cliente, pnr, monto, timestamp, txHash, blockNumber) {
        // Formateo del monto (asumiendo USDT: 6 decimales)
        const montoFormateado = ethers.formatUnits(monto, 6);

        // Validación criptográfica estricta del hash para prevenir inyecciones
        if (!/^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
            console.error(`[SEGURIDAD] Evento rechazado. El hash de transacción provisto no cumple con la estructura criptográfica válida: ${txHash}`);
            return { success: false, reason: 'INVALID_TX_HASH' };
        }

        // Obtener conexión exclusiva del pool
        const client = await dbPool.connect();

        try {
            // Obtener tipo de cambio (fuera de la transacción para no abortarla si la tabla no existe)
            let tipoCambio = 10.00;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const response = await fetch('https://api.factura.bo/ExchangeRate', { signal: controller.signal });
                clearTimeout(timeoutId);
                const data = await response.json();
                if (data && data.datos && data.datos.usd_bob) {
                    tipoCambio = parseFloat(data.datos.usd_bob);
                } else {
                    throw new Error("No se pudo obtener la tasa");
                }
            } catch (apiError) {
                console.error("[SERVICE] Falló API externa, usando contingencia DB");
                try {
                    const rateRes = await client.query("SELECT valor FROM parametros_contingencia WHERE clave = 'tasa_usdt'");
                    if (rateRes.rows.length > 0) tipoCambio = parseFloat(rateRes.rows[0].valor);
                } catch (e) { /* Ignorar si no existe tabla */ }
            }

            // 1. INICIO DE LA TRANSACCIÓN
            await client.query('BEGIN');



            const insertBoletoText = `
                INSERT INTO boletos_pagados (pnr, wallet_cliente, monto_usdt, tipo_cambio, fecha_pago, estado_emision)
                VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5), 'PENDIENTE')
                RETURNING id;
            `;
            await client.query(insertBoletoText, [pnr, cliente, montoFormateado, tipoCambio, timestamp]);

            // 3. INSERTAR EN auditoria_blockchain
            const rawEventData = JSON.stringify({
                args: { cliente, pnr, monto: monto.toString(), timestamp: timestamp.toString() },
                transactionHash: txHash,
                blockNumber: blockNumber
            });

            const insertAuditoriaText = `
                INSERT INTO auditoria_blockchain (pnr_relacionado, tx_hash, bloque_red, datos_completos_nodo)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(insertAuditoriaText, [pnr, txHash, blockNumber, rawEventData]);

            // 4. CONFIRMAR LA TRANSACCIÓN (COMMIT)
            await client.query('COMMIT');
            console.log(`[EXITO] Transacción ACID completada. PNR ${pnr} y auditoría registrados correctamente.`);
            
            return { success: true, pnr, txHash, blockNumber };

        } catch (error) {
            // 5. REVERSIÓN EN CASO DE FALLO (ROLLBACK)
            await client.query('ROLLBACK');
            
            // Código de error PostgreSQL '23505' equivale a 'unique_violation'
            if (error.code === '23505') {
                console.log(`[IDEMPOTENCIA] El pago para el PNR ${pnr} ya estaba registrado. Ignorando evento duplicado.`);
                return { success: false, reason: 'DUPLICATE' };
            } else {
                console.error(`[ERROR CRÍTICO] Fallo durante la transacción ACID para el PNR ${pnr}:`, error);
                throw error;
            }
        } finally {
            // Liberar el cliente de vuelta al pool
            client.release();
        }
    }
}

module.exports = new PaymentService();
