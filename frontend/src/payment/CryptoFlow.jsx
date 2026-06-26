import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/primitives.jsx';
import { CryptoIcon, DetailRow } from './components.jsx';
import { FadeIn, DrawnCheck } from './PaymentChrome.jsx';
import PrintableTicket from './PrintableTicket.jsx';
import { api } from '../services/api.js';
import { ethers } from 'ethers';
import { BOA_PAYMENTS_ADDRESS, BOA_PAYMENTS_ABI, USDT_TOKEN_ADDRESS, ERC20_ABI } from '../constants/contracts.js';

const tieneMetaMask = () => !!window.ethereum;
const explorerTxUrl = (chainId, txHash) => txHash ? `https://amoy.polygonscan.com/tx/${txHash}` : null;

// =========================================================================
// CRYPTO CHECKOUT — sub-flujo dentro de la sección "Pago con cripto"
// Soporta dos caminos cuando hay backend + reserva real (PNR):
//   1. MetaMask: el usuario firma approve + pagarBoleto.
//   2. Simular pago: el backend paga on-chain server-side.
// En ambos, hace polling del estado real hasta 'confirmado' (lo marca el
// listener al detectar el evento PagoRecibido). Sin backend, cae a una
// simulación visual con setTimeout.
// =========================================================================

const CRYPTOS = [
  { sym: 'USDT', name: 'Tether', nets: ['Polygon'], netCheap: 'Polygon', color: '#26A17B',
    pros: 'Stablecoin con paridad 1:1 USD · red Polygon · fee de centavos · liquidación casi instantánea',
    eta: '~30 segundos', popular: true },
];

const PROVIDER_RATES = { USDT: 6.96 };

const CryptoPick = ({ onPick }) => (
  <div>
    <div style={{
      fontSize: 13, color: '#3E484F', marginBottom: 14, lineHeight: 1.55,
      padding: '12px 14px', background: '#E0F6FF', borderRadius: 6,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <i className="ri-shield-check-line" style={{ color: '#006DB2', fontSize: 18, flexShrink: 0, marginTop: 1 }}></i>
      <span>
        BoA acepta pago con criptoactivos como canal complementario.
        El cobro se procesa vía <strong>smart contract auditado</strong>; el equivalente en USD se liquida automáticamente al confirmar la transacción on-chain. <a href="#" style={{ color: '#006DB2', fontWeight: 700 }}>¿Cómo funciona?</a>
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: CRYPTOS.length > 1 ? '1fr 1fr' : '1fr', gap: 10 }}>
      {CRYPTOS.map(c => (
        <button key={c.sym} onClick={() => onPick(c.sym)} style={{
          textAlign: 'left', cursor: 'pointer', background: '#fff',
          border: '1px solid #E5E7EB', borderRadius: 8,
          padding: '16px 18px', fontFamily: 'Lato',
          transition: 'all .2s cubic-bezier(.16,1,.3,1)', position: 'relative',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00306F'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,48,111,.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {c.popular && <span style={{
            position: 'absolute', top: -9, right: 12, background: '#F08A1D', color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: '.06em', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
          }}>Recomendado</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <CryptoIcon symbol={c.sym} size={36}/>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1D2429' }}>
                {c.sym} <span style={{ fontWeight: 400, color: '#6C767A', fontSize: 13 }}>· {c.name}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6C767A' }}>Confirmación {c.eta}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#3E484F', lineHeight: 1.5, marginBottom: 8 }}>{c.pros}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {c.nets.map(n => (
              <span key={n} style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                background: n === c.netCheap ? '#E6F7EF' : '#F3F4F6',
                color: n === c.netCheap ? '#00A95C' : '#4B5563', borderRadius: 999,
              }}>{n}{n === c.netCheap ? ' · más barata' : ''}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  </div>
);

const CryptoCheckout = ({ symbol, totalBob = 933, pnr, direccionPago, montoUSDT, backendDisponible, onBack, onSuccess }) => {
  const c = CRYPTOS.find(x => x.sym === symbol);
  const real = backendDisponible && !!pnr;
  const usd = (totalBob / 10.00).toFixed(2);
  const cryptoAmount = (montoUSDT != null ? Number(montoUSDT) : totalBob / 10.00).toFixed(2);
  const ADDRESS = direccionPago || BOA_PAYMENTS_ADDRESS;

  const [status, setStatus] = useState('waiting'); // waiting | confirming | confirmed
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');
  const [error, setError] = useState('');
  const [chain, setChain] = useState(null); // { chainId, contracts, tesoreria, decimals }
  const [qrMode, setQrMode] = useState('web3'); // 'web3' | 'binance'
  const esRef = useRef(null);

  // Info de cadena (token USDT + chainId) para armar el QR EIP-681.
  useEffect(() => {
    if (!real) return;
    api.chainInfo().then(setChain).catch(() => {});
  }, [real]);

  // QR EIP-681 real y escaneable (MetaMask) o dirección plana (Binance)
  const amountUnits = Math.round(Number(cryptoAmount) * 1e6); // USDT = 6 decimales
  const qrValue = qrMode === 'web3' && chain?.contracts?.MockUSDT
    ? `ethereum:${chain.contracts.MockUSDT}@${chain.chainId}/transfer?address=${ADDRESS}&uint256=${amountUnits}`
    : ADDRESS;
  const sinMetamask = !tieneMetaMask();

  // Confirmación por PUSH (SSE): el backend empuja el estado cuando el webhook
  // firmado verifica el pago on-chain. NO hay animación automática ni polling.
  useEffect(() => {
    if (!real) return;
    const es = new EventSource(api.streamUrl(pnr));
    esRef.current = es;
    es.addEventListener('pago', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.estadoPago === 'detectado') setStatus('confirming');
        if (d.estadoPago === 'confirmado') {
          setStatus('confirmed');
          es.close();
          setTimeout(() => onSuccess && onSuccess({ txHash: d.txHash, bloque: d.bloque, pnr, chainId: chain?.chainId }), 1200);
        }
      } catch { /* ignora frames mal formados */ }
    });
    es.onerror = () => { /* el navegador reintenta solo */ };
    return () => es.close();
  }, [real, pnr]);

  const pagarSimulado = async () => {
    setError(''); setBusy(true); setStatus('confirming');
    try {
      await api.simularPago(pnr);
      // No marcamos 'confirmado' aquí: esperamos el push verificado por webhook (SSE).
    } catch (e) {
      setError(e.message || 'No se pudo simular el pago'); setStatus('waiting'); setBusy(false);
    }
  };

  const pagarMetaMask = async () => {
    setError(''); setBusy(true);
    try {
      setWalletMsg('Conectando con MetaMask…');
      if (!window.ethereum) throw new Error("MetaMask no detectado");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      setWalletMsg('1/2 Aprobando USDT...');
      const montoFormateado = ethers.parseUnits(cryptoAmount.toString(), 6);
      const usdtContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const txAprobacion = await usdtContract.approve(BOA_PAYMENTS_ADDRESS, montoFormateado);
      await txAprobacion.wait();
      
      setWalletMsg('2/2 Confirmando en Blockchain...');
      const boaContract = new ethers.Contract(BOA_PAYMENTS_ADDRESS, BOA_PAYMENTS_ABI, signer);
      const txPago = await boaContract.pagarBoletaWeb3(pnr, montoFormateado);
      await txPago.wait();
      
      setWalletMsg(''); setStatus('confirming');
      // La confirmación llega por SSE cuando el webhook verifica el evento on-chain.
    } catch (e) {
      console.error(e);
      setWalletMsg(''); setBusy(false);
      setError(e?.reason || e?.message || 'Error al pagar con MetaMask');
    }
  };

  const copyAddr = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // QR real (escaneable) con el logo de USDT al centro. Codifica el URI EIP-681.
  const QR = () => (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <QRCodeSVG value={qrValue} size={200} level="H" bgColor="#ffffff" fgColor="#1D2429"/>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: '50%', padding: 5, display: 'flex',
        boxShadow: '0 0 0 3px #fff',
      }}>
        <CryptoIcon symbol={symbol} size={34}/>
      </div>
    </div>
  );

  const statusMeta = {
    waiting:    { color: '#F08A1D', bg: '#FFF4E5', label: 'Esperando pago',        sub: real ? 'Paga con MetaMask o simula el pago del cliente' : 'Requiere el middleware (backend) para el pago verificado' },
    confirming: { color: '#F08A1D', bg: '#FFF4E5', label: 'Verificando pago',      sub: 'Esperando la confirmación del webhook (evento on-chain firmado)…' },
    confirmed:  { color: '#00A95C', bg: '#E6F7EF', label: 'Pago confirmado',       sub: 'Verificado por webhook · emitiendo tu boleto…' },
  }[status];

  const accionable = status === 'waiting' && !busy;

  return (
    <FadeIn keyName={`checkout-${symbol}`}>
      <button onClick={onBack} disabled={busy} style={{
        background: 'none', border: 'none', color: '#006DB2', fontSize: 13,
        fontWeight: 700, cursor: busy ? 'default' : 'pointer', padding: 0, marginBottom: 14,
        display: 'inline-flex', alignItems: 'center', gap: 4, opacity: busy ? .5 : 1,
      }}>
        <i className="ri-arrow-left-line"></i> Cambiar criptoactivo
      </button>

      <div className="crypto-checkout-grid">
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            <button onClick={() => setQrMode('web3')} style={{
              flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: qrMode === 'web3' ? '#00306F' : '#F3F4F6', color: qrMode === 'web3' ? '#fff' : '#6C767A', transition: 'all .2s'
            }}>QR para Web3 (MetaMask)</button>
            <button onClick={() => setQrMode('binance')} style={{
              flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: qrMode === 'binance' ? '#00306F' : '#F3F4F6', color: qrMode === 'binance' ? '#fff' : '#6C767A', transition: 'all .2s'
            }}>QR para Exchanges (Binance)</button>
          </div>
          <div style={{
            padding: 14, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
            animation: 'qrFadeIn .4s cubic-bezier(.16,1,.3,1) both', position: 'relative',
          }}>
            <QR/>
            {status === 'waiting' && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 10,
                border: '2px solid rgba(0,48,111,.25)', animation: 'scanRing 2s ease-out infinite',
              }}/>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#6C767A', marginTop: 8 }}>
            <i className="ri-qr-scan-2-line"></i> Escanea con tu wallet
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <CryptoIcon symbol={symbol} size={32}/>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Pagando con {symbol} · {c.name}{pnr && <> · reserva <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#00306F' }}>{pnr}</span></>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 26, color: '#1D2429' }}>{cryptoAmount}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#1D2429' }}>{symbol}</span>
                <span style={{ fontSize: 13, color: '#6C767A' }}>≡ USD {usd}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Red</div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#7B3FE4', color: '#fff', borderRadius: 999,
              padding: '5px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'Lato',
            }}>
              <i className="ri-flashlight-fill" style={{ color: '#F8C700' }}></i> Polygon
            </span>
            <div style={{ fontSize: 11, color: '#849095', marginTop: 6, lineHeight: 1.5 }}>
              Único red soportada. Paga con <strong>USDT sobre Polygon</strong> desde la billetera que prefieras
              (MetaMask, Trust, Phantom…). USDT en otras redes no es compatible.
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Dirección de cobro · tesorería BoA (Polygon)
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
            background: '#F9F9F9', border: '1px solid #E5E7EB', borderRadius: 6, marginTop: 4,
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#1D2429', wordBreak: 'break-all', flex: 1 }}>{ADDRESS}</span>
            <button onClick={copyAddr} style={{
              background: copied ? '#00A95C' : '#00306F', color: '#fff', border: 'none',
              padding: '6px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'background .25s', minWidth: 78,
              display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center',
            }}>
              <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}></i>
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* Acciones de pago */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={pagarMetaMask} disabled={!real || busy || sinMetamask} style={{
                flex: '1 1 180px', background: '#00A95C', color: '#fff',
                border: 'none', borderRadius: 6, padding: '12px', fontSize: 13, fontWeight: 700,
                cursor: real && !busy && !sinMetamask ? 'pointer' : 'not-allowed', fontFamily: 'Lato',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <i className="ri-wallet-3-line"></i> Pagar con MetaMask
            </button>
          </div>

          {walletMsg && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#006DB2', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ri-loader-4-line"></i> {walletMsg}
            </div>
          )}
          {error && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#E11D2C', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <i className="ri-error-warning-line" style={{ marginTop: 1 }}></i> {error}
            </div>
          )}
          {real && sinMetamask && !error && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6C767A', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <i className="ri-information-line" style={{ marginTop: 1 }}></i>
              MetaMask no detectado en este navegador. Instálalo y conéctalo a Polygon.
            </div>
          )}
          {!real && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#B45309', background: '#FFF4E5', border: '1px solid #F8C70044', borderRadius: 6, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <i className="ri-plug-line" style={{ marginTop: 1 }}></i>
              <span>El pago con criptoactivos requiere el <strong>middleware (backend)</strong> y el nodo corriendo. La confirmación se verifica por <strong>webhook firmado</strong> del evento on-chain — no se confirma sola. Levanta el stack para habilitarlo.</span>
            </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 22, padding: '14px 18px', background: statusMeta.bg, color: statusMeta.color,
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14, transition: 'background .4s',
      }}>
        <span style={{ position: 'relative', display: 'inline-block', width: 28, height: 28 }}>
          {status === 'confirmed' ? (
            <i className="ri-checkbox-circle-fill" style={{ fontSize: 28 }}></i>
          ) : status === 'confirming' ? (
            <i className="ri-loader-4-line" style={{ fontSize: 26 }}></i>
          ) : (
            <>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'currentColor', opacity: .25, animation: 'statusPulse 1.5s ease-out infinite' }}/>
              <span style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'currentColor' }}/>
            </>
          )}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{statusMeta.label}</div>
          <div style={{ fontSize: 12, color: '#4B5563', marginTop: 1 }}>{statusMeta.sub}</div>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: '12px 14px', background: '#F0F9FF', borderRadius: 8,
        fontSize: 12, color: '#0369A1', display: 'flex', gap: 8,
      }}>
        <i className="ri-checkbox-circle-fill" style={{ color: '#0284C7', fontSize: 16, flexShrink: 0, marginTop: 1 }}></i>
        <div>
          <strong style={{ color: '#0F172A' }}>100% Compatible:</strong> Escanea este QR directamente desde Binance, Bybit, Takenos, Meru, Wallbit, Airtm, MetaMask o tu billetera favorita.
        </div>
      </div>
    </FadeIn>
  );
};

const CryptoSuccess = ({ symbol, totalBob = 933, txInfo, passenger, route, onReset }) => {
  const c = CRYPTOS.find(x => x.sym === symbol);
  const usd = (totalBob / 10.00).toFixed(2);
  const pnr = txInfo?.pnr || 'HJ3UJV';
  const hash = txInfo?.txHash || '0x9a3f8e21bd4c…d8e';
  const bloque = txInfo?.bloque != null ? `#${txInfo.bloque}` : '#62 891 042';
  const hashCorto = hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
  const urlExplorer = txInfo?.txHash ? `/explorer/tx/${txInfo.txHash}` : null;

  return (
    <div>
      <div className="crypto-success-hero" style={{
        background: 'linear-gradient(135deg, #00A95C 0%, #006DB2 100%)',
        color: '#fff', borderRadius: 10, padding: '32px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,255,255,.2), transparent 60%)' }}/>
        <div style={{ position: 'relative', flexShrink: 0, animation: 'popIn .5s cubic-bezier(.16,1.3,.3,1) both' }}>
          <DrawnCheck size={72} color="#fff"/>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .85 }}>Pago cripto confirmado</div>
          <h2 style={{ fontFamily: 'Lato', fontWeight: 900, fontSize: 26, margin: '4px 0 0', lineHeight: 1.15 }}>Tu boleto fue emitido</h2>
          <div style={{ fontSize: 13, marginTop: 4, opacity: .92 }}>Te enviamos los detalles a tu correo. Código de reserva <strong>{pnr}</strong>.</div>
        </div>
      </div>

      <div style={{ marginTop: 18, padding: '16px 18px', background: '#F9FAFB', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Comprobante on-chain</div>
        <DetailRow label="Criptoactivo" value={`${symbol} · ${c.name}`} bold/>
        <DetailRow label="Tx hash" value={hashCorto} mono/>
        <DetailRow label="Bloque" value={bloque} mono/>
        <DetailRow label="Equivalente" value={`USD ${usd}`} mono/>
        <DetailRow label="Reserva" value={pnr} mono bold/>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, width: '100%' }}>
          <Button
            variant="primary"
            style={{ flex: 1, padding: '14px 24px', fontSize: 15 }}
            onClick={() => {
              setTimeout(() => window.print(), 300);
            }}
          >
            <i className="ri-download-2-line" style={{ marginRight: 8 }}></i>
            Descargar boleto PDF
          </Button>
          <Button
            variant="outline"
            style={{ flex: 1, padding: '14px 24px', fontSize: 15 }}
            onClick={() => window.open(urlExplorer, '_blank')}
            disabled={!urlExplorer}
          >
            <i className="ri-external-link-line" style={{ marginRight: 8 }}></i>
            Auditar en Blockchain
          </Button>
        </div>
      </div>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#006DB2', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          <i className="ri-arrow-go-back-line"></i> Nueva reserva
        </button>
      </div>

      {createPortal(
        <PrintableTicket pnr={pnr} totalUSDT={usd} txHash={hash} passenger={passenger} route={route} />,
        document.body
      )}
    </div>
  );
};

export default function CryptoCheckoutFlow({ totalBob = 933, pnr, direccionPago, montoUSDT, backendDisponible = false, onBack, passenger, route, onReset }) {
  const [phase, setPhase] = useState('pick');
  const [symbol, setSymbol] = useState(null);
  const [txInfo, setTxInfo] = useState(null);

  return (
    <div>
      {phase === 'pick' && (
        <CryptoPick onPick={(s) => { setSymbol(s); setPhase('checkout'); }}/>
      )}
      {phase === 'checkout' && symbol && (
        <CryptoCheckout
          symbol={symbol} totalBob={totalBob}
          pnr={pnr} direccionPago={direccionPago} montoUSDT={montoUSDT} backendDisponible={backendDisponible}
          onBack={() => { setPhase('pick'); setSymbol(null); }}
          onSuccess={(info) => { setTxInfo(info); setPhase('success'); }}/>
      )}
      {phase === 'success' && symbol && (
        <CryptoSuccess symbol={symbol} totalBob={totalBob} txInfo={txInfo} passenger={passenger} route={route} onReset={() => {
          if (onReset) onReset();
        }}/>
      )}
    </div>
  );
}
