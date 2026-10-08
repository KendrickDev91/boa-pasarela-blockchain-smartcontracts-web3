# =========================================================
# Consolas de la demostración en vivo (Windows Terminal, pantalla dividida):
#   izquierda arriba : nodo de la cadena de bloques (transacciones minadas: contrato, hash, gas, bloque)
#   izquierda abajo  : servidor intermedio (reservas, PagoConfirmado, emisión, tipo de cambio)
#   derecha          : demostración paso a paso del contrato
# Los visores boa-ver-nodo y boa-ver-api están instalados en el servidor (solo leen los registros).
# Uso: powershell -ExecutionPolicy Bypass -File 05_despliegue\demo\consolas_demo.ps1
# =========================================================
param([switch]$Auto)   # -Auto: la demostración avanza sola (para grabar el video)
$IP = '157.245.247.70'
$Llave = "$env:USERPROFILE\.ssh\boa_do_ed25519"
$Backend = (Resolve-Path "$PSScriptRoot\..\..\02_middleware_backend").Path

$q = { param($t) '"' + $t + '"' }   # Start-Process une los argumentos con espacios
$ssh = @('ssh', '-t', '-i', (& $q $Llave), '-o', 'ServerAliveInterval=20', "root@$IP")
$wt = @('--maximized',
  'new-tab', '--title', (& $q 'Nodo blockchain - transacciones minadas'), '--suppressApplicationTitle') + $ssh + @('boa-ver-nodo', ';',
  'split-pane', '-V', '--size', '0.5', '--title', (& $q 'Demostracion del contrato'), '--suppressApplicationTitle', '-d', (& $q $Backend),
    'powershell', '-NoExit', '-Command', (& $q $(if ($Auto) { 'node scripts\demo_contrato_en_vivo.js --auto' } else { 'node scripts\demo_contrato_en_vivo.js' })), ';',
  'move-focus', 'left', ';',
  'split-pane', '-H', '--title', (& $q 'Middleware - eventos'), '--suppressApplicationTitle') + $ssh + @('boa-ver-api')
Start-Process wt.exe -ArgumentList $wt
