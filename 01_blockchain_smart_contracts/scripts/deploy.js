const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Variables opcionales (.env):
//   USDT_ADDRESS        -> token ya desplegado (si no se indica, se despliega MockUSDT)
//   TREASURY_ADDRESS    -> billetera recaudadora de BoA: billetera fría (hardware wallet) que recibe los fondos
//   OWNER_ADDRESS       -> billetera fría propietaria del contrato (funciones administrativas); al terminar
//                          el despliegue se le transfiere la propiedad y la cuenta de despliegue deja de tener control
//   OPERATOR_ADDRESS    -> cuenta en línea del servidor intermedio: solo registra tarifas, no puede mover fondos
// Si no se indican, se usa la cuenta de despliegue (válido solo para la red local).
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const red = hre.network.name;
  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log(`Red: ${red} (chainId ${chainId})`);
  console.log(`Cuenta de despliegue: ${deployer.address}`);
  console.log(`Saldo: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} POL`);

  let usdtAddress = process.env.USDT_ADDRESS;
  if (!usdtAddress) {
    const mock = await (await hre.ethers.getContractFactory("MockUSDT")).deploy();
    await mock.waitForDeployment();
    usdtAddress = await mock.getAddress();
    console.log(`MockUSDT (token de prueba ERC-20, 6 decimales): ${usdtAddress}`);
  }

  const tesoreria = process.env.TREASURY_ADDRESS || deployer.address;
  const operador = process.env.OPERATOR_ADDRESS || deployer.address;

  const boa = await (await hre.ethers.getContractFactory("BoAPayments")).deploy(usdtAddress, tesoreria, operador);
  await boa.waitForDeployment();
  const receipt = await boa.deploymentTransaction().wait();

  // Custodia en frío: la propiedad administrativa pasa a la billetera fría de BoA
  const propietario = process.env.OWNER_ADDRESS || deployer.address;
  if (propietario.toLowerCase() !== deployer.address.toLowerCase()) {
    await (await boa.transferOwnership(propietario)).wait();
    console.log(`Propiedad del contrato transferida a la billetera fría: ${propietario}`);
  }

  const salida = {
    red,
    chainId: Number(chainId),
    BoAPayments: await boa.getAddress(),
    token: usdtAddress,
    tesoreria,
    propietario,
    operador,
    bloqueDespliegue: receipt.blockNumber,
    fecha: new Date().toISOString(),
  };

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${red}.json`), JSON.stringify(salida, null, 2));

  console.log("\nDespliegue completado:", salida);
  console.log("\nActualice en 02_middleware_backend/.env:");
  console.log(`CONTRACT_ADDRESS=${salida.BoAPayments}\nTOKEN_ADDRESS=${salida.token}\nCHAIN_ID=${salida.chainId}\nDEPLOY_BLOCK=${salida.bloqueDespliegue}`);
  console.log("Y en 03_frontend_dapp/.env:");
  console.log(`VITE_BOA_PAYMENTS_ADDRESS=${salida.BoAPayments}\nVITE_USDT_ADDRESS=${salida.token}\nVITE_CHAIN_ID=${salida.chainId}`);
}

main().catch((error) => {
  console.error("Fallo durante el despliegue:", error);
  process.exitCode = 1;
});
