$ErrorActionPreference = "SilentlyContinue"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  METRICAS DE CODIGO FUENTE (COCOMO) - BoA PAYMENTS " -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Frontend
$frontLines = (Get-ChildItem -Path 03_frontend_dapp -Recurse -File -Include *.jsx,*.js,*.css,*.json | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\dist\\' }) | Get-Content | Measure-Object -Line
$front = $frontLines.Lines

# 2. Backend
$backLines = (Get-ChildItem -Path 02_middleware_backend -Recurse -File -Include *.js,*.json,*.yml | Where-Object { $_.FullName -notmatch '\\node_modules\\' }) | Get-Content | Measure-Object -Line
$back = $backLines.Lines

# 3. Smart Contracts
$scLines = (Get-ChildItem -Path 01_blockchain_smart_contracts -Recurse -File -Include *.sol,*.js | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\artifacts\\' -and $_.FullName -notmatch '\\cache\\' }) | Get-Content | Measure-Object -Line
$sc = $scLines.Lines

# 4. Base de Datos
$dbLines = (Get-ChildItem -Path 04_infraestructura_db -Recurse -File -Include *.sql) | Get-Content | Measure-Object -Line
$db = $dbLines.Lines

$total = $front + $back + $sc + $db
$ksloc = [math]::Round($total / 1000, 2)

Write-Host ""
Write-Host "[+] 1. Frontend dApp (React/Vite)    : $front lineas" -ForegroundColor Yellow
Write-Host "[+] 2. Middleware Backend (Node.js)  : $back lineas" -ForegroundColor Green
Write-Host "[+] 3. Smart Contracts (Solidity)    : $sc lineas" -ForegroundColor Magenta
Write-Host "[+] 4. Base de Datos (PostgreSQL)    : $db lineas" -ForegroundColor Cyan
Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host " TOTAL LINEAS DE CODIGO (KSLOC)      : $total ($ksloc KSLOC)" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
