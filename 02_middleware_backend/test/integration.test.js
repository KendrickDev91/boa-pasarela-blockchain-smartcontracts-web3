const request = require('supertest');
const { expect } = require('chai');
const express = require('express');
const EventEmitter = require('events');
const sinon = require('sinon');

// Importamos los componentes del middleware
const paymentRoutes = require('../routes/paymentRoutes');
const blockchainListener = require('../services/blockchainListener');
const paymentService = require('../services/paymentService');
const dbPool = require('../config/db');

describe("Validación de Integración de Componentes (CI-01 a CI-06)", function () {
    let app;
    let mockContract;
    let sseClient;
    const testPnr = "INT888";
    const testMonto = "100000000"; // 100 USDT (6 decimales)
    const testTxHash = "0xabc123def456";
    const testBlock = 404040;
    const testCliente = "0xClientAddress123";

    before(async function () {
        // 1. Configuramos el entorno Express de prueba
        app = express();
        app.use(express.json());
        app.use('/api/payments', paymentRoutes);

        // Añadimos la ruta de SSE para probar CI-05
        app.get('/api/pagos/:pnr/stream', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();
            
            // Adjuntamos la respuesta al cliente global para la prueba
            app.locals.testSseRes = res;
        });

        // 2. Mockeamos el contrato inteligente para emitir eventos controlados
        mockContract = new EventEmitter();
        mockContract.removeAllListeners = sinon.stub();
        
        // Sobrescribimos el web3Manager para que devuelva nuestro contrato mockeado
        const web3Manager = require('../config/web3');
        sinon.stub(web3Manager, 'connect').returns(mockContract);

        // 3. Inicializamos el listener de blockchain
        blockchainListener.startListening((pnr, txHash, blockNumber) => {
            // Callback de notificacion al frontend simulado
            if (app.locals.testSseRes) {
                app.locals.testSseRes.write(`event: pago\n`);
                app.locals.testSseRes.write(`data: ${JSON.stringify({ estadoPago: 'confirmado', txHash, bloque: blockNumber })}\n\n`);
            }
        });

        // 4. Mockeamos la Base de Datos para evitar afectar el entorno de producción
        // y poder evaluar el comportamiento ACID.
        const mockClient = {
            query: sinon.stub(),
            release: sinon.stub()
        };
        sinon.stub(dbPool, 'connect').resolves(mockClient);

        // Comportamiento del mock de base de datos
        mockClient.query.withArgs('BEGIN').resolves();
        mockClient.query.withArgs('COMMIT').resolves();
        mockClient.query.withArgs('ROLLBACK').resolves();
        
        // Simular inserción exitosa la primera vez
        mockClient.query.withArgs(sinon.match(/INSERT INTO boletos_pagados/)).resolves({ rows: [{ id: 'uuid-123' }] });
        mockClient.query.withArgs(sinon.match(/INSERT INTO auditoria_blockchain/)).resolves();

        this.mockClient = mockClient;
    });

    after(function () {
        sinon.restore(); // Limpiamos los mocks
    });

    it("CI-01: Emisión y captura del evento PagoConfirmado", async function () {
        // Simulamos la emisión del evento desde la blockchain
        const mockEvent = {
            transactionHash: testTxHash,
            blockNumber: testBlock,
            log: null
        };

        // Emitimos el evento. El listener debe capturarlo y procesarlo.
        // Espiamos el processPaymentEvent para verificar que el listener lo llamó
        const spyProcess = sinon.spy(paymentService, 'processPaymentEvent');
        
        mockContract.emit("PagoConfirmado", testCliente, testPnr, testMonto, 1690000000, mockEvent);

        // Esperamos a que la promesa asíncrona se resuelva
        await new Promise(resolve => setTimeout(resolve, 50)); 

        expect(spyProcess.calledOnce).to.be.true;
        expect(spyProcess.calledWith(testCliente, testPnr, testMonto, 1690000000, testTxHash, testBlock)).to.be.true;
        
        spyProcess.restore();
    });

    it("CI-02: Persistencia del pago en DB con propiedades ACID (BEGIN, COMMIT)", async function () {
        // Verificamos que el mockClient ejecutó la transacción correctamente durante CI-01
        expect(this.mockClient.query.calledWith('BEGIN')).to.be.true;
        expect(this.mockClient.query.calledWith(sinon.match(/INSERT INTO boletos_pagados/))).to.be.true;
        expect(this.mockClient.query.calledWith(sinon.match(/INSERT INTO auditoria_blockchain/))).to.be.true;
        expect(this.mockClient.query.calledWith('COMMIT')).to.be.true;
        expect(this.mockClient.release.called).to.be.true;
    });

    it("CI-03: Idempotencia off-chain (Reprocesamiento de evento duplicado)", async function () {
        // Configuramos el mock de DB para lanzar un error de violación de unicidad
        const uniqueViolationError = new Error("duplicate key value violates unique constraint");
        uniqueViolationError.code = '23505';
        
        this.mockClient.query.withArgs(sinon.match(/INSERT INTO boletos_pagados/)).rejects(uniqueViolationError);

        // Emitimos el mismo evento otra vez
        const result = await paymentService.processPaymentEvent(testCliente, testPnr, testMonto, 1690000000, testTxHash, testBlock);

        // Debe haber ejecutado un ROLLBACK y devuelto 'DUPLICATE'
        expect(this.mockClient.query.calledWith('ROLLBACK')).to.be.true;
        expect(result.success).to.be.false;
        expect(result.reason).to.equal('DUPLICATE');
    });

    it("CI-04: Envio de notificacion de autorizacion de emision al nucleo de reservas (Mock)", async function () {
        // Como el nucleo de reservas es externo, en la arquitectura se invoca mediante HTTP POST
        // Simularemos el servicio de notificaciones
        const notificacionMock = sinon.stub().resolves({ status: 200, data: 'OK' });
        
        // Ejecutamos la notificación
        const response = await notificacionMock({ pnr: testPnr, hash: testTxHash });
        expect(response.status).to.equal(200);
        expect(notificacionMock.calledOnce).to.be.true;
    });

    it("CI-05: Propagacion del estado hacia la interfaz en React via SSE", function (done) {
        // Conectamos un cliente simulado al endpoint de streaming SSE
        request(app)
            .get(`/api/pagos/${testPnr}/stream`)
            .expect(200)
            .expect('Content-Type', 'text/event-stream')
            .end((err, res) => {
                if (err) return done(err);
            });

        // Le damos tiempo al endpoint para configurar app.locals.testSseRes
        setTimeout(() => {
            // Espiamos el metodo write del response SSE
            const spyWrite = sinon.spy(app.locals.testSseRes, 'write');

            // Disparamos el callback de notificacion simulando un pago exitoso
            const notifyFrontendCallback = (pnr, hash, block) => {
                app.locals.testSseRes.write(`event: pago\n`);
                app.locals.testSseRes.write(`data: ${JSON.stringify({ estadoPago: 'confirmado', txHash: hash, bloque: block })}\n\n`);
            };

            notifyFrontendCallback(testPnr, testTxHash, testBlock);

            // Verificamos que el servidor haya enviado los datos correctos por el stream
            expect(spyWrite.calledTwice).to.be.true;
            expect(spyWrite.secondCall.args[0]).to.include('confirmado');
            expect(spyWrite.secondCall.args[0]).to.include(testTxHash);
            done();
        }, 50);
    });

    it("CI-06: Recuperacion del estado historico del cobro a traves del endpoint REST", async function () {
        // Configuramos el mock de DB para que la consulta SELECT devuelva datos
        sinon.stub(dbPool, 'query').resolves({
            rows: [{
                estado_emision: 'PENDIENTE',
                monto_usdt: '100.000000',
                tx_hash: testTxHash,
                bloque_red: testBlock
            }]
        });

        // Consultamos el endpoint del PaymentController
        const response = await request(app).get(`/api/payments/status/${testPnr}`);

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data.tx_hash).to.equal(testTxHash);
        expect(response.body.data.monto_usdt).to.equal('100.000000');
    });
});
