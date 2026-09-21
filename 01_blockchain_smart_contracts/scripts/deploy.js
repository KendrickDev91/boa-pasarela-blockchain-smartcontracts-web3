const hre = require("hardhat");

async function main() {
  console.log("=================================================");
  console.log("Iniciando el despliegue del Ecosistema BoA Web3");
  console.log("=================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nCuenta de despliegue (Deployer): ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance inicial de la cuenta: ${hre.ethers.formatEther(balance)} MATIC (POL)`);

  // 1. DESPLEGAR EL TOKEN SIMULADO (MockUSDT)
  console.log("\n1. Desplegando MockUSDT (Token de pruebas)...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  console.log(`=> MockUSDT desplegado exitosamente en: ${usdtAddress}`);

  // 2. DESPLEGAR LA PASARELA DE PAGOS (BoAPayments)
  console.log("\n2. Desplegando Pasarela BoAPayments...");
  const walletRecaudadoraBoA = deployer.address;
  const BoAPayments = await hre.ethers.getContractFactory("BoAPayments");
  
  // Le inyectamos la dirección real del MockUSDT recién creado
  const boaPayments = await BoAPayments.deploy(usdtAddress, walletRecaudadoraBoA);
  await boaPayments.waitForDeployment();
  const contractAddress = await boaPayments.getAddress();
  console.log(`=> BoAPayments desplegado exitosamente en: ${contractAddress}`);

  console.log("\n=================================================");
  console.log("✅ DESPLIEGUE EXITOSO COMPLETADO");
  console.log("=================================================");
  console.log("⚠️ INSTRUCCIONES POST-DESPLIEGUE:");
  console.log(`Copia y actualiza estas direcciones en tu archivo frontend/src/constants/contracts.js:\n`);
  console.log(`export const BOA_PAYMENTS_ADDRESS = "${contractAddress}";`);
  console.log(`export const USDT_TOKEN_ADDRESS = "${usdtAddress}";\n`);
  
  console.log(`Y en tu archivo backend/.env actualiza:\n`);
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log("=================================================\n");
}

main().catch((error) => {
  console.error("\n[ERROR CRÍTICO] Ocurrió un fallo durante el despliegue:", error);
  process.exitCode = 1;
});
