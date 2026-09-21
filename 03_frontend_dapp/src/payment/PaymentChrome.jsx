import { Fragment, useState } from 'react';

// =========================================================================
// PAYMENT CHROME — header navy + step pills + código amarillo + footer
// =========================================================================

export const StepPills = ({ steps, current }) => (
  <div className="step-pills" style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 0, padding: '28px 0 18px', flexWrap: 'wrap',
  }}>
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      const pillBg = active ? '#00306F' : done ? '#E0F6FF' : '#EFF2F7';
      const pillFg = active ? '#fff' : done ? '#00306F' : '#849095';
      const dotBg = active ? '#fff' : done ? '#00306F' : '#9CA3AF';
      const dotFg = active ? '#00306F' : done ? '#fff' : '#fff';
      return (
        <Fragment key={i}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: pillBg, color: pillFg,
            padding: '6px 16px 6px 6px', borderRadius: 999,
            fontSize: 13, fontWeight: active ? 700 : 600,
            transition: 'all .35s cubic-bezier(.16,1,.3,1)',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: dotBg, color: dotFg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              transition: 'all .3s',
            }}>{done ? <i className="ri-check-line" style={{ fontSize: 13 }}></i> : i + 1}</span>
            <span style={{ whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 28, height: 2,
              background: done ? '#00306F' : '#E5E7EB',
              transition: 'background .35s',
              margin: '0 2px',
            }}/>
          )}
        </Fragment>
      );
    })}
  </div>
);

export const ReservationBanner = ({ code }) => (
  <div style={{
    background: '#F8C700',
    color: '#00306F',
    padding: '14px 22px',
    borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 10px rgba(248,199,0,.25)',
    animation: 'slideInY .4s cubic-bezier(.16,1,.3,1) both',
  }}>
    <div style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 18 }}>Código de reserva</div>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em' }}>{code}</div>
  </div>
);

export const RouteHeader = ({ from, to, dateFrom, dateTo, pax, total }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: '#00306F', color: '#fff',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 17, color: '#F8C700', lineHeight: 1.2 }}>
          {from} → {to}
        </div>
        <div style={{ fontSize: 12, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: .95 }}>
          <i className="ri-flight-takeoff-line" style={{ color: '#F8C700' }}></i>
          {dateFrom}
          {dateTo && <>
            <i className="ri-flight-land-line" style={{ color: '#F8C700', marginLeft: 6 }}></i>
            {dateTo}
          </>}
          <span style={{ opacity: .6, margin: '0 4px' }}>·</span>
          <i className="ri-user-line"></i> {pax}
        </div>
      </div>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'transparent', border: '1px solid rgba(255,255,255,.35)',
        color: '#fff', padding: '8px 14px', borderRadius: 6, fontSize: 13,
        fontFamily: 'Lato', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'background .2s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        Resumen de compra <strong style={{ color: '#F8C700' }}>{total}</strong>
        <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`}></i>
      </button>
    </div>
  );
};

export const PaymentFooter = ({ paxCount, total, breakdown }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: '#fff', borderRadius: 8,
      boxShadow: '0 2px 10px rgba(0,48,111,.06)',
      animation: 'slideInY .4s cubic-bezier(.16,1,.3,1) both',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: '#E0F6FF', color: '#00306F', border: 'none',
            padding: '10px 22px', borderRadius: 6,
            fontFamily: 'Lato', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', transition: 'background .2s',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#CDEBFA'}
          onMouseLeave={e => e.currentTarget.style.background = '#E0F6FF'}
        >
          {open ? 'Ocultar detalle' : 'Ver detalle'}
          <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`}></i>
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#6C767A' }}>Tarifa por {paxCount} pasajero · adulto</div>
          <span style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 22, color: '#00306F' }}>{total}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '14px 22px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', animation: 'expandIn .25s ease-out both' }}>
          {breakdown?.length ? breakdown.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#3E484F', padding: '4px 0' }}>
              <span>{b.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{b.value}</span>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: '#6C767A' }}>Detalle de la tarifa disponible en el resumen de la reserva.</div>
          )}
        </div>
      )}
    </div>
  );
};

export const FadeIn = ({ children, keyName }) => (
  <div key={keyName} style={{
    opacity: 1,
    animation: 'fadeIn .35s cubic-bezier(.16,1,.3,1) both',
  }}>
    {children}
  </div>
);

export const DrawnCheck = ({ size = 80, color = '#00A95C' }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="3"
      style={{ strokeDasharray: 226, strokeDashoffset: 226, animation: 'drawCircle .6s ease-out forwards' }}
    />
    <path d="M24 41 L36 52 L56 30" fill="none" stroke={color} strokeWidth="4"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: 'drawCheck2 .4s .55s ease-out forwards' }}
    />
  </svg>
);
