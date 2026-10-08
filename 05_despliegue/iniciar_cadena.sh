#!/usr/bin/env bash
# =========================================================
# Nodo de la red de pruebas (Hardhat, chainId 31337) administrado por Supervisor.
# Al iniciar: levanta el nodo en 127.0.0.1:8545, despliega MockUSDT y BoAPayments
# (mismas direcciones en cada arranque, por ser la cuenta #0 con nonce 0 y 1) y
# reinicia el servidor intermedio para que reinicie su NonceManager.
# El estado de la cadena vive en memoria: un reinicio del nodo reinicia la red de pruebas.
# =========================================================
set -uo pipefail
cd /opt/boa/01_blockchain_smart_contracts

npx hardhat node --hostname 127.0.0.1 --port 8545 &
NODO=$!
trap 'kill $NODO 2>/dev/null' TERM INT

for i in $(seq 1 60); do
  curl -s -X POST -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' http://127.0.0.1:8545 >/dev/null && break
  sleep 1
done

npx hardhat run scripts/deploy.js --network localhost && echo "[cadena] contratos desplegados"
supervisorctl restart boa-api >/dev/null 2>&1 || true

wait $NODO
