// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title BoAPayments
 * @dev Contrato inteligente centralizado en la validación y registro inmutable de 
 * pagos de boletos aéreos de Boliviana de Aviación (BoA).
 * Asegura la idempotencia, previniendo la doble emisión de Localizadores de Reserva (PNR).
 */
contract BoAPayments is Ownable, ReentrancyGuard {
    // ==========================================
    // VARIABLES DE ESTADO
    // ==========================================
    
    /// @notice Dirección de la billetera corporativa recaudadora de BoA donde convergen los fondos
    address public walletRecaudadoraBoA;
    
    /// @notice Interfaz del token ERC20 (USDT o similar) aceptado como medio de pago
    IERC20 public usdtToken;
    
    /// @notice Registro de control de idempotencia para PNRs pagados
    /// @dev Mapea el identificador PNR (string) a un booleano (true si ya se pagó exitosamente)
    mapping(string => bool) public pnrPagados;

    // ==========================================
    // EVENTOS
    // ==========================================
    
    /// @notice Evento emitido asíncronamente cuando un pago se confirma exitosamente
    /// @dev El backend (Node.js) escuchará este evento para emitir el boleto
    /// @param cliente La dirección de la wallet que origina el pago
    /// @param pnr Localizador de reserva pagado
    /// @param monto Cantidad de tokens transferidos
    /// @param timestamp Sello de tiempo de la transacción en la blockchain
    event PagoConfirmado(address indexed cliente, string pnr, uint256 monto, uint256 timestamp);

    // ==========================================
    // CONSTRUCTOR
    // ==========================================
    
    /**
     * @dev Inicializa el contrato estableciendo la moneda de pago y la wallet recaudadora
     * @param _usdtToken Dirección del contrato del token aceptado
     * @param _walletRecaudadoraBoA Dirección de la wallet que recibe los fondos de los boletos
     */
    constructor(address _usdtToken, address _walletRecaudadoraBoA) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Direccion del token no valida");
        require(_walletRecaudadoraBoA != address(0), "Direccion recaudadora no valida");
        
        usdtToken = IERC20(_usdtToken);
        walletRecaudadoraBoA = _walletRecaudadoraBoA;
    }

    // ==========================================
    // FUNCIONES PRINCIPALES
    // ==========================================
    
    /**
     * @notice Permite al pasajero pagar un boleto asociado a un PNR específico
     * @dev Ejecuta la transferencia de los tokens, aplica control de reentrancia y de idempotencia
     * @param _pnr Localizador de Reserva (Passenger Name Record)
     * @param _monto Monto a debitar para cancelar la deuda del boleto
     */
    function pagarBoletaWeb3(string calldata _pnr, uint256 _monto) external nonReentrant {
        // Validaciones de negocio y seguridad
        require(_monto > 0, "El monto debe ser mayor a cero");
        require(!pnrPagados[_pnr], "El PNR ya ha sido pagado");
        
        // Ejecución de la transferencia (Delega la responsabilidad de balance/allowance al contrato ERC20)
        // El pasajero previamente debe haber aprobado el gasto (approve)
        bool transferenciaExitosa = usdtToken.transferFrom(msg.sender, walletRecaudadoraBoA, _monto);
        require(transferenciaExitosa, "La transferencia de tokens ha fallado");
        
        // Actualización de estado: Registro de idempotencia
        pnrPagados[_pnr] = true;
        
        // Emisión del evento on-chain para ser procesado por el middleware
        emit PagoConfirmado(msg.sender, _pnr, _monto, block.timestamp);
    }
    
    // ==========================================
    // FUNCIONES DE ADMINISTRACION
    // ==========================================
    
    /**
     * @notice Permite al propietario del contrato actualizar la wallet recaudadora
     * @param _nuevaWallet Dirección de la nueva billetera corporativa
     */
    function actualizarWalletRecaudadora(address _nuevaWallet) external onlyOwner {
        require(_nuevaWallet != address(0), "Direccion invalida");
        walletRecaudadoraBoA = _nuevaWallet;
    }
}
