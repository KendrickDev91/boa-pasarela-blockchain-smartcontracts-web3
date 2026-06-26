import { useState } from 'react';

// =========================================================================
// PRIMITIVES — átomos compartidos por todo el UI kit BoA
// =========================================================================

export const Button = ({ variant = 'primary', size = 'md', icon, iconRight, children, onClick, disabled, style, type = 'button' }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'Lato, sans-serif', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 6, border: '1px solid transparent',
    transition: 'all .2s cubic-bezier(.16,1,.3,1)', whiteSpace: 'nowrap',
  };
  const variants = {
    primary:  { background: disabled ? '#9CA3AF' : '#00306F', color: '#fff' },
    secondary:{ background: '#0844C5', color: '#fff' },
    outline:  { background: '#fff', color: '#00306F', borderColor: '#00306F' },
    ghost:    { background: 'transparent', color: '#374151' },
    danger:   { background: '#E11D2C', color: '#fff' },
    accent:   { background: '#F08A1D', color: '#fff' },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '10px 18px', fontSize: 14 },
    lg: { padding: '14px 24px', fontSize: 16 },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => { if (!disabled && variant === 'primary') e.currentTarget.style.background = '#00204D'; if (!disabled && variant === 'outline') e.currentTarget.style.background = '#E0F6FF'; }}
      onMouseLeave={e => { if (!disabled && variant === 'primary') e.currentTarget.style.background = '#00306F'; if (!disabled && variant === 'outline') e.currentTarget.style.background = '#fff'; }}
      style={{ ...base, ...variants[variant], ...sizes[size], ...style }}
    >
      {icon && <i className={`ri-${icon}`} style={{ fontSize: '1.15em' }}></i>}
      {children}
      {iconRight && <i className={`ri-${iconRight}`} style={{ fontSize: '1.15em' }}></i>}
    </button>
  );
};

export const Input = ({ label, icon, value, onChange, placeholder, error, type = 'text', style }) => (
  <label style={{ display: 'flex', flexDirection: 'column', ...style }}>
    {label && <span style={{ fontSize: 12, fontWeight: 700, color: '#1D2429', marginBottom: 6 }}>{label}</span>}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
      border: `1px solid ${error ? '#E11D2C' : '#D1D5DB'}`,
      borderRadius: 6, background: '#fff', transition: 'all .2s',
    }}>
      {icon && <i className={`ri-${icon}`} style={{ color: '#6C767A', fontSize: 16 }}></i>}
      <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder}
        style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Lato', fontSize: 14, color: '#1D2429', background: 'transparent' }}/>
    </div>
    {error && <span style={{ fontSize: 12, color: '#E11D2C', marginTop: 4 }}>{error}</span>}
  </label>
);

export const Card = ({ children, style, padded = true, hoverable }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 8,
        boxShadow: hover && hoverable ? '0 12px 28px rgba(0,48,111,.14)' : '0 2px 10px rgba(0,48,111,.06)',
        transform: hover && hoverable ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all .36s cubic-bezier(.16,1,.3,1)',
        padding: padded ? 20 : 0, ...style,
      }}
    >{children}</div>
  );
};

export const Chip = ({ active, icon, children, onClick }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'Lato', fontSize: 13, fontWeight: active ? 700 : 400,
    padding: '6px 12px', border: `1px solid ${active ? '#00306F' : '#D1D5DB'}`,
    borderRadius: 999, color: active ? '#fff' : '#4B5563',
    background: active ? '#00306F' : '#fff', cursor: 'pointer',
    transition: 'all .15s',
  }}>
    {icon && <i className={`ri-${icon}`}></i>}
    {children}
  </button>
);

export const Badge = ({ tone = 'info', icon, children }) => {
  const tones = {
    ok:      { bg: '#E6F7EF', fg: '#00A95C' },
    warn:    { bg: '#FFF4E5', fg: '#F08A1D' },
    err:     { bg: '#FDECEE', fg: '#E11D2C' },
    info:    { bg: '#E0F6FF', fg: '#006DB2' },
    neutral: { bg: '#F3F4F6', fg: '#4B5563' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'Lato', fontSize: 12, fontWeight: 700,
      padding: '4px 10px', borderRadius: 999,
      background: tones.bg, color: tones.fg,
    }}>
      {icon && <i className={`ri-${icon}`}></i>}
      {children}
    </span>
  );
};

export const SwooshBar = ({ height = 4, style }) => (
  <div style={{
    height,
    background: 'linear-gradient(90deg,#E11D2C 0%,#F08A1D 38%,#F8C700 66%,#00A95C 100%)',
    ...style,
  }}/>
);
