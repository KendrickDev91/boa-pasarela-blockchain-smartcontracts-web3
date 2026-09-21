const { Pool } = require('pg');
require('dotenv').config();

// =========================================================
// Configuración del Pool de Conexiones a PostgreSQL
// Utiliza variables de entorno para evitar hardcodear credenciales
// =========================================================
const pool = new Pool({
    user: process.env.DB_USER || 'keni_admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bova_payments_db',
    password: process.env.DB_PASSWORD || 'admin_password_boa',
    port: process.env.DB_PORT || 5432,
});

pool.on('connect', (client) => {
    console.log('Conexión establecida con la base de datos PostgreSQL de BoA');
    // Auto-migrate to add tipo_cambio if not exists
    client.query(`
        ALTER TABLE boletos_pagados 
        ADD COLUMN IF NOT EXISTS tipo_cambio DECIMAL(10,4) DEFAULT 10.00;
    `).catch(err => console.error('Error auto-migrating DB:', err.message));
});

pool.on('error', (err) => {
    console.error('Error inesperado en el cliente de PostgreSQL:', err);
    process.exit(-1);
});

module.exports = pool;
