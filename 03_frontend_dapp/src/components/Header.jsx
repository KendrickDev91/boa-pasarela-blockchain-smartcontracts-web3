import { useState } from 'react';
import { SwooshBar } from './primitives.jsx';
import logoUrl from "../assets/boa-logo.png";

const NAV = [
  { label: 'Reserva tu vuelo', icon: 'flight-takeoff-line' },
  { label: 'Check-in', icon: 'qr-code-line' },
  { label: 'Mis reservas', icon: 'ticket-2-line' },
  { label: 'Destinos', icon: 'map-pin-line' },
  { label: 'BoA Pass', icon: 'vip-crown-line' },
  { label: 'Atención al cliente', icon: 'customer-service-2-line' },
];

export default function Header({ onNavClick }) {
  const [active, setActive] = useState('Reserva tu vuelo');
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
      <div style={{ background: '#00306F', color: '#fff', fontSize: 12 }}>
        <div className="header-topbar">
          <div style={{ display: 'flex', gap: 18 }}>
            <span><i className="ri-phone-line" style={{ marginRight: 5 }}></i>901 10 5010</span>
            <span><i className="ri-global-line" style={{ marginRight: 5 }}></i>ES <i className="ri-arrow-down-s-line"></i></span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Agencias</a>
            <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Corporativo</a>
            <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Carga</a>
            <a href="#" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}><i className="ri-user-line" style={{ marginRight: 4 }}></i>Iniciar sesión</a>
          </div>
        </div>
      </div>
      <div className="header-bar">
        <a href="/" onClick={(e) => {
          e.preventDefault();
          sessionStorage.clear();
          window.location.href = '/';
        }} style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logoUrl} alt="Boliviana de Aviación" style={{ height: 44, display: 'block' }}/>
        </a>
        <nav className="header-nav">
          {NAV.map(item => {
            const isActive = item.label === active;
            return (
              <a key={item.label} href="#"
                onClick={(e) => { e.preventDefault(); setActive(item.label); onNavClick && onNavClick(item.label); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 12px', fontSize: 14, fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#00306F' : '#3E484F', textDecoration: 'none',
                  borderBottom: `3px solid ${isActive ? '#00306F' : 'transparent'}`,
                  transition: 'color .2s',
                }}>
                <i className={`ri-${item.icon}`} style={{ fontSize: 16 }}></i>
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
      <SwooshBar height={3}/>
    </header>
  );
}
