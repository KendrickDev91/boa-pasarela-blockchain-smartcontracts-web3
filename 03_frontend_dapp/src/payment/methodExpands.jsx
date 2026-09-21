import { BankLogo } from './PaymentMethods.jsx';

// =========================================================================
// Placeholder content for the non-crypto methods (out of scope)
// =========================================================================

export const ElectronicBankExpand = () => (
  <div>
    <div style={{ textAlign: 'center', fontSize: 13, color: '#6C767A', marginBottom: 14 }}>
      Paga desde la web o desde las oficinas del banco de tu elección.
    </div>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <BankLogo name="UNIÓN"  bg="#fff"     fg="#E11D2C" txt="BANCO UNIÓN"/>
      <BankLogo name="BISA"   bg="#FFE600"  fg="#1D2429" txt="banco bisa"/>
      <BankLogo name="ECO"    bg="#F08A1D"  fg="#fff"    txt="Banco ECOFUTURO"/>
      <BankLogo name="BNB"    bg="#005D96"  fg="#fff"    txt="BNB"/>
      <BankLogo name="MSC"    bg="#2A2520"  fg="#F8C700" txt="Mercantil Santa Cruz"/>
      <BankLogo name="BC"     bg="#7AB829"  fg="#fff"    txt="BANCOMUNIDAD"/>
      <BankLogo name="FIE"    bg="#fff"     fg="#E11D2C" txt="BancoFie"/>
      <BankLogo name="PRODEM" bg="#fff"     fg="#0067A6" txt="prodem"/>
    </div>
    <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#849095' }}>
      Selecciona un banco y serás redirigido a su portal para finalizar el pago.
    </div>
  </div>
);

export const MobileWalletExpand = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ fontSize: 13, color: '#3E484F' }}>
      Paga con tu billetera móvil. Recibirás un enlace de pago por SMS al número registrado.
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{
        background: '#001E62', color: '#fff', padding: '12px 18px',
        borderRadius: 8, fontFamily: 'Lato', fontWeight: 800, fontSize: 16, letterSpacing: '.04em',
      }}>Tigo Money</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#1D2429' }}>
        Número de celular
        <input defaultValue="70264123" readOnly style={{
          display: 'block', width: '100%', marginTop: 4,
          padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
          fontFamily: 'Lato', fontSize: 14, boxSizing: 'border-box',
        }}/>
      </label>
    </div>
  </div>
);

export const CardExpand = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ height: 26, padding: '0 10px', background: '#1A1F71', color: '#F7B600', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontFamily: 'Lato', fontWeight: 900, fontSize: 13, letterSpacing: '.1em' }}>VISA</span>
      <span style={{ height: 26, padding: '0 10px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#EB001B' }}/>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#F79E1B', marginLeft: -6, opacity: .85 }}/>
        <span style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 10, color: '#1D2429', marginLeft: 4 }}>mastercard</span>
      </span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#1D2429' }}>
        Número de tarjeta
        <input placeholder="1234 5678 9012 3456" style={{
          display: 'block', width: '100%', marginTop: 4,
          padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, boxSizing: 'border-box',
        }}/>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#1D2429' }}>
          Vence
          <input placeholder="MM/AA" style={{
            display: 'block', width: '100%', marginTop: 4,
            padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
            fontFamily: 'Lato', fontSize: 14, boxSizing: 'border-box',
          }}/>
        </label>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#1D2429' }}>
          CVV
          <input placeholder="•••" style={{
            display: 'block', width: '100%', marginTop: 4,
            padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
            fontFamily: 'Lato', fontSize: 14, boxSizing: 'border-box',
          }}/>
        </label>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#1D2429' }}>
          Titular
          <input placeholder="Nombre como en la tarjeta" style={{
            display: 'block', width: '100%', marginTop: 4,
            padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
            fontFamily: 'Lato', fontSize: 14, boxSizing: 'border-box',
          }}/>
        </label>
      </div>
    </div>
  </div>
);

export const QRExpand = () => {
  const size = 23;
  const bits = []; let seed = 73;
  for (let i = 0; i < size * size; i++) { seed = (seed * 9301 + 49297) % 233280; bits.push(seed % 2); }
  const finder = (cx, cy) => {
    const cells = [];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const on = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      if (on) cells.push(<rect key={`f${cx}${cy}${x}${y}`} x={cx + x} y={cy + y} width="1" height="1" fill="#1D2429"/>);
    }
    return cells;
  };
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="240" height="240" style={{ background: '#fff' }}>
        {bits.map((b, i) => {
          const x = i % size, y = Math.floor(i / size);
          if ((x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)) return null;
          if (!b) return null;
          return <rect key={i} x={x} y={y} width="1" height="1" fill="#1D2429"/>;
        })}
        {finder(0, 0)}{finder(size - 7, 0)}{finder(0, size - 7)}
      </svg>
      <div style={{ fontSize: 13, color: '#3E484F', maxWidth: 520, margin: '14px auto 0' }}>
        Escanea el código QR con tu app bancaria para completar el pago. Una vez que la transacción sea verificada, emitiremos tu boleto automáticamente.
      </div>
    </div>
  );
};
