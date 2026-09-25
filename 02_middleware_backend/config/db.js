const { Pool } = require('pg');
require('dotenv').config();

// =========================================================
// Pool de conexiones a PostgreSQL
// Las credenciales se leen exclusivamente de variables de entorno (.env)
// =========================================================
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Un error en un cliente inactivo (p. ej., reinicio del servidor de BD) no debe
// derribar el proceso: el pool descarta el cliente y crea uno nuevo en la próxima consulta.
pool.on('error', (err) => {
    console.error('[DB] Error en un cliente inactivo del pool:', err.message);
});

/**
 * Ejecuta `fn` dentro de una transacción ACID con un cliente exclusivo del pool.
 * Garantiza COMMIT/ROLLBACK y la liberación del cliente en todos los casos.
 */
async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await fn(client);
        await client.query('COMMIT');
        return resultado;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

module.exports = pool;
module.exports.withTransaction = withTransaction;
