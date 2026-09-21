// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BoAFirmaDigital (EIP-2612 Permit)
 * @dev Contrato de demostración para el Tribunal.
 * Muestra cómo se emplea un token con "Firma Digital" asimétrica.
 * Implementa EIP-712 (Typed Data Hashing) y EIP-2612 (ERC20 Permit).
 */
contract BoAFirmaDigital is ERC20Permit, Ownable {
    
    // ==========================================
    // CONSTRUCTOR
    // ==========================================
    
    constructor() 
        ERC20("BoA Token Firma Digital", "BOASIG") 
        ERC20Permit("BoA Token Firma Digital") 
        Ownable(msg.sender)
    {
        // Acuñar tokens iniciales para pruebas
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // ==========================================
    // EXPLICACIÓN DE FIRMA DIGITAL PARA TRIBUNAL
    // ==========================================
    
    /**
     * @notice Función de alto nivel que demuestra el uso de firmas criptográficas.
     * @dev En lugar de hacer una transacción tradicional de `approve()`, el cliente 
     * firma un mensaje fuera de la cadena (off-chain).
     * El contrato usa los vectores de firma (v, r, s) para recuperar la llave pública
     * del firmante y validar su autenticidad.
     * 
     * @param owner El dueño de los tokens (quien generó la firma digital)
     * @param spender El contrato de la pasarela que gastará los tokens
     * @param value El monto a transferir (Ej. costo del boleto)
     * @param deadline Fecha límite de validez de la firma digital (timestamp)
     * @param v Parámetro 'v' de la firma ECDSA (Recovery byte)
     * @param r Parámetro 'r' de la firma ECDSA (X-coordinate)
     * @param s Parámetro 's' de la firma ECDSA (Proof parameter)
     */
    function autorizarConFirmaDigital(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // 1. Invocación al estándar criptográfico EIP-2612
        // Dentro de `permit()`, se ejecuta `ecrecover` nativo de la EVM.
        // Esto verifica matemáticamente que la firma proviene de la llave privada de `owner`.
        permit(owner, spender, value, deadline, v, r, s);
        
        // 2. Si la firma es válida, se procede a transferir los fondos (opcional en el flujo)
        // transferFrom(owner, spender, value);
    }
    
    /**
     * @notice Función para que el Tribunal observe cómo se gestionan los Nonces 
     * para evitar ataques de repetición (Replay Attacks).
     * @param owner La dirección del firmante
     */
    function consultarNonceFirma(address owner) external view returns (uint256) {
        return nonces(owner);
    }
}
