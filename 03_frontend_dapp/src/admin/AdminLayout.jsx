import { useState, useEffect } from 'react';
import { BOA_PAYMENTS_ADDRESS } from '../constants/contracts.js';
import { StatCard, AreaChart, DonutChart, HBarChart } from './AdminCharts.jsx';
import logoUrl from "../assets/boa-logo.png";
import { API_BASE } from '../services/config.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',      icon: 'dashboard-line' },
  { id: 'tx',        label: 'Transacciones',  icon: 'exchange-funds-line', badge: 'total' },
  { id: 'clients',   label: 'Clientes',       icon: 'user-3-line' },
  { id: 'reconcile', label: 'Conciliación',   icon: 'scales-3-line' },
  { id: 'contract',  label: 'Smart contract', icon: 'file-code-line' },
  { id: 'settings',  label: 'Configuración',  icon: 'settings-3-line' },
];

// Total real de pagos confirmados registrados (mismo origen que el panel de conciliación)
const useTotalTransacciones = () => {
  const [total, setTotal] = useState(null);
  useEffect(() => {
    const cargar = () => {
      const token = localStorage.getItem('boa_admin_token');
      fetch(`${API_BASE}/payments/all`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(res => { if (res.success && res.data) setTotal(res.data.length); })
        .catch(() => {});
    };
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, []);
  return total;
};

export const AdminSidebar = ({ active, onNav, onLogout }) => {
  const totalTx = useTotalTransacciones();
  return (
  <aside className="admin-sidebar" style={{
    width: 240, background: '#00204D', color: '#fff',
    display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh',
  }}>
    <div style={{ padding: '22px 22px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
      <img src={logoUrl} alt="BoA" style={{ height: 32, filter: 'brightness(0) invert(1)' }}/>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .7 }}>Admin · Cripto</div>
    </div>
    <nav style={{ padding: '12px 12px', flex: 1 }}>
      {NAV.map(n => {
        const on = n.id === active;
        return (
          <button key={n.id} onClick={() => onNav(n.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 6,
            background: on ? 'rgba(255,255,255,.10)' : 'transparent',
            color: on ? '#fff' : 'rgba(255,255,255,.78)',
            fontSize: 14, fontWeight: on ? 700 : 400,
            textDecoration: 'none', marginBottom: 2, width: '100%', textAlign: 'left', border: 'none', outline: 'none', cursor: 'pointer',
            borderLeft: on ? '3px solid #F8C700' : '3px solid transparent',
            paddingLeft: on ? 9 : 12,
            transition: 'all .15s',
          }}>
            <i className={`ri-${n.icon}`} style={{ fontSize: 18 }}></i>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge === 'total' && totalTx != null && (
              <span style={{ background: '#F08A1D', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999 }}>{totalTx}</span>
            )}
          </button>
        );
      })}
    </nav>
    <div className="admin-sidebar-user" style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#E11D2C,#F08A1D)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>KR</div>
      <div style={{ flex: 1, fontSize: 12 }}>
        <div style={{ fontWeight: 700 }}>K. Ramos R.</div>
        <div style={{ opacity: .6 }}>Operador IT</div>
      </div>
      <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
        <i className="ri-logout-box-r-line" style={{ opacity: .6, fontSize: 18 }}></i>
      </button>
    </div>
  </aside>
  );
};

export const AdminTopbar = ({ title, subtitle, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 28px', background: '#fff', borderBottom: '1px solid #E5E7EB',
    position: 'sticky', top: 0, zIndex: 5, gap: 12, flexWrap: 'wrap',
  }}>
    <div>
      <h1 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 24, color: '#00306F', margin: 0 }}>{title}</h1>
      {subtitle && <div style={{ fontSize: 13, color: '#6C767A', marginTop: 2 }}>{subtitle}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {children}
      <div style={{ position: 'relative' }}>
        <i className="ri-notification-3-line" style={{ fontSize: 22, color: '#374151' }}></i>
        <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#E11D2C' }}/>
      </div>
    </div>
  </div>
);

export const DashboardScreen = () => {
  const [stats, setStats] = useState({ vol: 0, volBob: 0, count: 0, success: 0, tiempoSeg: null, medidos: 0 });
  const [chartData, setChartData] = useState({ area: [], tasas: [] });
  const [timeRange, setTimeRange] = useState('7d');
  const [rawData, setRawData] = useState([]);
  const [red, setRed] = useState(null);

  useEffect(() => {
    const fetchStats = () => {
      const token = localStorage.getItem('boa_admin_token');
      fetch(`${API_BASE}/payments/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            setRawData(res.data);
            const count = res.data.length;
            const vol = res.data.reduce((acc, t) => acc + (parseFloat(t.monto_usdt) || 0), 0);
            // Equivalente en Bs con el tipo de cambio aplicado en cada pago (no una tasa fija)
            const volBob = res.data.reduce((acc, t) => acc + (parseFloat(t.monto_bob) || 0), 0);
            const confirmed = res.data.filter(t => t.tx_hash).length;
            const success = count > 0 ? ((confirmed / count) * 100).toFixed(1) : 0;
            // Tiempo entre la cotización y la confirmación on-chain (incluye la firma del pasajero).
            // Se excluyen los registros migrados, que no conservan la hora de cotización.
            const tiempos = res.data
              .map(t => (new Date(t.fecha_pago) - new Date(t.fecha_solicitud)) / 1000)
              .filter(seg => Number.isFinite(seg) && seg > 0);
            const tiempoSeg = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null;
            setStats(prev => ({ ...prev, vol, volBob, count, tiempoSeg, medidos: tiempos.length }));
          }
        })
        .catch(() => {});
      fetch(`${API_BASE}/payments/resumen`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(res => {
          if (!res.success) return;
          const e = res.porEstado || {};
          const conf = e.CONFIRMADO || 0, exp = e.EXPIRADO || 0, pend = e.PENDIENTE || 0;
          const cerradas = conf + exp;
          setStats(prev => ({ ...prev, success: cerradas ? ((conf / cerradas) * 100).toFixed(1) : '0.0', conf, exp, pend }));
        })
        .catch(() => {});
      fetch(`${API_BASE}/chain`)
        .then(res => res.json())
        .then(res => { if (res.success) setRed(res); })
        .catch(() => {});
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (rawData.length === 0) return;
    
    const now = new Date();
    let daysToSub = 7;
    if (timeRange === '14d') daysToSub = 14;
    if (timeRange === '30d') daysToSub = 30;
    if (timeRange === '90d') daysToSub = 90;
    
    const limitDate = new Date(now.setDate(now.getDate() - daysToSub));
    
    const filteredForArea = rawData.filter(t => {
      const dateObj = new Date(t.fecha_pago);
      return !isNaN(dateObj) && dateObj >= limitDate;
    });

    const groupedByDate = {};
    filteredForArea.forEach(t => {
      const clave = new Date(t.fecha_pago).toISOString().slice(0, 10);
      groupedByDate[clave] = (groupedByDate[clave] || 0) + 1;
    });

    // Orden cronológico (de la fecha más antigua a la más reciente)
    const area = Object.keys(groupedByDate).sort().map(clave => ({
      x: new Date(clave + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
      v: groupedByDate[clave],
    }));
    if (area.length === 0) area.push({ x: 'Sin datos', v: 0 });

    // Tipo de cambio aplicado por día (se excluye la tasa fija de la versión anterior)
    const porDia = {};
    rawData.filter(t => t.fuente_tipo_cambio !== 'TASA_FIJA' && t.tipo_cambio).forEach(t => {
      const d = new Date(t.fecha_pago);
      const clave = d.toISOString().slice(0, 10);
      porDia[clave] = porDia[clave] || { suma: 0, n: 0, fecha: d };
      porDia[clave].suma += parseFloat(t.tipo_cambio);
      porDia[clave].n += 1;
    });
    const tasas = Object.keys(porDia).sort().slice(-8).map(k => ({
      label: porDia[k].fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
      v: Number((porDia[k].suma / porDia[k].n).toFixed(2)),
    }));
    setChartData({ area, tasas });
  }, [rawData, timeRange]);

  const fmt = (n) => Number(n || 0).toLocaleString('es-BO');
  
  return (
  <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
    <div className="admin-stat-grid">
      <StatCard icon="exchange-dollar-line" label="Volumen acumulado"
        value={`USD ${fmt(stats.vol)}`}
        sub={`Bs ${fmt(stats.volBob)} según el tipo de cambio de cada pago`}/>
      <StatCard icon="ticket-2-line" label="Boletos emitidos"
        value={fmt(stats.count)}
        sub={`${stats.count} pagos registrados`}/>
      <StatCard icon="check-double-line" label="Solicitudes pagadas"
        value={`${stats.success}%`}
        sub={`${stats.conf ?? 0} pagadas · ${stats.exp ?? 0} vencidas sin pago · ${stats.pend ?? 0} en curso`}/>
      <StatCard icon="time-line" label="Cotización a confirmación"
        value={stats.tiempoSeg != null ? `${fmt(Math.round(stats.tiempoSeg))} seg` : 'Sin datos'}
        sub={stats.medidos ? `Promedio de ${stats.medidos} pagos (incluye la firma del pasajero)` : 'Aún no hay pagos medidos'}/>
    </div>

    <div className="admin-chart-grid">
      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Pagos por día</div>
            <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 0' }}>Transacciones procesadas</h3>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['7d','14d','30d','90d'].map(p => (
              <button key={p} onClick={() => setTimeRange(p)} style={{
                background: timeRange === p ? '#00306F' : '#fff',
                color: timeRange === p ? '#fff' : '#6C767A',
                border: '1px solid ' + (timeRange === p ? '#00306F' : '#D1D5DB'),
                fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>
        <AreaChart data={chartData.area.length ? chartData.area : [{x:'N/A', v:0}]} height={220}/>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Distribución</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 16px' }}>Pagos por criptoactivo</h3>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220 }}>
          <DonutChart data={stats.count > 0 ? [{ label: 'USDT (Polygon)', v: stats.count, color: '#00A95C' }] : [{ label: 'Sin datos', v: 1, color: '#E5E7EB' }]}/>
        </div>
      </div>
    </div>

    <div className="admin-chart-grid">
      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Tipo de cambio</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 16px' }}>Bs por USD aplicado por día</h3>
        <HBarChart data={chartData.tasas.length ? chartData.tasas : [{label:'Sin datos', v:0}]}/>
        <div style={{ fontSize: 11, color: '#6C767A', marginTop: 10 }}>Promedio diario de las cotizaciones aplicadas a los cobros (últimos 8 días con pagos).</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Contrato Inteligente</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 14px' }}>Estado del sistema</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 12, background: '#E6F7EF', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ri-shield-check-fill" style={{ color: '#00A95C', fontSize: 22 }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: red?.nodoDisponible === false ? '#E11D2C' : '#00A95C' }}>
                {red?.nodoDisponible === false ? 'Nodo de la red no disponible' : `Contrato activo · ${red?.red || '…'}`}
              </div>
              <div style={{ fontSize: 11, color: '#374151' }}>{red?.bloqueActual != null ? `Bloque actual: ${red.bloqueActual}` : 'Consultando la red…'}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: 12, background: '#00306F', borderRadius: 6, color: '#fff', wordBreak: 'break-all', fontWeight: 700 }}>
            {red?.contracts?.BoAPayments || BOA_PAYMENTS_ADDRESS}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Red Blockchain</div>
              <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 14, color: '#00306F' }}>{red?.red || '…'}</div>
            </div>
            <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Gas de la cuenta operadora</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14, color: '#00306F' }}>{red?.saldoGasOperador != null ? Number(red.saldoGasOperador).toFixed(4) : '…'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
