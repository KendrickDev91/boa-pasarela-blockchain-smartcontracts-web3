import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function MockPolygonScan() {
  const { hash } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/explorer/tx/${hash}`);
        const result = await response.json();
        if (result.status === 'SUCCESS') {
          setData(result.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, [hash]);

  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      {/* HEADER */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e7eaf3', padding: '15px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, backgroundColor: '#8247E5', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>P</span>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E2022' }}>PolygonScan</span>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 15px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1E2022', marginBottom: '15px' }}>Transaction Details</h2>

        <div style={{ backgroundColor: '#fff', border: '1px solid #e7eaf3', borderRadius: '8px', padding: '20px', boxShadow: '0 0.5rem 1.2rem rgba(189,197,209,.2)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#77838F' }}>Buscando transacción...</div>
          ) : !data ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#E11D48' }}>
              <i className="ri-error-warning-line" style={{ fontSize: '48px' }}></i>
              <h3 style={{ marginTop: '10px' }}>Transaction Hash not found</h3>
              <p style={{ marginTop: '5px', color: '#77838F' }}>La transacción {hash} no existe en la red local.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', color: '#1E2022' }}>
              
              {/* Row: Transaction Hash */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Transaction Hash:
                </div>
                <div style={{ width: '75%', wordBreak: 'break-all' }}>{data.tx_hash}</div>
              </div>

              {/* Row: Status */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Status:
                </div>
                <div style={{ width: '75%' }}>
                  <span style={{ 
                    backgroundColor: '#00C9A7', color: '#fff', padding: '4px 8px', 
                    borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    <i className="ri-checkbox-circle-fill"></i> Success
                  </span>
                </div>
              </div>

              {/* Row: Block */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Block:
                </div>
                <div style={{ width: '75%', color: '#3498db' }}>{data.bloque_red} <span style={{ color: '#77838F', fontSize: '12px' }}>(2 Block Confirmations)</span></div>
              </div>

              {/* Row: Timestamp */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Timestamp:
                </div>
                <div style={{ width: '75%' }}>
                  <i className="ri-time-line"></i> {new Date(Number(data.datos_completos_nodo.args.timestamp) * 1000).toLocaleString()}
                </div>
              </div>

              {/* Row: From */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> From:
                </div>
                <div style={{ width: '75%', color: '#3498db', wordBreak: 'break-all' }}>
                  {data.datos_completos_nodo.args.cliente}
                </div>
              </div>

              {/* Row: Interacted With (To) */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Interacted With (To):
                </div>
                <div style={{ width: '75%', color: '#3498db', wordBreak: 'break-all' }}>
                  {data.datos_completos_nodo.address} <span style={{ color: '#1E2022' }}>(BoAPayments Contract)</span>
                </div>
              </div>

              {/* Row: ERC20 Tokens Transferred */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> ERC-20 Tokens Transferred:
                </div>
                <div style={{ width: '75%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #e7eaf3' }}>
                    <span style={{ fontWeight: 'bold' }}>From</span>
                    <span style={{ color: '#3498db', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.datos_completos_nodo.args.cliente}</span>
                    <span style={{ fontWeight: 'bold' }}>To</span>
                    <span style={{ color: '#3498db' }}>BoA Treasury</span>
                    <span style={{ fontWeight: 'bold' }}>For</span>
                    <span>{(data.datos_completos_nodo.args.monto / 1000000).toFixed(2)}</span>
                    <div style={{
                      width: 16, height: 16, backgroundColor: '#26A17B', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>T</span>
                    </div>
                    <span style={{ color: '#3498db' }}>Tether USD (USDT)</span>
                  </div>
                </div>
              </div>

              {/* Row: Value */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e7eaf3', paddingBottom: '15px' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Value:
                </div>
                <div style={{ width: '75%' }}>
                  0 ETH <span style={{ color: '#77838F', fontSize: '12px' }}>($0.00)</span>
                </div>
              </div>

              {/* Row: Transaction Fee */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: '25%', color: '#77838F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ri-question-line"></i> Transaction Fee:
                </div>
                <div style={{ width: '75%' }}>
                  0.0010915902 ETH <span style={{ color: '#77838F', fontSize: '12px' }}>($1.82)</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
      
      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #e7eaf3', padding: '20px 0', marginTop: '40px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px', color: '#77838F', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <div>PolygonScan © 2026 | Built by Team Polygon</div>
          <div>Powered by Polygon PoS Chain</div>
        </div>
      </footer>
    </div>
  );
}
