// =========================================================
// Límite de intentos de inicio de sesión por dirección IP (en memoria)
// 5 intentos fallidos en 15 minutos bloquean nuevos intentos hasta que expire la ventana.
// =========================================================
const VENTANA_MS = 15 * 60 * 1000;
const MAX_FALLOS = 5;
const fallos = new Map(); // ip -> { cuenta, desde }

function registroDe(ip) {
    const ahora = Date.now();
    const r = fallos.get(ip);
    if (!r || ahora - r.desde > VENTANA_MS) {
        const nuevo = { cuenta: 0, desde: ahora };
        fallos.set(ip, nuevo);
        return nuevo;
    }
    return r;
}

function limitarLogin(req, res, next) {
    const r = registroDe(req.ip);
    if (r.cuenta >= MAX_FALLOS) {
        const esperaMin = Math.ceil((VENTANA_MS - (Date.now() - r.desde)) / 60000);
        res.setHeader('Retry-After', String(esperaMin * 60));
        return res.status(429).json({ success: false, message: `Demasiados intentos fallidos. Intente nuevamente en ${esperaMin} min.` });
    }
    // Contabiliza el resultado cuando termina la respuesta
    res.on('finish', () => {
        if (res.statusCode === 401) registroDe(req.ip).cuenta += 1;
        else if (res.statusCode === 200) fallos.delete(req.ip);
    });
    next();
}

module.exports = limitarLogin;
