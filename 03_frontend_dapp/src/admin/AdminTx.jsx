import { useState, useMemo, useEffect } from 'react';
import { Button, Chip } from '../components/primitives.jsx';
import { CryptoIcon, DetailRow } from '../payment/components.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import boaLogo from '../assets/boa-logo.png';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const StatusPill = ({ status }) => {
  const normalized = status ? status.toLowerCase() : 'pendiente';
  const map = {
    confirmado: { tone:'ok',  icon:'checkbox-circle-fill', label:'Confirmada' },
    pendiente:   { tone:'warn',icon:'time-line',            label:'Pendiente'  },
    detectado:  { tone:'info',icon:'eye-line',             label:'Detectada'  },
    fallido:    { tone:'err', icon:'close-circle-fill',    label:'Fallida'    },
  }[normalized] || { tone:'warn', icon:'question-line', label: status };

  const colors = {
    ok:   { bg:'#E6F7EF', fg:'#00A95C' },
    warn: { bg:'#FFF4E5', fg:'#F08A1D' },
    err:  { bg:'#FDECEE', fg:'#E11D2C' },
    info: { bg:'#E0F6FF', fg:'#006DB2' },
  }[map.tone];
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: colors.bg, color: colors.fg,
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
    }}>
      <i className={`ri-${map.icon}`}></i>{map.label}
    </span>
  );
};

export default function TransactionsScreen() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTx, setSelectedTx] = useState(null);
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('loading'); // 'loading' | 'backend' | 'error'
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setPage(1);
  }, [filter, search, dateRange]);

  useEffect(() => {
    let cancel = false;
    
    const fetchTx = () => {
      const token = localStorage.getItem('boa_admin_token');
      fetch('http://localhost:3000/api/payments/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then((result) => {
          if (cancel) return;
          if (result.success) {
              setRows(result.data);
              setSource('backend');
          } else {
              setSource('error');
          }
        })
        .catch(() => { 
            if (!cancel) setSource('error');
        });
    };

    fetchTx();
    const interval = setInterval(fetchTx, 5000);
      
    return () => { 
      cancel = true; 
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => rows.filter(t => {
    const computedStatus = t.tx_hash ? 'confirmado' : 'pendiente';
    if (filter !== 'all' && computedStatus !== filter) return false;
    if (search && !t.pnr.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateRange.start && new Date(t.fecha_pago) < new Date(dateRange.start + 'T00:00:00')) return false;
    if (dateRange.end && new Date(t.fecha_pago) > new Date(dateRange.end + 'T23:59:59')) return false;
    return true;
  }), [rows, filter, search, dateRange]);

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['PNR', 'Hash Tx', 'Monto (USDT)', 'Fecha de Pago', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(t => `${t.pnr},${t.tx_hash || 'N/A'},${t.monto_usdt},${formatDate(t.fecha_pago)},${t.tx_hash ? 'CONFIRMADO' : 'PENDIENTE'}`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transacciones.csv';
    link.click();
  };

  const exportPDF = async () => {
    if (filtered.length === 0) return;
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
    doc.text("Registro Histórico de Transacciones Web3", 14, 32);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    doc.text(`Fecha: ${now.toLocaleDateString()}`, 196, 12, { align: 'right' });
    doc.text(`Hora: ${now.toLocaleTimeString()}`, 196, 17, { align: 'right' });
    doc.text(`Folio: FOLIO-${now.getTime().toString().slice(-6)}`, 196, 22, { align: 'right' });
    doc.text(`Operador: ADMIN-WEB3`, 196, 27, { align: 'right' });

    const headers = ['PNR', 'Hash Tx', 'Monto (USDT)', 'Fecha de Pago', 'Estado'];
    const rowsData = filtered.map(t => [
      t.pnr, t.tx_hash ? t.tx_hash.substring(0,16) + '...' : 'N/A', t.monto_usdt, formatDate(t.fecha_pago), t.tx_hash ? 'CONFIRMADO' : 'PENDIENTE'
    ]);
    
    autoTable(doc, {
      startY: 45, head: [headers], body: rowsData,
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

    doc.save('reporte_transacciones_boa.pdf');
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 2px 10px rgba(0,48,111,.06)', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', minWidth: 220, flex: 1 }}>
          <i className="ri-search-line" style={{ color: '#6C767A' }}></i>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por PNR..."
            style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Lato', fontSize: 13, background: 'transparent' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px' }}>
          <i className="ri-calendar-line" style={{ color: '#6C767A' }}></i>
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'transparent' }}/>
          <span style={{ color: '#6C767A' }}>-</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'transparent' }}/>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all','Todas'],['confirmado','Confirmadas'],['pendiente','Pendientes']].map(([k, l]) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderLeft: '1px solid #E5E7EB', paddingLeft: 12, flexWrap: 'wrap' }}>
            <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
            padding: '4px 10px', borderRadius: 999,
            background: source === 'backend' ? '#E6F7EF' : '#FDECEE',
            color: source === 'backend' ? '#00A95C' : '#E11D2C',
            }}>
            <i className={source === 'backend' ? "ri-wifi-line" : "ri-wifi-off-line"} style={{ marginRight: 4 }}></i>
            {source === 'backend' ? 'En línea' : (source === 'loading' ? 'Conectando...' : 'Desconectado')}
            </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" icon="file-excel-line" onClick={exportCSV}>CSV</Button>
          <Button style={{ background: '#00306F', color: '#fff', border: 'none' }} size="sm" icon="file-pdf-line" onClick={exportPDF}>PDF</Button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden' }}>
        <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
              {['PNR','Hash Tx','Monto (USDT)','Fecha de Pago','Estado'].map(h => (
                <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((t, i) => (
              <tr key={t.pnr} onClick={() => setSelectedTx(t)} style={{
                borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                background: selectedTx?.pnr === t.pnr ? '#E0F6FF' : (i % 2 ? '#FFFFFF' : '#FCFCFD'),
              }}>
                <td style={{ padding: '11px 14px', fontFamily: "'IBM Plex Mono', monospace", color: '#1D2429', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.pnr}</td>
                <td style={{ padding: '11px 14px', color: '#006DB2', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }} onClick={e => e.stopPropagation()}>
                    {t.tx_hash ? <a href={`/explorer/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{color:'#006DB2', textDecoration:'underline'}}>{t.tx_hash.substring(0,16)}...</a> : 'N/A'}
                </td>
                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#1D2429' }}>{t.monto_usdt}</div>
                </td>
                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: '#6C767A' }}>
                  {formatDate(t.fecha_pago)}
                </td>
                <td style={{ padding: '11px 14px' }}><StatusPill status={t.tx_hash ? 'confirmado' : 'pendiente'}/></td>
              </tr>
            ))}
            {filtered.length === 0 && (
                <tr>
                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#6C767A' }}>
                        No se encontraron transacciones registradas en el libro mayor.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderTop: '1px solid #E5E7EB', fontSize: 13, color: '#6C767A', gap: 12, flexWrap: 'wrap' }}>
          <span>Mostrando <strong style={{ color: '#1D2429' }}>{filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}</strong> al <strong style={{ color: '#1D2429' }}>{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</strong> de <strong style={{ color: '#1D2429' }}>{filtered.length}</strong> pagos procesados</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 10px', border: '1px solid #D1D5DB', background: page === 1 ? '#F3F4F6' : '#fff', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#6C767A' }}>
              Anterior
            </button>
            <button style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #00306F', background: '#00306F', color: '#fff', fontWeight: 700, fontSize: 12 }}>{page}</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * ITEMS_PER_PAGE >= filtered.length} style={{ padding: '4px 10px', border: '1px solid #D1D5DB', background: page * ITEMS_PER_PAGE >= filtered.length ? '#F3F4F6' : '#fff', borderRadius: 4, cursor: page * ITEMS_PER_PAGE >= filtered.length ? 'not-allowed' : 'pointer', color: '#374151' }}>
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {selectedTx && (
        <div onClick={() => setSelectedTx(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,32,77,.45)', zIndex: 100 }}>
          <aside className="tx-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em' }}>Reserva PNR</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 20, color: '#00306F', marginTop: 4 }}>{selectedTx.pnr}</div>
              </div>
              <button onClick={() => setSelectedTx(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6C767A' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <StatusPill status={selectedTx.tx_hash ? 'confirmado' : 'pendiente'}/>
              <div style={{ marginTop: 18 }}>
                <DetailRow label="Fecha" value={formatDate(selectedTx.fecha_pago)} mono/>
                <DetailRow label="Monto" value={`${selectedTx.monto_usdt} USDT`} mono bold/>
              </div>
              <div style={{ height: 16 }}/>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>On-chain (Polygon)</div>
              <DetailRow label="Tx hash" value={selectedTx.tx_hash || 'N/A'} mono/>
              
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedTx.tx_hash && (
                  <Button size="md" icon="external-link-line" style={{ width: '100%' }} onClick={() => window.open(`/explorer/tx/${selectedTx.tx_hash}`, '_blank')}>
                    Ver en blockchain explorer
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
