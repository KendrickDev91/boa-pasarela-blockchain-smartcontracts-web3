import React, { useState } from 'react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import { PlaneTakeoff, Wallet, CheckCircle2, AlertCircle, QrCode, Copy } from 'lucide-react';
import { BOA_PAYMENTS_ADDRESS, BOA_PAYMENTS_ABI, USDT_TOKEN_ADDRESS, ERC20_ABI } from '../constants/contracts';

const PaymentGateway = () => {
  const [account, setAccount] = useState('');
  const [pnr, setPnr] = useState('');
  const [monto, setMonto] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, CONNECTING, APPROVING, PENDING, SUCCESS, ERROR
  const [errorMessage, setErrorMessage] = useState('');
  const [showQR, setShowQR] = useState(false);

  // ==========================================
  // CONEXIÓN CON LA BILLETERA
  // ==========================================
  const connectWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage("Por favor, instala MetaMask para continuar.");
      return;
    }

    try {
      setStatus('CONNECTING');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setStatus('IDLE');
    } catch (error) {
      setErrorMessage("Error al conectar la billetera.");
      setStatus('ERROR');
    }
  };

  // ==========================================
  // LÓGICA DE PAGO WEB3
  // ==========================================
  const handlePayment = async () => {
    if (!pnr) {
      setErrorMessage("El PNR es obligatorio.");
      return;
    }

    try {
      setStatus('APPROVING');
      setErrorMessage('');

      // Instanciar proveedor y signer (usuario activo)
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const boaContract = new ethers.Contract(BOA_PAYMENTS_ADDRESS, BOA_PAYMENTS_ABI, signer);

      // El importe lo fija el contrato (tarifa registrada por el servidor intermedio para el PNR)
      const [montoFormateado] = await boaContract.consultarTarifa(pnr);
      if (montoFormateado === 0n) throw new Error('El PNR no tiene una tarifa registrada');
      setMonto(ethers.formatUnits(montoFormateado, 6));

      // 1. APROBAR GASTO DE USDT por el importe exacto
      const usdtContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const txAprobacion = await usdtContract.approve(BOA_PAYMENTS_ADDRESS, montoFormateado);
      await txAprobacion.wait(); // Esperamos que la transacción se mine

      setStatus('PENDING');

      // 2. EJECUTAR EL PAGO EN EL SMART CONTRACT DE BOA
      const txPago = await boaContract.pagarBoleto(pnr);

      // Esperamos confirmación de bloque
      await txPago.wait();

      setStatus('SUCCESS');
    } catch (error) {
      console.error(error);
      setErrorMessage(error?.reason || "Ocurrió un error en la transacción. Verifica tu saldo de gas/USDT o si el PNR ya fue pagado.");
      setStatus('ERROR');
    }
  };

  // ==========================================
  // RENDERIZADO VISUAL
  // ==========================================
  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden font-sans border border-gray-100">
      {/* Header Corporativo (Identidad Visual BoA) */}
      <div className="bg-boa-blue p-6 text-white text-center">
        <PlaneTakeoff className="mx-auto h-12 w-12 mb-3" />
        <h2 className="text-2xl font-bold tracking-wide">BoA Pagos</h2>
        <p className="text-boa-light text-sm mt-1">Pasarela Web3 Descentralizada</p>
      </div>

      <div className="p-6">
        {/* Conexión de Billetera */}
        {!account ? (
          <button
            onClick={connectWallet}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <Wallet size={20} />
            Conectar MetaMask
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-lg mb-6 border border-green-200">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium truncate">Conectado: {account}</span>
          </div>
        )}

        {/* Formulario de Pago */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Localizador (PNR)</label>
            <input
              type="text"
              placeholder="Ej. ABC123"
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              disabled={status === 'PENDING' || status === 'APPROVING' || status === 'SUCCESS'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-boa-accent focus:border-boa-accent outline-none transition-all uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Monto a Pagar (USDT)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={status === 'PENDING' || status === 'APPROVING' || status === 'SUCCESS'}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-boa-accent focus:border-boa-accent outline-none transition-all"
              />
            </div>
          </div>

          {/* Feedback Visual: Errores */}
          {status === 'ERROR' && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Feedback Visual: Éxito */}
          {status === 'SUCCESS' && (
            <div className="bg-green-100 text-green-800 p-4 rounded-lg border border-green-300 text-center transition-all">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-600" />
              <p className="font-bold">¡Pago Confirmado!</p>
              <p className="text-sm mt-1">Nuestros sistemas emitirán tu boleto en breve.</p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-4 space-y-3">
            <button
              onClick={handlePayment}
              disabled={!account || !pnr || !monto || status === 'PENDING' || status === 'APPROVING' || status === 'SUCCESS'}
              className="w-full bg-boa-accent hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {status === 'APPROVING' ? '1/2 Aprobando USDT...' : status === 'PENDING' ? '2/2 Confirmando Blockchain...' : 'Pagar Reserva con MetaMask'}
            </button>

            <button
              onClick={() => setShowQR(!showQR)}
              disabled={status === 'PENDING' || status === 'APPROVING' || status === 'SUCCESS'}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg border border-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <QrCode size={20} />
              {showQR ? 'Ocultar QR' : 'Generar QR (Depósito Remoto)'}
            </button>
          </div>

          {/* Sección QR Alternativa (Ticket de Cobro) */}
          {showQR && (
            <div className="mt-5 p-5 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300 text-center flex flex-col items-center shadow-inner relative overflow-hidden transition-all duration-300">
              {/* Decoración superior del ticket */}
              <div className="absolute top-0 left-0 w-full h-1 bg-boa-accent opacity-50"></div>
              
              <h3 className="text-lg font-bold text-gray-800 mb-1">Ticket de Cobro BoA</h3>
              <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-semibold">Depósito Remoto Web3</p>

              <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-gray-200 mb-5 relative group">
                <QRCodeSVG value={BOA_PAYMENTS_ADDRESS} size={160} level="H" includeMargin={false} />
              </div>

              <div className="w-full text-left space-y-2 bg-white p-3 rounded-lg border border-gray-200 mb-5 shadow-sm">
                <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">Red Requerida:</span>
                  <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">Polygon (MATIC)</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 pt-1">
                  <span className="text-gray-500 font-medium">Activo Digital:</span>
                  <span className="font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-100">Tether (USDT)</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-gray-500 font-medium">Monto a transferir:</span>
                  <span className="font-bold text-gray-900 text-lg">
                    ${monto ? parseFloat(monto).toFixed(2) : '0.00'} <span className="text-sm font-semibold text-gray-500">USDT</span>
                  </span>
                </div>
              </div>

              <div className="w-full">
                <p className="text-xs text-gray-500 font-medium mb-1.5 text-left">Dirección del Contrato Inteligente:</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-600 flex-1 break-all bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 font-mono select-all text-left shadow-inner">
                    {BOA_PAYMENTS_ADDRESS}
                  </p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(BOA_PAYMENTS_ADDRESS)}
                    className="p-2.5 bg-gray-50 hover:bg-boa-accent hover:text-white text-gray-500 rounded-lg border border-gray-200 transition-all duration-200 shadow-sm active:scale-95"
                    title="Copiar dirección"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2.5 text-left bg-orange-50 p-3.5 rounded-lg border border-orange-200">
                <AlertCircle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800 leading-relaxed">
                  <strong>Aviso Técnico:</strong> Debe transferir <span className="underline font-semibold">exactamente</span> el monto indicado a través de la red Polygon. El oráculo del sistema validará automáticamente el estado transaccional del PNR <span className="font-bold bg-orange-100 px-1 rounded">{pnr ? pnr.toUpperCase() : '[NO INGRESADO]'}</span> una vez confirmados los bloques de red.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
