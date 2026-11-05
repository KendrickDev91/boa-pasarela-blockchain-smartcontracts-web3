import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/primitives.jsx';
import { CryptoIcon, DetailRow } from './components.jsx';
import { FadeIn, DrawnCheck } from './PaymentChrome.jsx';
import PrintableTicket from './PrintableTicket.jsx';
import { api } from '../services/api.js';
import { ethers } from 'ethers';
import { BOA_PAYMENTS_ADDRESS, BOA_PAYMENTS_ABI, USDT_TOKEN_ADDRESS, ERC20_ABI, CHAIN_ID, RPC_URL, PUBLIC_RPC_URL, CHAIN_NAME } from '../constants/contracts.js';
import { API_BASE } from '../services/config.js';

const tieneMetaMask = () => !!window.ethereum;
const esNavegadorMovil = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
const explorerTxUrl = (chainId, txHash) => txHash ? `/explorer/tx/${txHash}` : null;

// =========================================================================
// CRYPTO CHECKOUT — sub-flujo dentro de la sección "Pago con cripto"
// Soporta dos caminos cuando hay backend + reserva real (PNR):
//   1. MetaMask: el usuario firma approve + pagarBoleto.
//   2. Operación manual: el backend paga on-chain server-side.
//   3. Web3 puro: el usuario aprueba en su wallet (MetaMask) y se despacha la tx.
// 
// En ambos, hace polling del estado real hasta 'confirmado' (lo marca el
// webhook, no el frontend). Mientras tanto, el usuario ve una animación de carga.
// =========================================================================

const CRYPTOS = [
  { sym: 'USDT', name: 'Tether', nets: ['Polygon'], netCheap: 'Polygon', color: '#26A17B',
    pros: 'Stablecoin con paridad 1:1 USD · red Polygon · fee de centavos · liquidación casi instantánea',
    eta: '~30 segundos', popular: true },
];

const PROVIDER_RATES = { USDT: 6.96 };

const CryptoPick = ({ onPick, onBack }) => (
  <div>
    {onBack && (
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: '#006DB2', fontSize: 13,
        fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 14,
        display: 'inline-flex', alignItems: 'center', gap: 4
      }}>
        <i className="ri-arrow-left-line"></i> Volver a métodos de pago
      </button>
    )}
    <div style={{
      fontSize: 13, color: '#3E484F', marginBottom: 14, lineHeight: 1.55,
      padding: '12px 14px', background: '#E0F6FF', borderRadius: 6,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <i className="ri-shield-check-line" style={{ color: '#006DB2', fontSize: 18, flexShrink: 0, marginTop: 1 }}></i>
      <span>
        BoA acepta pago con criptoactivos como canal complementario.
        El cobro se procesa mediante un <strong>contrato inteligente verificable</strong>; los fondos se transfieren directamente a la tesorería de BoA al confirmarse la transacción. <a href="#" style={{ color: '#006DB2', fontWeight: 700 }}>¿Cómo funciona?</a>
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

const CryptoCheckout = ({ symbol, totalBob = 933, pnr, direccionPago, montoUSDT, cotizacion, backendDisponible, onBack, onSuccess }) => {
  const c = CRYPTOS.find(x => x.sym === symbol);
  const real = backendDisponible && !!pnr && !!cotizacion?.montoUnidades;
  const [status, setStatus] = useState('waiting'); // waiting | confirming | confirmed
  const [busy, setBusy] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');
  const [error, setError] = useState('');
  const [faucetAddr, setFaucetAddr] = useState(null); // billetera sin saldo en la red de pruebas
  const [faucetMsg, setFaucetMsg] = useState('');
  const [chain, setChain] = useState(null); // { chainId, contracts, tesoreria, decimals }
  const [exchangeRate, setExchangeRate] = useState(null);
  const esRef = useRef(null);

  // Consultar la tasa dinámica del oráculo del backend
  useEffect(() => {
    fetch(`${API_BASE}/payments/rate`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tasa) setExchangeRate(data.tasa);
      })
      .catch(console.error);
  }, []);

  // La cotización la fija el servidor intermedio (POST /api/reservas) y queda registrada on-chain
  // con registrarTarifa; el frontend solo la muestra. Sin backend, el monto es solo ilustrativo.
  const rateToUse = cotizacion?.tipoCambio || exchangeRate;
  const cryptoAmount = cotizacion?.montoStablecoin
    ?? (rateToUse ? (Math.ceil((totalBob / rateToUse) * 100) / 100).toFixed(2) : '—');
  const usd = cryptoAmount;
  const ADDRESS = cotizacion?.contrato || BOA_PAYMENTS_ADDRESS;

  useEffect(() => {
    if (!real) return;
    api.chainInfo().then(setChain).catch(() => {});
  }, [real]);

  // QR: enlace profundo que abre esta misma pantalla de pago en el navegador de MetaMask Mobile,
  // donde el pasajero firma approve + pagarBoleto. No se codifica una transferencia directa:
  // un envío simple de USDT no invoca al contrato ni queda asociado al PNR.
  const qrValue = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}?pnr=${pnr || ''}`;
  const sinMetamask = !tieneMetaMask();

  // Confirmación por PUSH (SSE) + Sincronización Activa (Polling)
  useEffect(() => {
    if (!real) return;
    
    // 1. Webhook pasivo SSE (tiempo real)
    const es = new EventSource(api.streamUrl(pnr));
    esRef.current = es;
    es.addEventListener('pago', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.estadoPago === 'detectado') setStatus('confirming');
        if (d.estadoPago === 'confirmado') {
          setStatus('confirmed');
          es.close();
          // Asegurar que recuperamos el tipo_cambio y monto reales de la BD
          fetch(`${API_BASE}/payments/status/${pnr}`)
            .then(r => r.json())
            .then(data => {
              setTimeout(() => onSuccess && onSuccess({ 
                txHash: d.txHash, 
                bloque: d.bloque, 
                pnr, 
                chainId: chain?.chainId,
                rateUsed: data?.data?.tipo_cambio || rateToUse,
                usdAmount: data?.data?.monto_usdt || usd 
              }), 1200);
            })
            .catch(() => {
              // Fallback si falla
              setTimeout(() => onSuccess && onSuccess({ 
                txHash: d.txHash, 
                bloque: d.bloque, 
                pnr, 
                chainId: chain?.chainId,
                rateUsed: rateToUse,
                usdAmount: usd 
              }), 1200);
            });
        }
      } catch { /* ignora frames mal formados */ }
    });
    es.onerror = () => { /* el navegador reintenta solo */ };

    // 2. Polling activo (tolerancia a pérdida de conexión SSE o caída del middleware)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/status/${pnr}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.success && data.data.estado_pago === 'CONFIRMADO') {
          setStatus('confirmed');
          clearInterval(interval);
          if (es) es.close();
          setTimeout(() => onSuccess && onSuccess({ 
            txHash: data.data.tx_hash, 
            bloque: data.data.bloque_red,
            pnr, 
            chainId: chain?.chainId,
            rateUsed: data.data.tipo_cambio || rateToUse,
            usdAmount: data.data.monto_usdt || usd
          }), 1200);
        }
      } catch (err) {
        // Ignorar fallos de red silenciosamente para mantener el polling
      }
    }, 5000);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [real, pnr, chain]);

  // Función auxiliar para esquivar completamente el bug de Promesas Proxy de MetaMask/Vite
  // utilizando el método basado en callbacks (sendAsync) que no devuelve Promesas corruptas.
  // En MetaMask Mobile se usa request (EIP-1193): su sendAsync heredado no entrega bien los parámetros de eth_sendTransaction.
  const callMetaMask = (provider, method, params = []) => {
    return new Promise((resolve, reject) => {
      if (esNavegadorMovil() && typeof provider.request === 'function') {
        provider.request({ method, params }).then(resolve).catch(reject);
        return;
      }
      try {
        provider.sendAsync({ jsonrpc: '2.0', id: Date.now(), method, params }, (err, res) => {
          if (err) return reject(err);
          if (res && res.error) return reject(res.error);
          resolve(res ? res.result : null);
        });
      } catch (e) {
        // Fallback fallback
        provider.request({ method, params }).then(resolve).catch(reject);
      }
    });
  };

  const pagarMetaMask = async () => {
    if (!tieneMetaMask()) {
      alert('Se requiere instalar la billetera oficial para continuar con la operación');
      window.open('https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?pli=1', '_blank');
      return;
    }

    setError(''); setBusy(true);
    let paso = 'Conexión con la billetera';
    try {
      setWalletMsg('Conectando con la billetera oficial');
      
      let ethProvider = window.ethereum;
      if (ethProvider.providers && ethProvider.providers.length > 0) {
        ethProvider = ethProvider.providers.find(p => p.isMetaMask) || ethProvider;
      }

      // 1. Pedir cuentas usando callbacks
      const accounts = await callMetaMask(ethProvider, 'eth_requestAccounts');
      if (!accounts || accounts.length === 0) throw new Error("Se requiere seleccionar una cuenta para operar");
      // La billetera exige en "from" una dirección hexadecimal válida de la cuenta conectada
      const cuenta = typeof accounts[0] === 'string' ? accounts[0] : accounts[0]?.address;
      if (!cuenta || !ethers.isAddress(cuenta)) throw new Error('La billetera no devolvió una cuenta válida; vuelva a conectarla');
      const userAddress = ethers.getAddress(cuenta);
      
      // Importe exacto registrado on-chain para este PNR (unidades mínimas, 6 decimales)
      const montoUnidades = BigInt(cotizacion.montoUnidades);

      // 2. Verificar que la billetera esté en la red del contrato
      const chainHex = await callMetaMask(ethProvider, 'eth_chainId');
      if (Number(chainHex) !== CHAIN_ID) {
        const chainIdHex = '0x' + CHAIN_ID.toString(16);
        try {
          await callMetaMask(ethProvider, 'wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
        } catch (e) {
          // 4902: la red no está registrada en la billetera; se agrega con el RPC público del servidor
          if (e?.code !== 4902 && !/unrecognized|not been added/i.test(e?.message || '')) throw e;
          await callMetaMask(ethProvider, 'wallet_addEthereumChain', [{
            chainId: chainIdHex,
            chainName: CHAIN_NAME,
            rpcUrls: [PUBLIC_RPC_URL],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          }]);
        }
      }

      // 3. La billetera debe enviar las firmas al mismo nodo que lee el servidor: otra red con el mismo
      //    chainId (por ejemplo, un Hardhat local en 127.0.0.1:8545) recibiría la firma sin que el cobro avance
      const readProvider = new ethers.JsonRpcProvider(RPC_URL);
      const mismoNodo = async () => {
        const bloque = await readProvider.getBlock('latest');
        if (!bloque) return false;
        const enBilletera = await callMetaMask(ethProvider, 'eth_getBlockByNumber', ['0x' + bloque.number.toString(16), false]).catch(() => null);
        return !!enBilletera && enBilletera.hash === bloque.hash;
      };
      if (!(await mismoNodo())) {
        // Se ofrece en la billetera el RPC público del servidor para esta red
        await callMetaMask(ethProvider, 'wallet_addEthereumChain', [{
          chainId: '0x' + CHAIN_ID.toString(16),
          chainName: CHAIN_NAME,
          rpcUrls: [PUBLIC_RPC_URL],
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        }]).catch(() => null);
        if (!(await mismoNodo())) {
          throw new Error(`La billetera está conectada a otro nodo de la red ${CHAIN_ID}. En MetaMask, edite esa red y seleccione el RPC ${PUBLIC_RPC_URL}; luego vuelva a pagar.`);
        }
      }

      // 3b. MetaMask Mobile autoriza las cuentas por red: con la billetera ya en la red del contrato se confirma
      //     que la cuenta esté autorizada en ella; si no, eth_sendTransaction responde "must provide an Ethereum address"
      const autorizada = async () => {
        const cuentas = await callMetaMask(ethProvider, 'eth_accounts').catch(() => null);
        return !Array.isArray(cuentas) || cuentas.some((a) => String(a).toLowerCase() === userAddress.toLowerCase());
      };
      if (!(await autorizada())) {
        await callMetaMask(ethProvider, 'eth_requestAccounts').catch(() => null);
        if (!(await autorizada())) {
          await callMetaMask(ethProvider, 'wallet_requestPermissions', [{ eth_accounts: {} }]);
          if (!(await autorizada())) throw new Error('La billetera no autorizó la cuenta en la red de pruebas. En MetaMask, desconecte este sitio y vuelva a pagar.');
        }
      }

      // 4. Chequeo de saldo (solo lectura)
      const usdtContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, readProvider);
      const sinGas = (await readProvider.getBalance(userAddress)) === 0n;
      if (sinGas || (await usdtContract.balanceOf(userAddress)) < montoUnidades) {
        if (chain?.faucet) setFaucetAddr(userAddress);
        throw new Error(sinGas
          ? 'La billetera no tiene saldo para pagar la comisión de red'
          : 'Saldo de USDT insuficiente para completar la transacción');
      }

      // Espera la confirmación de cada transacción antes de continuar
      const esperarRecibo = async (hash) => {
        for (let i = 0; i < 120; i++) {
          const recibo = await readProvider.getTransactionReceipt(hash);
          if (recibo) {
            if (recibo.status !== 1) throw new Error('La transacción fue revertida por la red');
            return recibo;
          }
          await new Promise(r => setTimeout(r, 1500));
        }
        throw new Error('Tiempo de espera agotado al confirmar la transacción');
      };

      // 5. Firma 1/2: autorización de gasto (approve) por el importe exacto
      paso = 'Firma 1/2'; setWalletMsg('1/2 Autorizando el gasto de USDT');
      const ifaceUSDT = new ethers.Interface(ERC20_ABI);
      const dataApprove = ifaceUSDT.encodeFunctionData('approve', [ADDRESS, montoUnidades]);
      const hashApprove = await callMetaMask(ethProvider, 'eth_sendTransaction', [{ from: userAddress, to: USDT_TOKEN_ADDRESS, data: dataApprove }]);
      await esperarRecibo(hashApprove);

      // 6. Firma 2/2: pago (el contrato toma el importe de la tarifa registrada)
      paso = 'Firma 2/2'; setWalletMsg('2/2 Confirmando el pago en la red');
      const ifaceBoA = new ethers.Interface(BOA_PAYMENTS_ABI);
      const dataPago = ifaceBoA.encodeFunctionData('pagarBoleto', [pnr]);
      const hashPago = await callMetaMask(ethProvider, 'eth_sendTransaction', [{ from: userAddress, to: ADDRESS, data: dataPago }]);
      await esperarRecibo(hashPago);

      setWalletMsg(''); setStatus('confirming');
    } catch (e) {
      console.error("Operación detenida:", e);
      setWalletMsg(''); setBusy(false);
      // Los errores propios de la billetera indican el paso en que se detuvo la operación
      const msg = e?.message || 'Operación detenida en la billetera';
      setError(typeof e?.code === 'number' ? `${paso}: ${msg} (código ${e.code})` : msg);
    }
  };

  const [payMethod, setPayMethod] = useState(null); // 'mobile' | 'extension' | null

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
    waiting:    { color: '#F08A1D', bg: '#FFF4E5', label: 'Esperando pago',        sub: real ? 'Procesa el pago desde tu dispositivo' : 'Requiere el middleware (backend) para el pago verificado' },
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
        {/* Columna Izquierda: QR Code */}
        <div style={{ animation: 'qrFadeIn .4s cubic-bezier(.16,1,.3,1) both', width: '100%', maxWidth: 260 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00306F', textAlign: 'center', marginBottom: 12 }}>
            Abrir este pago en MetaMask Mobile
          </div>
          <div style={{
            padding: 18, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, position: 'relative',
          }}>
            <QR/>
            {status === 'waiting' && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 10,
                border: '2px solid rgba(0,48,111,.25)', animation: 'scanRing 2s ease-out infinite',
              }}/>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#6C767A', marginTop: 12 }}>
            <i className="ri-qr-scan-2-line"></i> Escanea con la cámara del teléfono
          </div>
        </div>

        {/* Columna Derecha: Detalles del Pago */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <CryptoIcon symbol={symbol} size={36}/>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Pagando con {symbol} · {c.name}{pnr && <> · reserva <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#006DB2' }}>{pnr}</span></>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 26, color: '#1D2429' }}>{cryptoAmount}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#1D2429' }}>{symbol}</span>
                <span style={{ fontSize: 13, color: '#6C767A' }}>≡ USD {usd}</span>
              </div>
              {exchangeRate && (
                <div style={{ fontSize: 11, color: '#006DB2', marginTop: 4, fontWeight: 700 }}>
                  Tipo de cambio oficial BCB aplicado: {exchangeRate} Bs
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 12, marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Red</div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#7B3FE4', color: '#fff', borderRadius: 999,
              padding: '5px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'Lato',
            }}>
              <i className="ri-flashlight-fill" style={{ color: '#F8C700' }}></i> Polygon
            </span>
            <div style={{ fontSize: 11, color: '#6C767A', marginTop: 8, lineHeight: 1.4 }}>
              Único red soportada. Paga con <strong>USDT sobre Polygon</strong> desde la billetera que prefieras (MetaMask, Trust, Phantom...). USDT en otras redes no es compatible.
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#6C767A', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 18 }}>
            Contrato de cobro BoAPayments (Polygon)
          </div>
          <div style={{
            padding: '8px 10px', background: '#F9F9F9', border: '1px solid #E5E7EB', borderRadius: 6, marginTop: 4,
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#1D2429', wordBreak: 'break-all' }}>{ADDRESS}</span>
          </div>
          <div style={{ fontSize: 11, color: '#B45309', marginTop: 6, lineHeight: 1.4 }}>
            No envíe USDT directamente a esta dirección: el pago solo es válido si se firma desde el botón de pago, que asocia la transacción a su reserva.
          </div>

          <div style={{ marginTop: 24 }}>
            <button onClick={() => { pagarMetaMask(); }} disabled={!real || busy} style={{
                width: '100%', background: '#00A95C', color: '#fff', border: 'none', borderRadius: 6, padding: '14px', fontSize: 14, fontWeight: 700,
                cursor: real && !busy ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s'
              }}>
              <i className={sinMetamask ? "ri-download-cloud-2-line" : "ri-wallet-3-line"}></i> 
              {sinMetamask ? "Instalar Extensión MetaMask" : "Pagar con la billetera oficial"}
            </button>
          </div>

          {walletMsg && (
            <div style={{ marginTop: 14, fontSize: 12, color: '#006DB2', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <i className="ri-loader-4-line animate-spin"></i> {walletMsg}
            </div>
          )}
          {error && (
            <div style={{ marginTop: 14, fontSize: 12, color: '#E11D2C', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <i className="ri-error-warning-line" style={{ marginTop: 1 }}></i> {error}
            </div>
          )}
          {faucetAddr && (
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button
                type="button"
                disabled={!!faucetMsg && faucetMsg.startsWith('Enviando')}
                onClick={async () => {
                  setFaucetMsg('Enviando fondos de prueba…');
                  try {
                    await api.faucet(faucetAddr);
                    setFaucetMsg('Fondos de prueba acreditados. Vuelve a pagar.');
                    setError(''); setFaucetAddr(null);
                  } catch (e) {
                    setFaucetMsg(e?.message || 'No se pudieron acreditar los fondos');
                  }
                }}
                style={{ fontSize: 12, fontWeight: 700, color: '#006DB2', background: '#E0F6FF', border: '1px solid #BFE6FF', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}
              >
                Obtener USDT y ETH de prueba
              </button>
            </div>
          )}
          {faucetMsg && !faucetAddr && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#00A95C', textAlign: 'center' }}>{faucetMsg}</div>
          )}
          {!real && (
            <div style={{ marginTop: 14, fontSize: 12, color: '#006DB2', background: '#E0F6FF', border: '1px solid #BFE6FF', borderRadius: 6, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <i className="ri-loader-4-line" style={{ marginTop: 1, animation: 'statusPulse 1.5s ease-out infinite' }}></i>
              <span>Estableciendo conexión segura con el orquestador principal</span>
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
          <strong style={{ color: '#0F172A' }}>Billeteras compatibles:</strong> billeteras de autocustodia con soporte para Polygon (MetaMask). Los retiros directos desde exchanges (Binance, Bybit y otros) no son compatibles, porque no pueden invocar el contrato de cobro.
        </div>
      </div>
    </FadeIn>
  );
};

const CryptoSuccess = ({ symbol, totalBob = 933, txInfo, passenger, route, onReset }) => {
  const c = CRYPTOS.find(x => x.sym === symbol);
  const usd = txInfo?.usdAmount || (totalBob / (txInfo?.rateUsed || 10.00)).toFixed(2);
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
        <DetailRow label="Tasa de Cambio" value={`${txInfo?.rateUsed || 10.00} Bs`} mono/>
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

export default function CryptoCheckoutFlow({ totalBob = 933, pnr, direccionPago, montoUSDT, cotizacion, backendDisponible = false, onBack, passenger, route, onReset }) {
  const [phase, setPhase] = useState('pick');
  const [symbol, setSymbol] = useState(null);
  const [txInfo, setTxInfo] = useState(null);

  return (
    <div>
      {phase === 'pick' && (
        <CryptoPick 
          onPick={(s) => { setSymbol(s); setPhase('checkout'); }}
          onBack={onBack}
        />
      )}
      {phase === 'checkout' && symbol && (
        <CryptoCheckout
          symbol={symbol} totalBob={totalBob}
          pnr={pnr} direccionPago={direccionPago} montoUSDT={montoUSDT} cotizacion={cotizacion} backendDisponible={backendDisponible}
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
