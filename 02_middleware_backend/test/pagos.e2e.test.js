/**
 * Pruebas de integración extremo a extremo (CI-01 a CI-08) con componentes REALES:
 *   nodo Hardhat (JSON-RPC) + contratos desplegados + PostgreSQL + API Express + listener.
 *
 * Requisitos (ver README de pruebas):
 *   1. npx hardhat node                                   (en 01_blockchain_smart_contracts)
 *   2. npx hardhat run scripts/deploy.js --network localhost
 *   3. PostgreSQL con el esquema de 04_infraestructura_db/init.sql
 *   4. .env de pruebas con CONTRACT_ADDRESS, TOKEN_ADDRESS, DB_* y ADMIN_PASSWORD
 * Ejecución:  node --test test/
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { ethers } = require('ethers');

// La API de tipo de cambio externa se reemplaza por un servidor local controlable
let tcDisponible = true;
const tcServer = http.createServer((req, res) => {
    if (!tcDisponible) { res.writeHead(503); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ datos: { usd_bob: 10.99 } }));
});

// Sufijo por ejecución: la cadena local conserva los PNR pagados entre corridas
const SFX = Math.random().toString(36).slice(2, 6).toUpperCase();
const P = (id) => `${id}${SFX}`;

let app, server, base, pool, listener, notifier, provider, pasajero, token, boa;

const TOKEN_ABI = [
    'function faucet()',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
];

async function json(method, ruta, body, headers = {}) {
    const res = await fetch(base + ruta, {
        method, headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
}

async function pagar(cotizacion) {
    await (await token.connect(pasajero).approve(cotizacion.contrato, cotizacion.montoUnidades)).wait();
    const tx = await boa.connect(pasajero).pagarBoleto(cotizacion.pnr);
    return tx.wait();
}

before(async () => {
    await new Promise((r) => tcServer.listen(0, r));
    process.env.EXCHANGE_RATE_URL = `http://127.0.0.1:${tcServer.address().port}/ExchangeRate`;
    process.env.CONFIRMATIONS = '0';

    app = require('../server');
    pool = require('../config/db');
    listener = require('../services/blockchainListener');
    notifier = require('../services/notifier');
    const web3 = require('../config/web3');
    provider = web3.provider;

    await pool.query('TRUNCATE transacciones_blockchain, pasarela_pagos_cripto, tipos_cambio, estado_listener');
    await pool.query('INSERT INTO estado_listener (id, ultimo_bloque) VALUES (1, $1)', [await provider.getBlockNumber()]);

    // Cuenta #1 de Hardhat como pasajero (solo red local)
    pasajero = new ethers.NonceManager(new ethers.Wallet(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider));
    token = new ethers.Contract(process.env.TOKEN_ADDRESS, TOKEN_ABI, provider);
    boa = web3.contrato();
    await (await token.connect(pasajero).faucet()).wait();

    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    server.close();
    tcServer.close();
    await pool.end();
});

test('CI-01: POST /api/reservas convierte la tarifa (953,05 Bs / 10,99) y la registra on-chain', async () => {
    const r = await json('POST', '/api/reservas', { pnr: P('CI01'), montoBob: 953.05 });
    assert.equal(r.status, 201);
    assert.equal(r.body.montoStablecoin, '86.72');
    assert.equal(r.body.montoUnidades, '86720000');
    const [monto] = await boa.consultarTarifa(P('CI01'));
    assert.equal(monto, 86720000n);
    const { rows } = await pool.query("SELECT estado_pago, fuente_tipo_cambio FROM pasarela_pagos_cripto WHERE id_reserva=$1", [P('CI01')]);
    assert.deepEqual(rows[0], { estado_pago: 'PENDIENTE', fuente_tipo_cambio: 'API' });
});

test('CI-02: el listener captura PagoConfirmado y persiste pago y transacción (ACID)', async () => {
    const cot = (await json('POST', '/api/reservas', { pnr: P('CI02'), montoBob: 500 })).body;
    const recibo = await pagar(cot);
    await listener.ciclo();

    const est = await json('GET', '/api/payments/status/' + P('CI02'));
    assert.equal(est.body.data.estado_pago, 'CONFIRMADO');
    assert.equal(est.body.data.estado_emision, 'EMITIDO');      // núcleo simulado
    assert.equal(est.body.data.tx_hash, recibo.hash);
    assert.ok(Number(est.body.data.gas_pagado) > 0);
});

test('CI-03: idempotencia off-chain - reprocesar el mismo evento no duplica registros', async () => {
    const boaC = require('../config/web3').contrato();
    const eventos = await boaC.queryFilter(boaC.filters.PagoConfirmado(), 0, 'latest');
    const ev = eventos.find((e) => e.args[1] === P('CI02'));
    const resultado = await require('../services/paymentService').procesarEvento(ev);
    assert.equal(resultado, 'DUPLICADO');
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM transacciones_blockchain WHERE id_reserva=$1", [P('CI02')]);
    assert.equal(rows[0].n, 1);
});

test('CI-04: un PNR ya pagado no admite nueva cotización (HTTP 409)', async () => {
    const r = await json('POST', '/api/reservas', { pnr: P('CI02'), montoBob: 100 });
    assert.equal(r.status, 409);
});

test('CI-05: SSE entrega la confirmación al suscriptor y libera la conexión al cerrarse', async () => {
    const cot = (await json('POST', '/api/reservas', { pnr: P('CI05'), montoBob: 120 })).body;
    const ctrl = new AbortController();
    const res = await fetch(`${base}/api/pagos/${P('CI05')}/stream`, { signal: ctrl.signal });
    const lector = res.body.getReader();
    const recibido = (async () => {
        let texto = '';
        while (!texto.includes('event: pago')) texto += new TextDecoder().decode((await lector.read()).value);
        return texto;
    })();

    await pagar(cot);
    await listener.ciclo();
    assert.match(await recibido, /"estadoPago":"confirmado"/);

    ctrl.abort();
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(notifier._suscriptores.has(P('CI05')), false);
});

test('CI-06: contingencia de tipo de cambio - si la API falla se usa la última cotización guardada', async () => {
    tcDisponible = false;
    const r = await json('GET', '/api/payments/rate');
    tcDisponible = true;
    assert.equal(r.status, 200);
    assert.equal(r.body.fuente, 'CONTINGENCIA');
    assert.equal(r.body.tasa, 10.99);
});

test('CI-07: el cursor no avanza si la BD falla; el pago se registra en el reintento', async () => {
    const cot = (await json('POST', '/api/reservas', { pnr: P('CI07'), montoBob: 200 })).body;
    await pagar(cot);

    const svc = require('../services/paymentService');
    const original = svc.procesarEvento;
    svc.procesarEvento = async () => { throw new Error('BD no disponible (simulada)'); };
    const cursorAntes = (await pool.query('SELECT ultimo_bloque FROM estado_listener')).rows[0].ultimo_bloque;
    await listener.ciclo();
    const cursorDespues = (await pool.query('SELECT ultimo_bloque FROM estado_listener')).rows[0].ultimo_bloque;
    svc.procesarEvento = original;
    assert.equal(cursorDespues, cursorAntes);

    await listener.ciclo();
    const est = await json('GET', '/api/payments/status/' + P('CI07'));
    assert.equal(est.body.data.estado_pago, 'CONFIRMADO');
});

test('CI-08: RF-11 (conciliación) - /api/payments/all exige JWT y lista solo pagos confirmados', async () => {
    assert.equal((await json('GET', '/api/payments/all')).status, 401);
    const login = await json('POST', '/api/payments/login', { username: 'admin', password: process.env.ADMIN_PASSWORD });
    assert.equal(login.status, 200);
    const r = await json('GET', '/api/payments/all', null, { Authorization: `Bearer ${login.body.token}` });
    assert.equal(r.status, 200);
    assert.ok(r.body.data.length >= 3);
    assert.ok(r.body.data.every((p) => p.tx_hash));
});

test('CI-09: RF-07 - una solicitud no pagada cuyo plazo venció pasa a EXPIRADO', async () => {
    const cot = (await json('POST', '/api/reservas', { pnr: P('CI09'), montoBob: 150 })).body;
    assert.equal(cot.pnr, P('CI09'));
    // Se adelanta el vencimiento en la base de datos más allá del margen de 2 minutos
    await pool.query("UPDATE pasarela_pagos_cripto SET vence_en = now() - interval '5 minutes' WHERE id_reserva = $1", [P('CI09')]);
    await listener.ciclo();
    const est = await json('GET', '/api/payments/status/' + P('CI09'));
    assert.equal(est.body.data.estado_pago, 'EXPIRADO');
    assert.equal(est.body.data.tx_hash, null);
});

test('CI-10: la cuenta operadora se resincroniza si otra transacción desfasó su nonce', async () => {
    // Transacción externa firmada con la misma cuenta operadora (cuenta #0 de Hardhat)
    const externa = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    await json('POST', '/api/reservas', { pnr: P('C10A'), montoBob: 100 }); // inicializa el contador local
    await (await externa.sendTransaction({ to: externa.address, value: 0 })).wait();
    const r = await json('POST', '/api/reservas', { pnr: P('C10B'), montoBob: 100 });
    assert.equal(r.status, 201);
});
