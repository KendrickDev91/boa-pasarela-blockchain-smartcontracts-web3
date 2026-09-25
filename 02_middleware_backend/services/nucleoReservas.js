const config = require('../config');

/**
 * Notifica al sistema central de reservas la autorización de emisión del boleto.
 * - Con CORE_WEBHOOK_URL configurado: POST REST autenticado con token de servicio (Bearer).
 * - Sin él: núcleo SIMULADO del prototipo, que devuelve un acuse local.
 * Devuelve el acuse de recepción; lanza error si el núcleo real responde con fallo.
 */
async function notificarEmision({ pnr, txHash, monto }) {
    if (!config.nucleo.webhookUrl) {
        return { simulado: true, pnr, recibidoEn: new Date().toISOString() };
    }
    const res = await fetch(config.nucleo.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.nucleo.token ? { Authorization: `Bearer ${config.nucleo.token}` } : {}),
        },
        body: JSON.stringify({ pnr, txHash, monto, evento: 'PAGO_CONFIRMADO' }),
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Núcleo de reservas respondió HTTP ${res.status}`);
    return res.json().catch(() => ({ pnr }));
}

module.exports = { notificarEmision };
