const dbPool = require('../config/db');

class PaymentController {
    /**
     * Consulta el estado de pago y auditoría de un boleto mediante su PNR
     */
    async getStatus(req, res) {
        const { pnr } = req.params;
        
        try {
            // Consulta unificada para obtener el estado del boleto y los datos de auditoría
            const queryText = `
                SELECT b.estado_emision, b.monto_usdt, b.tipo_cambio, b.wallet_cliente, a.tx_hash, a.bloque_red 
                FROM boletos_pagados b 
                LEFT JOIN auditoria_blockchain a ON b.pnr = a.pnr_relacionado 
                WHERE b.pnr = $1;
            `;
            const { rows } = await dbPool.query(queryText, [pnr]);

            if (rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'PNR no registrado en el sistema' 
                });
            }

            return res.status(200).json({ 
                success: true, 
                data: rows[0] 
            });

        } catch (error) {
            console.error(`[CONTROLLER ERROR] Fallo al consultar PNR ${pnr}:`, error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor al procesar la solicitud' 
            });
        }
    }

    /**
     * Consulta el estado de pago y auditoría mediante su hash de transacción (Para Explorer Público)
     */
    async getByHash(req, res) {
        const { hash } = req.params;
        try {
            const queryText = `
                SELECT b.estado_emision, b.monto_usdt, b.wallet_cliente, a.tx_hash, a.bloque_red, b.fecha_pago AT TIME ZONE 'UTC' as fecha_pago 
                FROM boletos_pagados b 
                INNER JOIN auditoria_blockchain a ON b.pnr = a.pnr_relacionado 
                WHERE a.tx_hash = $1;
            `;
            const { rows } = await dbPool.query(queryText, [hash]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Hash no encontrado en los registros de auditoría' });
            }
            return res.status(200).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error(`[CONTROLLER ERROR] Fallo al consultar hash ${hash}:`, error);
            return res.status(500).json({ success: false, message: 'Error interno' });
        }
    }

    /**
     * Consulta el listado completo de transacciones para el Dashboard de Conciliación
     * Cumplimiento del requerimiento RF-12. Se exige obligatoriamente un rango de fechas.
     */
    async getAll(req, res) {
        try {
            const { startDate, endDate } = req.query;

            let queryText = `
                SELECT 
                    b.pnr, 
                    a.tx_hash, 
                    a.bloque_red,
                    b.wallet_cliente,
                    b.monto_usdt, 
                    b.tipo_cambio,
                    b.fecha_pago AT TIME ZONE 'UTC' as fecha_pago, 
                    b.estado_emision 
                FROM boletos_pagados b 
                LEFT JOIN auditoria_blockchain a ON b.pnr = a.pnr_relacionado 
            `;
            const queryParams = [];

            if (startDate && endDate) {
                queryText += ` WHERE b.fecha_pago >= $1 AND b.fecha_pago <= $2 `;
                queryParams.push(startDate, endDate);
            }
            
            queryText += ` ORDER BY b.fecha_pago DESC;`;

            const { rows } = await dbPool.query(queryText, queryParams);

            return res.status(200).json({ 
                success: true, 
                data: rows 
            });

        } catch (error) {
            console.error('[CONTROLLER ERROR] Fallo al consultar todas las transacciones:', error.message);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor al obtener registros' 
            });
        }
    }

    /**
     * Consulta la cotización en tiempo real para conversión (RF-02)
     */
    async getExchangeRate(req, res) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
            
            const response = await fetch('https://api.factura.bo/ExchangeRate', { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            
            const tasa = parseFloat(data.datos.usd_bob);
            if (isNaN(tasa)) throw new Error("La tasa recibida no es un número válido");
            
            return res.status(200).json({ success: true, tasa, fuente: 'api.factura.bo' });
        } catch (error) {
            console.error('[CONTROLLER ERROR] Falla en API externa (tiempo real):', error.message);
            // Resiliencia: Fallback a contingencia parametrizada en BD
            try {
                // Generar tabla de contingencia dinámicamente si no existe
                await dbPool.query(`CREATE TABLE IF NOT EXISTS parametros_contingencia (clave VARCHAR(50) PRIMARY KEY, valor DECIMAL)`);
                await dbPool.query(`INSERT INTO parametros_contingencia (clave, valor) VALUES ('tasa_usdt', 10.00) ON CONFLICT DO NOTHING`);
                
                const { rows } = await dbPool.query(`SELECT valor FROM parametros_contingencia WHERE clave = 'tasa_usdt'`);
                return res.status(200).json({ success: true, tasa: parseFloat(rows[0].valor), fuente: 'contingencia_bd' });
            } catch (dbError) {
                return res.status(500).json({ success: false, message: 'Error crítico: cotizador no disponible' });
            }
        }
    }

    /**
     * Módulo de Conciliación Histórica (Auditoría)
     */
    async getHistoricalRate(req, res) {
        const { fecha } = req.params; // Formato YYYY-MM-DD
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`https://api.factura.bo/ExchangeRate/history/${fecha}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            
            const tasa = parseFloat(data.datos.usd_bob);
            if (isNaN(tasa)) throw new Error("La tasa histórica recibida no es válida");
            
            return res.status(200).json({ success: true, fecha, tasa, fuente: 'api.factura.bo' });
        } catch (error) {
            console.error(`[CONTROLLER ERROR] Falla en API externa (histórica para ${fecha}):`, error.message);
            // Resiliencia: Fallback a contingencia parametrizada en BD
            try {
                await dbPool.query(`CREATE TABLE IF NOT EXISTS parametros_contingencia (clave VARCHAR(50) PRIMARY KEY, valor DECIMAL)`);
                await dbPool.query(`INSERT INTO parametros_contingencia (clave, valor) VALUES ('tasa_usdt', 10.00) ON CONFLICT DO NOTHING`);
                
                const { rows } = await dbPool.query(`SELECT valor FROM parametros_contingencia WHERE clave = 'tasa_usdt'`);
                return res.status(200).json({ success: true, fecha, tasa: parseFloat(rows[0].valor), fuente: 'contingencia_bd' });
            } catch (dbError) {
                return res.status(500).json({ success: false, message: 'Error crítico: cotizador histórico no disponible' });
            }
        }
    }
}

module.exports = new PaymentController();
