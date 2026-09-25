// =========================================================================
// ADMIN DASHBOARD COMPONENTS — Pasarela Cripto · Panel administrativo BoA
// =========================================================================

export const StatCard = ({ icon, label, value, delta, deltaTone = 'ok', sub }) => {
  const tones = {
    ok:   { bg: '#E6F7EF', fg: '#00A95C' },
    warn: { bg: '#FFF4E5', fg: '#F08A1D' },
    err:  { bg: '#FDECEE', fg: '#E11D2C' },
    info: { bg: '#E0F6FF', fg: '#006DB2' },
  }[deltaTone] || { bg: '#E5E7EB', fg: '#374151' };
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '18px 20px',
      boxShadow: '0 2px 10px rgba(0,48,111,.06)',
      display: 'flex', flexDirection: 'column', gap: 4,
      minHeight: 118,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: '#E0F6FF', color: '#006DB2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}><i className={`ri-${icon}`}></i></div>
        {delta != null && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: tones.bg, color: tones.fg,
            fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 999,
          }}>
            <i className={`ri-${delta >= 0 ? 'arrow-up-line' : 'arrow-down-line'}`}></i>
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#6C767A', marginTop: 4 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 26, color: '#1D2429', letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#849095' }}>{sub}</div>}
    </div>
  );
};

export const AreaChart = ({ data, width = 720, height = 220, accent = '#00306F' }) => {
  const W = width, H = height, padL = 36, padR = 12, padT = 12, padB = 28;
  let maxV = Math.max(...data.map(d => d.v)) * 1.15;
  if (!maxV || maxV <= 0 || !isFinite(maxV)) maxV = 10;
  const xStep = data.length > 1 ? (W - padL - padR) / (data.length - 1) : 0;
  const yOf = v => H - padB - ((v || 0) / maxV) * (H - padT - padB);
  const pts = data.map((d, i) => [padL + i * xStep, yOf(d.v)]);
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${H - padB} L ${pts[0][0]},${H - padB} Z`;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = padT + (i * (H - padT - padB)) / ticks;
        const v = Math.round(maxV - (i * maxV) / ticks);
        return (
          <g key={i}>
            <line x1={padL} y1={y || 0} x2={W - padR} y2={y || 0} stroke="#E5E7EB" strokeWidth="1" strokeDasharray={i === ticks ? 'none' : '3,3'}/>
            <text x={padL - 6} y={(y + 4) || 0} textAnchor="end" fontSize="10" fill="#849095" fontFamily="'IBM Plex Mono', monospace">{v.toLocaleString()}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaG)"/>
      <path d={linePath} fill="none" stroke={accent} strokeWidth="2"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0] || 0} cy={p[1] || 0} r="3" fill="#fff" stroke={accent} strokeWidth="2"/>
      ))}
      {data.map((d, i) => (
        (data.length <= 8 || i % 2 === 0) ? <text key={i} x={(padL + i * xStep) || 0} y={H - 8} textAnchor="middle" fontSize="10" fill="#6C767A" fontFamily="Lato">{d.x}</text> : null
      ))}
    </svg>
  );
};

export const DonutChart = ({ data, size = 180 }) => {
  const total = data.reduce((s, d) => s + d.v, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 8, ir = r - 22;
  let acc = 0;
  const arcs = data.map(d => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.v;
    let end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    if (d.v === total && total > 0) end -= 0.0001; // Fix SVG 360 degree arc collapse
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start),  y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),    y2 = cy + r * Math.sin(end);
    const x3 = cx + ir * Math.cos(end),   y3 = cy + ir * Math.sin(end);
    const x4 = cx + ir * Math.cos(start), y4 = cy + ir * Math.sin(start);
    return {
      ...d,
      pct: (d.v / total) * 100,
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${ir} ${ir} 0 ${large} 0 ${x4} ${y4} Z`,
    };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color}/>)}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#6C767A">Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fontWeight="700" fill="#00306F" fontFamily="'IBM Plex Mono', monospace">{total.toLocaleString()}</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }}/>
            <span style={{ flex: 1, color: '#1D2429', fontWeight: 700 }}>{a.label}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#6C767A' }}>{a.pct.toFixed(1)}%</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1D2429', minWidth: 50, textAlign: 'right' }}>{a.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HBarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px', gap: 12, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: '#1D2429', fontWeight: 700 }}>{d.label}</span>
          <div style={{ height: 16, background: '#F3F4F6', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: '0 auto 0 0', width: `${(d.v / max) * 100}%`,
              background: `linear-gradient(90deg, #006DB2, #00306F)`, borderRadius: 4,
            }}/>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1D2429', textAlign: 'right' }}>{d.v}</span>
        </div>
      ))}
    </div>
  );
};
