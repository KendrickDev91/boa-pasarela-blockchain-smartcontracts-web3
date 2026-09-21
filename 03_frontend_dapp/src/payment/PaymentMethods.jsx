// =========================================================================
// PAYMENT METHODS — accordion estilo boa.bo (paso 6 únicamente)
// =========================================================================

export const MethodRow = ({ id, expandedId, onToggle, title, logos, children, badge }) => {
  const isOpen = expandedId === id;
  return (
    <div style={{
      background: '#fff', borderRadius: 8,
      border: `1px solid ${isOpen ? '#00306F' : '#E5E7EB'}`,
      marginBottom: 12, overflow: 'hidden',
      transition: 'border-color .2s, box-shadow .25s',
      boxShadow: isOpen ? '0 0 0 3px rgba(0,48,111,.08)' : 'none',
    }}>
      <button onClick={() => onToggle(id)} style={{
        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14,
        textAlign: 'left', fontFamily: 'Lato',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1D2429' }}>{title}</span>
            {badge}
          </div>
          {logos && !isOpen && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {logos.map((L, i) => <span key={i}>{L}</span>)}
            </div>
          )}
        </div>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `2px solid ${isOpen ? '#00306F' : '#D1D5DB'}`,
          background: isOpen ? '#00306F' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .25s', flexShrink: 0,
        }}>
          {isOpen && (
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 7.5 L6 10.5 L11 4.5" fill="none" stroke="#fff" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 16, animation: 'drawCheck .35s ease-out both' }}
              />
            </svg>
          )}
        </div>
      </button>
      <div style={{
        display: isOpen ? 'block' : 'none',
        animation: isOpen ? 'expandIn .35s cubic-bezier(.16,1,.3,1) both' : 'none',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '0 22px 22px', borderTop: '1px dashed #E5E7EB', marginTop: 0 }}>
          <div style={{ paddingTop: 16 }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export const BankLogo = ({ name, bg, fg, txt }) => (
  <div style={{
    width: 82, height: 60,
    background: bg, color: fg, borderRadius: 6,
    border: bg === '#fff' ? '1px solid #E5E7EB' : 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Lato', fontWeight: 800, fontSize: 10, letterSpacing: '.04em',
    cursor: 'pointer', flexShrink: 0,
    transition: 'transform .15s, box-shadow .2s',
    textAlign: 'center', padding: 4, lineHeight: 1.15,
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,48,111,.10)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    {txt || name}
  </div>
);

export const tinyLogo = (text, bg, fg) => (
  <span style={{
    height: 18, padding: '0 6px',
    background: bg, color: fg || '#fff',
    borderRadius: 3, display: 'inline-flex', alignItems: 'center',
    fontFamily: 'Lato', fontWeight: 800, fontSize: 9, letterSpacing: '.04em',
  }}>{text}</span>
);
