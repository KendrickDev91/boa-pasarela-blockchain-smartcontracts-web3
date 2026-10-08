#!/usr/bin/env bash
# =========================================================
# Publica el código en el servidor y lo pone en marcha (se ejecuta desde la PC de desarrollo).
# Uso:  bash 05_despliegue/desplegar.sh <ip> <dominio> [llave_ssh]
# Requiere que instalar_servidor.sh ya se haya ejecutado en el servidor.
# Las credenciales del panel de Finanzas se toman del .env local del servidor intermedio.
# =========================================================
set -euo pipefail
IP="${1:?IP del servidor}"
DOMINIO="${2:?dominio (p. ej. 164-90-10-20.sslip.io)}"
LLAVE="${3:-$HOME/.ssh/boa_do_ed25519}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SSH="ssh -i $LLAVE -o StrictHostKeyChecking=accept-new root@$IP"

ADMIN_USER=$(grep -E '^ADMIN_USER=' "$RAIZ/02_middleware_backend/.env" | cut -d= -f2- || echo admin)
ADMIN_PASSWORD=$(grep -E '^ADMIN_PASSWORD=' "$RAIZ/02_middleware_backend/.env" | cut -d= -f2-)

echo "==> Copiando el código (sin dependencias ni artefactos)"
tar -C "$RAIZ" -czf - \
  --exclude='node_modules' --exclude='dist' --exclude='coverage' --exclude='.env' \
  --exclude='01_blockchain_smart_contracts/artifacts' --exclude='01_blockchain_smart_contracts/cache' \
  01_blockchain_smart_contracts 02_middleware_backend 03_frontend_dapp 04_infraestructura_db 05_despliegue \
  | $SSH "mkdir -p /opt/boa && tar -xzf - -C /opt/boa && chown -R boa:boa /opt/boa"

echo "==> Configuración y compilación en el servidor"
$SSH "DOMINIO='$DOMINIO' ADMIN_USER='$ADMIN_USER' ADMIN_PASSWORD='$ADMIN_PASSWORD' bash -s" <<'REMOTO'
set -euo pipefail
cd /opt/boa
DBPASS=$(cat /root/.boa_db_pass)
[[ -f /root/.boa_jwt ]] || { openssl rand -hex 32 > /root/.boa_jwt; chmod 600 /root/.boa_jwt; }

cat > 02_middleware_backend/.env <<EOF
PORT=3000
FRONTEND_URL=https://${DOMINIO}
JWT_SECRET=$(cat /root/.boa_jwt)
ADMIN_USER=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
DB_USER=boa
DB_PASSWORD=${DBPASS}
DB_NAME=boa_pagos
DB_HOST=127.0.0.1
DB_PORT=5432
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
DEPLOY_BLOCK=2
FAUCET_ENABLED=true
EXCHANGE_RATE_URL=https://api.factura.bo/ExchangeRate
QUOTE_TTL_MINUTES=15
EOF
chmod 600 02_middleware_backend/.env; chown boa:boa 02_middleware_backend/.env

cat > 03_frontend_dapp/.env.production <<EOF
VITE_API_URL=/api
VITE_RPC_URL=https://${DOMINIO}/rpc
VITE_PUBLIC_RPC_URL=https://${DOMINIO}/rpc
VITE_CHAIN_ID=31337
VITE_CHAIN_NAME=BoA Red de Pruebas
VITE_BOA_PAYMENTS_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_USDT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
EOF

echo "   dependencias y compilación"
(cd 01_blockchain_smart_contracts && npm ci --no-audit --no-fund >/dev/null && npx hardhat compile >/dev/null)
(cd 02_middleware_backend && npm ci --omit=dev --no-audit --no-fund >/dev/null)
(cd 03_frontend_dapp && npm ci --no-audit --no-fund >/dev/null && npx vite build >/dev/null)
chown -R boa:boa /opt/boa

echo "   esquema de base de datos"
PGPASSWORD="$DBPASS" psql -h 127.0.0.1 -U boa -d boa_pagos -q -f 04_infraestructura_db/init.sql

echo "   reinicio de procesos"
install -m 755 05_despliegue/iniciar_cadena.sh /usr/local/bin/boa-iniciar-cadena
supervisorctl restart boa-cadena
sleep 25
supervisorctl status
curl -s http://127.0.0.1:3000/api/health; echo
REMOTO

echo "==> Publicado en https://$DOMINIO"
