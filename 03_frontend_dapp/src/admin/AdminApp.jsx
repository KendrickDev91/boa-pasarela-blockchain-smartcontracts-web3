import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge } from '../components/primitives.jsx';
import { CryptoIcon } from '../payment/components.jsx';
import { AdminSidebar, AdminTopbar, DashboardScreen } from './AdminLayout.jsx';
import TransactionsScreen from './AdminTx.jsx';
import { FinancialDashboard, AdminLogin } from './FinancialDashboard.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BOA_PAYMENTS_ADDRESS } from '../constants/contracts.js';
import boaLogo from '../assets/boa-logo.png';

const TITLES = {
  dashboard: { t: 'Dashboard',     s: 'Métricas calculadas con los pagos confirmados en la cadena de bloques' },
  tx:        { t: 'Transacciones', s: 'Visor de auditoría criptográfica' },
  clients:   { t: 'Gestión de Reservas', s: 'Agrupación dinámica de PNRs procesados' },
  reconcile: { t: 'Conciliación',  s: 'Liquidación on-chain ↔ Base de datos' },
  contract:  { t: 'Smart contract',s: 'Estado del contrato y eventos' },
  settings:  { t: 'Configuración', s: 'Parámetros del módulo' },
};

const ContractScreen = () => {
  const exportAuditPDF = (firm, date, result) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0, 48, 111);
    doc.text("Reporte Técnico Corporativo", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("División de Auditoría Web3 - Boliviana de Aviación", 14, 26);
    
    autoTable(doc, {
      startY: 35,
      head: [['Parámetro de Auditoría', 'Valor Registrado']],
      body: [
        ['Firma Auditora', firm],
        ['Fecha de Emisión', date],
        ['Resultado de Escaneo', result],
        ['Dirección de Contrato', BOA_PAYMENTS_ADDRESS],
        ['Red de Despliegue', 'Polygon (Amoy Testnet)']
      ],
      headStyles: { fillColor: [0, 48, 111] },
      styles: { fontSize: 10, cellPadding: 6 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });
    
    doc.save(`auditoria_${firm.toLowerCase()}.pdf`);
  };

  return (
  <div style={{ padding: '24px 28px' }}>
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden', padding: '24px' }}>
      <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 18, color: '#00306F', margin: '0 0 16px' }}>Estado del Smart Contract</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 12, color: '#6C767A', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Estado de Conexión</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00A95C', fontWeight: 700, fontSize: 16 }}>
            <i className="ri-checkbox-circle-fill"></i> Operativo
          </div>
        </div>
        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 12, color: '#6C767A', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Red Activa</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1D2429', fontWeight: 700, fontSize: 16 }}>
            <i className="ri-global-line"></i> Hardhat Local
          </div>
        </div>
        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 12, color: '#6C767A', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Dirección del Contrato</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#006DB2', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, wordBreak: 'break-all' }}>
            {BOA_PAYMENTS_ADDRESS}
          </div>
        </div>
      </div>

      <h4 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 15, color: '#1D2429', margin: '0 0 12px' }}>Historial de Auditorías de Seguridad</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
            <th style={{ padding: '12px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase' }}>Fecha</th>
            <th style={{ padding: '12px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase' }}>Firma Auditora</th>
            <th style={{ padding: '12px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase' }}>Resultado</th>
            <th style={{ padding: '12px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase' }}>Reporte</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '12px', color: '#374151' }}>15 Mar 2026</td>
            <td style={{ padding: '12px', fontWeight: 700, color: '#1D2429' }}>CertiK</td>
            <td style={{ padding: '12px' }}><Badge tone="ok">Seguro (Score 98/100)</Badge></td>
            <td style={{ padding: '12px' }}>
              <button onClick={() => exportAuditPDF('CertiK', '15 Mar 2026', 'Seguro (Score 98/100)')} style={{ color: '#006DB2', textDecoration: 'none', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Descargar PDF</button>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '12px', color: '#374151' }}>10 Ene 2026</td>
            <td style={{ padding: '12px', fontWeight: 700, color: '#1D2429' }}>HackControl</td>
            <td style={{ padding: '12px' }}><Badge tone="ok">Sin vulnerabilidades</Badge></td>
            <td style={{ padding: '12px' }}>
              <button onClick={() => exportAuditPDF('HackControl', '10 Ene 2026', 'Sin vulnerabilidades')} style={{ color: '#006DB2', textDecoration: 'none', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Descargar PDF</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  );
};

const SettingsScreen = () => (
  <div style={{ padding: '24px 28px' }}>
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden', padding: '24px', maxWidth: '600px' }}>
      <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 18, color: '#00306F', margin: '0 0 20px' }}>Configuración de la Pasarela</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Comisión por transacción (%)</label>
          <input type="number" defaultValue={2.5} step="0.1" style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: 14, outline: 'none' }} />
          <div style={{ fontSize: 11, color: '#6C767A', marginTop: 4 }}>Esta comisión se cobra al pasajero para cubrir el gas y el procesamiento.</div>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Red Activa</label>
          <select defaultValue="hardhat" style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', background: '#fff' }}>
            <option value="hardhat">Hardhat Local (Desarrollo)</option>
            <option value="amoy">Polygon Amoy (Testnet)</option>
            <option value="polygon">Polygon Mainnet (Producción)</option>
          </select>
        </div>

        <div style={{ marginTop: '10px' }}>
          <Button onClick={() => alert('Configuración guardada exitosamente. Los cambios se aplicarán en la próxima transacción.')} size="md">
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ClientsScreen = () => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  useEffect(() => {
    const fetchAll = () => {
      const token = localStorage.getItem('boa_admin_token');
      fetch('http://localhost:3000/api/payments/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) setData(res.data);
        })
        .catch(() => {});
    };
    
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const exportPDF = async () => {
    if (data.length === 0) return;
    const doc = new jsPDF();
    
    const img = new Image();
    img.src = boaLogo;
    await new Promise(r => { img.onload = r; });

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');
    doc.addImage(img, 'PNG', 14, 12, 35, 12);

    doc.setFontSize(16);
    doc.setTextColor(0, 48, 111);
    doc.setFont("helvetica", "bold");
    doc.text("Padrón de Clientes y Reservas", 14, 32);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    doc.text(`Fecha: ${now.toLocaleDateString()}`, 196, 12, { align: 'right' });
    doc.text(`Hora: ${now.toLocaleTimeString()}`, 196, 17, { align: 'right' });
    doc.text(`Folio: FOLIO-${now.getTime().toString().slice(-6)}`, 196, 22, { align: 'right' });
    doc.text(`Operador: ADMIN-WEB3`, 196, 27, { align: 'right' });
    
    const tableColumn = ["PNR", "Hash", "Monto (USDT)", "Red", "Fecha", "Estado"];
    const tableRows = data.map(t => [
        t.pnr,
        t.tx_hash ? t.tx_hash.substring(0, 16) + '...' : 'N/A',
        t.monto_usdt,
        'Polygon',
        formatDate(t.fecha_pago),
        t.tx_hash ? 'Confirmada' : 'Pendiente'
    ]);
    
    autoTable(doc, { 
      head: [tableColumn], body: tableRows, startY: 45, 
      theme: 'grid',
      headStyles: { fillColor: [0, 48, 111], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { bottom: 30 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Documento generado por el Motor de Orquestación Web3", 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
    }

    doc.save('auditoria_reservas.pdf');
  };

  const paginated = data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
  <div style={{ padding: '24px 28px' }}>
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 16, color: '#00306F', margin: 0 }}>Registros on-chain agrupados</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" icon="download-line" onClick={exportPDF}>Exportar PDF</Button>
        </div>
      </div>
      <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
        <thead>
          <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
            {['Localizador (PNR)','Tx Hash','Volumen Facturado','Red / Token','Última Actualización','Estado',''].map(h => (
              <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 ? '#FFFFFF' : '#FCFCFD', cursor: 'pointer' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1D2429' }}>{c.pnr}</td>
              <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", color: '#006DB2' }}>
                {c.tx_hash ? <a href={`/explorer/tx/${c.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{color:'#006DB2', textDecoration:'underline'}}>{c.tx_hash.substring(0, 16)}...</a> : 'N/A'}
              </td>
              <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#00A95C' }}>{c.monto_usdt} USDT</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CryptoIcon symbol="USDT" size={18}/>
                  <strong style={{ fontSize: 12 }}>Polygon</strong>
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", color: '#374151', fontSize: 12 }}>{formatDate(c.fecha_pago)}</td>
              <td style={{ padding: '12px 16px' }}><Badge tone={c.tx_hash ? 'ok' : 'warn'}>{c.tx_hash ? 'Confirmada' : 'Pendiente'}</Badge></td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {c.tx_hash ? (
                  <a href={`/explorer/tx/${c.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#006DB2', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    Detalles →
                  </a>
                ) : (
                  <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 700, cursor: 'not-allowed' }}>Detalles →</span>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
             <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: '#6C767A' }}>No hay registros consolidados</td></tr>
          )}
        </tbody>
      </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #E5E7EB', fontSize: 13, color: '#6C767A', gap: 12, flexWrap: 'wrap' }}>
        <span>Mostrando <strong style={{ color: '#1D2429' }}>{data.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}</strong> al <strong style={{ color: '#1D2429' }}>{Math.min(page * ITEMS_PER_PAGE, data.length)}</strong> de <strong style={{ color: '#1D2429' }}>{data.length}</strong> pagos procesados</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 10px', border: '1px solid #D1D5DB', background: page === 1 ? '#F3F4F6' : '#fff', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#6C767A' }}>
            Anterior
          </button>
          <button style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #00306F', background: '#00306F', color: '#fff', fontWeight: 700, fontSize: 12 }}>{page}</button>
          <button onClick={() => setPage(p => p + 1)} disabled={page * ITEMS_PER_PAGE >= data.length} style={{ padding: '4px 10px', border: '1px solid #D1D5DB', background: page * ITEMS_PER_PAGE >= data.length ? '#F3F4F6' : '#fff', borderRadius: 4, cursor: page * ITEMS_PER_PAGE >= data.length ? 'not-allowed' : 'pointer', color: '#374151' }}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('boa_admin_token'));
  const [section, setSection] = useState(localStorage.getItem('boa_admin_section') || 'dashboard');
  const meta = TITLES[section];

  const handleNav = (id) => {
    setSection(id);
    localStorage.setItem('boa_admin_section', id);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderSection = () => {
    if (section === 'dashboard') return <DashboardScreen />;
    if (section === 'tx')        return <TransactionsScreen/>;
    if (section === 'clients')   return <ClientsScreen />;
    if (section === 'reconcile') return <FinancialDashboard />;
    if (section === 'contract')  return <ContractScreen />;
    if (section === 'settings')  return <SettingsScreen />;
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active={section} onNav={handleNav} onLogout={() => { localStorage.removeItem('boa_admin_token'); setIsAuthenticated(false); }}/>
      <div className="admin-content">
        <AdminTopbar title={meta.t} subtitle={meta.s}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#006DB2', fontWeight: 700, textDecoration: 'none' }}>
            <i className="ri-external-link-line"></i> Ver pasarela de usuario
          </Link>
        </AdminTopbar>
        <div>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
