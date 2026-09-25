/**
 * Lote de validación de indicadores (KPI) del quinto incremento.
 * Ejecuta N reservas y pagos completos contra el sistema en ejecución, como lo harían la
 * interfaz y la billetera del pasajero, y mide tiempos, gas e integridad del registro.
 *
 * Uso (con nodo, backend y base de datos en ejecución):
 *   node test/lote_validacion_kpi.js 30
 * Resultado: test/resultados_lote_kpi.json
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const API = process.env.API_URL || 'http://localhost:3000/api';
const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';
const N = Number(process.argv[2] || 30);
// Cuenta #1 de Hardhat (pasajero de pruebas, solo red local)
const CLAVE_PASAJERO = process.env.PASAJERO_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const ABI_TOKEN = ['function faucet()', 'function approve(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)'];
const ABI_BOA = ['function pagarBoleto(string)', 'event TarifaRegistrada(string pnr, uint256 monto, uint64 venceEn)'];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const prom = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };

async function esperarSSE(pnr, limiteMs = 60000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), limiteMs);
    const res = await fetch(`${API}/pagos/${pnr}/stream`, { signal: ctrl.signal });
    const lector = res.body.getReader();
    let texto = '';
    try {
        while (!texto.includes('event: pago')) texto += new TextDecoder().decode((await lector.read()).value);
        return Date.now();
    } finally { clearTimeout(t); ctrl.abort(); }
}

async function esperarEmision(pnr, limiteMs = 60000) {
    const inicio = Date.now();
    while (Date.now() - inicio < limiteMs) {
        const d = (await (await fetch(`${API}/payments/status/${pnr}`)).json()).data;
        if (d && d.estado_emision === 'EMITIDO') return { t: Date.now(), d };
        await esperar(250);
    }
    throw new Error(`Emisión no confirmada para ${pnr}`);
}

(async () => {
    const provider = new ethers.JsonRpcProvider(RPC);
    const pasajero = new ethers.NonceManager(new ethers.Wallet(CLAVE_PASAJERO, provider));
    const chain = await (await fetch(`${API}/chain`)).json();
    const token = new ethers.Contract(chain.contracts.token, ABI_TOKEN, pasajero);
    const boa = new ethers.Contract(chain.contracts.BoAPayments, ABI_BOA, pasajero);
    await (await token.faucet()).wait();
    await (await token.faucet()).wait();

    const filas = [];
    for (let i = 1; i <= N; i++) {
        const montoBob = Math.round((600 + Math.random() * 5400) * 100) / 100; // tarifas de 600 a 6 000 Bs
        const t0 = Date.now();
        const r = await (await fetch(`${API}/reservas`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ montoBob }),
        })).json();
        const tCotizacion = Date.now() - t0;
        if (!r.success) throw new Error(`Reserva ${i} falló: ${r.message}`);

        // Recarga del token de prueba cuando el saldo no alcanza para la tarifa
        while ((await token.balanceOf(await pasajero.getAddress())) < BigInt(r.montoUnidades)) {
            await (await token.faucet()).wait();
        }

        const sse = esperarSSE(r.pnr);
        const recApprove = await (await token.approve(r.contrato, r.montoUnidades)).wait();
        const tFirma = Date.now();
        const recPago = await (await boa.pagarBoleto(r.pnr)).wait();
        const tBloque = Date.now();
        const tSSE = await sse;
        const { t: tEmision, d } = await esperarEmision(r.pnr);

        const [logTarifa] = await boa.queryFilter(boa.filters.TarifaRegistrada(), 0, 'latest')
            .then((ls) => ls.filter((l) => l.args[0] === r.pnr).slice(-1));
        const recTarifa = logTarifa ? await logTarifa.getTransactionReceipt() : null;

        filas.push({
            n: i, pnr: r.pnr, montoBob, tipoCambio: r.tipoCambio, fuenteTipoCambio: r.fuenteTipoCambio,
            montoUsdt: r.montoStablecoin, txHash: recPago.hash, bloque: recPago.blockNumber,
            ms_cotizacion: tCotizacion,
            ms_firma_a_bloque: tBloque - tFirma,
            ms_firma_a_evento_sse: tSSE - tFirma,
            ms_confirmacion_a_emision: tEmision - tBloque,
            gas_registrarTarifa: recTarifa ? Number(recTarifa.gasUsed) : null,
            gas_approve: Number(recApprove.gasUsed),
            gas_pagarBoleto: Number(recPago.gasUsed),
            registro_bd_coincide: d.tx_hash === recPago.hash && Number(d.monto_usdt) === Number(r.montoStablecoin),
        });
        process.stdout.write(`\r${i}/${N} pagos completados`);
    }

    // Intentos de doble pago sobre localizadores ya liquidados (deben revertir)
    let doblesRechazados = 0;
    for (const f of filas.slice(0, 5)) {
        try { await boa.pagarBoleto(f.pnr); } catch { doblesRechazados++; }
    }

    const campo = (k) => filas.map((f) => f[k]).filter((v) => v != null);
    const resumen = {
        fecha: new Date().toISOString(),
        red: chain.red,
        pagos: N,
        exitosos: filas.length,
        tasaExito: `${((filas.length / N) * 100).toFixed(1)} %`,
        registrosCoincidentes: filas.filter((f) => f.registro_bd_coincide).length,
        doblesPagosRechazados: `${doblesRechazados} de 5`,
        cotizacion_ms: { promedio: Math.round(prom(campo('ms_cotizacion'))), p95: pct(campo('ms_cotizacion'), 95) },
        firma_a_bloque_ms: { promedio: Math.round(prom(campo('ms_firma_a_bloque'))), p95: pct(campo('ms_firma_a_bloque'), 95) },
        firma_a_evento_sse_ms: { promedio: Math.round(prom(campo('ms_firma_a_evento_sse'))), p95: pct(campo('ms_firma_a_evento_sse'), 95) },
        confirmacion_a_emision_ms: { promedio: Math.round(prom(campo('ms_confirmacion_a_emision'))), p95: pct(campo('ms_confirmacion_a_emision'), 95) },
        gas: {
            registrarTarifa: Math.round(prom(campo('gas_registrarTarifa'))),
            approve: Math.round(prom(campo('gas_approve'))),
            pagarBoleto: Math.round(prom(campo('gas_pagarBoleto'))),
        },
    };
    const salida = path.join(__dirname, 'resultados_lote_kpi.json');
    fs.writeFileSync(salida, JSON.stringify({ resumen, pagos: filas }, null, 2));
    console.log('\n' + JSON.stringify(resumen, null, 2));
})().catch((e) => { console.error('\nFALLÓ:', e.message); process.exit(1); });
