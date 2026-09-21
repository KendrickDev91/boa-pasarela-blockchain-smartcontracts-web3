import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import boaLogo from '../assets/boa-logo.png';

export default function PrintableTicket({ pnr, passenger, route, totalUSDT, txHash }) {
  // Default data from JSON if not provided
  const _passenger = passenger || {
    lastName: "RAMOS",
    firstName: "KENI",
    docNum: "8484605"
  };

  const _route = route || {
    origin: "CBB",
    dest: "TJA",
    depart: "2026-07-07T10:30:00"
  };

  const _pnr = pnr || "7SIDHY";
  const _txHash = txHash || "0x01c06c25489779c9b09d79d329499e272eedc27d2fa2eeca6726219b3dd9943c";
  const _totalUSDT = totalUSDT || 77.60;
  
  const eTicket = "9302400000001";
  const issuedDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  
  // Usar window.location.origin para armar la URL absoluta al explorador local
  const qrUrl = _txHash ? `${window.location.origin}/explorer/tx/${_txHash}` : `https://www.boa.bo/`;

  return (
    <div className="print-wrapper" style={{
      fontFamily: "'Courier New', Courier, monospace",
      color: '#000',
      padding: '25px 40px',
      maxWidth: '850px',
      margin: '0 auto',
      background: '#fff'
    }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: '12px', lineHeight: '1.4' }}>
          <img src={boaLogo} alt="BoA" style={{ height: '35px', marginBottom: '5px' }} />
          <div>NIT 154422029</div>
          <div>EMITIDO/ISSUED {issuedDate}</div>
          <div>IATA 56991266</div>
          <div>BOA VENTAS WEB BOB NIT 154422029</div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <QRCodeSVG value={qrUrl} size={80} level="M" />
        </div>
      </div>

      <div style={{ textAlign: 'center', fontFamily: 'sans-serif', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', margin: '0', letterSpacing: '1px', fontWeight: 'bold' }}>BILLETE ELECTRÓNICO - ELECTRONIC TICKET</h2>
        <h3 style={{ fontSize: '16px', margin: '5px 0 0 0', fontWeight: 'bold' }}>RECIBO DEL PASAJERO - PASSENGER RECEIPT</h3>
      </div>

      {/* PASSENGER SECTION */}
      <div style={{ marginBottom: '20px' }}>
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '40%', paddingBottom: '8px' }}><strong>NOMBRE/NAME</strong></td>
              <td style={{ paddingBottom: '8px' }}>{_passenger.lastName} / {_passenger.firstName}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '8px' }}><strong>IDENTIFICACIÓN/IDENTIFICATION</strong></td>
              <td style={{ paddingBottom: '8px' }}>{_passenger.documentId || _passenger.docNum}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '8px' }}><strong>NRO. BILLETE/TICKET NUMBER</strong></td>
              <td style={{ paddingBottom: '8px' }}>{eTicket}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '8px' }}><strong>LOCALIZADOR/RECORD LOCATOR</strong></td>
              <td style={{ paddingBottom: '8px', color: '#000', fontWeight: 'bold', fontSize: '18px' }}>{_pnr}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ITINERARY TABLE */}
      <div style={{ marginBottom: '25px' }}>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ borderBottom: '1px solid #000' }}>
            <tr>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>ITINERARIO<br/>ITINERARY</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>VUELO<br/>FLIGHT</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>CL<br/>CL</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>SALIDA<br/>DEPARTURE</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>LLEGADA<br/>ARRIVAL</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>BASE TARIFA<br/>FARE BASIS</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>EQP<br/>BAG</th>
              <th style={{ padding: '8px 0', fontWeight: 'bold' }}>ESTADO<br/>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '15px 0 5px 0' }}><strong>Desde / From</strong></td>
              <td style={{ padding: '15px 0 5px 0' }}>OB663</td>
              <td style={{ padding: '15px 0 5px 0' }}>N</td>
              <td style={{ padding: '15px 0 5px 0' }}>{_route.depart ? new Date(_route.depart).toLocaleDateString('en-GB') : '07/07/2026'}</td>
              <td style={{ padding: '15px 0 5px 0' }}>{_route.depart ? new Date(_route.depart).toLocaleDateString('en-GB') : '07/07/2026'}</td>
              <td style={{ padding: '15px 0 5px 0' }}></td>
              <td style={{ padding: '15px 0 5px 0' }}>20K</td>
              <td style={{ padding: '15px 0 5px 0' }}>OK</td>
            </tr>
            <tr>
              <td style={{ padding: '0 0 15px 0' }}>{_route.origin}</td>
              <td></td>
              <td></td>
              <td style={{ padding: '0 0 15px 0' }}>1030</td>
              <td style={{ padding: '0 0 15px 0' }}>1145</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ padding: '15px 0 5px 0' }}><strong>A / To</strong></td>
              <td colSpan={7}></td>
            </tr>
            <tr>
              <td style={{ padding: '0 0 15px 0' }}>{_route.dest}</td>
              <td colSpan={7}></td>
            </tr>
          </tbody>
        </table>
        <div style={{ borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '12px', fontFamily: 'sans-serif' }}>
          No Válido Antes de / Invalid Before: No Válido Después de / Invalid After:
        </div>
        <div style={{ borderTop: '2px solid #000', marginTop: '5px' }}></div>
      </div>

      {/* PAYMENT AND WEB3 DATA */}
      <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
        <div style={{ flex: 1.5 }}>
           <div style={{ marginBottom: '15px' }}>
             <strong>ENDOSOS-RESTRICCIONES<br/>ENDORSEMENT-RESTRICTIONS</strong><br/>
             CI|{_passenger.docNum}|{_passenger.lastName.toUpperCase()}
           </div>
           <div style={{ marginBottom: '15px' }}>
             <strong>FORMA DE PAGO<br/>FORM OF PAYMENT</strong><br/>
             <span style={{ color: '#00A95C', fontWeight: 'bold' }}>CRIPTOACTIVOS (RED POLYGON)</span>
           </div>
           <div style={{ marginBottom: '15px' }}>
             <strong>CÁLCULO DE TARIFA<br/>FARE CALCULATION</strong><br/>
             07JUL26SRZ OB TJA{(_totalUSDT - 12.60).toFixed(2)}USDT{(_totalUSDT - 12.60).toFixed(2)}END
           </div>
           <div style={{ marginBottom: '15px' }}>
             <strong>HASH DE TRANSACCIÓN<br/>TX HASH</strong><br/>
             <span style={{ fontSize: '11px', wordBreak: 'break-all' }}>{_txHash}</span>
           </div>
        </div>

         <div style={{ flex: 1 }}>
           <table style={{ width: '100%', fontSize: '13px' }}>
             <tbody>
               <tr>
                 <td style={{ paddingBottom: '8px' }}><strong>TARIFA AÉREA<br/>BASIC FARE</strong></td>
                 <td style={{ paddingBottom: '8px', verticalAlign: 'bottom' }}>USDT {(_totalUSDT - 12.60).toFixed(2)}</td>
               </tr>
               <tr>
                 <td style={{ paddingBottom: '8px' }}><strong>TASAS<br/>TAXES</strong></td>
                 <td style={{ paddingBottom: '8px', verticalAlign: 'bottom' }}>USDT 12.60</td>
               </tr>
               <tr>
                 <td colSpan={2} style={{ paddingBottom: '8px', fontSize: '11px' }}>
                   USDT 10.60 (USDT 8.00 A7; 2.60 BO)
                 </td>
               </tr>
               <tr>
                 <td style={{ paddingBottom: '8px', paddingTop: '15px' }}><strong>TOTAL</strong></td>
                 <td style={{ paddingBottom: '8px', paddingTop: '15px', fontWeight: 'bold', fontSize: '16px' }}>USDT {_totalUSDT}</td>
               </tr>
             </tbody>
           </table>
           <div style={{ marginTop: '20px', padding: '10px', background: '#00A95C', color: '#fff', textAlign: 'center', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
             ✓ PAGO CONFIRMADO ON-CHAIN
           </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: '25px', fontSize: '10px', fontFamily: 'sans-serif', textAlign: 'justify', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
        El transporte de ciertos materiales peligrosos como aerosoles, pirotecnia y líquidos inflamables a bordo de la aeronave está estrictamente prohibido. Si no comprende estas restricciones, solicite más información. 
        Este boleto ha sido emitido automáticamente mediante un contrato inteligente en la red blockchain Polygon. Conserve este documento como comprobante oficial de su compra en Boliviana de Aviación.
      </div>
    </div>
  );
}
