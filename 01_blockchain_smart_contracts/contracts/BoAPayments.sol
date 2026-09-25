// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BoAPayments
 * @dev Canal complementario de cobro de boletos de Boliviana de Aviación (BoA) en un
 * activo estable ERC-20 (USDT). El importe de cada localizador de reserva (PNR) lo
 * registra el servidor intermedio (operador) antes del cobro; el pasajero no puede
 * elegir el monto. Cada PNR se liquida una sola vez (idempotencia on-chain).
 *
 * Seguridad:
 *  - ReentrancyGuard (nonReentrant) en la función de pago.
 *  - Patrón verificación-efectos-interacción: el PNR se marca como pagado ANTES de
 *    invocar al contrato del token.
 *  - SafeERC20 para tolerar tokens que no devuelven bool.
 *  - Ownable para funciones administrativas; rol operador para registrar tarifas.
 */
contract BoAPayments is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Tarifa {
        uint256 monto;   // unidades mínimas del token (USDT: 6 decimales)
        uint64 venceEn;  // marca de tiempo UNIX de vencimiento de la cotización
    }

    // ==========================================
    // VARIABLES DE ESTADO
    // ==========================================

    /// @notice Token ERC-20 aceptado como medio de pago (inmutable tras el despliegue)
    IERC20 public immutable usdtToken;

    /// @notice Billetera institucional (tesorería BoA) que recibe los fondos
    address public billeteraRecaudadora;

    /// @notice Dirección del servidor intermedio autorizada a registrar tarifas
    address public operador;

    /// @dev Tarifa registrada por PNR. Clave: keccak256(bytes(pnr))
    mapping(bytes32 => Tarifa) private tarifaPorPnr;

    /// @dev Control de idempotencia. Clave: keccak256(bytes(pnr))
    mapping(bytes32 => bool) private pnrPagados;

    uint256 private constant LONGITUD_MAXIMA_PNR = 10;

    // ==========================================
    // EVENTOS
    // ==========================================

    event TarifaRegistrada(string pnr, uint256 monto, uint64 venceEn);
    /// @dev Firma conservada respecto de la versión anterior para no romper al middleware
    event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp);
    event BilleteraRecaudadoraActualizada(address anterior, address nueva);
    event OperadorActualizado(address anterior, address nuevo);

    // ==========================================
    // ERRORES
    // ==========================================

    error DireccionInvalida();
    error SoloOperador();
    error PnrInvalido();
    error MontoInvalido();
    error VencimientoInvalido();
    error PnrYaPagado();
    error PnrSinTarifa();
    error CotizacionVencida();

    modifier soloOperador() {
        if (msg.sender != operador) revert SoloOperador();
        _;
    }

    constructor(address _usdtToken, address _billeteraRecaudadora, address _operador)
        Ownable(msg.sender)
    {
        if (_usdtToken == address(0) || _billeteraRecaudadora == address(0) || _operador == address(0)) {
            revert DireccionInvalida();
        }
        usdtToken = IERC20(_usdtToken);
        billeteraRecaudadora = _billeteraRecaudadora;
        operador = _operador;
    }

    // ==========================================
    // FUNCIONES PRINCIPALES
    // ==========================================

    /**
     * @notice Registra el importe exigido para un PNR antes de habilitar su cobro.
     * @param pnr Localizador de reserva (1 a 10 caracteres)
     * @param monto Importe en unidades mínimas del token
     * @param venceEn Marca de tiempo UNIX hasta la cual la cotización es válida
     */
    function registrarTarifa(string calldata pnr, uint256 monto, uint64 venceEn) external soloOperador {
        bytes32 clave = _clave(pnr);
        if (monto == 0) revert MontoInvalido();
        if (venceEn <= block.timestamp) revert VencimientoInvalido();
        if (pnrPagados[clave]) revert PnrYaPagado();

        tarifaPorPnr[clave] = Tarifa(monto, venceEn);
        emit TarifaRegistrada(pnr, monto, venceEn);
    }

    /**
     * @notice Paga el boleto asociado a un PNR. El importe se toma del registro on-chain.
     * @dev Requiere approve previo del pasajero sobre este contrato por el importe registrado.
     */
    function pagarBoleto(string calldata pnr) external nonReentrant {
        // 1. Verificaciones
        bytes32 clave = _clave(pnr);
        Tarifa memory tarifa = tarifaPorPnr[clave];
        if (tarifa.monto == 0) revert PnrSinTarifa();
        if (pnrPagados[clave]) revert PnrYaPagado();
        if (block.timestamp > tarifa.venceEn) revert CotizacionVencida();

        // 2. Efectos
        pnrPagados[clave] = true;

        // 3. Interacción
        usdtToken.safeTransferFrom(msg.sender, billeteraRecaudadora, tarifa.monto);

        emit PagoConfirmado(msg.sender, pnr, tarifa.monto, block.timestamp);
    }

    // ==========================================
    // CONSULTAS
    // ==========================================

    function verificarPago(string calldata pnr) external view returns (bool) {
        return pnrPagados[keccak256(bytes(pnr))];
    }

    function consultarTarifa(string calldata pnr) external view returns (uint256 monto, uint64 venceEn) {
        Tarifa memory t = tarifaPorPnr[keccak256(bytes(pnr))];
        return (t.monto, t.venceEn);
    }

    // ==========================================
    // ADMINISTRACIÓN (solo propietario)
    // ==========================================

    function actualizarBilleteraRecaudadora(address nueva) external onlyOwner {
        if (nueva == address(0)) revert DireccionInvalida();
        emit BilleteraRecaudadoraActualizada(billeteraRecaudadora, nueva);
        billeteraRecaudadora = nueva;
    }

    function actualizarOperador(address nuevo) external onlyOwner {
        if (nuevo == address(0)) revert DireccionInvalida();
        emit OperadorActualizado(operador, nuevo);
        operador = nuevo;
    }

    /**
     * @notice Recupera tokens enviados por error directamente al contrato
     * (el flujo normal nunca deja fondos en el contrato).
     */
    function rescatarTokens(address token, address destino, uint256 monto) external onlyOwner {
        if (destino == address(0)) revert DireccionInvalida();
        IERC20(token).safeTransfer(destino, monto);
    }

    function _clave(string calldata pnr) private pure returns (bytes32) {
        uint256 largo = bytes(pnr).length;
        if (largo == 0 || largo > LONGITUD_MAXIMA_PNR) revert PnrInvalido();
        return keccak256(bytes(pnr));
    }
}
