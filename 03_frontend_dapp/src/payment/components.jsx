import { Fragment, useState, useEffect } from 'react';

// =========================================================================
// COMPONENTS shared by the Crypto Payment Gateway flow
// =========================================================================

export const StepIndicator = ({ steps, current }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '24px 0' }}>
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <Fragment key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#00A95C' : active ? '#00306F' : '#E5E7EB',
              color: done || active ? '#fff' : '#6C767A',
              fontWeight: 700, fontSize: 14,
              transition: 'all .3s',
            }}>
              {done ? <i className="ri-check-line" style={{ fontSize: 18 }}></i> : i + 1}
            </div>
            <div style={{
              fontSize: 13, fontWeight: active ? 700 : 400,
              color: active ? '#00306F' : done ? '#00A95C' : '#6C767A',
            }}>{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: done ? '#00A95C' : '#E5E7EB', margin: '0 14px', transition: 'background .3s' }}/>
          )}
        </Fragment>
      );
    })}
  </div>
);

export const CRYPTO_ICONS = {
  USDT: (
    <svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.92 17.4v-.01c-.11.01-.68.04-1.95.04-1.02 0-1.74-.03-1.99-.04v.01c-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.66c.26.02.99.07 2.01.07 1.21 0 1.82-.05 1.93-.07v-2.66c3.88.17 6.78.85 6.78 1.66s-2.9 1.49-6.78 1.66m0-3.59v-2.38h5.45V7.79H8.65v3.64H14.1v2.38c-4.43.2-7.76 1.08-7.76 2.13s3.33 1.93 7.76 2.13v7.63h3.82v-7.63c4.42-.2 7.74-1.08 7.74-2.13s-3.32-1.92-7.74-2.13" fill="#fff"/></svg>
  ),
  USDC: (
    <svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="16" fill="#2775CA"/><path d="M16 25.5C10.75 25.5 6.5 21.25 6.5 16S10.75 6.5 16 6.5 25.5 10.75 25.5 16 21.25 25.5 16 25.5zM15.05 21.7v-1.21c-1.95-.27-3.18-1.34-3.27-3.06h1.6c.13.97.86 1.65 2.2 1.79v-2.74l-.41-.1c-1.93-.45-3.25-1.18-3.25-2.93 0-1.65 1.32-2.78 3.13-3v-1.18h1.16v1.18c1.93.24 3.05 1.4 3.13 2.95h-1.55c-.06-.86-.74-1.55-1.74-1.66v2.51l.39.09c2.02.5 3.31 1.27 3.31 3.03 0 1.74-1.41 2.91-3.34 3.14v1.19z" fill="#fff"/></svg>
  ),
  BTC: (
    <svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.5 14c.29-1.94-1.18-2.98-3.2-3.68l.66-2.62-1.6-.4-.64 2.55c-.42-.1-.85-.2-1.28-.3l.65-2.57-1.6-.4-.65 2.62c-.35-.08-.7-.16-1.03-.24v-.01l-2.2-.55-.43 1.7s1.18.27 1.16.29c.65.16.76.59.74.93l-.74 2.99c.04.01.1.03.18.05l-.18-.04-1.04 4.17c-.08.2-.27.49-.72.38.01.02-1.16-.29-1.16-.29l-.79 1.83 2.07.52c.39.1.77.2 1.14.29l-.67 2.65 1.6.4.65-2.62c.43.12.86.22 1.28.33l-.65 2.6 1.6.4.67-2.65c2.74.52 4.79.31 5.66-2.16.7-1.99-.04-3.14-1.48-3.89 1.05-.24 1.84-.93 2.05-2.36zM18.96 18.46c-.5 2-3.86.92-4.95.65l.88-3.5c1.09.27 4.59.81 4.07 2.85zm.5-4.49c-.45 1.82-3.25.9-4.16.67l.79-3.18c.91.23 3.85.65 3.37 2.51z" fill="#fff"/></svg>
  ),
  ETH: (
    <svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="16" fill="#627EEA"/><g fill="#fff" fillRule="nonzero"><path d="M16.498 4v8.87l7.497 3.35z" opacity=".6"/><path d="M16.498 4L9 16.22l7.498-3.35z"/><path d="M16.498 21.968v6.027L24 17.616z" opacity=".6"/><path d="M16.498 27.995v-6.028L9 17.616z"/><path d="M16.498 20.573l7.497-4.353-7.497-3.348z" opacity=".2"/><path d="M9 16.22l7.498 4.353v-7.701z" opacity=".6"/></g></svg>
  ),
};

export const CryptoIcon = ({ symbol, size = 32 }) => (
  <div style={{ width: size, height: size, flexShrink: 0 }}>{CRYPTO_ICONS[symbol]}</div>
);

export const CountdownTimer = ({ seconds, onExpire }) => {
  const [t, setT] = useState(seconds);
  useEffect(() => {
    if (t <= 0) { onExpire && onExpire(); return; }
    const id = setTimeout(() => setT(t - 1), 1000);
    return () => clearTimeout(id);
  }, [t]);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  const warn = t < 60;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 14,
      color: warn ? '#E11D2C' : '#006DB2',
      background: warn ? '#FDECEE' : '#E0F6FF',
      padding: '4px 10px', borderRadius: 999,
    }}>
      <i className="ri-time-line"></i>
      {mm}:{ss}
    </span>
  );
};

export const PulseDot = ({ color = '#F08A1D' }) => (
  <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: .35, animation: 'pulse 1.6s ease-out infinite' }}/>
    <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: color }}/>
    <style>{`@keyframes pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.4);opacity:0} }`}</style>
  </span>
);

export const TxStatus = ({ confirmations, required = 12 }) => {
  const done = confirmations >= required;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', background: done ? '#E6F7EF' : '#FFF4E5',
      border: `1px solid ${done ? '#00A95C' : '#F08A1D'}33`,
      borderRadius: 8,
    }}>
      {done
        ? <i className="ri-checkbox-circle-fill" style={{ color: '#00A95C', fontSize: 22 }}></i>
        : <PulseDot/>}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: done ? '#00A95C' : '#F08A1D' }}>
          {done ? 'Transacción confirmada' : 'Esperando confirmaciones'}
        </div>
        <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{confirmations}/{required}</span> confirmaciones · ETA {done ? '0' : Math.max(1, (required - confirmations) * 12)}s
        </div>
      </div>
    </div>
  );
};

export const DetailRow = ({ label, value, mono, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '8px 0', borderBottom: '1px dashed #E5E7EB' }}>
    <span style={{ fontSize: 13, color: '#6C767A', whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{
      fontSize: 13, color: '#1D2429',
      fontFamily: mono ? "'IBM Plex Mono', monospace" : 'Lato, sans-serif',
      fontWeight: bold ? 700 : 400, whiteSpace: 'nowrap', textAlign: 'right',
    }}>{value}</span>
  </div>
);
