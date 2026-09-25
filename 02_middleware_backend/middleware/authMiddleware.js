const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Falta el token de autenticación' });
    }

    try {
        req.user = jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token de autenticación inválido o expirado' });
    }
};
