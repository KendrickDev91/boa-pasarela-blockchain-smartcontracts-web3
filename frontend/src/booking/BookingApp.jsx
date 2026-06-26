import { useState, useEffect } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { Button } from '../components/primitives.jsx';
import { api } from '../services/api.js';
import Header from '../components/Header.jsx';
import HeroSearch from '../components/HeroSearch.jsx';
import { Footer, OfferCards } from '../components/Sections.jsx';
import {
  WizardStepPills, TripSubHeader,
  FlightSelectionScreen, PassengersScreen, CustomizeScreen, ReservationScreen,
} from './BookingFlow.jsx';
import { RouteHeader, ReservationBanner, PaymentFooter } from '../payment/PaymentChrome.jsx';
import { MethodRow, tinyLogo } from '../payment/PaymentMethods.jsx';
import { ElectronicBankExpand, MobileWalletExpand, CardExpand, QRExpand } from '../payment/methodExpands.jsx';
import { CryptoIcon } from '../payment/components.jsx';
import CryptoCheckoutFlow from '../payment/CryptoFlow.jsx';
import { getDestino, precioBaseRuta } from '../data/destinations.js';
import MockPolygonScan from '../explorer/MockPolygonScan';

// Formatea ISO date (YYYY-MM-DD) → "Sáb 30 May"
const fmtFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2,'0')} ${meses[d.getMonth()]}`;
};

export default function BookingApp() {
  const [screen, setScreen] = useState('home'); // 'home' | 'wizard'
  const [step, setStep] = useState(0);

  const [tripType, setTripType] = useState('roundtrip');
  const [route, setRoute] = useState({
    origin: 'CBB', dest: 'LPB',
    depart: null, ret: null, pax: 1,
  });
  const [outbound, setOutbound] = useState(null);
  const [returnFlight, setReturnFlight] = useState(null);
  const [passenger, setPassenger] = useState({
    firstName: 'Keni', lastName: 'Ramos',
    dob: '01/01/2005', gender: 'MASCULINO',
    docType: 'Carnet de Identidad', docNum: '8484605',
    email: 'KeniRamos@gmail.com', phone: '70264123',
  });
  const [extras, setExtras] = useState({ baggage: false, seat: false, meal: false, insure: false });
  const [expanded, setExpanded] = useState('bank');

  // Reserva real creada en el backend al llegar al paso de pago.
  const [reserva, setReserva] = useState(null); // { pnr, montoStablecoin, direccionBoa }
  const [backendOk, setBackendOk] = useState(false);

  // El total solo se calcula cuando hay vuelo seleccionado (evita mostrar
  // un precio "fantasma" en el paso 0 antes de elegir nada).
  const baseOut = outbound ? outbound.price : 0;
  const baseRet = tripType === 'roundtrip' && returnFlight ? returnFlight.price : 0;
  const extrasTotal = (extras.baggage ? 120 : 0) + (extras.seat ? 45 : 0) + (extras.meal ? 65 : 0) + (extras.insure ? 80 : 0);
  const taxes = outbound ? 87 : 0;
  const total = baseOut + baseRet + extrasTotal + taxes;
  const TASA = 10.00; // BOB por USD/USDT (Ajustado a 10 para resguardar valor)
  const totalUSDT = +(total / TASA).toFixed(2);

  // Al entrar al paso 6 (pago), crea la reserva real en el backend (si está
  // disponible). Si el backend está apagado, el checkout cae a modo simulación.
  useEffect(() => {
    if (step !== 5 || reserva) return;
    let cancel = false;
    (async () => {
      try {
        const r = await api.crearReserva({
          origen: route.origin, destino: route.dest,
          fechaIda: route.depart, fechaVuelta: route.ret, pax: route.pax,
          montoFiat: totalUSDT,
          pasajero: {
            ci: passenger.docNum, nombre: passenger.firstName,
            apellido: passenger.lastName, correo: passenger.email,
          },
        });
        if (!cancel) { setReserva(r); setBackendOk(true); }
      } catch {
        if (!cancel) setBackendOk(false); // backend no disponible → modo demo
      }
    })();
    return () => { cancel = true; };
  }, [step]);

  const setPassengerField = (k, v) => setPassenger(p => ({ ...p, [k]: v }));
  const toggleExtra = (k) => setExtras(e => ({ ...e, [k]: !e[k] }));

  const goNext = () => {
    if (step === 0 && tripType === 'oneway') return setStep(2);
    setStep(s => Math.min(5, s + 1));
  };
  const goBack = () => {
    if (step === 2 && tripType === 'oneway') return setStep(0);
    if (step === 0) return setScreen('home');
    setStep(s => Math.max(0, s - 1));
  };

  const startWizard = (params = {}) => {
    const t = params.trip === 'oneway' ? 'oneway' : 'roundtrip';
    setTripType(t);
    setRoute({
      origin: params.origin || 'CBB',
      dest:   params.dest   || 'LPB',
      depart: params.depart || null,
      ret:    params.ret    || null,
      pax:    params.pax    || 1,
    });
    setOutbound(null);
    setReturnFlight(null);
    setReserva(null);
    setScreen('wizard');
    setStep(0);
  };

  const resetAll = () => {
    setOutbound(null);
    setReturnFlight(null);
    setReserva(null);
    setScreen('home');
    setStep(0);
  };



  if (screen === 'home') {
    return (
      <div>
        <Header/>
        <HeroSearch onSearch={(params) => startWizard(params)}/>
        <OfferCards onCardClick={() => startWizard({ trip: 'roundtrip' })}/>
        <Footer/>
      </div>
    );
  }

  return (
    <BookingContent 
      step={step} setStep={setStep} 
      tripType={tripType} route={route}
      outbound={outbound} returnFlight={returnFlight}
      passenger={passenger} extras={extras}
      expanded={expanded} setExpanded={setExpanded}
      reserva={reserva} backendOk={backendOk}
      total={total} taxes={taxes} baseOut={baseOut} baseRet={baseRet} extrasTotal={extrasTotal}
      setScreen={setScreen} setOutbound={setOutbound} setReturnFlight={setReturnFlight}
      setPassengerField={setPassengerField} toggleExtra={toggleExtra} goNext={goNext} goBack={goBack}
      resetAll={resetAll}
    />
  );
}

function BookingContent({ step, setStep, tripType, route, outbound, returnFlight, passenger, extras, expanded, setExpanded, reserva, backendOk, total, taxes, baseOut, baseRet, extrasTotal, setScreen, setOutbound, setReturnFlight, setPassengerField, toggleExtra, goNext, goBack, resetAll }) {
  const originInfo = getDestino(route.origin);
  const destInfo   = getDestino(route.dest);

  const summary = {
    from: originInfo?.name || route.origin,
    to:   destInfo?.name || route.dest,
    originCode: route.origin,
    destCode:   route.dest,
    dateFrom: fmtFecha(route.depart),
    dateTo:   tripType === 'roundtrip' ? fmtFecha(route.ret) : null,
    pax: `${route.pax} ${route.pax === 1 ? 'adulto' : 'adultos'}`,
    total,
  };

  if (step === 5) {
    return (
      <div>
        <Header/>
        <RouteHeader
          from={summary.from} to={summary.to}
          dateFrom={summary.dateFrom} dateTo={summary.dateTo}
          pax={summary.pax}
          total={`BOB ${total}`}
        />

        <main className="shell" style={{ paddingTop: 0 }}>
          <WizardStepPills current={5} tripType={tripType} onJump={setStep}/>

          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 19, color: '#1D2429', margin: '0 0 4px' }}>Pagar reserva</h2>
            <p style={{ fontSize: 13, color: '#6C767A', margin: 0, lineHeight: 1.5 }}>
              Se ha generado un código de reserva para pago inmediato. Finaliza tu reserva realizando el pago con tu método preferido.
            </p>
          </div>

          <ReservationBanner code={reserva?.pnr || 'HJ3UJV'}/>

          <div style={{ marginTop: 22 }}>
            <h3 style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 15, color: '#1D2429', margin: '0 0 12px' }}>
              Selecciona método de pago
            </h3>

            <MethodRow id="bank" expandedId={expanded} onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              title="Banco electrónico"
              logos={[
                tinyLogo('UNIÓN', '#fff', '#E11D2C'), tinyLogo('BISA', '#FFE600', '#1D2429'),
                tinyLogo('ECO', '#F08A1D', '#fff'), tinyLogo('BNB', '#005D96', '#fff'),
                tinyLogo('MSC', '#2A2520', '#F8C700'), tinyLogo('BC', '#7AB829', '#fff'),
                tinyLogo('FIE', '#fff', '#E11D2C'), tinyLogo('PRODEM', '#fff', '#0067A6'),
              ]}><ElectronicBankExpand/></MethodRow>

            <MethodRow id="wallet" expandedId={expanded} onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              title="Billetera móvil" logos={[tinyLogo('TIGO MONEY', '#001E62', '#fff')]}>
              <MobileWalletExpand/>
            </MethodRow>

            <MethodRow id="card" expandedId={expanded} onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              title="Tarjeta de crédito / débito"
              logos={[tinyLogo('VISA', '#1A1F71', '#F7B600'), tinyLogo('MASTERCARD', '#EB001B', '#fff')]}>
              <CardExpand/>
            </MethodRow>

            <MethodRow id="qr" expandedId={expanded} onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              title="Pago con QR" logos={[tinyLogo('QR SIMPLE', '#1D2429', '#fff')]}>
              <QRExpand/>
            </MethodRow>

            <MethodRow id="crypto" expandedId={expanded} onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              title="Pago con criptoactivos"
              logos={[
                <span key="usdt" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 18, padding: '0 8px 0 4px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 3 }}>
                  <CryptoIcon symbol="USDT" size={14}/>
                  <span style={{ fontFamily: 'Lato', fontWeight: 700, fontSize: 9, color: '#1D2429' }}>USDT</span>
                </span>,
              ]}
            >
              <CryptoCheckoutFlow
                totalBob={total}
                pnr={reserva?.pnr}
                direccionPago={reserva?.direccionBoa}
                montoUSDT={reserva?.montoStablecoin ?? (total / 10.00).toFixed(2)}
                backendDisponible={backendOk}
                passenger={passenger}
                route={route}
                onReset={resetAll}
              />
            </MethodRow>
          </div>

          <div style={{ marginTop: 18 }}>
            <PaymentFooter
              paxCount="1"
              total={`BOB ${total}`}
              breakdown={[
                { label: `Vuelo de ida${outbound ? ` (${outbound.id})` : ''}`, value: `BOB ${baseOut}` },
                ...(tripType === 'roundtrip' ? [{ label: `Vuelo de vuelta${returnFlight ? ` (${returnFlight.id})` : ''}`, value: `BOB ${baseRet}` }] : []),
                ...(extrasTotal > 0 ? [{ label: 'Servicios adicionales', value: `BOB ${extrasTotal}` }] : []),
                { label: 'Tasas e impuestos', value: `BOB ${taxes}` },
                { label: 'Total', value: `BOB ${total}` },
              ]}
            />
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={goBack}
              style={{
                color: '#1D2429', fontSize: 13, textDecoration: 'none', cursor: 'pointer',
                background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit',
              }}>
              <i className="ri-arrow-left-line"></i> Atrás
            </button>
          </div>
        </main>

        {/* ⛔ Footer omitido en el paso 6 — evita navegar fuera del checkout */}
      </div>
    );
  }

  // STEPS 0..4
  return (
    <div>
      <Header/>
      <TripSubHeader
        from={summary.from} to={summary.to}
        dateFrom={summary.dateFrom} dateTo={summary.dateTo}
        pax={summary.pax}
        total={outbound ? total : null}
        onEdit={() => setScreen('home')}
      />

      <main className="shell" style={{ paddingTop: 0 }}>
        <WizardStepPills current={step} tripType={tripType} onJump={setStep}/>

        <div style={{ minHeight: 360 }}>
          {step === 0 && (
            <FlightSelectionScreen
              kind="outbound" originCode={route.origin} destCode={route.dest} date={route.depart}
              onPick={setOutbound} picked={outbound}
            />
          )}
          {step === 1 && (
            <FlightSelectionScreen
              kind="return" originCode={route.dest} destCode={route.origin} date={route.ret}
              onPick={setReturnFlight} picked={returnFlight}
            />
          )}
          {step === 2 && (
            <PassengersScreen data={passenger} onChange={setPassengerField}/>
          )}
          {step === 3 && (
            <CustomizeScreen extras={extras} onToggle={toggleExtra}/>
          )}
          {step === 4 && (
            <ReservationScreen
              outbound={outbound}
              ret={returnFlight}
              passenger={passenger}
              total={total}
              oneWay={tripType === 'oneway'}
              originCode={route.origin}
              destCode={route.dest}
              dateFrom={summary.dateFrom}
              dateTo={summary.dateTo}
            />
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={goBack}
            style={{
              color: '#1D2429', fontSize: 13, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit',
            }}>
            <i className="ri-arrow-left-line"></i> Atrás
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#6C767A' }}>Total estimado</div>
              <div style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 20, color: '#00306F', fontVariantNumeric: 'tabular-nums' }}>
                {outbound ? `BOB ${total}` : <span style={{ color: '#9CA3AF' }}>—</span>}
              </div>
            </div>
            <Button
              variant="primary" size="lg" onClick={goNext}
              disabled={(step === 0 && !outbound) || (step === 1 && tripType === 'roundtrip' && !returnFlight)}
            >
              {step === 4 ? 'Proceder al pago' : 'Continuar'} <i className="ri-arrow-right-line" style={{ marginLeft: 4 }}></i>
            </Button>
          </div>
        </div>
      </main>

      <Footer/>
    </div>
  );
}
