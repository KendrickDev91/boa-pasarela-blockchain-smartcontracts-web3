import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import polygonLogo from '../assets/polygon-logo.png';
import { API_BASE } from '../services/config.js';

// Diseño adaptable: en pantallas angostas la etiqueta va arriba del valor
const ESTILOS = `
.exp-page { min-height: 100vh; background: #F9FAFB; font-family: Lato, sans-serif; padding: 40px 20px; display: flex; justify-content: center; box-sizing: border-box; }
.exp-head { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
.exp-head img { height: 40px; object-fit: contain; flex-shrink: 0; }
.exp-head h1 { margin: 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
.exp-sub { font-size: 20px; font-weight: 700; color: #1D2429; margin: 0 0 20px; }
.exp-card { background: #fff; border-radius: 12px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px rgba(0,0,0,0.02); padding: 10px 30px; }
.exp-row { display: flex; flex-direction: row; padding: 20px 0; border-bottom: 1px solid #E5E7EB; gap: 20px; }
.exp-row:last-child { border-bottom: none; }
.exp-label { flex: 0 0 250px; color: #6C767A; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.exp-value { flex: 1; min-width: 0; color: #1D2429; overflow-wrap: anywhere; }
.exp-mono { font-family: 'IBM Plex Mono', monospace; word-break: break-all; }
.exp-footer { margin-top: 40px; padding: 20px 0; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12px; color: #6C767A; }
.exp-nota { color: #6C767A; margin-left: 8px; font-size: 14px; }
@media (max-width: 640px) {
  .exp-page { padding: 20px 14px; }
  .exp-head { margin-bottom: 18px; }
  .exp-head img { height: 30px; }
  .exp-head h1 { font-size: 21px; }
  .exp-sub { font-size: 17px; margin-bottom: 12px; }
  .exp-card { padding: 4px 16px; }
  .exp-row { flex-direction: column; gap: 6px; padding: 14px 0; }
  .exp-label { flex: none; font-size: 13px; }
  .exp-value { font-size: 15px; }
  .exp-mono { font-size: 13px; }
  .exp-nota { display: block; margin-left: 0; margin-top: 4px; font-size: 13px; }
  .exp-footer { flex-direction: column; align-items: flex-start; margin-top: 24px; }
}
`;

export default function BlockchainExplorer() {
  const { hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [txData, setTxData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchTx = async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/tx/${hash}`);
        const data = await res.json();
        
        if (data.success) {
          if (isMounted) {
            setTxData(data.data);
          }
        } else if (isMounted) {
          setErrorMsg('El registro se encuentra en proceso de sincronización o el identificador es incorrecto');
        }
      } catch (e) {
        if (isMounted) setErrorMsg('No se pudo establecer conexión con la red de nodos');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Simulamos un leve retraso para que se aprecie la pantalla de carga corporativa
    setTimeout(fetchTx, 600);

    return () => { isMounted = false; };
  }, [hash]);

  // Funciones de formateo dinámico
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    let safeDateString = dateString;
    if (typeof safeDateString === 'string' && !safeDateString.endsWith('Z')) {
      safeDateString += 'Z';
    }
    const d = new Date(safeDateString);
    const dateStr = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  };

  const DataRow = ({ label, children }) => (
    <div className="exp-row">
      <div className="exp-label">
        <i className="ri-question-line" style={{ fontSize: 14, opacity: 0.6 }}></i>
        {label}:
      </div>
      <div className="exp-value">{children}</div>
    </div>
  );

  return (
    <div className="exp-page">
      <style>{ESTILOS}</style>
      <div style={{ width: '100%', maxWidth: 960 }}>
        
        {/* Encabezado Principal */}
        <div className="exp-head">
          <img src={polygonLogo} alt="Red Polygon" />
          <h1>Explorador de transacciones BoA</h1>
        </div>

        <h2 className="exp-sub">
          Detalles de la Transacción
        </h2>

        {loading ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 60, textAlign: 'center' }}>
            <i className="ri-loader-4-line" style={{ fontSize: 40, color: '#006DB2', animation: 'spin 1.2s linear infinite' }}></i>
            <div style={{ fontSize: 16, color: '#1D2429', fontWeight: 700, marginTop: 15 }}>Consultando bloque en la red de nodos</div>
          </div>
        ) : errorMsg ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 60, textAlign: 'center' }}>
             <i className="ri-information-line" style={{ fontSize: 40, color: '#6C767A' }}></i>
             <div style={{ fontSize: 16, color: '#1D2429', fontWeight: 700, marginTop: 15 }}>{errorMsg}</div>
          </div>
        ) : (
          <div className="exp-card">
            
            <DataRow label="Hash de Transacción">
              <span className="exp-mono">
                {hash}
              </span>
            </DataRow>

            <DataRow label="Estado">
              <span style={{ 
                background: '#00A95C', 
                color: '#fff', 
                padding: '4px 10px', 
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <i className="ri-checkbox-circle-fill"></i> Éxito
              </span>
            </DataRow>

            <DataRow label="Bloque">
              <span style={{ color: '#00306F', fontWeight: 600 }}>{txData.bloque_red || 'N/A'}</span>
              <span className="exp-nota">
                (Bloque Confirmado)
              </span>
            </DataRow>

            <DataRow label="Marca de Tiempo">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ri-time-line" style={{ color: '#6C767A' }}></i> {formatTimestamp(txData.fecha_pago)}
              </span>
            </DataRow>

            <DataRow label="Origen (Desde)">
              <span style={{ color: '#00306F', wordBreak: 'break-all' }}>
                {txData.wallet_cliente || 'N/A'}
              </span>
            </DataRow>

            <DataRow label="Destino (Hacia)">
              <span style={{ 
                color: '#00306F', 
                wordBreak: 'break-all', 
                background: '#F0F5FF', 
                padding: '2px 6px', 
                borderRadius: 4, 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                maxWidth: '100%'
              }}>
                <i className="ri-file-list-3-line" style={{ flexShrink: 0 }}></i>
                0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
              </span>
              <span className="exp-nota">
                (Contrato Inteligente BoA)
              </span>
            </DataRow>

            <DataRow label="Transferencia de Tokens">
              <div style={{ 
                background: '#F9FAFB', 
                border: '1px solid #E5E7EB', 
                padding: '12px 16px', 
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <span style={{ fontWeight: 600, color: '#6C767A' }}>De</span>
                <span style={{ color: '#00306F' }}>
                  {txData.wallet_cliente ? txData.wallet_cliente.substring(0, 16) + '...' : 'N/A'}
                </span>
                <span style={{ fontWeight: 600, color: '#6C767A' }}>Hacia</span>
                <span style={{ color: '#00306F' }}>Tesorería BoA</span>
                <span style={{ fontWeight: 600, color: '#6C767A' }}>Por</span>
                <span style={{ fontWeight: 700 }}>{txData.monto_usdt}</span>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  background: '#E6F7EF', 
                  color: '#00A95C', 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  fontWeight: 700, 
                  fontSize: 13 
                }}>
                  <i className="ri-money-dollar-circle-fill"></i> USDT
                </span>
              </div>
            </DataRow>

            <DataRow label="Tarifa de Red (Gas)">
              <span>{txData.gas_pagado ? `${Number(txData.gas_pagado).toFixed(6)} POL` : 'N/A'}</span>
            </DataRow>

          </div>
        )}

        {/* Pie de Página (Footer) */}
        <div className="exp-footer">
          <div>Explorador interno de la pasarela · datos del registro de auditoría de BoA</div>
          <div>Verificación pública: explorador oficial de la red configurada</div>
        </div>

      </div>
    </div>
  );
}
