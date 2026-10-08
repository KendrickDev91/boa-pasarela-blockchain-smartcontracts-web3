#!/usr/bin/env bash
# =========================================================
# Monitoreo con Cacti (Debian 12/13): recursos del servidor y módulo de pagos
#  - SNMP local (snmpd) con "extend boa" que publica las métricas de /api/metricas
#  - Cacti + Spine, instalación desatendida y alta del dispositivo local
#  - Gráficas: CPU, memoria, carga, tráfico de red y métricas del módulo de pagos
# Uso (como root): bash instalar_cacti.sh
# El primer ingreso a https://<dominio>/cacti usa admin/admin y obliga a cambiar la clave.
# =========================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
COMUNIDAD=boa_monitoreo

echo "==> Métricas del módulo de pagos para SNMP"
cat > /usr/local/bin/boa-metricas <<'EOF'
#!/usr/bin/env bash
# Una línea por métrica (el orden define el OID nsExtendOutLine."boa".N)
m=$(curl -s -m 5 'http://127.0.0.1:3000/api/metricas?formato=cacti')
for k in pagos_confirmados pagos_pendientes pagos_expirados emisiones_error recaudado_usdt \
         solicitudes_api respuesta_api_ms latencia_nodo_ms memoria_mb; do
  v=$(tr ' ' '\n' <<<"$m" | grep "^$k:" | cut -d: -f2)
  echo "${v:-0}"
done
EOF
chmod 755 /usr/local/bin/boa-metricas

cat > /etc/snmp/snmpd.conf <<EOF
agentAddress udp:127.0.0.1:161
rocommunity ${COMUNIDAD} 127.0.0.1
sysLocation DigitalOcean
sysContact Pasarela BoA
extend boa /usr/local/bin/boa-metricas
EOF
systemctl restart snmpd

echo "==> Cacti y Spine"
echo "cacti cacti/webserver select apache2" | debconf-set-selections
echo "cacti cacti/dbconfig-install boolean true" | debconf-set-selections
apt-get install -y cacti cacti-spine cron >/dev/null
systemctl enable --now cron   # la imagen de Debian 13 no trae cron activo; Cacti lo necesita para su poller
cd /usr/share/cacti
sudo -u www-data php cli/install_cacti.php --accept-eula --install --force >/dev/null 2>&1 || true

echo "==> Dispositivo local y gráficas"
DEV=$(php cli/add_device.php --description="Servidor pasarela BoA" --ip=127.0.0.1 \
        --template="$(php cli/add_device.php --list-host-templates | awk -F'\t' '/Local Linux|Net-SNMP/{print $1; exit}')" \
        --version=2 --community=${COMUNIDAD} --avail=snmp 2>/dev/null | grep -oE 'device-id: \([0-9]+\)' | grep -oE '[0-9]+' || true)
[[ -n "$DEV" ]] || DEV=$(php cli/add_graphs.php --list-hosts | awk -F'\t' '/127.0.0.1/{print $1; exit}')
echo "   dispositivo: $DEV"

# Gráficas de las plantillas asociadas al dispositivo (CPU, memoria, carga, interfaces)
for tpl in $(php cli/add_graphs.php --list-graph-templates --host-template-id="$(php cli/add_graphs.php --list-hosts | awk -F'\t' -v d="$DEV" '$1==d{print $4}')" | awk -F'\t' 'NR>1{print $1}'); do
  php cli/add_graphs.php --host-id="$DEV" --graph-type=cg --graph-template-id="$tpl" >/dev/null 2>&1 || true
done
php cli/add_graphs.php --host-id="$DEV" --graph-type=ds --graph-template-id=2 --snmp-query-id=1 \
    --snmp-query-type-id=13 --snmp-field=ifOperStatus --snmp-value=Up >/dev/null 2>&1 || true

# Métricas del módulo de pagos (plantilla "SNMP - Generic OID Template")
GEN=$(php cli/add_graphs.php --list-graph-templates | awk -F'\t' '/Generic OID/{print $1; exit}')
i=1
for nombre in "Pagos confirmados" "Pagos pendientes" "Pagos expirados" "Emisiones con error" "USDT recaudado" \
              "Solicitudes a la API" "Tiempo de respuesta de la API (ms)" "Latencia del nodo (ms)" "Memoria del servidor intermedio (MB)"; do
  php cli/add_graphs.php --host-id="$DEV" --graph-type=cg --graph-template-id="$GEN" \
      --graph-title="BoA - ${nombre}" \
      --input-fields="oid=.1.3.6.1.4.1.8072.1.3.2.4.1.2.3.98.111.97.${i}" >/dev/null 2>&1 || true
  i=$((i+1))
done

php cli/poller_reindex_hosts.php --id="$DEV" >/dev/null 2>&1 || true
echo "Cacti listo en /cacti (primer ingreso: admin / admin)."
