#!/usr/bin/env bash
# =========================================================
# Pruebas de carga y estrés del módulo de pagos contra el servidor público
# Por cada nivel de usuarios: JMeter (desde la PC) + muestreo de CPU/RAM en el servidor (vmstat 1 s)
# Uso: bash ejecutar_carga.sh <ip> <dominio> "10 25 50 100" <duracion_s>
# =========================================================
set -uo pipefail
IP="${1:?ip}"; DOMINIO="${2:?dominio}"; NIVELES="${3:-10 25 50 100}"; DURACION="${4:-300}"
LLAVE="$HOME/.ssh/boa_do_ed25519"
DIR="$(cd "$(dirname "$0")" && pwd)"
SALIDA="$DIR/resultados_$(date +%Y%m%d_%H%M)"
JMETER=/c/apache-jmeter-5.6.3/bin/jmeter.bat
mkdir -p "$SALIDA"
echo "Resultados en $SALIDA"

for U in $NIVELES; do
  echo "$(date +%H:%M:%S) nivel $U usuarios: inicio"
  ssh -i "$LLAVE" root@"$IP" "nohup vmstat -n -t 1 > /root/vmstat_${U}.log 2>&1 & echo \$! > /root/vmstat.pid"
  "$JMETER" -n -t "$DIR/modulo_pagos.jmx" -Jhost="$DOMINIO" -Jprotocolo=https -Jusuarios="$U" -Jrampa=30 \
    -Jduracion="$DURACION" -Jpausa=1000 -l "$SALIDA/resultados_${U}.jtl" -e -o "$SALIDA/reporte_${U}" \
    > "$SALIDA/jmeter_${U}.log" 2>&1
  ssh -i "$LLAVE" root@"$IP" "kill \$(cat /root/vmstat.pid) 2>/dev/null"
  scp -q -i "$LLAVE" root@"$IP":/root/vmstat_${U}.log "$SALIDA/"
  grep "summary =" "$SALIDA/jmeter_${U}.log" | tail -1 | sed "s/^/$(date +%H:%M:%S) nivel $U usuarios: /"
  sleep 60
done
echo "$(date +%H:%M:%S) FIN"
