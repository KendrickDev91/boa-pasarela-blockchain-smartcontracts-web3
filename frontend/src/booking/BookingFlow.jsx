import { Fragment, useState } from 'react';
import { Button } from '../components/primitives.jsx';
import { getDestino, precioBaseRuta } from '../data/destinations.js';

// =========================================================================
// BOOKING FLOW — Pasos 1-5 (Ida / Vuelta / Pasajeros / Extras / Resumen)
// =========================================================================

export const STEP_LABELS = ['Vuelo de ida', 'Vuelo de vuelta', 'Pasajeros', 'Personalizar viaje', 'Resumen', 'Pago'];

export const WizardStepPills = ({ current, onJump, tripType = 'roundtrip' }) => (
  <div className="step-pills" style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 0 18px', flexWrap: 'wrap', gap: 0,
  }}>
    {STEP_LABELS.map((s, i) => {
      const skipped = tripType === 'oneway' && i === 1; // "Return flight" no aplica
      const done = i < current && !skipped;
      const active = i === current;
      const pillBg = skipped ? '#F3F4F6' : active ? '#00306F' : done ? '#E0F6FF' : '#EFF2F7';
      const pillFg = skipped ? '#A6ADB3' : active ? '#fff' : done ? '#00306F' : '#849095';
      const dotBg = skipped ? '#D1D5DB' : active ? '#fff' : done ? '#00306F' : '#9CA3AF';
      const dotFg = skipped ? '#fff' : active ? '#00306F' : done ? '#fff' : '#fff';
      const clickable = done && typeof onJump === 'function';
      return (
        <Fragment key={s}>
          <div
            onClick={() => clickable && onJump(i)}
            title={skipped ? 'No aplica para vuelo de solo ida' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: pillBg, color: pillFg,
              padding: '6px 16px 6px 6px', borderRadius: 999,
              fontSize: 13, fontWeight: active ? 700 : 600,
              cursor: clickable ? 'pointer' : 'default',
              opacity: skipped ? .65 : 1,
              textDecoration: skipped ? 'line-through' : 'none',
              transition: 'all .35s cubic-bezier(.16,1,.3,1)',
            }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: dotBg, color: dotFg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {skipped ? <i className="ri-subtract-line" style={{ fontSize: 13 }}></i>
                : done ? <i className="ri-check-line" style={{ fontSize: 13 }}></i>
                : i + 1}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{ width: 28, height: 2, background: done ? '#00306F' : '#E5E7EB', margin: '0 2px', transition: 'background .35s' }}/>
          )}
        </Fragment>
      );
    })}
  </div>
);

export const TripSubHeader = ({ from, to, dateFrom, dateTo, pax, total, onEdit }) => (
  <div style={{
    background: '#00306F', color: '#fff', padding: '14px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 24, flexWrap: 'wrap',
  }}>
    <div>
      <div style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 17, color: '#F8C700', lineHeight: 1.2 }}>
        {from} → {to}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            style={{
              marginLeft: 10, fontSize: 13, color: '#fff', opacity: .85, fontWeight: 400,
              cursor: 'pointer', textDecoration: 'underline',
              background: 'transparent', border: 'none', padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <i className="ri-edit-line" style={{ marginRight: 4 }}></i>Editar
          </button>
        )}
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
    {total != null && (
      <div style={{
        background: '#fff', color: '#00306F', borderRadius: 6,
        padding: '8px 14px', fontSize: 13, fontFamily: 'Lato', fontWeight: 700,
      }}>
        Resumen de compra <span style={{ color: '#00306F', fontWeight: 900 }}>BOB. {total}</span>
        <i className="ri-arrow-down-s-line" style={{ marginLeft: 6 }}></i>
      </div>
    )}
  </div>
);

// =========================================================================
// SCREEN: Outbound / Return flight selection
// =========================================================================

const DateStripCarousel = ({ activeIdx, dates, onPick }) => (
  <div className="date-strip">
    {dates.map((d, i) => {
      const isActive = i === activeIdx;
      return (
        <button key={d.date} onClick={() => onPick(i)} style={{
          background: isActive ? '#00306F' : '#fff',
          color: isActive ? '#fff' : '#1D2429',
          border: `1px solid ${isActive ? '#00306F' : '#D1D5DB'}`,
          borderRadius: 8, padding: '12px 18px', minWidth: 110,
          fontFamily: 'Lato', cursor: 'pointer', textAlign: 'center',
          transition: 'all .2s',
        }}>
          <div style={{ fontSize: 11, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{d.label}</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4, fontFamily: 'Lato', fontVariantNumeric: 'tabular-nums' }}>BOB. {d.price}</div>
        </button>
      );
    })}
  </div>
);

const FlightCard = ({ f, selected, onSelect }) => (
  <div
    onClick={onSelect}
    style={{
      background: '#fff', borderRadius: 8,
      border: `1px solid ${selected ? '#00306F' : '#E5E7EB'}`,
      boxShadow: selected ? '0 0 0 3px rgba(0,48,111,.10)' : '0 2px 8px rgba(0,48,111,.05)',
      marginBottom: 10, transition: 'all .2s', cursor: 'pointer',
    }}
  >
    <div className="flight-card-grid">
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.06em' }}>BoA · {f.id}</div>
        <div style={{ fontSize: 11, color: '#849095', marginTop: 2 }}>{f.aircraft}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 20, color: '#1D2429', fontVariantNumeric: 'tabular-nums' }}>{f.dep}</div>
          <div style={{ fontSize: 12, color: '#6C767A' }}>{f.from}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', color: '#6C767A', fontSize: 11 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ri-flight-takeoff-line" style={{ color: '#00306F' }}></i>
            <span>{f.dur} · {f.stops}</span>
          </div>
          <div style={{ position: 'relative', height: 2, background: '#D1D5DB', margin: '6px 0' }}>
            <span style={{ position: 'absolute', left: 0, top: -3, width: 8, height: 8, background: '#00A95C', borderRadius: '50%' }}></span>
            <span style={{ position: 'absolute', right: 0, top: -3, width: 8, height: 8, background: '#00306F', borderRadius: '50%' }}></span>
          </div>
          <div style={{ color: '#00A95C', fontWeight: 700 }}><i className="ri-luggage-cart-line"></i> {f.baggage}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 20, color: '#1D2429', fontVariantNumeric: 'tabular-nums' }}>{f.arr}</div>
          <div style={{ fontSize: 12, color: '#6C767A' }}>{f.to}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: '#6C767A' }}>Desde</div>
        <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 24, color: '#00306F' }}>BOB. {f.price}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Button variant={selected ? 'primary' : 'outline'} icon={selected ? 'check-line' : null}>
          {selected ? 'Seleccionado' : 'Seleccionar'}
        </Button>
      </div>
    </div>
  </div>
);

// Genera fechas alrededor de la fecha pivote (-1, 0, +1, +2)
const dateStrip = (pivotIso, basePrice) => {
  const pivot = pivotIso ? new Date(pivotIso + 'T00:00:00') : new Date();
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const variations = [-1, 0, 1, 2];
  // factores 1.7, 1.0, 1.4, 1.8 → emula días caros / baratos
  const factors = [1.7, 1.0, 1.4, 1.8];
  return variations.map((delta, i) => {
    const d = new Date(pivot);
    d.setDate(d.getDate() + delta);
    return {
      date: d.toISOString().slice(0, 10),
      label: `${dias[d.getDay()]} ${String(d.getDate()).padStart(2,'0')} ${meses[d.getMonth()]}`,
      price: Math.round(basePrice * factors[i]),
    };
  });
};

// Genera 4 vuelos típicos del día, escalados al precio base de la ruta
const flightsForRoute = (originCode, destCode, basePrice) => {
  const aircraft = ['Boeing 737-800', 'Boeing 737-700', 'Boeing 737-800', 'Boeing 737-MAX'];
  const slots = [
    { id: 'OB-704', dep: '06:30', arr: '07:15', factor: 1.00, dur: '0h 45m' },
    { id: 'OB-712', dep: '10:20', arr: '11:05', factor: 1.23, dur: '0h 45m' },
    { id: 'OB-728', dep: '15:45', arr: '16:35', factor: 1.40, dur: '0h 50m' },
    { id: 'OB-742', dep: '19:10', arr: '19:55', factor: 1.00, dur: '0h 45m' },
  ];
  // Para rutas internacionales, vuelos más largos
  const dest = getDestino(destCode);
  const origin = getDestino(originCode);
  const intl = origin?.region === 'Internacional' || dest?.region === 'Internacional';
  return slots.map((s, i) => ({
    id: s.id,
    dep: s.dep,
    arr: intl ? '—' : s.arr,
    from: originCode,
    to: destCode,
    dur: intl ? '~11h 20m' : s.dur,
    stops: intl ? '1 escala (LIM)' : 'Directo',
    price: Math.round(basePrice * s.factor),
    baggage: '1 maleta',
    aircraft: intl ? 'Boeing 787-9' : aircraft[i],
  }));
};

export const FlightSelectionScreen = ({ kind, originCode, destCode, date, onPick, picked }) => {
  const basePrice = precioBaseRuta(originCode, destCode);
  const DATES = dateStrip(date, basePrice);
  const [activeDate, setActiveDate] = useState(1); // índice 1 = la fecha pivote del usuario

  const FLIGHTS = flightsForRoute(originCode, destCode, DATES[activeDate].price);

  const origin = getDestino(originCode);
  const dest = getDestino(destCode);
  const labelRoute = origin && dest ? `${origin.name} → ${dest.name}` : `${originCode} → ${destCode}`;

  return (
    <div>
      <div style={{
        background: 'linear-gradient(180deg, rgba(0,32,77,.55), rgba(0,48,111,.45)), url("https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1400&q=80") center/cover',
        color: '#fff', borderRadius: 8, padding: '22px 28px', marginBottom: 18,
      }}>
        <div style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 20 }}>
          {kind === 'outbound' ? 'Selecciona tu vuelo de ida' : 'Selecciona tu vuelo de vuelta'}
        </div>
        <div style={{ fontSize: 13, opacity: .9, marginTop: 4 }}>
          {DATES[activeDate].label} · {labelRoute} ({originCode} → {destCode})
        </div>
      </div>

      <DateStripCarousel activeIdx={activeDate} dates={DATES} onPick={setActiveDate}/>

      <h3 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 15, color: '#1D2429', margin: '0 0 12px' }}>
        {FLIGHTS[0]?.stops === 'Directo' ? 'Vuelos directos' : 'Vuelos disponibles'} · {DATES[activeDate].label}
      </h3>

      {FLIGHTS.map(f => (
        <FlightCard key={f.id} f={f} selected={picked && picked.id === f.id} onSelect={() => onPick(f)}/>
      ))}
    </div>
  );
};

// =========================================================================
// SCREEN: Passengers
// =========================================================================

const textInputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
  fontFamily: 'Lato', fontSize: 14, boxSizing: 'border-box', background: '#fff', color: '#1D2429',
};

const Field = ({ label, hint, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#3E484F' }}>{label}</span>
    {children}
    {hint && <span style={{ fontSize: 11, color: '#849095', marginTop: 2, lineHeight: 1.4 }}>{hint}</span>}
  </label>
);

export const PassengersScreen = ({ data, onChange }) => {
  const [freqFlyer, setFreqFlyer] = useState(false);

  return (
  <div>
    <h2 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 19, color: '#1D2429', margin: '0 0 4px' }}>Pasajeros</h2>
    <p style={{ fontSize: 13, color: '#6C767A', margin: '0 0 16px', lineHeight: 1.5 }}>
      Por favor verifica que la información del pasajero sea correcta antes de continuar.
      <span style={{ background: '#00306F', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginLeft: 10 }}>Económica</span>
    </p>

    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,48,111,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1D2429' }}>Pasajero 1 : Adulto</div>
        <i className="ri-arrow-up-s-line" style={{ fontSize: 18, color: '#6C767A' }}></i>
      </div>

      <div style={{ padding: 22 }}>
        <button
          type="button"
          onClick={() => setFreqFlyer(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 13, color: '#3E484F' }}>Agregar número de viajero frecuente</span>
          <span style={{
            width: 36, height: 18, background: freqFlyer ? '#00A95C' : '#D1D5DB',
            borderRadius: 999, position: 'relative', transition: 'background .2s',
          }}>
            <span style={{
              width: 14, height: 14, background: '#fff', borderRadius: '50%',
              position: 'absolute', top: 2, left: freqFlyer ? 20 : 2,
              transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
            }}/>
          </span>
        </button>

        {freqFlyer && (
          <div style={{ marginBottom: 18, maxWidth: 320 }}>
            <Field label="Número BoA Pass" hint="Lo encuentras en tu tarjeta o app BoA Pass.">
              <input placeholder="BP-00000000" style={textInputStyle}/>
            </Field>
          </div>
        )}

        <div className="pax-grid">
          <Field label="Nombres" hint="Ingresa tu(s) nombre(s) exactamente como aparece(n) en tu documento.">
            <input value={data.firstName} onChange={e => onChange('firstName', e.target.value)} style={textInputStyle}/>
          </Field>
          <Field label="Apellidos" hint="Ingresa tu apellido exactamente como aparece en tu documento.">
            <input value={data.lastName} onChange={e => onChange('lastName', e.target.value)} style={textInputStyle}/>
          </Field>
          <Field label="Fecha de nacimiento" hint="Ingresa la fecha de nacimiento">
            <input value={data.dob} onChange={e => onChange('dob', e.target.value)} style={textInputStyle} placeholder="DD/MM/AAAA"/>
          </Field>
          <Field label="Género">
            <select value={data.gender} onChange={e => onChange('gender', e.target.value)} style={textInputStyle}>
              <option>MASCULINO</option><option>FEMENINO</option><option>OTRO</option>
            </select>
          </Field>
          <Field label="Tipo de documento">
            <select value={data.docType} onChange={e => onChange('docType', e.target.value)} style={textInputStyle}>
              <option>Carnet de Identidad</option><option>Pasaporte</option>
            </select>
          </Field>
          <Field label="Número de documento">
            <input value={data.docNum} onChange={e => onChange('docNum', e.target.value)} style={textInputStyle}/>
          </Field>
          <Field label="Correo electrónico">
            <input value={data.email} onChange={e => onChange('email', e.target.value)} style={textInputStyle} type="email"/>
          </Field>
          <Field label="Teléfono celular">
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
              <select style={textInputStyle} defaultValue="BO">
                <option>🇧🇴 +591</option>
              </select>
              <input value={data.phone} onChange={e => onChange('phone', e.target.value)} style={textInputStyle}/>
            </div>
          </Field>
        </div>
      </div>
    </div>
  </div>
  );
};

// =========================================================================
// SCREEN: Customize your trip
// =========================================================================

export const CustomizeScreen = ({ extras, onToggle }) => {
  const OPTIONS = [
    { id: 'baggage', icon: 'luggage-cart-line', title: 'Equipaje extra',         sub: 'Agrega una maleta adicional de 23 kg', price: 120 },
    { id: 'seat',    icon: 'armchair-line',     title: 'Selección de asiento',   sub: 'Elige tu asiento favorito (ventana / pasillo)', price: 45 },
    { id: 'meal',    icon: 'restaurant-line',   title: 'Comida a bordo',         sub: 'Menú caliente con bebida incluida', price: 65 },
    { id: 'insure',  icon: 'shield-check-line', title: 'Seguro de viaje',        sub: 'Cobertura por cancelación o demora', price: 80 },
  ];
  return (
    <div>
      <h2 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 19, color: '#1D2429', margin: '0 0 4px' }}>Personaliza tu viaje</h2>
      <p style={{ fontSize: 13, color: '#6C767A', margin: '0 0 16px', lineHeight: 1.5 }}>
        Agrega servicios adicionales para hacer tu viaje más cómodo.
      </p>

      <div className="customize-grid">
        {OPTIONS.map(o => {
          const on = extras[o.id];
          return (
            <div key={o.id} onClick={() => onToggle(o.id)} style={{
              background: '#fff', borderRadius: 8, padding: '16px 18px', cursor: 'pointer',
              border: `1px solid ${on ? '#00306F' : '#E5E7EB'}`,
              boxShadow: on ? '0 0 0 3px rgba(0,48,111,.08)' : '0 2px 8px rgba(0,48,111,.05)',
              transition: 'all .2s',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: on ? '#00306F' : '#E0F6FF', color: on ? '#fff' : '#00306F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ri-${o.icon}`} style={{ fontSize: 22 }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1D2429' }}>{o.title}</div>
                <div style={{ fontSize: 12, color: '#6C767A', marginTop: 2 }}>{o.sub}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Lato', fontWeight: 900, color: '#00306F', fontSize: 16 }}>+ BOB {o.price}</div>
                <div style={{ fontSize: 11, color: on ? '#00A95C' : '#849095', marginTop: 2, fontWeight: 700 }}>{on ? 'Agregado' : 'Agregar'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// SCREEN: Reservation review
// =========================================================================

export const ReservationScreen = ({ outbound, ret, passenger, total, oneWay, originCode, destCode, dateFrom, dateTo }) => {
  const origin = getDestino(originCode);
  const dest   = getDestino(destCode);
  const nameOrigin = origin?.name || originCode;
  const nameDest   = dest?.name   || destCode;
  return (
  <div>
    <h2 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 19, color: '#1D2429', margin: '0 0 4px' }}>Revisar reserva</h2>
    <p style={{ fontSize: 13, color: '#6C767A', margin: '0 0 16px', lineHeight: 1.5 }}>
      Esta es la información de tu reserva. Verifica que todo esté correcto antes de proceder al pago.
    </p>

    <div style={{
      background: 'linear-gradient(135deg, rgba(0,48,111,.85), rgba(0,93,150,.85)), url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80") center/cover',
      color: '#fff', borderRadius: 8, padding: '20px 24px', marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, color: '#F8C700', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{nameOrigin} → {nameDest}</div>
      <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 24, marginTop: 4 }}>{nameOrigin} a {nameDest}</div>
      <div style={{ fontSize: 13, marginTop: 8, opacity: .95 }}>
        <i className="ri-calendar-line"></i> {dateFrom || '—'} · {outbound ? `${outbound.dep} - ${outbound.arr}` : '—'}
        <span style={{ margin: '0 8px' }}>·</span>
        <i className="ri-user-line"></i> 1 pasajero adulto
        <span style={{ margin: '0 8px' }}>·</span>
        BOB. {outbound ? outbound.price : '—'}
      </div>
    </div>

    {!oneWay && (
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,93,150,.85), rgba(0,109,178,.80)), url("https://images.unsplash.com/photo-1518790315747-91ef4a96d49d?w=1200&q=80") center/cover',
        color: '#fff', borderRadius: 8, padding: '20px 24px', marginBottom: 18,
      }}>
        <div style={{ fontSize: 11, color: '#F8C700', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{nameDest} → {nameOrigin}</div>
        <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 24, marginTop: 4 }}>{nameDest} a {nameOrigin}</div>
        <div style={{ fontSize: 13, marginTop: 8, opacity: .95 }}>
          <i className="ri-calendar-line"></i> {dateTo || '—'} · {ret ? `${ret.dep} - ${ret.arr}` : '—'}
          <span style={{ margin: '0 8px' }}>·</span>
          <i className="ri-user-line"></i> 1 pasajero adulto
          <span style={{ margin: '0 8px' }}>·</span>
          BOB. {ret ? ret.price : '—'}
        </div>
      </div>
    )}

    <div style={{ background: '#fff', borderRadius: 8, padding: '14px 22px', marginTop: 4, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,48,111,.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3E484F', textTransform: 'uppercase', letterSpacing: '.04em' }}>Pasajeros</div>
          <div style={{ fontSize: 14, color: '#1D2429', marginTop: 4 }}>
            Pasajero 1 : {passenger.firstName} {passenger.lastName}
          </div>
        </div>
        <a style={{ color: '#006DB2', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>Ver detalle ▾</a>
      </div>
    </div>

    <div style={{ background: '#fff', borderRadius: 8, padding: '18px 22px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,48,111,.05)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#3E484F', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Detalle de reserva</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#3E484F', marginBottom: 6 }}>
        <span>Tarifa base · 1 adulto</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>BOB. {outbound ? outbound.price : 0}{!oneWay && ret ? ` + ${ret.price}` : ''}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#3E484F', marginBottom: 6 }}>
        <span>Tasas e impuestos aeroportuarios</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>BOB. 87</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#3E484F', marginBottom: 6 }}>
        <span>Servicios adicionales</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>BOB. {Math.max(0, total - (outbound ? outbound.price : 0) - (!oneWay && ret ? ret.price : 0) - 87)}</span>
      </div>
      <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 14, color: '#1D2429' }}>Precio total del viaje</span>
        <span style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 22, color: '#00306F', fontVariantNumeric: 'tabular-nums' }}>BOB. {total}</span>
      </div>
    </div>

    <div style={{ background: '#fff', borderRadius: 8, padding: '18px 22px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,48,111,.05)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1D2429', marginBottom: 10 }}>Condiciones de tarifa</div>
      <ul style={{ fontSize: 12, color: '#3E484F', lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
        <li>Tienes 4 horas a partir del momento actual para realizar el pago.</li>
        <li>Dependiendo de las tarifas obtenidas, no son reembolsables.</li>
        <li>Permite cambios sujetos a las condiciones de tarifa.</li>
        <li>Si no realizas el pago en el tiempo establecido, la reserva se anula automáticamente.</li>
        <li>Equipaje incluido: 1 maleta de bodega + 1 equipaje de mano.</li>
      </ul>
    </div>

    <div style={{ background: '#E0F6FF', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <input type="checkbox" defaultChecked style={{ marginTop: 3 }}/>
      <div style={{ fontSize: 12, color: '#1D2429', lineHeight: 1.5 }}>
        He leído y acepto los <a href="#" style={{ color: '#006DB2', fontWeight: 700, textDecoration: 'none' }}>Términos y condiciones de viaje</a>,
        las <a href="#" style={{ color: '#006DB2', fontWeight: 700, textDecoration: 'none' }}>Condiciones de tarifa</a> y
        el <a href="#" style={{ color: '#006DB2', fontWeight: 700, textDecoration: 'none' }}>Contrato de transporte</a>.
      </div>
    </div>
  </div>
  );
};
