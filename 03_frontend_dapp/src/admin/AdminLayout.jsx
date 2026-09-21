import { useState, useEffect } from 'react';
import { BOA_PAYMENTS_ADDRESS } from '../constants/contracts.js';
import { StatCard, AreaChart, DonutChart, HBarChart } from './AdminCharts.jsx';
import logoUrl from "../assets/boa-logo.png";

const NAV = [
  { id: 'dashboard', label: 'Dashboard',      icon: 'dashboard-line' },
  { id: 'tx',        label: 'Transacciones',  icon: 'exchange-funds-line', badge: 142 },
  { id: 'clients',   label: 'Clientes',       icon: 'user-3-line' },
  { id: 'reconcile', label: 'Conciliación',   icon: 'scales-3-line' },
  { id: 'contract',  label: 'Smart contract', icon: 'file-code-line' },
  { id: 'settings',  label: 'Configuración',  icon: 'settings-3-line' },
];

export const AdminSidebar = ({ active, onNav, onLogout }) => (
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
            {n.badge != null && (
              <span style={{ background: '#F08A1D', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999 }}>{n.badge}</span>
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
  const [stats, setStats] = useState({ vol: 0, count: 0, success: 0 });
  const [chartData, setChartData] = useState({ area: [], routes: [] });
  const [timeRange, setTimeRange] = useState('7d');
  const [rawData, setRawData] = useState([]);

  useEffect(() => {
    const fetchStats = () => {
      const token = localStorage.getItem('boa_admin_token');
      fetch('http://localhost:3000/api/payments/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            setRawData(res.data);
            const count = res.data.length;
            const vol = res.data.reduce((acc, curr) => acc + (parseFloat(curr.monto_usdt) || 0), 0);
            const confirmed = res.data.filter(t => t.tx_hash).length;
            const success = count > 0 ? ((confirmed / count) * 100).toFixed(1) : 0;
            setStats({ vol, count, success });
          }
        })
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
      const dateStr = new Date(t.fecha_pago).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
      groupedByDate[dateStr] = (groupedByDate[dateStr] || 0) + 1;
    });
    
    const area = Object.entries(groupedByDate).map(([x, v]) => ({ x, v: Number(v) || 0 }));
    if (area.length === 0) area.push({ x: 'Sin datos', v: 0 });

    const groupedByRoute = {};
    rawData.forEach(t => {
      const route = (t.origen && t.destino) ? `${t.origen} a ${t.destino}` : null;
      if (route) groupedByRoute[route] = (groupedByRoute[route] || 0) + 1;
    });
    
    let routes = Object.entries(groupedByRoute).map(([label, v]) => ({ label, v })).sort((a,b) => b.v - a.v);
    if (routes.length === 0) {
       const count = rawData.length;
       routes = [
         { label: 'CBB a LPB', v: Math.floor(count * 0.4) },
         { label: 'LPB a SCZ', v: Math.floor(count * 0.3) },
         { label: 'SCZ a CBB', v: Math.floor(count * 0.2) },
         { label: 'LPB a MAD', v: count - Math.floor(count * 0.4) - Math.floor(count * 0.3) - Math.floor(count * 0.2) }
       ].filter(r => r.v > 0);
    }
    setChartData({ area, routes });
  }, [rawData, timeRange]);

  const fmt = (n) => Number(n || 0).toLocaleString('es-BO');
  
  return (
  <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
    <div className="admin-stat-grid">
      <StatCard icon="exchange-dollar-line" label="Volumen acumulado"
        value={`USD ${fmt(stats.vol)}`} delta={0} deltaTone="info"
        sub={`Bs ${fmt(stats.vol * 10)} equivalente`}/>
      <StatCard icon="ticket-2-line" label="Boletos emitidos"
        value={fmt(stats.count)} delta={100} deltaTone="ok"
        sub={`${stats.count} pagos registrados`}/>
      <StatCard icon="check-double-line" label="Tasa de éxito"
        value={`${stats.success}%`} delta={0} deltaTone="ok"
        sub={`De ${stats.count} transacciones`}/>
      <StatCard icon="time-line" label="Tiempo medio de confirmación" value="15 seg" delta={5} deltaTone="ok" sub="Red Polygon Amoy"/>
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
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Top rutas</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 16px' }}>Rutas más pagadas con cripto</h3>
        <HBarChart data={chartData.routes.length ? chartData.routes : [{label:'N/A', v:0}]}/>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Contrato Inteligente</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 14px' }}>Estado del sistema</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 12, background: '#E6F7EF', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ri-shield-check-fill" style={{ color: '#00A95C', fontSize: 22 }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00A95C' }}>Estado: Desplegado en Red Polygon Amoy</div>
              <div style={{ fontSize: 11, color: '#374151' }}>Versión del Contrato: 1.0.0 (Candidato a Producción)</div>
            </div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: 12, background: '#00306F', borderRadius: 6, color: '#fff', wordBreak: 'break-all', fontWeight: 700 }}>
            0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Red Blockchain</div>
              <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 14, color: '#00306F' }}>Polygon Amoy</div>
            </div>
            <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Balance de Gas</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14, color: '#00306F' }}>1.42 MATIC</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
