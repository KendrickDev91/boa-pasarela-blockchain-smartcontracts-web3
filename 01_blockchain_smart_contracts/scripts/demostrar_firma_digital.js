const { ethers } = require("hardhat");

async function main() {
    console.log("=============================================================");
    console.log("✈️  DEMOSTRACIÓN TÉCNICA: FIRMAS DIGITALES ECDSA (EIP-2612) ✈️");
    console.log("=============================================================\n");

    // 1. Obtener billeteras de prueba
    const [deployer, cliente, pasarelaBoA] = await ethers.getSigners();

    // 2. Desplegar el contrato BoAFirmaDigital
    console.log("⏳ Desplegando Smart Contract BoAFirmaDigital...");
    const Token = await ethers.getContractFactory("BoAFirmaDigital");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log(`✅ Contrato desplegado en: ${tokenAddress}\n`);

    // Fondear al cliente con algunos tokens para la demo
    await token.transfer(cliente.address, ethers.parseUnits("500", 18));
    console.log(`💰 Balance del Cliente: 500 BOASIG`);

    // ==========================================
    // CREACIÓN DE LA FIRMA DIGITAL OFF-CHAIN
    // ==========================================
    console.log("\n🔐 --- INICIO DEL PROCESO DE FIRMA OFF-CHAIN --- 🔐");
    console.log(`👤 Cliente (Firmante): ${cliente.address}`);
    console.log(`🏢 Pasarela BoA (Spender): ${pasarelaBoA.address}`);

    // Parámetros del Permit
    const value = ethers.parseUnits("65", 18); // Precio del boleto
    const deadline = Math.floor(Date.now() / 1000) + 3600; // Validez de 1 hora
    const nonce = await token.consultarNonceFirma(cliente.address);

    console.log(`\n📄 Generando Payload EIP-712 (Sin gastar Gas)...`);
    console.log(`   - Monto a autorizar: 65 BOASIG`);
    console.log(`   - Nonce actual: ${nonce}`);
    console.log(`   - Deadline: ${deadline}`);

    // Estructura EIP-712
    const domain = {
        name: "BoA Token Firma Digital",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: tokenAddress,
    };

    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ],
    };

    const message = {
        owner: cliente.address,
        spender: pasarelaBoA.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
    };

    // Firmar criptográficamente (Billetera del Cliente)
    const signature = await cliente.signTypedData(domain, types, message);
    console.log(`\n✍️  Firma Criptográfica resultante (Raw):\n   ${signature}`);

    // Descomponer la firma en v, r, s
    const sig = ethers.Signature.from(signature);
    console.log(`\n🧩 Descomposición Vectorial de la Firma (v, r, s):`);
    console.log(`   v: ${sig.v} (Recovery Byte)`);
    console.log(`   r: ${sig.r}`);
    console.log(`   s: ${sig.s}`);

    // ==========================================
    // EJECUCIÓN EN LA BLOCKCHAIN
    // ==========================================
    console.log("\n🚀 --- ENVÍO A LA BLOCKCHAIN (ON-CHAIN) --- 🚀");
    console.log("El cliente envía los vectores v,r,s al Backend, y la pasarela ejecuta el contrato.");

    // La pasarela llama al contrato usando la firma del cliente
    const tx = await token.connect(pasarelaBoA).autorizarConFirmaDigital(
        cliente.address,
        pasarelaBoA.address,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s
    );

    console.log(`⏳ Esperando confirmación del bloque...`);
    const receipt = await tx.wait();

    console.log(`✅ ¡Firma validada exitosamente por el Smart Contract!`);
    console.log(`🔗 Hash de Transacción: ${receipt.hash}`);

    // Comprobar la autorización (Allowance)
    const allowance = await token.allowance(cliente.address, pasarelaBoA.address);
    console.log(`\n💵 Allowance (Crédito) otorgado a la Pasarela BoA: ${ethers.formatUnits(allowance, 18)} BOASIG`);
    
    // Ahora el nonce debió subir a 1
    const nuevoNonce = await token.consultarNonceFirma(cliente.address);
    console.log(`🔄 Nuevo Nonce del cliente (Previene Replay Attacks): ${nuevoNonce}`);
    console.log("\n=============================================================");
    console.log("🏆 DEMOSTRACIÓN FINALIZADA CON ÉXITO");
    console.log("=============================================================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
