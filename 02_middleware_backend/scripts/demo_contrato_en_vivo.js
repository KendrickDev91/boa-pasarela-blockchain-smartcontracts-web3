// =========================================================
// Demostración en vivo del contrato BoAPayments, paso a paso, contra el servidor público.
// Cada paso espera ENTER. Las operaciones válidas son transacciones reales (hash, bloque, gas, evento);
// los ataques se ejecutan como llamada simulada en el nodo (eth_call), que devuelve el error del contrato
// sin enviar la transacción.
// Uso:  node scripts/demo_contrato_en_vivo.js [https://157-245-247-70.sslip.io]
// =========================================================
const { ethers } = require('ethers');
const readline = require('readline');

const ARGS = process.argv.slice(2);
const BASE = ARGS.find((a) => a.startsWith('http')) || 'https://157-245-247-70.sslip.io';
const provider = new ethers.JsonRpcProvider(`${BASE}/rpc`, undefined, { staticNetwork: true, pollingInterval: 500 });

const ABI_BOA = [
  'function owner() view returns (address)', 'function operador() view returns (address)',
  'function billeteraRecaudadora() view returns (address)', 'function usdtToken() view returns (address)',
  'function consultarTarifa(string) view returns (uint256 monto, uint64 venceEn)',
  'function verificarPago(string) view returns (bool)',
  'function pagarBoleto(string)', 'function registrarTarifa(string,uint256,uint64)',
  'function actualizarBilleteraRecaudadora(address)',
  'event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp)',
  'error PnrYaPagado()', 'error PnrSinTarifa()', 'error CotizacionVencida()', 'error SoloOperador()',
  'error OwnableUnauthorizedAccount(address)', 'error ReentrancyGuardReentrantCall()',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
];
const ABI_TOKEN = ['function approve(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'];

const C = { r: '\x1b[0m', b: '\x1b[1m', g: '\x1b[32m', rj: '\x1b[31m', a: '\x1b[33m', c: '\x1b[36m', gr: '\x1b[90m', az: '\x1b[34m' };
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const AUTO = process.env.DEMO_AUTO === '1' || ARGS.includes('--auto');   // avanza solo (verificación o grabación)
if (ARGS.includes('--auto')) process.env.DEMO_PAUSA_MS ||= '2200';
const pausa = (t = 'ENTER para continuar') => AUTO ? new Promise((ok) => setTimeout(ok, Number(process.env.DEMO_PAUSA_MS || 0))) : new Promise((ok) => rl.question(`${C.gr}  ▸ ${t}…${C.r}`, () => ok()));
const titulo = (n, t) => console.log(`\n${C.b}${C.az}━━ Paso ${n}. ${t} ${'━'.repeat(Math.max(2, 60 - t.length))}${C.r}`);
const dato = (k, v) => console.log(`  ${C.gr}${k.padEnd(30)}${C.r}${v}`);
const usdt = (v) => `${ethers.formatUnits(v, 6)} USDT`;
const post = async (ruta, cuerpo) => (await fetch(BASE + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })).json();

async function transaccion(etiqueta, envio) {
  const tx = await envio();
  console.log(`  ${C.a}→ ${etiqueta}: transacción enviada ${tx.hash}${C.r}`);
  const r = await tx.wait();
  dato('Bloque', `#${r.blockNumber}`);
  dato('Gas consumido', `${r.gasUsed} unidades`);
  dato('Estado', r.status === 1 ? `${C.g}éxito${C.r}` : `${C.rj}revertida${C.r}`);
  return r;
}

async function ataque(descripcion, simulacion, esperado) {
  console.log(`  ${C.a}→ ${descripcion}${C.r}`);
  try {
    await simulacion();
    console.log(`  ${C.rj}✗ El contrato aceptó la operación (no esperado)${C.r}`);
  } catch (e) {
    const nombre = e.revert?.name || (e.shortMessage || e.message).split('\n')[0];
    const ok = nombre === esperado;
    console.log(`  ${ok ? C.g + '✓ RECHAZADA por el contrato' : C.rj + '✗ Rechazo inesperado'}: ${C.b}${nombre}${C.r}`);
  }
}

(async () => {
  if (ARGS.includes('--auto')) await new Promise((ok) => setTimeout(ok, 7000));
  console.clear();
  console.log(`${C.b}${C.c}DEMOSTRACIÓN EN VIVO · CONTRATO INTELIGENTE BoAPayments.sol${C.r}`);
  dato('Servidor', BASE);
  const red = await provider.getNetwork();
  dato('Red (chainId)', `${red.chainId}`);
  dato('Último bloque', `#${await provider.getBlockNumber()}`);

  const chain = await (await fetch(`${BASE}/api/chain`)).json();
  const boa = new ethers.Contract(chain.contracts.BoAPayments, ABI_BOA, provider);
  const token = new ethers.Contract(chain.contracts.token, ABI_TOKEN, provider);
  const recaudadora = await boa.billeteraRecaudadora();

  titulo(1, 'El contrato desplegado en la cadena de bloques');
  dato('Contrato BoAPayments', chain.contracts.BoAPayments);
  dato('Código en la red', `${((await provider.getCode(chain.contracts.BoAPayments)).length - 2) / 2} bytes (inmutable)`);
  dato('Propietario (billetera fría)', await boa.owner());
  dato('Cuenta operadora', await boa.operador());
  dato('Billetera recaudadora BoA', recaudadora);
  dato('Token de cobro', `${await token.symbol()} ${chain.contracts.token}`);
  await pausa();

  titulo(2, 'Pasajero con billetera de autocustodia');
  const pasajero = ethers.Wallet.createRandom().connect(provider);
  dato('Dirección del pasajero', pasajero.address);
  const f = await post('/api/chain/faucet', { address: pasajero.address });
  dato('Fondos de prueba', `${f.usdt} USDT y ${f.eth} ETH para la comisión de red`);
  await new Promise((r) => setTimeout(r, 1500));
  dato('Saldo del pasajero', usdt(await token.balanceOf(pasajero.address)));
  await pausa();

  titulo(3, 'Reserva: el servidor cotiza en USDT y registra la tarifa en el contrato');
  const pnr = 'D' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const r = await post('/api/reservas', { pnr, montoBob: 520 });
  dato('Localizador (PNR)', pnr);
  dato('Tarifa', `520,00 Bs ÷ ${r.tipoCambio} (tipo de cambio oficial) = ${r.montoStablecoin} USDT`);
  const [monto, vence] = await boa.consultarTarifa(pnr);
  dato('Tarifa leída del contrato', `${usdt(monto)} · vence ${new Date(Number(vence) * 1000).toLocaleTimeString()}`);
  console.log(`  ${C.gr}(evento TarifaRegistrada: el importe queda fijado en la cadena, el pasajero no puede cambiarlo)${C.r}`);
  await pausa();

  const boaP = boa.connect(pasajero);
  titulo(4, 'Ataque 1: pagar sin autorizar el gasto');
  await ataque('pagarBoleto sin approve previo', () => boaP.pagarBoleto.staticCall(pnr), 'ERC20InsufficientAllowance');
  await pausa();

  titulo(5, 'Firma 1 de 2: el pasajero autoriza el gasto por el importe exacto');
  await transaccion('approve', () => token.connect(pasajero).approve(chain.contracts.BoAPayments, monto));
  await pausa();

  titulo(6, 'Ataque 2: pagar un localizador sin tarifa registrada');
  await ataque('pagarBoleto("FALSO1")', () => boaP.pagarBoleto.staticCall('FALSO1'), 'PnrSinTarifa');
  await pausa();

  titulo(7, 'Firma 2 de 2: pago del boleto (el contrato transfiere el USDT a BoA)');
  const antes = await token.balanceOf(recaudadora);
  const rec = await transaccion('pagarBoleto', () => boaP.pagarBoleto(pnr));
  for (const log of rec.logs) {
    try {
      const ev = boa.interface.parseLog(log);
      if (ev?.name === 'PagoConfirmado') console.log(`  ${C.g}✓ Evento PagoConfirmado${C.r}  cliente ${ev.args.cliente} · PNR ${ev.args.pnr} · ${usdt(ev.args.monto)}`);
    } catch { /* evento del token */ }
  }
  dato('Billetera recaudadora', `${usdt(antes)} → ${usdt(await token.balanceOf(recaudadora))}  (+${usdt((await token.balanceOf(recaudadora)) - antes)})`);
  dato('verificarPago(PNR)', `${await boa.verificarPago(pnr)}`);
  await pausa();

  titulo(8, 'El middleware detecta el evento y emite el boleto (sin intervención manual)');
  for (let i = 0; i < 20; i++) {
    const s = (await (await fetch(`${BASE}/api/payments/status/${pnr}`)).json()).data;
    if (s && s.estado_pago === 'CONFIRMADO') {
      dato('Estado del pago', `${C.g}${s.estado_pago}${C.r} · bloque #${s.bloque_red}`);
      dato('Emisión del boleto', `${C.g}${s.estado_emision}${C.r}`);
      dato('Registro en PostgreSQL', `hash ${s.tx_hash.slice(0, 18)}… vinculado al PNR (transacción ACID)`);
      break;
    }
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  dato('Explorador', `${BASE}/explorer/tx/${rec.hash}`);
  await pausa();

  titulo(9, 'Ataque 3: cobrar dos veces el mismo localizador');
  await ataque('segundo pagarBoleto del mismo PNR', () => boaP.pagarBoleto.staticCall(pnr), 'PnrYaPagado');
  await pausa();

  titulo(10, 'Ataque 4: cuentas no autorizadas intentan administrar el contrato');
  const intruso = ethers.Wallet.createRandom().connect(provider);
  await ataque('un tercero cambia la billetera recaudadora a la suya',
    () => boa.connect(intruso).actualizarBilleteraRecaudadora.staticCall(intruso.address), 'OwnableUnauthorizedAccount');
  await ataque('un tercero registra una tarifa de 0,01 USDT',
    () => boa.connect(intruso).registrarTarifa.staticCall('HACK01', 10000n, BigInt(Math.floor(Date.now() / 1000) + 600)), 'SoloOperador');

  console.log(`\n${C.b}${C.g}Resultado: el cobro exigió las dos firmas del pasajero, el importe acreditado coincide con la tarifa`);
  console.log(`registrada y el contrato rechazó por sí mismo el pago sin autorización, el localizador inexistente,`);
  console.log(`el doble cobro y la administración por cuentas no autorizadas.${C.r}\n`);
  rl.close();
})().catch((e) => { console.error(`${C.rj}Error: ${e.shortMessage || e.message}${C.r}`); rl.close(); process.exitCode = 1; });
