const web3Manager = require('../config/web3');
const paymentService = require('./paymentService');

class BlockchainListener {
    constructor() {
        this.contract = null;
        this.provider = null;
        this.lastBlockProcessed = 0;
    }

    /**
     * Inicializa la escucha de eventos mediante polling de bloques (Resiliente a caídas HTTP)
     */
    async startListening(notifyFrontendCallback) {
        this.contract = web3Manager.connect();
        this.provider = web3Manager.getProvider();
        
        try {
            this.lastBlockProcessed = await this.provider.getBlockNumber();
            console.log(`[WEB3] Sincronizando eventos históricos desde el bloque 0 hasta ${this.lastBlockProcessed}...`);
            
            const filter = this.contract.filters.PagoConfirmado();
            const events = await this.contract.queryFilter(filter, 0, this.lastBlockProcessed);
            
            for (const event of events) {
                const [cliente, pnr, monto, timestamp] = event.args;
                await paymentService.processPaymentEvent(
                    cliente, 
                    pnr, 
                    monto.toString(), 
                    Number(timestamp), 
                    event.transactionHash, 
                    event.blockNumber
                );
            }
            console.log(`[WEB3] Sincronización completada exitosamente. Iniciando polling...`);
        } catch (e) {
            console.error('[WEB3] Error en la sincronización inicial. Se iniciará desde el bloque 0.', e.message);
            this.lastBlockProcessed = 0;
        }

        // Configurar polling robusto cada 3 segundos
        setInterval(async () => {
            await this.pollEvents(notifyFrontendCallback);
        }, 3000);
    }

    async pollEvents(notifyFrontendCallback) {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            this.consecutiveFailures = 0; // Resetear en éxito
            
            if (currentBlock > this.lastBlockProcessed) {
                // Consultamos eventos desde el ultimo bloque procesado + 1 hasta el actual
                const fromBlock = this.lastBlockProcessed + 1;
                const toBlock = currentBlock;
                
                const filter = this.contract.filters.PagoConfirmado();
                const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

                for (const event of events) {
                    // Extraer los argumentos del evento. En Ethers v6, event.args contiene la data
                    const [cliente, pnr, monto, timestamp] = event.args;
                    const txHash = event.transactionHash;
                    const blockNumber = event.blockNumber;

                    console.log(`\n[WEB3 EVENT] PagoConfirmado detectado por polling. PNR: ${pnr}`);

                    try {
                        const result = await paymentService.processPaymentEvent(
                            cliente, 
                            pnr, 
                            monto.toString(), // Prevención de crash por BigInt en pg
                            Number(timestamp), 
                            txHash, 
                            blockNumber
                        );
                        
                        // Si se procesó con éxito en PostgreSQL, se emite el Webhook SSE
                        if (result && result.success && notifyFrontendCallback) {
                            notifyFrontendCallback(pnr, txHash, blockNumber);
                        }
                    } catch (error) {
                        console.error('[LISTENER ERROR] Error procesando el evento en DB:', error);
                    }
                }
                this.lastBlockProcessed = currentBlock;
            }
        } catch (e) {
            this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
            console.error(`[WEB3 ERROR] Fallo de conexión con el proveedor RPC (Intento ${this.consecutiveFailures}).`);
            
            if (this.consecutiveFailures >= 3) {
                console.log(`[WEB3 RECONNECT] Reiniciando proveedor de red para restablecer conexión...`);
                this.contract = web3Manager.connect();
                this.provider = web3Manager.getProvider();
                this.consecutiveFailures = 0;
            }
        }
    }
}

module.exports = new BlockchainListener();
