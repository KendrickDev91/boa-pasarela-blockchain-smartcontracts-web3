#!/usr/bin/env bash
# =========================================================
# Instalación del servidor de la pasarela BoA (Debian 12/13)
#   Apache2 (sitio + proxy inverso) · Node.js 24 bajo Supervisor · PostgreSQL 16
#   Nodo Hardhat de la red de pruebas · Cacti + SNMP para el monitoreo
# Uso (como root):  bash instalar_servidor.sh <dominio>
#   <dominio> ej.: 164-90-10-20.sslip.io  (nombre gratuito que resuelve a la IP del servidor)
# =========================================================
set -euo pipefail
DOMINIO="${1:?Indique el dominio (p. ej. 164-90-10-20.sslip.io)}"
BASE=/opt/boa
export DEBIAN_FRONTEND=noninteractive

echo "==> Paquetes base"
apt-get update -y
apt-get install -y curl ca-certificates gnupg git rsync ufw apache2 supervisor snmp snmpd \
                   certbot python3-certbot-apache jq

echo "==> Node.js 24 LTS (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

echo "==> PostgreSQL 16 (repositorio oficial PGDG)"
if ! command -v psql >/dev/null; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release; echo $VERSION_CODENAME)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-16
fi

echo "==> Usuario de servicio"
id boa >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/boa --shell /usr/sbin/nologin boa
mkdir -p "$BASE" /var/log/boa
chown -R boa:boa "$BASE" /var/log/boa

echo "==> Base de datos"
if [[ ! -f /root/.boa_db_pass ]]; then openssl rand -hex 16 > /root/.boa_db_pass; chmod 600 /root/.boa_db_pass; fi
DBPASS=$(cat /root/.boa_db_pass)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='boa'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE boa LOGIN PASSWORD '${DBPASS}'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='boa_pagos'" | grep -q 1 \
  || sudo -u postgres createdb -O boa boa_pagos

echo "==> Apache2: módulos y sitio"
a2enmod proxy proxy_http headers rewrite deflate >/dev/null
sed "s/__DOMINIO__/${DOMINIO}/g" "$(dirname "$0")/apache/boa-pasarela.conf" > /etc/apache2/sites-available/boa-pasarela.conf
a2dissite 000-default >/dev/null 2>&1 || true
a2ensite boa-pasarela >/dev/null
systemctl reload apache2

echo "==> Supervisor: nodo de la red de pruebas y servidor intermedio"
install -m 755 "$(dirname "$0")/iniciar_cadena.sh" /usr/local/bin/boa-iniciar-cadena
cp "$(dirname "$0")/supervisor/"*.conf /etc/supervisor/conf.d/
supervisorctl reread && supervisorctl update

echo "==> Cortafuegos"
ufw allow OpenSSH >/dev/null
ufw allow 'Apache Full' >/dev/null
ufw --force enable >/dev/null

echo "==> Certificado TLS (Let's Encrypt)"
certbot --apache -d "$DOMINIO" --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
  echo "AVISO: no se pudo emitir el certificado; el sitio queda en HTTP."

echo "Listo. Siguiente paso: publicar el código con desplegar.sh y ejecutar instalar_cacti.sh"
