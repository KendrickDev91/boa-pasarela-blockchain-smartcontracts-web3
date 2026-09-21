import { useState } from 'react';
import { Button } from './primitives.jsx';
import { DESTINOS } from '../data/destinations.js';

const TripTab = ({ id, active, onClick, children }) => (
  <button onClick={() => onClick(id)} style={{
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '12px 18px', fontFamily: 'Lato', fontSize: 14,
    fontWeight: active ? 700 : 400, color: active ? '#00306F' : '#4B5563',
    borderBottom: `3px solid ${active ? '#00306F' : 'transparent'}`,
  }}>{children}</button>
);

const baseField = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 12px',
  border: '1px solid #D1D5DB', borderRadius: 6,
  background: '#fff', minHeight: 44, boxSizing: 'border-box',
};

const Field = ({ label, icon, children, style }) => (
  <label style={{ display: 'flex', flexDirection: 'column', flex: '1 1 180px', minWidth: 0, ...style }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#1D2429', marginBottom: 6 }}>{label}</span>
    <div style={baseField}>
      {icon && <i className={`ri-${icon}`} style={{ color: '#6C767A', fontSize: 16, flexShrink: 0 }}></i>}
      {children}
    </div>
  </label>
);

const todayPlus = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const DestSelect = ({ value, onChange, exclude }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      border: 'none', outline: 'none', flex: 1, fontFamily: 'Lato', fontSize: 14,
      color: '#1D2429', background: 'transparent', minWidth: 0, cursor: 'pointer',
    }}
  >
    <optgroup label="Bolivia">
      {DESTINOS.filter(d => d.region === 'Bolivia' && d.code !== exclude).map(d => (
        <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
      ))}
    </optgroup>
    <optgroup label="Internacional">
      {DESTINOS.filter(d => d.region === 'Internacional' && d.code !== exclude).map(d => (
        <option key={d.code} value={d.code}>{d.name}, {d.country} ({d.code})</option>
      ))}
    </optgroup>
  </select>
);

export default function HeroSearch({ onSearch }) {
  const [trip, setTrip] = useState('roundtrip'); // 'roundtrip' | 'oneway'
  const [origin, setOrigin] = useState('CBB');
  const [dest, setDest]     = useState('LPB');
  const [depart, setDepart] = useState(todayPlus(14));
  const [ret, setRet]       = useState(todayPlus(21));
  const [pax, setPax]       = useState(1);
  const [directOnly, setDirectOnly] = useState(true);

  const submit = () => {
    onSearch && onSearch({
      trip, origin, dest, depart,
      ret: trip === 'roundtrip' ? ret : null,
      pax, directOnly,
    });
  };

  return (
    <section style={{
      position: 'relative',
      background: `linear-gradient(180deg, rgba(0,32,77,.65), rgba(0,48,111,.55)),
                   url('https://images.unsplash.com/photo-1542296332-2e4473faf563?w=1600&q=80') center/cover`,
      minHeight: 480, padding: '48px 24px 96px', color: '#fff',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ maxWidth: 680, marginBottom: 32, color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .85, marginBottom: 8, color: '#fff' }}>
            Boliviana de Aviación
          </div>
          <h1 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,.25)' }}>
            Conecta Bolivia con<br/>el mundo.
          </h1>
          <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', lineHeight: 1.5, marginTop: 14, opacity: .95, maxWidth: 560, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.25)' }}>
            Vuelos nacionales e internacionales con equipaje incluido y tarifas accesibles.
            Ahora también puedes pagar con criptoactivos.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,48,111,.14)', overflow: 'hidden', color: '#1D2429' }}>
          {/* Tabs (sin Multidestino) */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', padding: '0 12px' }}>
            <TripTab id="roundtrip" active={trip === 'roundtrip'} onClick={setTrip}>Ida y vuelta</TripTab>
            <TripTab id="oneway"    active={trip === 'oneway'}    onClick={setTrip}>Solo ida</TripTab>
          </div>

          {/* Formulario — flex-wrap permite que los campos se acomoden sin desbordar */}
          <div style={{
            padding: 20,
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
          }}>
            <Field label="Origen" icon="flight-takeoff-line">
              <DestSelect value={origin} onChange={setOrigin} exclude={dest}/>
            </Field>

            <Field label="Destino" icon="flight-land-line">
              <DestSelect value={dest} onChange={setDest} exclude={origin}/>
            </Field>

            <Field label="Fecha de ida" icon="calendar-line" style={{ flex: '1 1 140px' }}>
              <input
                type="date"
                value={depart}
                min={todayPlus(0)}
                onChange={(e) => {
                  setDepart(e.target.value);
                  if (e.target.value > ret) setRet(e.target.value);
                }}
                style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Lato', fontSize: 14, color: '#1D2429', background: 'transparent', minWidth: 0 }}
              />
            </Field>

            {trip === 'roundtrip' && (
              <Field label="Fecha de vuelta" icon="calendar-line" style={{ flex: '1 1 140px' }}>
                <input
                  type="date"
                  value={ret}
                  min={depart}
                  onChange={(e) => setRet(e.target.value)}
                  style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Lato', fontSize: 14, color: '#1D2429', background: 'transparent', minWidth: 0 }}
                />
              </Field>
            )}

            <Field label="Pasajeros" icon="user-line" style={{ flex: '0 1 160px' }}>
              <button
                type="button"
                onClick={() => setPax(p => Math.max(1, p - 1))}
                disabled={pax <= 1}
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB',
                  background: '#fff', cursor: pax > 1 ? 'pointer' : 'not-allowed',
                  color: '#1D2429', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, opacity: pax > 1 ? 1 : .5,
                }}
                aria-label="Quitar pasajero"
              ><i className="ri-subtract-line"></i></button>
              <span style={{ flex: 1, textAlign: 'center', fontFamily: 'Lato', fontSize: 14, color: '#1D2429' }}>
                {pax} {pax === 1 ? 'adulto' : 'adultos'}
              </span>
              <button
                type="button"
                onClick={() => setPax(p => Math.min(9, p + 1))}
                disabled={pax >= 9}
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB',
                  background: '#fff', cursor: pax < 9 ? 'pointer' : 'not-allowed',
                  color: '#1D2429', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, opacity: pax < 9 ? 1 : .5,
                }}
                aria-label="Agregar pasajero"
              ><i className="ri-add-line"></i></button>
            </Field>

            <Button size="lg" icon="search-line" onClick={submit} style={{ flex: '0 0 auto', height: 44 }}>
              Buscar
            </Button>
          </div>

          {/* Sin link a BoA Pass */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 20px 16px', fontSize: 13, color: '#6C767A' }}>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={directOnly} onChange={e => setDirectOnly(e.target.checked)}/>
              Solo vuelos directos
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
