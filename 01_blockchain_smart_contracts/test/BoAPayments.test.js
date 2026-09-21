const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BoAPayments - Pruebas de Seguridad y Validaciones (Quinto Incremento)", function () {
    let boaPayments;
    let mockUSDT;
    let maliciousToken;
    let owner;
    let walletRecaudadora;
    let pasajero;
    let atacante;

    const PNR = "HJ3UVJ";
    const MONTO = ethers.parseUnits("100", 6); // 100 USDT

    beforeEach(async function () {
        [owner, walletRecaudadora, pasajero, atacante] = await ethers.getSigners();

        // 1. Desplegar MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        mockUSDT = await MockUSDT.deploy();

        // 2. Desplegar BoAPayments apuntando al MockUSDT
        const BoAPayments = await ethers.getContractFactory("BoAPayments");
        boaPayments = await BoAPayments.deploy(await mockUSDT.getAddress(), walletRecaudadora.address);

        // Fondeamos al pasajero con USDT y aprobamos al contrato
        await mockUSDT.connect(pasajero).faucet();
        await mockUSDT.connect(pasajero).approve(await boaPayments.getAddress(), ethers.MaxUint256);
    });

    it("CU-01: Pago exitoso en USDT - Transfiere el monto exacto, registra PNR y emite el evento PagoConfirmado", async function () {
        const balanceInicialRecaudadora = await mockUSDT.balanceOf(walletRecaudadora.address);

        // Ejecutar pago
        const tx = await boaPayments.connect(pasajero).pagarBoletaWeb3(PNR, MONTO);

        // Verificar balance de la wallet recaudadora
        const balanceFinalRecaudadora = await mockUSDT.balanceOf(walletRecaudadora.address);
        expect(balanceFinalRecaudadora - balanceInicialRecaudadora).to.equal(MONTO);

        // Verificar registro inmutable (idempotencia)
        const pnrPagado = await boaPayments.pnrPagados(PNR);
        expect(pnrPagado).to.be.true;

        // Verificar emisión del evento esperado por el middleware
        const txReceipt = await tx.wait();
        const block = await ethers.provider.getBlock(txReceipt.blockNumber);
        
        await expect(tx)
            .to.emit(boaPayments, "PagoConfirmado")
            .withArgs(pasajero.address, PNR, MONTO, block.timestamp);
    });

    it("CU-02: Rechazo por monto incorrecto - La transacción revierte si el monto enviado es 0", async function () {
        await expect(
            boaPayments.connect(pasajero).pagarBoletaWeb3("INVALID", 0)
        ).to.be.revertedWith("El monto debe ser mayor a cero");
    });

    it("CU-03: Prevencion de reentrada maliciosa - Modificador nonReentrant bloquea llamadas recursivas", async function () {
        // Desplegamos el token malicioso
        const MaliciousToken = await ethers.getContractFactory("MaliciousToken");
        maliciousToken = await MaliciousToken.deploy();

        // Desplegamos una instancia vulnerable de BoAPayments apuntando al token malicioso
        const BoAPaymentsVulnerable = await ethers.getContractFactory("BoAPayments");
        const vulnerablePayments = await BoAPaymentsVulnerable.deploy(await maliciousToken.getAddress(), walletRecaudadora.address);

        // Fondeamos al atacante y aprobamos
        await maliciousToken.transfer(atacante.address, MONTO * 2n);
        await maliciousToken.connect(atacante).approve(await vulnerablePayments.getAddress(), ethers.MaxUint256);

        // Configuramos el ataque
        await maliciousToken.connect(atacante).setupAttack(await vulnerablePayments.getAddress(), "ATACK1");

        // Al intentar pagar, el token intentará reentrar a pagarBoletaWeb3
        // ReentrancyGuard de OpenZeppelin lanza el error personalizado ReentrancyGuardReentrantCall
        await expect(
            vulnerablePayments.connect(atacante).pagarBoletaWeb3("ATACK1", MONTO)
        ).to.be.revertedWithCustomError(vulnerablePayments, "ReentrancyGuardReentrantCall");
    });

    it("CU-04: Validacion de localizador duplicado - Revierte operacion si el PNR ya esta pagado", async function () {
        // Primer pago exitoso
        await boaPayments.connect(pasajero).pagarBoletaWeb3(PNR, MONTO);
        
        // Segundo intento de pago con el mismo PNR exacto
        await expect(
            boaPayments.connect(pasajero).pagarBoletaWeb3(PNR, MONTO)
        ).to.be.revertedWith("El PNR ya ha sido pagado");
    });

    it("CU-05: Restriccion de funciones administrativas - Solo el owner puede actualizar la wallet recaudadora", async function () {
        const nuevaWallet = ethers.Wallet.createRandom().address;

        // Un atacante o usuario normal intenta cambiar la wallet
        await expect(
            boaPayments.connect(atacante).actualizarWalletRecaudadora(nuevaWallet)
        ).to.be.revertedWithCustomError(boaPayments, "OwnableUnauthorizedAccount")
         .withArgs(atacante.address);

        // El Owner legitimo cambia la wallet exitosamente
        await boaPayments.connect(owner).actualizarWalletRecaudadora(nuevaWallet);
        expect(await boaPayments.walletRecaudadoraBoA()).to.equal(nuevaWallet);
    });

    it("CU-06: Validacion de la direccion del token - Descarta pagos con activos no reconocidos", async function () {
        // El atacante crea su propio "Fake USDT"
        const FakeUSDT = await ethers.getContractFactory("MockUSDT");
        const fakeUSDT = await FakeUSDT.deploy();

        // El atacante se fondea y aprueba a BoAPayments usando SU token falso
        await fakeUSDT.connect(atacante).faucet();
        await fakeUSDT.connect(atacante).approve(await boaPayments.getAddress(), ethers.MaxUint256);

        // Si el atacante llama a pagarBoletaWeb3, el contrato internamente ejecuta transferFrom 
        // pero sobre la direccion del USDT legitimo. Como el atacante no ha dado allowance 
        // del USDT legitimo, la operacion fallara, descartando el intento de fraude.
        await expect(
            boaPayments.connect(atacante).pagarBoletaWeb3("FAKE12", MONTO)
        ).to.be.revertedWithCustomError(mockUSDT, "ERC20InsufficientAllowance");
    });
});
