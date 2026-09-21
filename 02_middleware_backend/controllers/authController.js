const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'boa_super_secret_key_2026';

class AuthController {
    async login(req, res) {
        const { username, password } = req.body;

        // Credenciales estáticas seguras para demostración al tribunal (departamento financiero)
        if (username === 'admin' && password === 'admin_boa_2026') {
            const token = jwt.sign(
                { id: 1, role: 'finance_admin', username: 'admin' },
                JWT_SECRET,
                { expiresIn: '2h' }
            );

            return res.status(200).json({
                success: true,
                token,
                message: 'Autenticación exitosa'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Credenciales inválidas'
        });
    }
}

module.exports = new AuthController();
