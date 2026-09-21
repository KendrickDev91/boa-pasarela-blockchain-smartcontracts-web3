const { Pool } = require('pg');
const pool = new Pool({
  user: 'keni_admin',
  password: 'admin_password_boa',
  database: 'bova_payments_db',
  host: 'localhost',
  port: 5432
});
async function main() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'boletos_pagados'");
    const cols = res.rows.map(r => r.column_name);
    console.log("Columnas actuales:", cols);
    if (!cols.includes('tipo_cambio')) {
      console.log("Agregando columna tipo_cambio...");
      await pool.query('ALTER TABLE boletos_pagados ADD COLUMN tipo_cambio DECIMAL;');
      console.log("Columna agregada exitosamente.");
    }
  } catch (e) {
    console.error("Error DB:", e.message);
  } finally {
    pool.end();
  }
}
main();
