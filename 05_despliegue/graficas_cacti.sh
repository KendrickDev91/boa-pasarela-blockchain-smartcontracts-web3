#!/usr/bin/env bash
# =========================================================
# Gráficas de Cacti (RRD) de una ventana de prueba, con marcas por nivel de carga.
# Uso (en el servidor): bash graficas_cacti.sh "<inicio UTC>" "<fin UTC>" "<hora>=<etiqueta>" ...
# Ej.: bash graficas_cacti.sh "2026-09-28 10:33" "2026-09-28 11:04" "10:36:44=10 usuarios" "10:43:05=25 usuarios"
# =========================================================
set -euo pipefail
S=$(date -d "$1 UTC" +%s); E=$(date -d "$2 UTC" +%s); shift 2
DIA=$(date -u -d "@$S" +%F)
MARCAS=()
for m in "$@"; do MARCAS+=("VRULE:$(date -d "$DIA ${m%%=*} UTC" +%s)#888888:${m#*=}:dashes"); done
RRA=/var/lib/cacti/rra; OUT=/root/graficas; mkdir -p "$OUT"
g() {
  local archivo=$1 titulo=$2 unidad=$3; shift 3
  rrdtool graph "$OUT/$archivo.png" --start "$S" --end "$E" -w 900 -h 260 --title "$titulo" \
    --vertical-label "$unidad" --font DEFAULT:10: -c BACK#FFFFFF -c SHADEA#FFFFFF -c SHADEB#FFFFFF \
    --slope-mode --lower-limit 0 "$@" "${MARCAS[@]}" >/dev/null && echo "$archivo"
}
g 01_cpu "Uso de CPU del servidor" "%" \
  DEF:c=$RRA/servidor_pasarela_boa_cpu_16.rrd:cpu:AVERAGE AREA:c#1F4E79:"CPU (%)" \
  GPRINT:c:MAX:"Máx %.0lf %%" GPRINT:c:AVERAGE:"Prom %.0lf %%\n"
g 02_carga "Carga promedio del sistema (load average)" "procesos" \
  DEF:a=$RRA/servidor_pasarela_boa_load_1min_2.rrd:load_1min:AVERAGE LINE2:a#C0504D:"1 minuto" GPRINT:a:MAX:"Máx %.2lf\n"
g 03_trafico "Tráfico de red (eth0)" "bits/s" \
  DEF:i=$RRA/servidor_pasarela_boa_traffic_in_15.rrd:traffic_in:AVERAGE \
  DEF:o=$RRA/servidor_pasarela_boa_traffic_in_15.rrd:traffic_out:AVERAGE CDEF:ib=i,8,* CDEF:ob=o,8,* \
  AREA:ib#9BBB59:"Entrada" LINE2:ob#1F4E79:"Salida" GPRINT:ob:MAX:"Máx salida %.1lf %sb/s\n"
g 04_solicitudes "Módulo de pagos: solicitudes atendidas por la API (por minuto)" "solicitudes" \
  DEF:s=$RRA/servidor_pasarela_boa_snmp_oid_11.rrd:snmp_oid:AVERAGE AREA:s#1F4E79:"Solicitudes" GPRINT:s:MAX:"Máx %.0lf\n"
g 05_respuesta "Módulo de pagos: tiempo de respuesta promedio de la API" "ms" \
  DEF:r=$RRA/servidor_pasarela_boa_snmp_oid_12.rrd:snmp_oid:AVERAGE LINE2:r#C0504D:"Promedio (ms)" GPRINT:r:MAX:"Máx %.0lf ms\n"
g 06_pendientes "Módulo de pagos: solicitudes de pago registradas en el contrato" "solicitudes" \
  DEF:p=$RRA/servidor_pasarela_boa_snmp_oid_7.rrd:snmp_oid:AVERAGE LINE2:p#F79646:"Solicitudes pendientes" GPRINT:p:MAX:"Máx %.0lf\n"
g 07_nodo "Módulo de pagos: latencia del nodo de la red de pruebas" "ms" \
  DEF:n=$RRA/servidor_pasarela_boa_snmp_oid_13.rrd:snmp_oid:AVERAGE LINE2:n#8064A2:"Latencia (ms)" GPRINT:n:MAX:"Máx %.0lf ms\n"
g 08_memoria_api "Módulo de pagos: memoria del servidor intermedio" "MB" \
  DEF:m=$RRA/servidor_pasarela_boa_snmp_oid_14.rrd:snmp_oid:AVERAGE LINE2:m#4F81BD:"Memoria (MB)" GPRINT:m:MAX:"Máx %.0lf MB\n"
