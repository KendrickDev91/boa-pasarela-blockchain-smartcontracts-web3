$ErrorActionPreference = "SilentlyContinue"

# =========================================================
# Conteo de líneas lógicas de código fuente (SLOC) para COCOMO II
# Criterio: se excluyen líneas en blanco, comentarios, dependencias (node_modules),
# artefactos de compilación y archivos generados (package-lock.json, reportes .json).
# Se cuentan solo archivos escritos para el proyecto: .sol .js .jsx .css .sql
# =========================================================

function Contar-SLOC($ruta, $extensiones, $excluir) {
    $archivos = Get-ChildItem -Path $ruta -Recurse -File -Include $extensiones |
        Where-Object { $_.FullName -notmatch $excluir }
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
    return $total
}

$excluir = '\\node_modules\\|\\dist\\|\\artifacts\\|\\cache\\|\\deployments\\'

$front = Contar-SLOC '03_frontend_dapp\src' @('*.jsx','*.js','*.css') $excluir
$back  = Contar-SLOC '02_middleware_backend' @('*.js') ($excluir + '|\\test\\')
$sc    = Contar-SLOC '01_blockchain_smart_contracts\contracts' @('*.sol') ($excluir + '|\\test\\')
$db    = Contar-SLOC '04_infraestructura_db' @('*.sql') $excluir
$prue  = (Contar-SLOC '01_blockchain_smart_contracts\test' @('*.js') $excluir) + (Contar-SLOC '02_middleware_backend\test' @('*.js') $excluir)

$total = $front + $back + $sc + $db
Write-Host "Frontend (React/Vite)      : $front SLOC"
Write-Host "Servidor intermedio (Node) : $back SLOC"
Write-Host "Contratos (Solidity)       : $sc SLOC"
Write-Host "Base de datos (SQL)        : $db SLOC"
Write-Host "---------------------------------------------"
Write-Host ("TOTAL PRODUCTO             : {0} SLOC ({1:N2} KSLOC)" -f $total, ($total / 1000))
Write-Host "Pruebas (no se incluyen)   : $prue SLOC"
