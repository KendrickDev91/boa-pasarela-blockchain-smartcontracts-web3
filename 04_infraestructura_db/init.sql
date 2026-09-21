-- Extensión para la generación de UUIDs nativos
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Tabla 1: boletos_pagados
-- Controla la emisión e idempotencia de pagos por PNR
-- =========================================================
CREATE TABLE boletos_pagados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pnr VARCHAR(10) UNIQUE NOT NULL,
    wallet_cliente VARCHAR(42) NOT NULL,
    monto_usdt DECIMAL NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_emision VARCHAR(20) DEFAULT 'PENDIENTE'
);

-- =========================================================
-- Tabla 2: auditoria_blockchain
-- Almacena la trazabilidad criptográfica y trama en JSONB
-- =========================================================
CREATE TABLE auditoria_blockchain (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pnr_relacionado VARCHAR(10) REFERENCES boletos_pagados(pnr),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    bloque_red INTEGER,
    datos_completos_nodo JSONB NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
