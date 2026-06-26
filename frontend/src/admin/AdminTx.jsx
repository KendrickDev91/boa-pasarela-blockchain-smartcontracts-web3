import { useState, useMemo, useEffect } from 'react';
import { Button, Chip } from '../components/primitives.jsx';
import { CryptoIcon, DetailRow } from '../payment/components.jsx';
import { api } from '../services/api.js';

// =========================================================================
// TRANSACTIONS TABLE — vista detallada
// =========================================================================

const ALL_TX = [
  { id:'TX-58291', date:'2026-06-15 14:22', client:'María Fernández', email:'m.fernandez@gmail.com',   booking:'BOA-7XF2KQ', route:'CBB → LPB', flight:'OB-704', amountBs: 707.30, amountUSD: 101.45, crypto:'USDT', cryptoAmt:'101.45',   net:'Polygon',  hash:'0x9a3f…3d8e', status:'confirmed', confirmations:24, gas:0.40 },
  { id:'TX-58290', date:'2026-06-15 14:18', client:'Carlos Vargas',   email:'cvargas88@hotmail.com',   booking:'BOA-9KL3WR', route:'LPB → MAD', flight:'OB-770', amountBs: 4789.50, amountUSD: 687.20, crypto:'USDC', cryptoAmt:'687.20',   net:'Polygon',  hash:'0x4d12…9b21', status:'confirmed', confirmations:18, gas:0.41 },
  { id:'TX-58289', date:'2026-06-15 13:58', client:'Andrea Rocha',    email:'a.rocha@empresa.bo',      booking:'BOA-2VBN5T', route:'SCZ → EZE', flight:'OB-741', amountBs: 2298.00, amountUSD: 329.80, crypto:'BTC',  cryptoAmt:'0.005107', net:'Bitcoin',  hash:'0x82a1…3fa9', status:'pending',   confirmations:4,  gas:28 },
  { id:'TX-58288', date:'2026-06-15 13:42', client:'Luis Mamani',     email:'luis.mamani@gmail.com',   booking:'BOA-PT8MX1', route:'CBB → SCZ', flight:'OB-712', amountBs: 555.40,  amountUSD: 79.70,  crypto:'USDT', cryptoAmt:'79.70',    net:'Polygon',  hash:'0x1f8d…6c44', status:'confirmed', confirmations:31, gas:0.39 },
  { id:'TX-58287', date:'2026-06-15 13:15', client:'Roberto Quispe',  email:'r.quispe@bolivia.bo',     booking:'BOA-4ZN9KQ', route:'LPB → GRU', flight:'OB-720', amountBs: 3145.20, amountUSD: 451.30, crypto:'ETH',  cryptoAmt:'0.01867',  net:'Ethereum', hash:'0x55ab…f201', status:'confirmed', confirmations:19, gas:18 },
  { id:'TX-58286', date:'2026-06-15 12:58', client:'Daniela Pinto',   email:'dpinto@uagrm.edu.bo',     booking:'BOA-3MWHX8', route:'SCZ → CBB', flight:'OB-733', amountBs: 491.20,  amountUSD: 70.50,  crypto:'USDT', cryptoAmt:'70.50',    net:'Polygon',  hash:'0xa72f…d810', status:'failed',    confirmations:0,  gas:0 },
  { id:'TX-58285', date:'2026-06-15 12:41', client:'Felipe Salinas',  email:'felipe.s@startup.io',     booking:'BOA-RT9LX2', route:'LPB → LIM', flight:'OB-680', amountBs: 1501.50, amountUSD: 215.40, crypto:'USDC', cryptoAmt:'215.40',   net:'Polygon',  hash:'0x6e2c…b8d3', status:'confirmed', confirmations:28, gas:0.42 },
  { id:'TX-58284', date:'2026-06-15 12:30', client:'Gabriela Soliz',  email:'g.soliz@boa.bo',          booking:'BOA-NM7KL3', route:'CBB → SCZ', flight:'OB-704', amountBs: 619.50,  amountUSD: 88.90,  crypto:'BTC',  cryptoAmt:'0.001371', net:'Bitcoin',  hash:'0xee45…7cb2', status:'expired',   confirmations:0,  gas:0 },
  { id:'TX-58283', date:'2026-06-15 12:09', client:'Iván Choque',     email:'ichoque92@gmail.com',     booking:'BOA-V2BX7H', route:'LPB → CUZ', flight:'OB-621', amountBs: 1980.00, amountUSD: 284.00, crypto:'USDT', cryptoAmt:'284.00',   net:'Polygon',  hash:'0xd391…4e12', status:'confirmed', confirmations:22, gas:0.40 },
  { id:'TX-58282', date:'2026-06-15 11:52', client:'Sofía Mendoza',   email:'sofia.m@hotmail.com',     booking:'BOA-9JR4XK', route:'SCZ → CBB', flight:'OB-728', amountBs: 491.20,  amountUSD: 70.50,  crypto:'USDT', cryptoAmt:'70.50',    net:'Polygon',  hash:'0x7841…29ab', status:'confirmed', confirmations:17, gas:0.41 },
];

const StatusPill = ({ status }) => {
  const map = ({
    confirmed: { tone:'ok',  icon:'checkbox-circle-fill', label:'Confirmada' },
    pending:   { tone:'warn',icon:'time-line',            label:'Pendiente'  },
    detected:  { tone:'info',icon:'eye-line',             label:'Detectada'  },
    failed:    { tone:'err', icon:'close-circle-fill',    label:'Fallida'    },
    expired:   { tone:'err', icon:'close-circle-line',    label:'Expirada'   },
    refunded:  { tone:'info',icon:'arrow-go-back-line',   label:'Reembolsada'},
  })[status] || { tone:'warn', icon:'question-line', label: status };
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

const CryptoTag = ({ sym }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <CryptoIcon symbol={sym} size={18}/>
    <span style={{ fontWeight: 700, fontSize: 12 }}>{sym}</span>
  </span>
);

export default function TransactionsScreen() {
  const [filter, setFilter] = useState('all');
  const [cryptoFilter, setCryptoFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [rows, setRows] = useState(ALL_TX);
  const [source, setSource] = useState('mock'); // 'mock' | 'backend'

  // Intenta cargar transacciones reales del backend; si no responde, usa mock.
  useEffect(() => {
    let cancel = false;
    api.transacciones()
      .then((data) => {
        if (cancel || !Array.isArray(data) || data.length === 0) return;
        setRows(data.map(t => ({ ...t, flight: t.flight || '—', confirmations: t.confirmations ?? (t.status === 'confirmed' ? 12 : 0), gas: t.gas ?? 0 })));
        setSource('backend');
      })
      .catch(() => { /* backend apagado → se queda con mock */ });
    return () => { cancel = true; };
  }, []);

  const filtered = useMemo(() => rows.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (cryptoFilter !== 'all' && t.crypto !== cryptoFilter) return false;
    if (search && !(t.client.toLowerCase().includes(search.toLowerCase()) || t.booking.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [rows, filter, cryptoFilter, search]);

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 2px 10px rgba(0,48,111,.06)', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', minWidth: 280, flex: 1 }}>
          <i className="ri-search-line" style={{ color: '#6C767A' }}></i>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, código de reserva o ID de transacción"
            style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Lato', fontSize: 13, background: 'transparent' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all','Todas'],['confirmed','Confirmadas'],['pending','Pendientes'],['failed','Fallidas'],['expired','Expiradas']].map(([k, l]) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderLeft: '1px solid #E5E7EB', paddingLeft: 12, flexWrap: 'wrap' }}>
          <Chip active={cryptoFilter === 'all'} onClick={() => setCryptoFilter('all')}>Todas</Chip>
          <Chip active={cryptoFilter === 'USDT'} onClick={() => setCryptoFilter('USDT')}>
            <CryptoIcon symbol="USDT" size={16}/> USDT
          </Chip>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
          padding: '4px 10px', borderRadius: 999,
          background: source === 'backend' ? '#E6F7EF' : '#FFF4E5',
          color: source === 'backend' ? '#00A95C' : '#F08A1D',
        }} title={source === 'backend' ? 'Datos sincronizados (Node)' : 'Modo Offline (Solo lectura)'}>
          <i className={source === 'backend' ? "ri-wifi-line" : "ri-wifi-off-line"} style={{ marginRight: 4 }}></i>
          {source === 'backend' ? 'En línea' : 'Desconectado'}
        </span>
        <Button variant="outline" size="sm" icon="download-line">Exportar CSV</Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden' }}>
        <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
              {['ID','Fecha','Cliente','Reserva / Ruta','Monto','Cripto','Estado','Tx'].map(h => (
                <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} onClick={() => setSelectedTx(t)} style={{
                borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                background: selectedTx?.id === t.id ? '#E0F6FF' : (i % 2 ? '#FFFFFF' : '#FCFCFD'),
              }}>
                <td style={{ padding: '11px 14px', fontFamily: "'IBM Plex Mono', monospace", color: '#1D2429', fontWeight: 500, whiteSpace: 'nowrap' }}>{t.id}</td>
                <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{t.date}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1D2429' }}>{t.client}</div>
                  <div style={{ fontSize: 11, color: '#849095' }}>{t.email}</div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#006DB2', fontWeight: 600 }}>{t.booking}</div>
                  <div style={{ fontSize: 11, color: '#849095' }}>{t.route} · {t.flight}</div>
                </td>
                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#1D2429' }}>Bs {t.amountBs.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#849095', fontFamily: "'IBM Plex Mono', monospace" }}>USD {t.amountUSD.toFixed(2)}</div>
                </td>
                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                  <CryptoTag sym={t.crypto}/>
                  <div style={{ fontSize: 11, color: '#849095', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{t.cryptoAmt}</div>
                </td>
                <td style={{ padding: '11px 14px' }}><StatusPill status={t.status}/></td>
                <td style={{ padding: '11px 14px', fontFamily: "'IBM Plex Mono', monospace", color: '#006DB2', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {t.hash !== '—' ? <span>{t.hash} <i className="ri-external-link-line"></i></span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #E5E7EB', fontSize: 13, color: '#6C767A', gap: 12, flexWrap: 'wrap' }}>
          <span>Mostrando <strong style={{ color: '#1D2429' }}>{filtered.length}</strong> de <strong style={{ color: '#1D2429' }}>3 097</strong> transacciones</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ padding: '4px 10px', border: '1px solid #D1D5DB', background: '#fff', borderRadius: 4, cursor: 'pointer', color: '#6C767A' }}><i className="ri-arrow-left-s-line"></i></button>
            {[1, 2, 3, '…', 310].map((p, i) => (
              <button key={i} style={{
                padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid ' + (p === 1 ? '#00306F' : '#D1D5DB'),
                background: p === 1 ? '#00306F' : '#fff',
                color: p === 1 ? '#fff' : '#374151',
                fontWeight: p === 1 ? 700 : 400, fontSize: 12,
              }}>{p}</button>
            ))}
            <button style={{ padding: '4px 10px', border: '1px solid #D1D5DB', background: '#fff', borderRadius: 4, cursor: 'pointer', color: '#374151' }}><i className="ri-arrow-right-s-line"></i></button>
          </div>
        </div>
      </div>

      {selectedTx && (
        <div onClick={() => setSelectedTx(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,32,77,.45)', zIndex: 100 }}>
          <aside className="tx-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em' }}>Detalle de transacción</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 20, color: '#00306F', marginTop: 4 }}>{selectedTx.id}</div>
              </div>
              <button onClick={() => setSelectedTx(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6C767A' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <StatusPill status={selectedTx.status}/>
              <div style={{ marginTop: 18 }}>
                <DetailRow label="Cliente" value={selectedTx.client} bold/>
                <DetailRow label="Email" value={selectedTx.email}/>
                <DetailRow label="Reserva" value={selectedTx.booking} mono bold/>
                <DetailRow label="Ruta" value={`${selectedTx.route} · ${selectedTx.flight}`}/>
                <DetailRow label="Fecha" value={selectedTx.date} mono/>
              </div>
              <div style={{ height: 16 }}/>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Importes</div>
              <DetailRow label="Monto Bs"  value={`Bs ${selectedTx.amountBs.toFixed(2)}`} mono bold/>
              <DetailRow label="Monto USD" value={`USD ${selectedTx.amountUSD.toFixed(2)}`} mono/>
              <DetailRow label="Cripto"    value={`${selectedTx.cryptoAmt} ${selectedTx.crypto}`} mono bold/>
              <DetailRow label="Gas estimado" value={`Bs ${selectedTx.gas.toFixed(2)}`} mono/>
              <div style={{ height: 16 }}/>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>On-chain</div>
              <DetailRow label="Red"            value={selectedTx.net}/>
              <DetailRow label="Tx hash"        value={selectedTx.hash} mono/>
              <DetailRow label="Confirmaciones" value={`${selectedTx.confirmations}/12`} mono/>
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button size="md" icon="external-link-line" style={{ width: '100%' }}>Ver en blockchain explorer</Button>
                <Button variant="outline" size="md" icon="download-line" style={{ width: '100%' }}>Descargar comprobante</Button>
                {selectedTx.status === 'failed' && (
                  <Button variant="danger" size="md" icon="refresh-line" style={{ width: '100%' }}>Reintentar liquidación</Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
