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

export const AdminSidebar = ({ active, onNav }) => (
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
          <a key={n.id} href="#" onClick={(e) => { e.preventDefault(); onNav(n.id); }} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 6,
            background: on ? 'rgba(255,255,255,.10)' : 'transparent',
            color: on ? '#fff' : 'rgba(255,255,255,.78)',
            fontSize: 14, fontWeight: on ? 700 : 400,
            textDecoration: 'none', marginBottom: 2,
            borderLeft: on ? '3px solid #F8C700' : '3px solid transparent',
            paddingLeft: on ? 9 : 12,
            transition: 'all .15s',
          }}>
            <i className={`ri-${n.icon}`} style={{ fontSize: 18 }}></i>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge != null && (
              <span style={{ background: '#F08A1D', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999 }}>{n.badge}</span>
            )}
          </a>
        );
      })}
    </nav>
    <div className="admin-sidebar-user" style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#E11D2C,#F08A1D)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>KR</div>
      <div style={{ flex: 1, fontSize: 12 }}>
        <div style={{ fontWeight: 700 }}>K. Ramos R.</div>
        <div style={{ opacity: .6 }}>Operador IT</div>
      </div>
      <i className="ri-logout-box-r-line" style={{ opacity: .6 }}></i>
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

const AREA_DATA = [
  { x:'L 02', v:142 }, { x:'M 03', v:168 }, { x:'X 04', v:195 }, { x:'J 05', v:142 },
  { x:'V 06', v:234 }, { x:'S 07', v:289 }, { x:'D 08', v:198 }, { x:'L 09', v:312 },
  { x:'M 10', v:278 }, { x:'X 11', v:345 }, { x:'J 12', v:401 }, { x:'V 13', v:458 },
  { x:'S 14', v:521 }, { x:'D 15', v:387 },
];
const DONUT_DATA = [
  { label:'USDT', v:1842, color:'#26A17B' },
  { label:'USDC', v: 724, color:'#2775CA' },
  { label:'ETH',  v: 389, color:'#627EEA' },
  { label:'BTC',  v: 142, color:'#F7931A' },
];
const ROUTES_DATA = [
  { label:'CBB → LPB', v:412 },
  { label:'LPB → SCZ', v:387 },
  { label:'SCZ → CBB', v:298 },
  { label:'LPB → MAD', v:156 },
  { label:'SCZ → EZE', v:124 },
  { label:'LPB → GRU', v:102 },
];

export const DashboardScreen = ({ kpis }) => {
  const fmt = (n) => Number(n || 0).toLocaleString('es-BO');
  return (
  <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
    <div className="admin-stat-grid">
      <StatCard icon="exchange-dollar-line" label="Volumen acumulado"
        value={kpis ? `USD ${fmt(kpis.volumenUSD)}` : 'USD 287 459'} delta={12.4} deltaTone="ok"
        sub={kpis ? `≈ Bs ${fmt(kpis.volumenBOB)}` : '≈ Bs 2 003 950'}/>
      <StatCard icon="ticket-2-line" label="Boletos emitidos"
        value={kpis ? fmt(kpis.boletosEmitidos) : '3 097'} delta={8.2} deltaTone="ok"
        sub={kpis ? `${fmt(kpis.pagosTotales)} pagos` : '142 hoy'}/>
      <StatCard icon="check-double-line" label="Tasa de éxito on-chain"
        value={kpis ? `${kpis.tasaExito}%` : '98.7%'} delta={0.3} deltaTone="ok"
        sub={kpis ? `${kpis.pagosTotales} tx procesadas` : '41 fallos / 3 138 tx'}/>
      <StatCard icon="time-line" label="Tiempo medio confirm." value="38 s" delta={-6} deltaTone="ok" sub="Polygon: 24s"/>
    </div>

    <div className="admin-chart-grid">
      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Pagos por día</div>
            <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 0' }}>Transacciones procesadas</h3>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['14d','30d','90d','12m'].map((p, i) => (
              <button key={p} style={{
                background: i === 0 ? '#00306F' : '#fff',
                color: i === 0 ? '#fff' : '#374151',
                border: '1px solid ' + (i === 0 ? '#00306F' : '#D1D5DB'),
                fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>
        <AreaChart data={AREA_DATA} height={220}/>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Distribución</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 16px' }}>Pagos por criptoactivo</h3>
        <DonutChart data={DONUT_DATA}/>
      </div>
    </div>

    <div className="admin-chart-grid">
      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Top rutas</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 16px' }}>Rutas más pagadas con cripto</h3>
        <HBarChart data={ROUTES_DATA}/>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 2px 10px rgba(0,48,111,.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Smart contract</div>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', margin: '2px 0 14px' }}>Estado del contrato</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 12, background: '#E6F7EF', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ri-shield-check-fill" style={{ color: '#00A95C', fontSize: 22 }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00A95C' }}>Operativo · v1.2.4</div>
              <div style={{ fontSize: 11, color: '#374151' }}>Última auditoría: 02 mar 2026 · CertiK</div>
            </div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: 10, background: '#F9FAFB', borderRadius: 6, color: '#1D2429', wordBreak: 'break-all', border: '1px solid #E5E7EB' }}>
            0x4f3a9c8e21d57f29a3b8e0d4c7f912a3b1c8d21c
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6C767A' }}>Balance en reserva</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 16, color: '#1D2429' }}>USD 18 720</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6C767A' }}>Gas pool</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 16, color: '#1D2429' }}>1.42 MATIC</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
