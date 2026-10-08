// Cobertura del contrato del sistema: se excluyen los contratos auxiliares de prueba
// (MockUSDT, MaliciousToken) y la demostración independiente de firma digital.
module.exports = {
  skipFiles: ['MockUSDT.sol', 'test/MaliciousToken.sol', 'BoAFirmaDigital.sol'],
};
