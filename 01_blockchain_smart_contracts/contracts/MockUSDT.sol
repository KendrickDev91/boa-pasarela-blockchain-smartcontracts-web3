// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Simulación de USDT para el entorno de pruebas de la pasarela BoA.
 * Implementa 6 decimales (estándar USDT) y permite emisión gratuita para pruebas.
 */
contract MockUSDT is ERC20, Ownable {
    constructor() ERC20("Mock USDT BoA", "USDT") Ownable(msg.sender) {
        // Mintear 100,000 tokens iniciales a la cuenta que despliega el contrato
        _mint(msg.sender, 100000 * 10 ** decimals());
    }

    /**
     * @dev Sobrescribimos a 6 decimales para imitar el comportamiento real del USDT
     */
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /**
     * @notice Permite al administrador emitir más tokens
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Función Faucet para pruebas. 
     * Permite a cualquier billetera conectada reclamar 1,000 USDT de prueba gratis.
     */
    function faucet() public {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}
