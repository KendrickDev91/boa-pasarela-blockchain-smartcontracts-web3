const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Comparación en tiempo constante para no filtrar información por temporización
function iguales(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

class AuthController {
    async login(req, res) {
        if (!config.admin.password) {
            return res.status(503).json({ success: false, message: 'ADMIN_PASSWORD no está configurado en el servidor' });
        }
        const { username, password } = req.body || {};
        if (iguales(username, config.admin.user) && iguales(password, config.admin.password)) {
            const token = jwt.sign(
                { id: 1, role: 'finance_admin', username: config.admin.user },
                config.jwtSecret,
                { expiresIn: '2h' }
            );
            return res.status(200).json({ success: true, token, message: 'Autenticación exitosa' });
        }
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
}

module.exports = new AuthController();
