// =========================================================
// Demostración del contrato BoAPayments sobre la red desplegada
// Ejecuta cada regla de negocio con transacciones reales y registra el resultado,
// el gas consumido y el hash de la transacción (o el error personalizado del rechazo).
// Uso: npx hardhat run scripts/demostracion_contrato.js --network localhost
// Salida: deployments/demostracion_<red>.json y tabla en consola.
// =========================================================
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers, network } = hre;
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`)));
  const [operador, , ajeno, pasajero] = await ethers.getSigners();
  const boa = await ethers.getContractAt("BoAPayments", dep.BoAPayments);
  const token = await ethers.getContractAt("MockUSDT", dep.token);
  const tesoreria = await boa.billeteraRecaudadora();

  const unico = () => "D" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const MONTO = 135_060_000n; // 135.06 USDT
  const vence = async (seg) => (await ethers.provider.getBlock("latest")).timestamp + seg;
  const filas = [];

  async function caso(id, descripcion, esperado, fn) {
    try {
      const tx = await fn();
      const r = await tx.wait();
      const eventos = r.logs.map((l) => { try { return boa.interface.parseLog(l).name; } catch { return null; } }).filter(Boolean);
      filas.push({ id, descripcion, esperado, obtenido: eventos.length ? `Aceptada (${eventos.join(", ")})` : "Aceptada",
                   gas: Number(r.gasUsed), tx: r.hash, cumple: esperado.startsWith("Aceptada") });
    } catch (e) {
      const texto = `${e.message || ""} ${e.shortMessage || ""}`;
      const nombre = e.revert?.name || (texto.match(/custom error '(\w+)/) || [])[1] || e.shortMessage || "error";
      filas.push({ id, descripcion, esperado, obtenido: `Rechazada (${nombre})`, gas: null, tx: null,
                   cumple: esperado === `Rechazada (${nombre})` });
    }
  }

  await (await token.connect(pasajero).faucet()).wait();
  // Estado inicial reproducible: sin autorizaciones de gasto previas
  await (await token.connect(pasajero).approve(dep.BoAPayments, 0)).wait();

  const pnr = unico();
  await caso("DC-01", "El operador registra la tarifa del localizador", "Aceptada (TarifaRegistrada)",
    async () => boa.connect(operador).registrarTarifa(pnr, MONTO, await vence(900)));
  await caso("DC-02", "Una cuenta ajena intenta registrar una tarifa", "Rechazada (SoloOperador)",
    async () => boa.connect(ajeno).registrarTarifa(unico(), MONTO, await vence(900)));
  await caso("DC-03", "El pasajero paga sin autorizar el gasto (approve)", "Rechazada (ERC20InsufficientAllowance)",
    async () => boa.connect(pasajero).pagarBoleto(pnr, { gasLimit: 300000 }));

  const saldoAntes = await token.balanceOf(tesoreria);
  await caso("DC-04", "Firma 1/2: el pasajero autoriza el gasto por el importe exacto", "Aceptada",
    async () => token.connect(pasajero).approve(dep.BoAPayments, MONTO));
  await caso("DC-05", "Firma 2/2: el pasajero paga el boleto", "Aceptada (PagoConfirmado)",
    async () => boa.connect(pasajero).pagarBoleto(pnr));
  const acreditado = (await token.balanceOf(tesoreria)) - saldoAntes;

  await (await token.connect(pasajero).approve(dep.BoAPayments, MONTO)).wait();
  await caso("DC-06", "Segundo pago del mismo localizador (doble cobro)", "Rechazada (PnrYaPagado)",
    async () => boa.connect(pasajero).pagarBoleto(pnr, { gasLimit: 300000 }));
  await caso("DC-07", "Pago de un localizador sin tarifa registrada", "Rechazada (PnrSinTarifa)",
    async () => boa.connect(pasajero).pagarBoleto(unico(), { gasLimit: 300000 }));

  const pnrVencido = unico();
  await (await boa.connect(operador).registrarTarifa(pnrVencido, MONTO, await vence(60))).wait();
  if (network.name === "localhost" || network.name === "hardhat") {
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);
  }
  await caso("DC-08", "Pago con la cotización vencida", "Rechazada (CotizacionVencida)",
    async () => boa.connect(pasajero).pagarBoleto(pnrVencido, { gasLimit: 300000 }));
  await caso("DC-09", "Una cuenta ajena intenta rescatar tokens del contrato", "Rechazada (OwnableUnauthorizedAccount)",
    async () => boa.connect(ajeno).rescatarTokens(dep.token, ajeno.address, 1n, { gasLimit: 300000 }));

  const resumen = {
    red: network.name, contrato: dep.BoAPayments, token: dep.token, tesoreria,
    importe: ethers.formatUnits(MONTO, 6), acreditadoEnTesoreria: ethers.formatUnits(acreditado, 6),
    pagado: await boa.verificarPago(pnr), fecha: new Date().toISOString(),
    casos: filas, cumplidos: filas.filter((f) => f.cumple).length, total: filas.length,
  };
  fs.writeFileSync(path.join(__dirname, "..", "deployments", `demostracion_${network.name}.json`), JSON.stringify(resumen, null, 2));

  console.table(filas.map(({ id, descripcion, obtenido, gas, cumple }) => ({ id, descripcion, obtenido, gas, cumple })));
  console.log(`Importe acreditado en la billetera recaudadora: ${resumen.acreditadoEnTesoreria} USDT`);
  console.log(`Casos que cumplen lo esperado: ${resumen.cumplidos}/${resumen.total}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
