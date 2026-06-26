import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge } from '../components/primitives.jsx';
import { CryptoIcon } from '../payment/components.jsx';
import { AdminSidebar, AdminTopbar, DashboardScreen } from './AdminLayout.jsx';
import TransactionsScreen from './AdminTx.jsx';
import { api } from '../services/api.js';

const TITLES = {
  dashboard: { t: 'Dashboard',     s: 'Resumen general · últimos 14 días · actualizado hace 12s' },
  tx:        { t: 'Transacciones', s: '3 097 pagos cripto procesados · 142 hoy' },
  clients:   { t: 'Clientes',      s: 'Pasajeros que han pagado con criptoactivos' },
  reconcile: { t: 'Conciliación',  s: 'Liquidación on-chain ↔ ERP BoA' },
  contract:  { t: 'Smart contract',s: 'Estado del contrato y eventos' },
  settings:  { t: 'Configuración', s: 'Parámetros del módulo' },
};

const PlaceholderScreen = ({ icon, title, blurb }) => (
  <div style={{ padding: '60px 28px', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
    <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#E0F6FF', color: '#006DB2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
      <i className={`ri-${icon}`} style={{ fontSize: 40 }}></i>
    </div>
    <h2 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 26, color: '#00306F', margin: '0 0 6px' }}>{title}</h2>
    <p style={{ fontSize: 14, color: '#3E484F', maxWidth: 480, margin: '0 auto 18px' }}>{blurb}</p>
    <Badge tone="warn" icon="tools-line">Próximamente · ver Dashboard y Transacciones</Badge>
  </div>
);

const CLIENTS = [
  { name:'María Fernández', email:'m.fernandez@gmail.com', country:'BO', txs:8,  total:'USD 1 248', last:'2026-06-15', cripto:'USDT' },
  { name:'Carlos Vargas',   email:'cvargas88@hotmail.com', country:'BO', txs:4,  total:'USD 2 187', last:'2026-06-15', cripto:'USDC' },
  { name:'Andrea Rocha',    email:'a.rocha@empresa.bo',    country:'BO', txs:2,  total:'USD 658',   last:'2026-06-15', cripto:'BTC'  },
  { name:'Luis Mamani',     email:'luis.mamani@gmail.com', country:'BO', txs:12, total:'USD 1 092', last:'2026-06-14', cripto:'USDT' },
  { name:'Roberto Quispe',  email:'r.quispe@bolivia.bo',   country:'BO', txs:3,  total:'USD 1 354', last:'2026-06-13', cripto:'ETH'  },
  { name:'Daniela Pinto',   email:'dpinto@uagrm.edu.bo',   country:'BO', txs:1,  total:'USD 71',    last:'2026-06-15', cripto:'USDT' },
  { name:'Felipe Salinas',  email:'felipe.s@startup.io',   country:'US', txs:6,  total:'USD 1 290', last:'2026-06-12', cripto:'USDC' },
  { name:'Iván Choque',     email:'ichoque92@gmail.com',   country:'BO', txs:2,  total:'USD 568',   last:'2026-06-15', cripto:'USDT' },
];

const ClientsScreen = ({ clientes }) => {
  const data = clientes && clientes.length ? clientes : CLIENTS;
  return (
  <div style={{ padding: '24px 28px' }}>
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 16, color: '#00306F', margin: 0 }}>Clientes con pagos cripto</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" icon="filter-3-line">Filtros</Button>
          <Button variant="outline" size="sm" icon="download-line">Exportar</Button>
        </div>
      </div>
      <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
        <thead>
          <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
            {['Cliente','País','Transacciones','Volumen total','Cripto preferida','Última actividad',''].map(h => (
              <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 ? '#FFFFFF' : '#FCFCFD', cursor: 'pointer' }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E0F6FF', color: '#006DB2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                    {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1D2429' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#849095' }}>{c.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}><Badge tone="neutral">{c.country || 'BO'}</Badge></td>
              <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", color: '#1D2429' }}>{c.txs}</td>
              <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#00306F' }}>{c.total}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CryptoIcon symbol={c.cripto} size={18}/>
                  <strong style={{ fontSize: 12 }}>{c.cripto}</strong>
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", color: '#374151', fontSize: 12 }}>{c.last || '—'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                <button style={{ background: 'none', border: 'none', color: '#006DB2', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Ver historial →</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  </div>
  );
};

export default function AdminApp() {
  const [section, setSection] = useState('dashboard');
  const [kpis, setKpis] = useState(null);
  const [clientes, setClientes] = useState(null);
  const meta = TITLES[section];

  // Carga datos reales del backend (con fallback a mock si no responde).
  useEffect(() => {
    api.dashboard().then(setKpis).catch(() => {});
    api.clientes().then((c) => Array.isArray(c) && setClientes(c)).catch(() => {});
  }, []);

  const renderSection = () => {
    if (section === 'dashboard') return <DashboardScreen kpis={kpis}/>;
    if (section === 'tx')        return <TransactionsScreen/>;
    if (section === 'clients')   return <ClientsScreen clientes={clientes}/>;
    if (section === 'reconcile') return <PlaceholderScreen icon="scales-3-line" title="Conciliación contable"
      blurb="Reconcilia los pagos on-chain con los registros del ERP de BoA. Identifica diferencias de tipo de cambio, gas y comisiones de la pasarela."/>;
    if (section === 'contract')  return <PlaceholderScreen icon="file-code-line" title="Eventos del Smart Contract"
      blurb="Inspector de eventos emitidos por el contrato inteligente: PaymentReceived, TicketIssued, Refund, etc. Incluye logs y filtros por bloque."/>;
    if (section === 'settings')  return <PlaceholderScreen icon="settings-3-line" title="Configuración del módulo"
      blurb="Parámetros: criptoactivos habilitados, comisión de pasarela, ventana de cotización, red preferida, wallet de tesorería."/>;
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active={section} onNav={setSection}/>
      <div className="admin-content">
        <AdminTopbar title={meta.t} subtitle={meta.s}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#006DB2', fontWeight: 700, textDecoration: 'none' }}>
            <i className="ri-external-link-line"></i> Ver pasarela de usuario
          </Link>
          <Button variant="outline" size="sm" icon="refresh-line">Actualizar</Button>
        </AdminTopbar>
        <div>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
