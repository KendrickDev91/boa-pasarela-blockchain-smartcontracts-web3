import { Badge, Card, SwooshBar } from './primitives.jsx';
import logoUrl from "../assets/boa-logo.png";

const OFFERS = [
  { route: 'La Paz → Madrid',           price: '689', img: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80', tag: 'Internacional' },
  { route: 'Santa Cruz → Buenos Aires', price: '329', img: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&q=80', tag: 'Destacado' },
  { route: 'Cochabamba → São Paulo',    price: '389', img: 'https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=600&q=80', tag: 'Promoción' },
  { route: 'La Paz → Lima',             price: '215', img: 'https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=600&q=80', tag: 'Nuevo' },
];

export const OfferCards = ({ onCardClick }) => (
  <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#006DB2', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ofertas vigentes</div>
        <h2 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 32, color: '#00306F', margin: '4px 0 0' }}>Vuela más, paga menos</h2>
      </div>
      <a href="#" style={{ color: '#006DB2', fontWeight: 700, fontSize: 14 }}>Ver todas las ofertas →</a>
    </div>
    <div className="offer-grid">
      {OFFERS.map((o, i) => (
        <div key={i}
          onClick={() => onCardClick && onCardClick(o)}
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
          <Card hoverable padded={false} style={{ overflow: 'hidden' }}>
            <div style={{ height: 160, background: `url('${o.img}') center/cover`, position: 'relative' }}>
              <span style={{
                position: 'absolute', top: 12, left: 12, background: '#E11D2C', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>{o.tag}</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1D2429', marginBottom: 4 }}>{o.route}</div>
              <div style={{ fontSize: 12, color: '#6C767A' }}>Desde</div>
              <div style={{ fontFamily: 'Lato', color: '#00306F', display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <span style={{ fontSize: 13 }}>USD</span>
                <span style={{ fontWeight: 900, fontSize: 28 }}>{o.price}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6C767A', marginTop: 4 }}>Ida y vuelta · Equipaje incluido</div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  </section>
);

export const Footer = () => (
  <footer style={{ background: '#00306F', color: '#fff', marginTop: 64 }}>
    <SwooshBar height={4}/>
    <div className="footer-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 24px' }}>
      <div>
        <img src={logoUrl} alt="BoA" style={{ height: 52, filter: 'brightness(0) invert(1)' }}/>
        <p style={{ fontSize: 13, marginTop: 14, opacity: .85, lineHeight: 1.55 }}>
          Boliviana de Aviación · Aerolínea de bandera del Estado Plurinacional de Bolivia.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {['facebook-circle-fill','instagram-line','twitter-x-line','youtube-fill','tiktok-fill'].map(i => (
            <a key={i} href="#" style={{ color: '#fff', fontSize: 20 }}><i className={`ri-${i}`}></i></a>
          ))}
        </div>
      </div>
      <div>
        <h6 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14, color: '#F8C700' }}>Reserva</h6>
        {['Buscar vuelos', 'Ofertas', 'Check-in', 'Equipaje', 'Mascotas a bordo'].map(t =>
          <a key={t} href="#" style={{ display: 'block', fontSize: 13, color: '#fff', opacity: .85, textDecoration: 'none', marginBottom: 8 }}>{t}</a>
        )}
      </div>
      <div>
        <h6 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14, color: '#F8C700' }}>BoA</h6>
        {['Acerca de nosotros', 'Flota', 'BoA Pass', 'Carga', 'Atención al cliente'].map(t =>
          <a key={t} href="#" style={{ display: 'block', fontSize: 13, color: '#fff', opacity: .85, textDecoration: 'none', marginBottom: 8 }}>{t}</a>
        )}
      </div>
      <div>
        <h6 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14, color: '#F8C700' }}>Pagos</h6>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {['visa-fill', 'mastercard-fill', 'paypal-fill'].map(i => (
            <div key={i} style={{ background: '#fff', color: '#00306F', width: 38, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
              <i className={`ri-${i}`} style={{ fontSize: 18 }}></i>
            </div>
          ))}
        </div>
        <Badge tone="warn" icon="coin-line">Próximamente · Cripto</Badge>
      </div>
    </div>
    <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', padding: '16px 24px', fontSize: 12, opacity: .7, textAlign: 'center' }}>
      © 2026 Boliviana de Aviación · Todos los derechos reservados
    </div>
  </footer>
);
