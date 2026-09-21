import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import polygonLogo from '../assets/polygon-logo.png';

export default function BlockchainExplorer() {
  const { hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [txData, setTxData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchTx = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/payments/tx/${hash}`);
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

  const DataRow = ({ label, children, isLast }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      padding: '20px 0',
      borderBottom: isLast ? 'none' : '1px solid #E5E7EB',
      gap: 20
    }}>
      <div style={{
        flex: '0 0 250px',
        color: '#6C767A',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <i className="ri-question-line" style={{ fontSize: 14, opacity: 0.6 }}></i>
        {label}:
      </div>
      <div style={{ flex: 1, color: '#1D2429' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', 
      background: '#F9FAFB', 
      fontFamily: 'Lato, sans-serif',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 960 }}>
        
        {/* Encabezado Principal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
          <img src={polygonLogo} alt="PolygonScan" style={{ height: 40, objectFit: 'contain' }} />
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            PolygonScan
          </h1>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1D2429', marginBottom: 20 }}>
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
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            border: '1px solid #E5E7EB', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
            padding: '10px 30px'
          }}>
            
            <DataRow label="Hash de Transacción">
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", wordBreak: 'break-all' }}>
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
              <span style={{ color: '#6C767A', marginLeft: 8, fontSize: 14 }}>
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
                gap: 6
              }}>
                <i className="ri-file-list-3-line"></i>
                0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
              </span>
              <span style={{ color: '#6C767A', marginLeft: 8, fontSize: 14 }}>
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

            <DataRow label="Tarifa de Red (Gas)" isLast>
              <span>0.00109 MATIC</span>
            </DataRow>

          </div>
        )}

        {/* Pie de Página (Footer) */}
        <div style={{
          marginTop: 40,
          padding: '20px 0',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#6C767A',
          background: '#F9FAFB',
        }}>
          <div>PolygonScan © 2026 | Built by Team Polygon</div>
          <div>Powered by Polygon PoS Chain</div>
        </div>

      </div>
    </div>
  );
}
