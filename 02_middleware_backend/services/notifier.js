// =========================================================
// Canal de eventos enviados por el servidor (SSE)
// - Un conjunto de conexiones por PNR (sin EventEmitter global, sin límite de oyentes)
// - Latido cada 25 s para que proxies y navegadores no cierren la conexión
// - Limpieza de la conexión y del temporizador al cerrarse (sin fugas de memoria)
// =========================================================
const suscriptores = new Map(); // pnr -> Set<res>
const LATIDO_MS = 25000;

function escribir(res, datos) {
    res.write(`event: pago\ndata: ${JSON.stringify(datos)}\n\n`);
}

/**
 * Registra la conexión SSE de un PNR. Si el pago ya estaba confirmado al momento de
 * suscribirse, se envía de inmediato (evita perder la notificación por condición de carrera).
 */
function suscribir(req, res, pnr, estadoActual) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write('retry: 5000\n\n');

    if (estadoActual) escribir(res, estadoActual);

    if (!suscriptores.has(pnr)) suscriptores.set(pnr, new Set());
    suscriptores.get(pnr).add(res);

    const latido = setInterval(() => res.write(': ping\n\n'), LATIDO_MS);

    req.on('close', () => {
        clearInterval(latido);
        const conjunto = suscriptores.get(pnr);
        if (conjunto) {
            conjunto.delete(res);
            if (conjunto.size === 0) suscriptores.delete(pnr);
        }
    });
}

function publicar(pnr, datos) {
    const conjunto = suscriptores.get(pnr);
    if (!conjunto) return 0;
    for (const res of conjunto) escribir(res, datos);
    return conjunto.size;
}

module.exports = { suscribir, publicar, _suscriptores: suscriptores };
