-- =========================================================
-- Migración del histórico de pagos (versión 1 -> esquema actual)
-- Origen : boletos_pagados + auditoria_blockchain (se conservan sin cambios)
-- Destino: pasarela_pagos_cripto + transacciones_blockchain + tipos_cambio
-- Idempotente: puede ejecutarse varias veces sin duplicar registros.
--
-- Criterios:
--  * tipo_cambio = 10.00 corresponde a la tasa fija de la versión anterior del
--    frontend (TASA = 10.00), no a una cotización oficial -> fuente 'TASA_FIJA'.
--  * Los demás valores provienen de la consulta a la API -> fuente 'API'.
--  * monto_bob se reconstruye como monto_usdt * tipo_cambio (la tarifa original
--    en bolivianos no se almacenaba en la versión anterior).
--  * El gas pagado no se registraba en la versión anterior -> NULL.
-- =========================================================
BEGIN;

ALTER TABLE pasarela_pagos_cripto DROP CONSTRAINT IF EXISTS pasarela_pagos_cripto_fuente_tipo_cambio_check;
ALTER TABLE pasarela_pagos_cripto ADD CONSTRAINT pasarela_pagos_cripto_fuente_tipo_cambio_check
    CHECK (fuente_tipo_cambio IN ('API', 'CONTINGENCIA', 'TASA_FIJA'));

INSERT INTO pasarela_pagos_cripto
    (id_reserva, monto_bob, tipo_cambio, fuente_tipo_cambio, monto_stablecoin,
     direccion_contrato, direccion_billetera_boa, direccion_billetera_cliente,
     estado_pago, estado_emision, fecha_solicitud, vence_en, fecha_confirmacion)
SELECT b.pnr,
       round(b.monto_usdt * coalesce(b.tipo_cambio, 10.00), 2),
       coalesce(b.tipo_cambio, 10.00),
       CASE WHEN coalesce(b.tipo_cambio, 10.00) = 10.00 THEN 'TASA_FIJA' ELSE 'API' END,
       b.monto_usdt,
       coalesce(a.datos_completos_nodo->>'address', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'),
       '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',   -- billetera recaudadora de la versión anterior (cuenta de despliegue)
       b.wallet_cliente,
       'CONFIRMADO',
       'EMITIDO',                                        -- el boleto se emitía en la interfaz al confirmar el pago
       b.fecha_pago AT TIME ZONE 'UTC',
       b.fecha_pago AT TIME ZONE 'UTC',
       b.fecha_pago AT TIME ZONE 'UTC'
  FROM boletos_pagados b
  JOIN auditoria_blockchain a ON a.pnr_relacionado = b.pnr
ON CONFLICT (id_reserva) DO NOTHING;

INSERT INTO transacciones_blockchain
    (tx_hash, id_reserva, bloque_numero, origen_address, destino_address,
     monto_transferido, gas_pagado, estado_tx, datos_evento, fecha_registro)
SELECT a.tx_hash, b.pnr, a.bloque_red, b.wallet_cliente,
       coalesce(a.datos_completos_nodo->>'address', '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'),
       b.monto_usdt, NULL, 'SUCCESS', a.datos_completos_nodo, a.fecha_registro AT TIME ZONE 'UTC'
  FROM auditoria_blockchain a
  JOIN boletos_pagados b ON b.pnr = a.pnr_relacionado
  JOIN pasarela_pagos_cripto p ON p.id_reserva = b.pnr
ON CONFLICT DO NOTHING;

-- Histórico diario de cotizaciones reales (se excluye la tasa fija de 10.00)
INSERT INTO tipos_cambio (valor, fuente, consultado_en)
SELECT DISTINCT ON (date(b.fecha_pago), b.tipo_cambio)
       b.tipo_cambio, 'HISTORICO (pagos registrados v1)', b.fecha_pago AT TIME ZONE 'UTC'
  FROM boletos_pagados b
 WHERE b.tipo_cambio IS NOT NULL AND b.tipo_cambio <> 10.00
   AND NOT EXISTS (SELECT 1 FROM tipos_cambio t
                    WHERE t.fuente = 'HISTORICO (pagos registrados v1)'
                      AND t.valor = b.tipo_cambio
                      AND date(t.consultado_en) = date(b.fecha_pago AT TIME ZONE 'UTC'))
 ORDER BY date(b.fecha_pago), b.tipo_cambio, b.fecha_pago;

COMMIT;
