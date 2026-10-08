# Resumen de las pruebas de carga: JMeter (.jtl) + uso de recursos del servidor (vmstat 1 s)
# Uso: python analizar_carga.py <carpeta_resultados> [ram_total_mb]
import csv, json, os, statistics as st, sys

D = sys.argv[1]
RAM_TOTAL = float(sys.argv[2]) if len(sys.argv) > 2 else 3921


def pct(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))]


resumen = []
for u in (10, 25, 50, 100):
    ruta = os.path.join(D, f'resultados_{u}.jtl')
    if not os.path.exists(ruta):
        continue
    rows = [r for r in csv.DictReader(open(ruta, encoding='utf-8', errors='ignore')) if r['label'][:2].isdigit()]
    t0 = min(int(r['timeStamp']) for r in rows)
    t1 = max(int(r['timeStamp']) + int(r['elapsed']) for r in rows)
    dur = (t1 - t0) / 1000
    el = [int(r['elapsed']) for r in rows]
    err = sum(r['success'] != 'true' for r in rows)
    vm = [l.split() for l in open(os.path.join(D, f'vmstat_{u}.log')) if l.strip() and l.split()[0].isdigit()]
    cpu = [100 - int(x[14]) for x in vm]
    usada = [RAM_TOTAL - (int(x[3]) + int(x[4]) + int(x[5])) / 1024 for x in vm]
    nivel = {
        'usuarios': u, 'solicitudes': len(rows), 'rendimiento_rps': round(len(rows) / dur, 1),
        'promedio_ms': round(st.mean(el)), 'p90_ms': pct(el, 90), 'p95_ms': pct(el, 95),
        'error_pct': round(100 * err / len(rows), 2),
        'cpu_prom_pct': round(st.mean(cpu)), 'cpu_max_pct': max(cpu),
        'ram_prom_mb': round(st.mean(usada)), 'ram_max_mb': round(max(usada)), 'operaciones': {},
    }
    for lab in sorted(set(r['label'] for r in rows)):
        e = [int(r['elapsed']) for r in rows if r['label'] == lab]
        er = sum(r['success'] != 'true' for r in rows if r['label'] == lab)
        nivel['operaciones'][lab] = {'n': len(e), 'promedio_ms': round(st.mean(e)), 'p95_ms': pct(e, 95), 'errores': er}
    resumen.append(nivel)
    print(f"== {u} usuarios: {nivel['solicitudes']} solicitudes, {nivel['rendimiento_rps']}/s, prom {nivel['promedio_ms']} ms, "
          f"p90 {nivel['p90_ms']} ms, p95 {nivel['p95_ms']} ms, error {nivel['error_pct']}% | CPU prom {nivel['cpu_prom_pct']}% "
          f"max {nivel['cpu_max_pct']}% | RAM usada prom {nivel['ram_prom_mb']} MB max {nivel['ram_max_mb']} MB")
    for lab, o in nivel['operaciones'].items():
        print(f"     {lab[:45]:45s} n={o['n']:5d} prom {o['promedio_ms']:6d} p95 {o['p95_ms']:6d} err {o['errores']}")

json.dump(resumen, open(os.path.join(D, 'resumen_carga.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
