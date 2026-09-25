-- =========================================================
-- Esquema de persistencia de la pasarela de cobro en USDT - BoA
-- Corresponde a los diccionarios de datos del Capítulo III (Tablas 17 y 18)
-- =========================================================

-- ---------------------------------------------------------
-- Tabla: pasarela_pagos_cripto
-- Una fila por solicitud de pago (cotización) de un PNR.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pasarela_pagos_cripto (
    id_reserva                  VARCHAR(10)   PRIMARY KEY,                 -- PNR
    monto_bob                   NUMERIC(12,2) NOT NULL CHECK (monto_bob > 0),
    tipo_cambio                 NUMERIC(10,4) NOT NULL CHECK (tipo_cambio > 0),
    fuente_tipo_cambio          VARCHAR(20)   NOT NULL CHECK (fuente_tipo_cambio IN ('API', 'CONTINGENCIA', 'TASA_FIJA')),
    monto_stablecoin            NUMERIC(18,6) NOT NULL CHECK (monto_stablecoin > 0),
    token_simbolo               VARCHAR(10)   NOT NULL DEFAULT 'USDT',
    direccion_contrato          VARCHAR(42)   NOT NULL,
    direccion_billetera_boa     VARCHAR(42)   NOT NULL,
    direccion_billetera_cliente VARCHAR(42),
    estado_pago                 VARCHAR(15)   NOT NULL DEFAULT 'PENDIENTE'
                                CHECK (estado_pago IN ('PENDIENTE', 'CONFIRMADO', 'EXPIRADO')),
    estado_emision              VARCHAR(15)   NOT NULL DEFAULT 'NO_EMITIDO'
                                CHECK (estado_emision IN ('NO_EMITIDO', 'EMITIDO', 'ERROR')),
    fecha_solicitud             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    vence_en                    TIMESTAMPTZ   NOT NULL,
    fecha_confirmacion          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pagos_estado_vencimiento ON pasarela_pagos_cripto (estado_pago, vence_en);

-- ---------------------------------------------------------
-- Tabla: transacciones_blockchain
-- Una fila por transacción on-chain confirmada (relación 1:1 con el PNR pagado).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacciones_blockchain (
    tx_hash            VARCHAR(66)    PRIMARY KEY CHECK (tx_hash ~ '^0x[0-9a-fA-F]{64}$'),
    id_reserva         VARCHAR(10)    NOT NULL UNIQUE REFERENCES pasarela_pagos_cripto (id_reserva),
    bloque_numero      BIGINT         NOT NULL,
    origen_address     VARCHAR(42)    NOT NULL,
    destino_address    VARCHAR(42)    NOT NULL,
    monto_transferido  NUMERIC(18,6)  NOT NULL,
    gas_pagado         NUMERIC(30,18),                                      -- en POL
    estado_tx          VARCHAR(15)    NOT NULL DEFAULT 'SUCCESS',
    datos_evento       JSONB          NOT NULL,
    fecha_registro     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Tabla: tipos_cambio (contingencia)
-- Histórico de cotizaciones obtenidas con éxito; la última se usa si la API falla.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_cambio (
    id             BIGSERIAL      PRIMARY KEY,
    valor          NUMERIC(10,4)  NOT NULL CHECK (valor > 0),
    fuente         VARCHAR(60)    NOT NULL,
    consultado_en  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Tabla: estado_listener
-- Cursor persistente del último bloque procesado por el servidor intermedio.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS estado_listener (
    id              SMALLINT  PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    ultimo_bloque   BIGINT    NOT NULL,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
