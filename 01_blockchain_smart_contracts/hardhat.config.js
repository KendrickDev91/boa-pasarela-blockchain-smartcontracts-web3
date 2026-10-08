require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 1000 } }
      },
      {
        version: "0.8.24",
        settings: { 
            optimizer: { enabled: true, runs: 1000 },
            evmVersion: "cancun"
        }
      }
    ]
  },
  networks: {
    // Nodo local: bloques con la misma marca de tiempo permitidos, para que el reloj de la
    // cadena no se adelante al real cuando se minan varias transacciones por segundo
    hardhat: { allowBlocksWithSameTimestamp: true },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
  },
};