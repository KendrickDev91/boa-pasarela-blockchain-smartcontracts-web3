# Guía de arranque y demostración – Pasarela de pagos BoA (USDT)

Esta guía sirve para preparar la demostración después de apagar y volver a encender la laptop, sin ayuda.

---

## 1. Qué corre dónde

| Componente | Dónde está | ¿Hay que encenderlo? |
|---|---|---|
| Pasarela pública (interfaz, middleware, base de datos, cadena de bloques, Cacti) | Servidor DigitalOcean `157.245.247.70` | **No.** Está siempre encendido mientras el Droplet esté activo |
| Navegador con MetaMask, PowerPoint, consolas de la demo, JMeter | Tu laptop | Solo abrir los programas |
| Sistema local (Docker + Hardhat) | Tu laptop | Solo si quieres el plan de respaldo sin internet (sección 8) |

Direcciones importantes:

- Pasarela: https://157-245-247-70.sslip.io
- Panel de Finanzas: https://157-245-247-70.sslip.io/admin
- Cacti: https://157-245-247-70.sslip.io/cacti
- RPC de la red de pruebas (para MetaMask): https://157-245-247-70.sslip.io/rpc · chainId **31337**

---

## 2. Revisión previa (5 minutos, el mismo día)

1. Conéctate al wifi o al punto de acceso de tu celular.
2. Abre https://157-245-247-70.sslip.io. Si carga la página de BoA, el servidor está bien.
3. Comprueba la API en una terminal:

   ```bash
   curl https://157-245-247-70.sslip.io/api/health
   ```

   Debe responder `{"success":true,"estado":"operativo"}`.
4. Si no responde, revisa los procesos en el servidor (sección 9).

---

## 3. MetaMask (una sola vez; queda configurado)

1. Si tienes la red **Hardhat Local** (`127.0.0.1:8545`), elimínala: MetaMask → Configuración → Redes → Hardhat Local → Eliminar.
2. Usa una cuenta propia de pasajero (por ejemplo "Pasajero BoA"). **No pagues con `0xf39Fd…92266`**: es la cuenta operadora del servidor.
3. La primera vez que pulses **Pagar con la billetera oficial**, MetaMask pedirá agregar la red **BoA Red de Pruebas**: acepta.
4. Si sale "saldo insuficiente", pulsa **Obtener USDT y ETH de prueba** y vuelve a pagar.
5. Si alguna vez la segunda firma no aparece: Configuración → Avanzado → **Borrar datos de actividad y nonce**, y repite el pago.

Flujo de la demo de compra: buscar vuelo → pasajero → **Pago con criptoactivos** → USDT → firma 1/2 (autorización) → firma 2/2 (pago) → **Tu boleto fue emitido**.

---

## 4. Consolas en pantalla dividida (nodo + middleware + contrato)

Desde la carpeta del proyecto (`C:\Users\KENDRICK\proyecto_pasarela_de_pagos_boa_smartcontracts_blockchain`):

```bash
powershell -ExecutionPolicy Bypass -File 05_despliegue\demo\consolas_demo.ps1
```

Se abre Windows Terminal con tres paneles:

- **Nodo blockchain:** cada transacción minada (función del contrato, hash, gas, bloque).
- **Middleware:** reservas, `[PAGO] … confirmado`, emisión del boleto.
- **Demostración del contrato:** avanza un paso cada vez que presionas **Enter** (10 pasos: dos firmas reales y cuatro ataques rechazados).

Consejo: deja estas consolas abiertas al hacer la compra con MetaMask; verás aparecer las transacciones y el `[PAGO]` en vivo.

Solo la demostración del contrato, sin los paneles:

```bash
cd 02_middleware_backend
node scripts\demo_contrato_en_vivo.js
```

---

## 5. Prueba de carga con JMeter (opcional en vivo)

En la presentación ya están el video y las gráficas. Para repetir una corrida corta en vivo (25 usuarios, 1 minuto):

```bash
cd 05_despliegue\jmeter
jmeter -n -t modulo_pagos.jmx -Jhost=157-245-247-70.sslip.io -Jusuarios=25 -Jrampa=10 -Jduracion=60 -l prueba_vivo.jtl -e -o reporte_vivo
```

Al terminar, abre `05_despliegue\jmeter\reporte_vivo\index.html` (estadísticas y gráficas). Antes de repetirla, borra las carpetas `reporte_vivo` y `prueba_vivo.jtl` o cambia sus nombres.

El reporte completo de la corrida de 50 usuarios está en `05_despliegue\jmeter\resultados_defensa\reporte\index.html`.

---

## 6. Cacti

1. Abre https://157-245-247-70.sslip.io/cacti e inicia sesión **antes** de entrar al tribunal (ver sección 10).
2. Ve a **Graphs** → árbol del dispositivo "Servidor pasarela BoA" y elige el rango de tiempo de la prueba.
3. Cacti promedia cada minuto: las curvas de una prueba aparecen 1 o 2 minutos después.

---

## 7. Panel de Finanzas (reportes y respaldo)

1. Abre https://157-245-247-70.sslip.io/admin.
2. Usuario y contraseña: los valores `ADMIN_USER` y `ADMIN_PASSWORD` del archivo `02_middleware_backend\.env`.
3. **Transacciones:** filtros por fecha, estado y PNR; sumatorias arriba.
4. **Reporte firmado:** PDF con logo, firma, sello y huella SHA-256.
5. **Backup:** descarga un respaldo JSON de toda la base de datos.

---

## 8. Plan de respaldo sin internet (sistema local)

1. Abre **Docker Desktop** y espera a que diga "Engine running".
2. Ejecuta `iniciar_sistema_boa.bat` (doble clic). Abre el nodo, despliega los contratos, el middleware y la interfaz.
3. Abre http://localhost:5173.
4. En MetaMask, para esta modalidad sí se usa una red con RPC `http://127.0.0.1:8545` y chainId 31337. **Vuelve a la red del servidor** cuando regreses a la pasarela pública.

Pruebas automáticas (todas en local):

```bash
cd 01_blockchain_smart_contracts && npx hardhat test
cd 01_blockchain_smart_contracts && npx hardhat coverage
cd 02_middleware_backend && npm run test:integracion
cd 03_frontend_dapp && npx vitest run
```

Las pruebas de integración necesitan el nodo local encendido y usan la base `bova_payments_test`; nunca tocan tu base de datos con el histórico.

---

## 9. Si el servidor no responde

Conéctate por SSH (la llave está en `C:\Users\KENDRICK\.ssh\boa_do_ed25519`):

```bash
ssh -i %USERPROFILE%\.ssh\boa_do_ed25519 root@157.245.247.70
supervisorctl status
```

- Si `boa-api` no está en `RUNNING`: `supervisorctl restart boa-api` (es seguro).
- Si `boa-cadena` no está en `RUNNING`: `supervisorctl start boa-cadena`. La cadena de pruebas vive en memoria: al reiniciarla se vuelven a desplegar los contratos (mismas direcciones) y el saldo de prueba de MetaMask se pierde; vuelve a usar el botón de fondos de prueba. El histórico de la base de datos y los reportes **no** se pierden.
- Si el Droplet está apagado: enciéndelo en https://cloud.digitalocean.com → Droplets → Power On.

**No hagas:**

- No ejecutes `05_despliegue\desplegar.sh` el día de la defensa (reinstala y reinicia la cadena).
- No reinicies `boa-cadena` si todo funciona.
- No pagues con la cuenta `0xf39Fd…92266`.

---

## 10. Cacti: usuario y contraseña

- Usuario: `admin`.
- Contraseña: la que definiste al instalarlo (la inicial de Cacti es `admin` y obliga a cambiarla en el primer ingreso).
- Si no la recuerdas, restablécela por SSH (cambia `NuevaClave` por la tuya):

  ```bash
  mysql cacti -e "UPDATE user_auth SET password=MD5('NuevaClave'), must_change_password='on' WHERE username='admin';"
  ```

  Al entrar, Cacti pedirá cambiarla por una definitiva.

---

## 11. Orden sugerido de la demostración (20 minutos)

1. Consolas divididas abiertas (sección 4) y la pasarela en el navegador.
2. Compra de un boleto con MetaMask: mostrar las dos firmas y cómo aparecen las transacciones y el `[PAGO]` en las consolas.
3. Demostración del contrato paso a paso con Enter (ataques rechazados).
4. Panel de Finanzas: filtro por fechas, reporte firmado y backup.
5. Cacti (gráficas de la prueba) y, si hay tiempo, la corrida corta de JMeter.
6. Explorador de la transacción desde el comprobante ("Auditar en Blockchain").
