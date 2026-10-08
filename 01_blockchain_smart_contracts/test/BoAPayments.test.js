const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BoAPayments - Pruebas unitarias (Tabla 22)", function () {
    let boaPayments, mockUSDT;
    let owner, recaudadora, operador, pasajero, atacante;

    const PNR = "HJ3UVJ";
    const MONTO = ethers.parseUnits("86.72", 6); // 953.05 Bs / 10.99
    const QUINCE_MIN = 15 * 60;

    async function vence(seg = QUINCE_MIN) {
        return BigInt((await time.latest()) + seg);
    }

    beforeEach(async function () {
        [owner, recaudadora, operador, pasajero, atacante] = await ethers.getSigners();

        mockUSDT = await (await ethers.getContractFactory("MockUSDT")).deploy();
        boaPayments = await (await ethers.getContractFactory("BoAPayments"))
            .deploy(await mockUSDT.getAddress(), recaudadora.address, operador.address);

        await mockUSDT.connect(pasajero).faucet();
        await mockUSDT.connect(atacante).faucet();
    });

    async function registrar(pnr = PNR, monto = MONTO) {
        await boaPayments.connect(operador).registrarTarifa(pnr, monto, await vence());
    }

    it("CU-01: Pago exitoso - transfiere la tarifa registrada, marca el PNR y emite PagoConfirmado", async function () {
        await registrar();
        await mockUSDT.connect(pasajero).approve(await boaPayments.getAddress(), MONTO);

        const antes = await mockUSDT.balanceOf(recaudadora.address);
        const tx = await boaPayments.connect(pasajero).pagarBoleto(PNR);
        const bloque = await ethers.provider.getBlock((await tx.wait()).blockNumber);

        expect(await mockUSDT.balanceOf(recaudadora.address) - antes).to.equal(MONTO);
        expect(await boaPayments.verificarPago(PNR)).to.equal(true);
        await expect(tx).to.emit(boaPayments, "PagoConfirmado")
            .withArgs(pasajero.address, PNR, MONTO, bloque.timestamp);
    });

    it("CU-02: Rechazo por monto insuficiente - si la autorización es menor a la tarifa, revierte y el PNR sigue pendiente", async function () {
        await registrar();
        await mockUSDT.connect(pasajero).approve(await boaPayments.getAddress(), MONTO - 1n);

        await expect(boaPayments.connect(pasajero).pagarBoleto(PNR))
            .to.be.revertedWithCustomError(mockUSDT, "ERC20InsufficientAllowance");
        expect(await boaPayments.verificarPago(PNR)).to.equal(false);
    });

    it("CU-03: Prevención de reentrada - nonReentrant bloquea la llamada recursiva desde el token", async function () {
        const mal = await (await ethers.getContractFactory("MaliciousToken")).deploy();
        const vulnerable = await (await ethers.getContractFactory("BoAPayments"))
            .deploy(await mal.getAddress(), recaudadora.address, operador.address);

        await vulnerable.connect(operador).registrarTarifa("ATACK1", MONTO, await vence());
        await mal.transfer(atacante.address, MONTO * 2n);
        await mal.connect(atacante).approve(await vulnerable.getAddress(), ethers.MaxUint256);
        await mal.setupAttack(await vulnerable.getAddress(), "ATACK1");

        await expect(vulnerable.connect(atacante).pagarBoleto("ATACK1"))
            .to.be.revertedWithCustomError(vulnerable, "ReentrancyGuardReentrantCall");
        expect(await vulnerable.verificarPago("ATACK1")).to.equal(false);
    });

    it("CU-04: Localizador duplicado - un segundo pago del mismo PNR revierte con PnrYaPagado", async function () {
        await registrar();
        await mockUSDT.connect(pasajero).approve(await boaPayments.getAddress(), MONTO * 2n);
        await boaPayments.connect(pasajero).pagarBoleto(PNR);

        await expect(boaPayments.connect(pasajero).pagarBoleto(PNR))
            .to.be.revertedWithCustomError(boaPayments, "PnrYaPagado");
    });

    it("CU-05: Funciones administrativas - solo el propietario actualiza la billetera, el operador y rescata tokens", async function () {
        const nueva = ethers.Wallet.createRandom().address;
        await expect(boaPayments.connect(atacante).actualizarBilleteraRecaudadora(nueva))
            .to.be.revertedWithCustomError(boaPayments, "OwnableUnauthorizedAccount").withArgs(atacante.address);
        await expect(boaPayments.connect(atacante).actualizarOperador(nueva))
            .to.be.revertedWithCustomError(boaPayments, "OwnableUnauthorizedAccount");
        await expect(boaPayments.connect(atacante).rescatarTokens(await mockUSDT.getAddress(), atacante.address, 1))
            .to.be.revertedWithCustomError(boaPayments, "OwnableUnauthorizedAccount");

        await boaPayments.connect(owner).actualizarBilleteraRecaudadora(nueva);
        expect(await boaPayments.billeteraRecaudadora()).to.equal(nueva);
    });

    it("CU-06: Token no reconocido - pagar con un token falso no liquida el PNR", async function () {
        await registrar("FAKE12");
        const fake = await (await ethers.getContractFactory("MockUSDT")).deploy();
        await fake.connect(atacante).faucet();
        await fake.connect(atacante).approve(await boaPayments.getAddress(), ethers.MaxUint256);

        // El contrato solo opera con el token fijado en el despliegue (immutable)
        await expect(boaPayments.connect(atacante).pagarBoleto("FAKE12"))
            .to.be.revertedWithCustomError(mockUSDT, "ERC20InsufficientAllowance");
        expect(await boaPayments.verificarPago("FAKE12")).to.equal(false);
    });

    // ---------- Casos de borde adicionales ----------

    it("CU-07: PNR sin tarifa registrada - no se puede pagar un localizador inexistente", async function () {
        await mockUSDT.connect(atacante).approve(await boaPayments.getAddress(), ethers.MaxUint256);
        await expect(boaPayments.connect(atacante).pagarBoleto("NOEXIS"))
            .to.be.revertedWithCustomError(boaPayments, "PnrSinTarifa");
    });

    it("CU-08: Cotización vencida - el pago revierte fuera de la ventana de validez", async function () {
        await registrar();
        await mockUSDT.connect(pasajero).approve(await boaPayments.getAddress(), MONTO);
        await time.increase(QUINCE_MIN + 1);
        await expect(boaPayments.connect(pasajero).pagarBoleto(PNR))
            .to.be.revertedWithCustomError(boaPayments, "CotizacionVencida");
    });

    it("CU-09: Solo el operador registra tarifas", async function () {
        await expect(boaPayments.connect(atacante).registrarTarifa(PNR, 1, await vence()))
            .to.be.revertedWithCustomError(boaPayments, "SoloOperador");
    });

    it("CU-10: No se puede re-cotizar un PNR ya pagado", async function () {
        await registrar();
        await mockUSDT.connect(pasajero).approve(await boaPayments.getAddress(), MONTO);
        await boaPayments.connect(pasajero).pagarBoleto(PNR);
        await expect(boaPayments.connect(operador).registrarTarifa(PNR, 1, await vence()))
            .to.be.revertedWithCustomError(boaPayments, "PnrYaPagado");
    });

    it("CU-11: Validación de entradas - PNR vacío o de más de 10 caracteres y monto cero", async function () {
        await expect(boaPayments.connect(operador).registrarTarifa("", MONTO, await vence()))
            .to.be.revertedWithCustomError(boaPayments, "PnrInvalido");
        await expect(boaPayments.connect(operador).registrarTarifa("ABCDEFGHIJK", MONTO, await vence()))
            .to.be.revertedWithCustomError(boaPayments, "PnrInvalido");
        await expect(boaPayments.connect(operador).registrarTarifa(PNR, 0, await vence()))
            .to.be.revertedWithCustomError(boaPayments, "MontoInvalido");
    });

    it("CU-13: Consultas y rotación del operador - consultarTarifa, verificarPago y actualizarOperador", async function () {
        await registrar();
        const [monto, venceEn] = await boaPayments.consultarTarifa(PNR);
        expect(monto).to.equal(MONTO);
        expect(venceEn).to.be.greaterThan(BigInt(await time.latest()));
        expect(await boaPayments.verificarPago(PNR)).to.equal(false);

        await expect(boaPayments.connect(owner).actualizarOperador(atacante.address))
            .to.emit(boaPayments, "OperadorActualizado").withArgs(operador.address, atacante.address);
        await expect(boaPayments.connect(operador).registrarTarifa("OTRO01", MONTO, await vence()))
            .to.be.revertedWithCustomError(boaPayments, "SoloOperador");
        await expect(boaPayments.connect(owner).actualizarOperador(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(boaPayments, "DireccionInvalida");
        await expect(boaPayments.connect(owner).rescatarTokens(await mockUSDT.getAddress(), ethers.ZeroAddress, 1))
            .to.be.revertedWithCustomError(boaPayments, "DireccionInvalida");
    });

    it("CU-12: Rescate de tokens enviados por error directamente al contrato", async function () {
        const enviado = ethers.parseUnits("10", 6);
        await mockUSDT.connect(pasajero).transfer(await boaPayments.getAddress(), enviado);
        await boaPayments.connect(owner).rescatarTokens(await mockUSDT.getAddress(), pasajero.address, enviado);
        expect(await mockUSDT.balanceOf(await boaPayments.getAddress())).to.equal(0);
    });
});
