import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/primitives.jsx';
import { generarReportePDF, totales } from './reporteAuditoria.js';

const leer = (k, d = '') => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const campo = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const etiqueta = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 };

/** Lienzo para firmar con el mouse, el lápiz o el dedo */
function PadFirma({ onCambio }) {
  const ref = useRef(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d');
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B2A6F';
  }, []);

  const punto = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [(e.clientX - r.left) * (ref.current.width / r.width), (e.clientY - r.top) * (ref.current.height / r.height)];
  };
  const inicio = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); dibujando.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...punto(e)); };
  const mover = (e) => { if (!dibujando.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...punto(e)); ctx.stroke(); };
  const fin = () => { if (!dibujando.current) return; dibujando.current = false; setVacio(false); onCambio(ref.current.toDataURL('image/png')); };
  const limpiar = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setVacio(true); onCambio(null); };

  return (
    <div>
      <canvas ref={ref} width={600} height={200}
        onPointerDown={inicio} onPointerMove={mover} onPointerUp={fin} onPointerLeave={fin}
        style={{ width: '100%', height: 120, border: '1px dashed #94A3B8', borderRadius: 6, background: '#fff', touchAction: 'none', cursor: 'crosshair' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6C767A', marginTop: 4 }}>
        <span>{vacio ? 'Firme dentro del recuadro' : 'Firma capturada'}</span>
        <button type="button" onClick={limpiar} style={{ background: 'none', border: 'none', color: '#006DB2', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Limpiar firma</button>
      </div>
    </div>
  );
}

export default function ReporteModal({ filas, filtros, onCerrar }) {
  const [datos, setDatos] = useState({
    elaboradoPor: leer('boa_rep_elabora'), cargo: leer('boa_rep_cargo', 'Personal de Finanzas'),
    revisadoPor: leer('boa_rep_revisa'), cargoRevisor: leer('boa_rep_cargo_rev', 'Gerencia de Finanzas'),
  });
  const [firma, setFirma] = useState(null);
  const [conSello, setConSello] = useState(true);
  const [estado, setEstado] = useState('');
  const t = totales(filas);
  const set = (k) => (e) => setDatos({ ...datos, [k]: e.target.value });

  const generar = async () => {
    guardar('boa_rep_elabora', datos.elaboradoPor); guardar('boa_rep_cargo', datos.cargo);
    guardar('boa_rep_revisa', datos.revisadoPor); guardar('boa_rep_cargo_rev', datos.cargoRevisor);
    setEstado('Generando…');
    try {
      const r = await generarReportePDF(filas, { ...filtros, ...datos, firma, conSello });
      setEstado(`Reporte ${r.folio} generado · SHA-256 ${r.sha.slice(0, 16)}…`);
    } catch (e) {
      setEstado(`No se pudo generar el reporte: ${e.message}`);
    }
  };

  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,32,77,.45)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 'min(620px, 100%)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 17, color: '#00306F' }}>Reporte de conciliación firmado</div>
            <div style={{ fontSize: 12, color: '#6C767A' }}>{t.cantidad} pagos · Bs {t.bob.toLocaleString('es-BO', { minimumFractionDigits: 2 })} · {t.usdt.toLocaleString('es-BO', { minimumFractionDigits: 2 })} USDT</div>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6C767A' }}><i className="ri-close-line"></i></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={etiqueta}>Elaborado por</label><input style={campo} value={datos.elaboradoPor} onChange={set('elaboradoPor')} placeholder="Nombre completo" /></div>
          <div><label style={etiqueta}>Cargo</label><input style={campo} value={datos.cargo} onChange={set('cargo')} /></div>
          <div><label style={etiqueta}>Revisado y aprobado por</label><input style={campo} value={datos.revisadoPor} onChange={set('revisadoPor')} placeholder="Nombre completo" /></div>
          <div><label style={etiqueta}>Cargo</label><input style={campo} value={datos.cargoRevisor} onChange={set('cargoRevisor')} /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={etiqueta}>Firma de quien elabora</label>
            <PadFirma onCambio={setFirma} />
          </div>
          <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#374151' }}>
            <input type="checkbox" checked={conSello} onChange={(e) => setConSello(e.target.checked)} /> Incluir sello de conciliación de la Gerencia de Finanzas
          </label>
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#6C767A', background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px' }}>
            El reporte incluye el logo, el periodo y los criterios de filtro, el detalle con la sumatoria, el resumen de conciliación y la huella SHA-256 del contenido como evidencia de auditoría.
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: estado.startsWith('No se') ? '#E11D2C' : '#00A95C' }}>{estado}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={onCerrar}>Cerrar</Button>
            <Button size="sm" icon="file-pdf-line" onClick={generar} disabled={filas.length === 0}>Generar PDF firmado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
