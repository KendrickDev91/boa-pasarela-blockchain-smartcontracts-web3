const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'boa_super_secret_key_2026';

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Falta el token de autenticación' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token de autenticación inválido o expirado' });
    }
};
