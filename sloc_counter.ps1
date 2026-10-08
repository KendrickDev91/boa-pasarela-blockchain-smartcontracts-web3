$ErrorActionPreference = "SilentlyContinue"

# =========================================================
# Conteo de lineas logicas de codigo fuente (SLOC) para COCOMO II
# Se cuenta solo el codigo del producto entregado, escrito para el proyecto.
# Se excluyen: lineas en blanco y comentarios; dependencias (node_modules);
# artefactos de compilacion; archivos generados (package-lock.json, reportes);
# codigo de pruebas (test\); el token de pruebas (MockUSDT.sol); el contrato de
# demostracion (BoAFirmaDigital.sol) y el script de migracion de datos historicos.
# =========================================================

function Contar-SLOC($ruta, $extensiones, $excluir) {
    $archivos = @(Get-ChildItem -Path $ruta -Recurse -File -Include $extensiones |
        Where-Object { $_.FullName -notmatch $excluir })
    $total = 0
    foreach ($f in $archivos) {
        $enBloque = $false
        foreach ($linea in (Get-Content $f.FullName)) {
            $l = $linea.Trim()
            if ($enBloque) { if ($l -match '\*/') { $enBloque = $false }; continue }
            if ($l -eq '' -or $l.StartsWith('//') -or $l.StartsWith('--') -or $l.StartsWith('#')) { continue }
            if ($l.StartsWith('/*') -or $l.StartsWith('{/*')) { if ($l -notmatch '\*/') { $enBloque = $true }; continue }
            if ($l.StartsWith('*')) { continue }
            $total++
        }
    }
    return @{ sloc = $total; archivos = $archivos.Count }
}

$excluir = '\\node_modules\\|\\dist\\|\\artifacts\\|\\cache\\|\\deployments\\'
$noProducto = '\\test\\|MockUSDT\.sol|BoAFirmaDigital\.sol|migracion_'

$front = Contar-SLOC '03_frontend_dapp\src' @('*.jsx','*.js','*.css') $excluir
$back  = Contar-SLOC '02_middleware_backend' @('*.js') ($excluir + '|' + $noProducto)
$sc    = Contar-SLOC '01_blockchain_smart_contracts\contracts' @('*.sol') ($excluir + '|' + $noProducto)
$db    = Contar-SLOC '04_infraestructura_db' @('*.sql') ($excluir + '|' + $noProducto)
$prue  = (Contar-SLOC '01_blockchain_smart_contracts\test' @('*.js') $excluir).sloc + (Contar-SLOC '02_middleware_backend\test' @('*.js') $excluir).sloc

$total = $front.sloc + $back.sloc + $sc.sloc + $db.sloc

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  LINEAS LOGICAS DE CODIGO FUENTE (COCOMO II) - BoA PAYMENTS  " -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("[+] 1. Frontend dApp (React/Vite)      : {0,5} SLOC ({1} archivos)" -f $front.sloc, $front.archivos) -ForegroundColor Yellow
Write-Host ("[+] 2. Servidor intermedio (Node.js)   : {0,5} SLOC ({1} archivos)" -f $back.sloc, $back.archivos) -ForegroundColor Green
Write-Host ("[+] 3. Contrato inteligente (Solidity) : {0,5} SLOC ({1} archivo)" -f $sc.sloc, $sc.archivos) -ForegroundColor Magenta
Write-Host ("[+] 4. Base de datos (PostgreSQL)      : {0,5} SLOC ({1} archivo)" -f $db.sloc, $db.archivos) -ForegroundColor Cyan
Write-Host ""
Write-Host "-------------------------------------------------------------" -ForegroundColor Cyan
Write-Host (" TOTAL DEL PRODUCTO                    : {0,5} SLOC ({1} KSLOC) " -f $total, ($total / 1000).ToString('0.000')) -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ("Excluido: pruebas ({0} SLOC), token de pruebas, contrato de demostracion," -f $prue) -ForegroundColor DarkGray
Write-Host "migracion de datos, dependencias, archivos generados, comentarios y blancos." -ForegroundColor DarkGray
