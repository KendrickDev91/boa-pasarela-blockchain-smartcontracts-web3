@echo off
title Orquestador del Sistema BoA Web3
color 0B

echo ========================================================
echo       INICIANDO ECOSISTEMA BOA WEB3 - ENTORNO LOCAL
echo ========================================================
echo.

echo [1/5] Iniciando Base de Datos PostgreSQL (Docker)...
docker start bova_postgres_container
timeout /t 3 >nul

echo [2/5] Levantando Nodo Blockchain (Hardhat)...
start "BoA - Nodo Blockchain" cmd /k "cd 01_blockchain_smart_contracts && npx hardhat node"

echo Esperando a que el nodo local despierte (5 segundos)...
timeout /t 5 >nul

echo [3/5] Desplegando Smart Contracts en la blockchain local...
start "BoA - Deploy Contracts" cmd /c "cd 01_blockchain_smart_contracts && npx hardhat run scripts/deploy.js --network localhost && echo. && echo [EXITO] Contratos desplegados. Esta ventana se cerrara sola... && timeout /t 5 >nul"

echo Esperando a que finalice el despliegue (6 segundos)...
timeout /t 6 >nul

echo [4/5] Iniciando Middleware (Backend Node.js)...
start "BoA - Middleware Backend" cmd /k "cd 02_middleware_backend && npm run dev"

echo [5/5] Iniciando Interfaz de Usuario (Frontend React)...
start "BoA - Frontend DApp" cmd /k "cd 03_frontend_dapp && npm run dev"

echo.
echo ========================================================
echo                 SISTEMA EN EJECUCION
echo ========================================================
echo El Backend esta corriendo en http://localhost:3000
echo El Frontend estara disponible en http://localhost:5173
echo.
echo Las terminales se han abierto en ventanas separadas.
echo Cierra esas ventanas cuando desees apagar el sistema.
echo ========================================================
pause
