// Respaldo lógico de la base de datos de la pasarela (todas las tablas, en JSON, con huella SHA-256)
const crypto = require('crypto');
const pool = require('../config/db');
const config = require('../config');

// Tablas del esquema actual y, si existen, las de la versión anterior (histórico de origen)
const TABLAS = ['pasarela_pagos_cripto', 'transacciones_blockchain', 'tipos_cambio', 'estado_listener', 'boletos_pagados', 'auditoria_blockchain'];

async function generar() {
    const { rows: existentes } = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)", [TABLAS]);
    const nombres = TABLAS.filter((t) => existentes.some((e) => e.table_name === t));
    const tablas = {};
    for (const t of nombres) {
        const { rows } = await pool.query(`SELECT * FROM ${t}`);   // nombres tomados de la lista fija, no del usuario
        tablas[t] = rows;
    }
    const contenido = JSON.stringify(tablas);
    return {
        sistema: 'Pasarela de cobro en USDT - Boliviana de Aviación',
        generado_en: new Date().toISOString(),
        red: { chainId: config.chain.chainId, contrato: config.chain.contractAddress, token: config.chain.tokenAddress },
        registros: Object.fromEntries(nombres.map((t) => [t, tablas[t].length])),
        sha256: crypto.createHash('sha256').update(contenido).digest('hex'),
        tablas,
    };
}

module.exports = { generar, TABLAS };
